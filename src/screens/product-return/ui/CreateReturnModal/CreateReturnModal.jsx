import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Color, FontFamily, FontSize, Border, Shadow, Padding } from '@app/styles/GlobalStyles';
import { normalize } from '@shared/lib/normalize';
import {
  useCreateReturn,
  validateReturnData,
  fetchProductReturns,
} from '@entities/product-return';
import { useDispatch } from 'react-redux';
import { GlobalAlert } from '@shared/ui/CustomAlert';

/**
 * Модальное окно для создания возврата товара
 * Открывается из StagnantProductsScreen
 */
export const CreateReturnModal = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { product } = route.params || {};

  const { createReturn, isCreating } = useCreateReturn();

  // Определяем доступные склады
  const warehouses = product?.warehouses || [];
  const hasMultipleWarehouses = warehouses.length > 1;
  
  // Состояние формы
  const [selectedWarehouseIndex, setSelectedWarehouseIndex] = useState(0);
  const selectedWarehouse = warehouses[selectedWarehouseIndex] || null;
  const maxQuantity = selectedWarehouse?.quantity || product?.quantity || 0;
  
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  // Закрытие модалки
  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Валидация формы
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!product) {
      newErrors.general = 'Продукт не выбран';
      return newErrors;
    }

    const quantityNum = parseInt(quantity, 10);
    if (!quantity || isNaN(quantityNum) || quantityNum <= 0) {
      newErrors.quantity = 'Укажите корректное количество';
    } else if (quantityNum > maxQuantity) {
      newErrors.quantity = `Максимум: ${maxQuantity} коробок`;
    }

    if (!reason.trim()) {
      newErrors.reason = 'Укажите причину возврата';
    } else if (reason.trim().length < 10) {
      newErrors.reason = 'Минимум 10 символов';
    }

    return newErrors;
  }, [product, quantity, reason, maxQuantity]);

  // Обработчик создания возврата
  const handleSubmit = useCallback(async () => {
    // Валидация
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!product) {
      GlobalAlert.showError('Ошибка', 'Продукт не найден');
      return;
    }

    // Определяем warehouseId для возврата
    const warehouseId = selectedWarehouse?.id || product.warehouseId;
    
    if (!warehouseId) {
      GlobalAlert.showError('Ошибка', 'Склад не выбран');
      return;
    }
    
    // Создание возврата
    const result = await createReturn({
      productId: product.productId,
      warehouseId: warehouseId,
      quantity: parseInt(quantity, 10),
      reason: reason.trim(),
      notes: notes.trim() || undefined,
    });

    if (result.success) {
      // Обновляем список возвратов в фоне
      dispatch(fetchProductReturns({ forceRefresh: true }));
      
      GlobalAlert.showSuccess(
        '',
        'Возврат создан и отправлен на рассмотрение',
        [
          {
            text: 'OK',
            style: 'primary',
            onPress: () => {
              handleClose();
              // Остаемся на экране залежавшихся товаров
            },
          },
        ]
      );
    } else {
      if (result.validationFailed && result.errors) {
        GlobalAlert.showError('Ошибка валидации', result.errors.join('\n'));
      } else {
        GlobalAlert.showError('Ошибка', result.message || 'Не удалось создать возврат');
      }
    }
  }, [product, quantity, reason, notes, createReturn, handleClose, navigation, validateForm, selectedWarehouse, dispatch]);

  // Очистка ошибок при изменении полей
  useEffect(() => {
    setErrors({});
  }, [quantity, reason, notes, selectedWarehouseIndex]);

  if (!product) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.container}>
            <Text style={styles.errorText}>Продукт не найден</Text>
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>Закрыть</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Заголовок */}
          <View style={styles.header}>
            <Text style={styles.title}>Создание возврата</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Информация о товаре */}
            <View style={styles.productInfo}>
              {product.productImage && (
                <Image
                  source={{ uri: product.productImage }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.productDetails}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.productName}
                </Text>
                {hasMultipleWarehouses ? (
                  <Text style={styles.productMeta}>
                    На {warehouses.length} складах
                  </Text>
                ) : (
                  <Text style={styles.productMeta}>
                    Доступно: {maxQuantity} коробок
                  </Text>
                )}
                <Text style={styles.productMeta}>
                  {product.daysSinceLastSale} дней без продаж
                </Text>
              </View>
            </View>

            {/* Выбор склада (если товар на нескольких складах) */}
            {hasMultipleWarehouses && (
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Выбор склада <Text style={styles.required}>*</Text>
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.warehousesScroll}
                >
                  {warehouses.map((warehouse, index) => (
                    <Pressable
                      key={warehouse.id || index}
                      style={[
                        styles.warehouseChip,
                        selectedWarehouseIndex === index && styles.warehouseChipActive,
                      ]}
                      onPress={() => setSelectedWarehouseIndex(index)}
                    >
                      <Text style={[
                        styles.warehouseChipText,
                        selectedWarehouseIndex === index && styles.warehouseChipTextActive,
                      ]}>
                        {warehouse.name}
                      </Text>
                      <Text style={[
                        styles.warehouseChipQuantity,
                        selectedWarehouseIndex === index && styles.warehouseChipQuantityActive,
                      ]}>
                        {warehouse.quantity} шт
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {selectedWarehouse && (
                  <Text style={styles.hint}>
                    На складе "{selectedWarehouse.name}": {selectedWarehouse.quantity} коробок
                    {selectedWarehouse.daysSinceLastSale > 0 && 
                      ` • ${selectedWarehouse.daysSinceLastSale} дней без продаж`
                    }
                  </Text>
                )}
              </View>
            )}

            {/* Поля формы */}
            <View style={styles.form}>
              {/* Количество */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Количество коробок <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.quantity && styles.inputError,
                  ]}
                  placeholder="Введите количество"
                  placeholderTextColor={Color.textSecondary}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                  editable={!isCreating}
                />
                {errors.quantity && (
                  <Text style={styles.errorMessage}>{errors.quantity}</Text>
                )}
                <Text style={styles.hint}>
                  Максимум: {maxQuantity} коробок
                  {hasMultipleWarehouses && selectedWarehouse && 
                    ` на складе "${selectedWarehouse.name}"`
                  }
                </Text>
              </View>

              {/* Причина */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Причина возврата <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    errors.reason && styles.inputError,
                  ]}
                  placeholder="Опишите причину возврата"
                  placeholderTextColor={Color.textSecondary}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!isCreating}
                />
                {errors.reason && (
                  <Text style={styles.errorMessage}>{errors.reason}</Text>
                )}
                <Text style={styles.hint}>
                  Минимум 10 символов. Укажите, почему товар не продается
                </Text>
              </View>

              {/* Заметки */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Дополнительные заметки</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Дополнительная информация (необязательно)"
                  placeholderTextColor={Color.textSecondary}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!isCreating}
                />
              </View>
            </View>
          </ScrollView>

          {/* Кнопки */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isCreating}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                styles.submitButton,
                isCreating && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color={Color.colorLightMode} />
              ) : (
                <Text style={styles.submitButtonText}>Создать возврат</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Color.colorLightMode,
    borderTopLeftRadius: Border.br_xl,
    borderTopRightRadius: Border.br_xl,
    maxHeight: '90%',
    ...Shadow.heavy,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Padding.large,
    borderBottomWidth: 1,
    borderBottomColor: Color.border,
  },
  title: {
    fontSize: FontSize.size_xl,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Color.textPrimary,
  },
  closeIcon: {
    fontSize: 24,
    color: Color.textSecondary,
  },
  scrollView: {
    maxHeight: normalize(500),
  },
  scrollContent: {
    padding: Padding.large,
  },

  // Информация о товаре
  productInfo: {
    flexDirection: 'row',
    backgroundColor: Color.secondary,
    borderRadius: Border.radius.large,
    padding: Padding.medium,
    marginBottom: Padding.large,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: Border.radius.medium,
    backgroundColor: Color.border,
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productName: {
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: Color.textPrimary,
    marginBottom: 4,
  },
  productMeta: {
    fontSize: FontSize.size_xs,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
    marginTop: 2,
  },

  // Форма
  form: {
    gap: Padding.large,
  },
  fieldContainer: {
    gap: 8,
  },
  label: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: Color.textPrimary,
  },
  required: {
    color: Color.error,
  },
  input: {
    backgroundColor: Color.secondary,
    borderRadius: Border.radius.medium,
    borderWidth: 1,
    borderColor: Color.border,
    padding: Padding.small,
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.regular,
    color: Color.textPrimary,
  },
  inputError: {
    borderColor: Color.error,
    borderWidth: 1.5,
  },
  textArea: {
    minHeight: 80,
    paddingTop: Padding.small,
  },
  errorMessage: {
    fontSize: FontSize.size_xs,
    fontFamily: FontFamily.regular,
    color: Color.error,
  },
  hint: {
    fontSize: FontSize.size_xs,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
    fontStyle: 'italic',
  },

  // Кнопки
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: Padding.large,
    borderTopWidth: 1,
    borderTopColor: Color.border,
  },
  button: {
    flex: 1,
    borderRadius: Border.radius.medium,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Color.secondary,
  },
  cancelButtonText: {
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: Color.textPrimary,
  },
  submitButton: {
    backgroundColor: Color.purpleSoft,
    ...Shadow.button,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Color.colorLightMode,
  },
  closeButton: {
    backgroundColor: Color.purpleSoft,
    borderRadius: Border.radius.medium,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: Padding.medium,
  },
  closeButtonText: {
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: Color.colorLightMode,
    textAlign: 'center',
  },
  errorText: {
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.regular,
    color: Color.error,
    textAlign: 'center',
    marginBottom: Padding.large,
  },
  
  // Выбор склада
  warehousesScroll: {
    marginVertical: 8,
  },
  warehouseChip: {
    backgroundColor: Color.secondary,
    borderRadius: Border.radius.medium,
    borderWidth: 2,
    borderColor: Color.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
    minWidth: 120,
  },
  warehouseChipActive: {
    backgroundColor: Color.purpleLight,
    borderColor: Color.purpleSoft,
  },
  warehouseChipText: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: Color.textPrimary,
    marginBottom: 4,
  },
  warehouseChipTextActive: {
    color: Color.purpleSoft,
  },
  warehouseChipQuantity: {
    fontSize: FontSize.size_xs,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
  },
  warehouseChipQuantityActive: {
    color: Color.purpleSoft,
  },
});

