import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { UrgencyLevelBadge } from './UrgencyLevelBadge';
import { formatDaysSinceLastSale } from '../lib/utils';
import { Color, FontFamily, FontSize, Border, Shadow, Padding } from '@app/styles/GlobalStyles';

/**
 * Карточка залежавшегося товара
 * @param {Object} props
 * @param {Object} props.product - Данные залежавшегося товара
 * @param {Function} [props.onPress] - Обработчик нажатия
 * @param {Function} [props.onCreateReturn] - Обработчик создания возврата
 */
export const StagnantProductCard = React.memo(({ 
  product, 
  onPress,
  onCreateReturn,
}) => {
  const {
    productImage,
    productName,
    supplierName,
    warehouseName,
    quantity,
    daysSinceLastSale,
    urgencyLevel,
    warehouses = [], // Массив складов (если товар на нескольких складах)
    warehousesCount = 0, // Количество складов
  } = product;

  const handlePress = () => {
    if (onPress) {
      onPress(product);
    }
  };

  const handleCreateReturn = () => {
    if (onCreateReturn) {
      onCreateReturn(product);
    }
  };

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
      android_ripple={{ color: Color.purpleLight }}
    >
      {/* Изображение товара */}
      {productImage ? (
        <Image
          source={{ uri: productImage }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>📦</Text>
        </View>
      )}

      {/* Контент */}
      <View style={styles.content}>
        {/* Верхняя часть: название и бейдж */}
        <View style={styles.header}>
          <Text style={styles.productName} numberOfLines={2}>
            {productName}
          </Text>
          <UrgencyLevelBadge level={urgencyLevel} size="small" />
        </View>

        {/* Информация о поставщике */}
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Поставщик:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {supplierName}
            </Text>
          </View>
          
          {/* Список складов */}
          {warehouses.length > 0 ? (
            <View style={styles.warehousesContainer}>
              <Text style={styles.infoLabel}>
                {warehouses.length > 1 
                  ? `Склады (${warehouses.length}):`
                  : 'Склад:'
                }
              </Text>
              {warehouses.map((warehouse, index) => (
                <View key={warehouse.id || index} style={styles.warehouseItem}>
                  <Text style={styles.warehouseDot}>•</Text>
                  <Text style={styles.warehouseName} numberOfLines={1}>
                    {warehouse.name}
                  </Text>
                  <Text style={styles.warehouseQuantity}>
                    ({warehouse.quantity} шт, {warehouse.daysSinceLastSale} дн.)
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Склад:</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {warehouseName}
              </Text>
            </View>
          )}
        </View>

        {/* Нижняя часть: статистика */}
        <View style={styles.footer}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{quantity}</Text>
              <Text style={styles.statLabel}>коробок</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{daysSinceLastSale}</Text>
              <Text style={styles.statLabel}>дней без продаж</Text>
            </View>
          </View>

          {/* Кнопка создания возврата */}
          {onCreateReturn && (
            <Pressable
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.createButtonPressed,
              ]}
              onPress={handleCreateReturn}
              android_ripple={{ color: Color.colorLightMode, radius: 20 }}
            >
              <Text style={styles.createButtonText}>Создать возврат</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}, (prevProps, nextProps) => {
  // Оптимизация: ререндер только если изменились данные товара
  return (
    prevProps.product.productId === nextProps.product.productId &&
    prevProps.product.daysSinceLastSale === nextProps.product.daysSinceLastSale &&
    prevProps.product.quantity === nextProps.product.quantity &&
    prevProps.product.urgencyLevel === nextProps.product.urgencyLevel
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Color.colorLightMode,
    borderRadius: Border.br_base,
    padding: Padding.medium,
    marginBottom: 12,
    ...Shadow.card,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: Border.radius.large,
    backgroundColor: Color.secondary,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Color.secondary,
  },
  imagePlaceholderText: {
    fontSize: 32,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    flex: 1,
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: Color.textPrimary,
    marginRight: 8,
  },
  infoContainer: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: FontSize.size_xs,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
    marginRight: 6,
  },
  infoValue: {
    flex: 1,
    fontSize: FontSize.size_xs,
    fontFamily: FontFamily.medium,
    color: Color.textPrimary,
  },
  warehousesContainer: {
    marginTop: 4,
  },
  warehouseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    paddingLeft: 8,
  },
  warehouseDot: {
    fontSize: FontSize.size_xs,
    color: Color.purpleSoft,
    marginRight: 4,
    fontWeight: '700',
  },
  warehouseName: {
    flex: 1,
    fontSize: FontSize.size_5xs,
    fontFamily: FontFamily.regular,
    color: Color.textPrimary,
  },
  warehouseQuantity: {
    fontSize: FontSize.size_5xs,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
    marginLeft: 4,
  },
  footer: {
    marginTop: 'auto',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Color.secondary,
    borderRadius: Border.radius.medium,
    padding: 8,
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: Color.border,
  },
  statValue: {
    fontSize: FontSize.size_lg,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Color.purpleSoft,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FontSize.size_5xs,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
  },
  createButton: {
    backgroundColor: Color.purpleSoft,
    borderRadius: Border.radius.medium,
    paddingVertical: 8,
    alignItems: 'center',
    ...Shadow.button,
  },
  createButtonPressed: {
    backgroundColor: Color.primary,
    opacity: 0.9,
  },
  createButtonText: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: Color.colorLightMode,
  },
});

