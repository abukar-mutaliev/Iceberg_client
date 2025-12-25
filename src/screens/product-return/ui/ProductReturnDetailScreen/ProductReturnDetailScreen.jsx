import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Color, FontFamily, FontSize, Border, Shadow, Padding } from '@app/styles/GlobalStyles';
import { normalize } from '@shared/lib/normalize';
import {
  useProductReturn,
  useReturnPermissions,
  ReturnStatusBadge,
  formatReturnNumber,
  formatDate,
  ProductReturnStatus,
  fetchStagnantProducts,
} from '@entities/product-return';
import { clearProductsCache } from '@entities/product/model/slice';
import { clearProductStocks } from '@entities/warehouse/model/slice';
import { GlobalAlert } from '@shared/ui/CustomAlert';

/**
 * Экран деталей возврата товара
 * Доступен для: ADMIN, EMPLOYEE, SUPPLIER
 */
export const ProductReturnDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { returnId } = route.params || {};

  // Хук для работы с возвратом
  const {
    returnDetail,
    loading,
    error,
    refresh,
    approve,
    reject,
    complete,
    isApproving,
    isRejecting,
    isCompleting,
    isPerformingAction,
  } = useProductReturn(returnId, { autoLoad: true });

  // Проверка прав
  const permissions = useReturnPermissions(returnDetail);

  // Состояние модалок
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Обработчик одобрения
  const handleApprove = useCallback(async () => {
    if (!returnDetail) return;

    const result = await approve(notes || null);
    if (result.success) {
      setShowApproveModal(false);
      setNotes('');
      GlobalAlert.showSuccess('', 'Возврат одобрен');
      refresh();
    } else {
      GlobalAlert.showError('Ошибка', result.error || 'Не удалось одобрить возврат');
    }
  }, [returnDetail, approve, notes, refresh]);

  // Обработчик отклонения
  const handleReject = useCallback(async () => {
    if (!returnDetail || !rejectionReason.trim()) {
      GlobalAlert.showError('Ошибка', 'Укажите причину отклонения');
      return;
    }

    const result = await reject(rejectionReason);
    if (result.success) {
      setShowRejectModal(false);
      setRejectionReason('');
      GlobalAlert.showSuccess('', 'Возврат отклонен');
      refresh();
    } else {
      GlobalAlert.showError('Ошибка', result.error || 'Не удалось отклонить возврат');
    }
  }, [returnDetail, reject, rejectionReason, refresh]);

  // Обработчик завершения
  const handleComplete = useCallback(async () => {
    if (!returnDetail) return;

    GlobalAlert.showConfirm(
      'Подтверждение',
      'Вы уверены, что хотите завершить возврат? Товар будет списан со склада.',
      async () => {
        const result = await complete(notes || null);
        if (result.success) {
          setShowCompleteModal(false);
          setNotes('');
          
          // Очищаем кэш продуктов, чтобы обновились остатки на складах
          dispatch(clearProductsCache());
          
          // Очищаем кэш остатков конкретного продукта
          if (returnDetail?.productId) {
            dispatch(clearProductStocks(returnDetail.productId));
          }
          
          // Обновляем список залежавшихся товаров
          dispatch(fetchStagnantProducts({ forceRefresh: true }));
          
          GlobalAlert.showSuccess('', 'Возврат завершен. Товар списан со склада.');
          refresh();
        } else {
          GlobalAlert.showError('Ошибка', result.error || 'Не удалось завершить возврат');
        }
      }
    );
  }, [returnDetail, complete, notes, refresh, dispatch]);

  // Рендер загрузки
  if (loading && !returnDetail) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Color.purpleSoft} />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Рендер ошибки
  if (error && !returnDetail) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Ошибка загрузки</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Попробовать снова</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!returnDetail) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>Возврат не найден</Text>
          <Pressable style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Вернуться назад</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const returnNumber = formatReturnNumber(returnDetail.id);
  const requestDate = formatDate(returnDetail.requestedAt, true);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Заголовок */}
        <View style={styles.header}>
          <Text style={styles.returnNumber}>{returnNumber}</Text>
          <ReturnStatusBadge status={returnDetail.status} size="medium" />
        </View>

        {/* Изображение товара */}
        {returnDetail.product?.image && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: returnDetail.product.image }}
              style={styles.productImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Информация о товаре */}
        <InfoCard title="Товар">
          <InfoRow label="Название" value={returnDetail.product?.name || 'Не указано'} />
          <InfoRow
            label="Количество коробок"
            value={`${returnDetail.quantity} шт.`}
            highlight
          />
          {returnDetail.daysSinceLastSale !== null && (
            <InfoRow
              label="Дней без продаж"
              value={`${returnDetail.daysSinceLastSale} дней`}
            />
          )}
        </InfoCard>

        {/* Информация о поставщике */}
        {returnDetail.supplier && (
          <InfoCard title="Поставщик">
            <InfoRow
              label="Компания"
              value={returnDetail.supplier.companyName}
            />
            {returnDetail.supplier.contactPerson && (
              <InfoRow
                label="Контактное лицо"
                value={returnDetail.supplier.contactPerson}
              />
            )}
            {returnDetail.supplier.phone && (
              <InfoRow label="Телефон" value={returnDetail.supplier.phone} />
            )}
          </InfoCard>
        )}

        {/* Информация о складе */}
        {returnDetail.warehouse && (
          <InfoCard title="Склад">
            <InfoRow label="Название" value={returnDetail.warehouse.name} />
            {returnDetail.warehouse.address && (
              <InfoRow label="Адрес" value={returnDetail.warehouse.address} />
            )}
            {returnDetail.warehouse.district?.name && (
              <InfoRow
                label="Район"
                value={returnDetail.warehouse.district.name}
              />
            )}
          </InfoCard>
        )}

        {/* Причина возврата */}
        <InfoCard title="Причина возврата">
          <Text style={styles.reasonText}>{returnDetail.reason}</Text>
        </InfoCard>

        {/* Дополнительная информация */}
        <InfoCard title="История">
          <InfoRow label="Запрошен" value={requestDate} />
          {returnDetail.approvedAt && (
            <InfoRow
              label="Одобрен"
              value={formatDate(returnDetail.approvedAt, true)}
            />
          )}
          {returnDetail.completedAt && (
            <InfoRow
              label="Завершен"
              value={formatDate(returnDetail.completedAt, true)}
            />
          )}
          {returnDetail.rejectedAt && (
            <InfoRow
              label="Отклонен"
              value={formatDate(returnDetail.rejectedAt, true)}
            />
          )}
        </InfoCard>

        {/* Причина отклонения */}
        {returnDetail.rejectionReason && (
          <InfoCard title="Причина отклонения">
            <Text style={styles.rejectionText}>
              {returnDetail.rejectionReason}
            </Text>
          </InfoCard>
        )}

        {/* Заметки */}
        {returnDetail.notes && (
          <InfoCard title="Заметки">
            <Text style={styles.notesText}>{returnDetail.notes}</Text>
          </InfoCard>
        )}

        {/* Кнопки действий */}
        {permissions.hasAnyActionPermission && (
          <View style={styles.actionsContainer}>
            {permissions.canApprove && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.approveButton,
                  pressed && styles.actionButtonPressed,
                  isApproving && styles.actionButtonDisabled,
                ]}
                onPress={() => setShowApproveModal(true)}
                disabled={isApproving || isPerformingAction}
              >
                <Text style={styles.actionButtonText}>
                  {isApproving ? 'Одобрение...' : '✓ Одобрить'}
                </Text>
              </Pressable>
            )}
            {permissions.canReject && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.rejectButton,
                  pressed && styles.actionButtonPressed,
                  isRejecting && styles.actionButtonDisabled,
                ]}
                onPress={() => setShowRejectModal(true)}
                disabled={isRejecting || isPerformingAction}
              >
                <Text style={styles.actionButtonText}>
                  {isRejecting ? 'Отклонение...' : '✕ Отклонить'}
                </Text>
              </Pressable>
            )}
            {permissions.canComplete && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.completeButton,
                  pressed && styles.actionButtonPressed,
                  isCompleting && styles.actionButtonDisabled,
                ]}
                onPress={() => setShowCompleteModal(true)}
                disabled={isCompleting || isPerformingAction}
              >
                <Text style={styles.actionButtonText}>
                  {isCompleting ? 'Завершение...' : '✓ Завершить'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {/* Модалка одобрения */}
      <ActionModal
        visible={showApproveModal}
        title="Одобрить возврат"
        onClose={() => setShowApproveModal(false)}
        onConfirm={handleApprove}
        confirmText="Одобрить"
        loading={isApproving}
      >
        <Text style={styles.modalDescription}>
          Вы уверены, что хотите одобрить этот возврат?
        </Text>
        <TextInput
          style={styles.modalInput}
          placeholder="Заметки (необязательно)"
          placeholderTextColor={Color.textSecondary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </ActionModal>

      {/* Модалка отклонения */}
      <ActionModal
        visible={showRejectModal}
        title="Отклонить возврат"
        onClose={() => setShowRejectModal(false)}
        onConfirm={handleReject}
        confirmText="Отклонить"
        loading={isRejecting}
        danger
      >
        <Text style={styles.modalDescription}>
          Укажите причину отклонения возврата:
        </Text>
        <TextInput
          style={styles.modalInput}
          placeholder="Причина отклонения *"
          placeholderTextColor={Color.textSecondary}
          value={rejectionReason}
          onChangeText={setRejectionReason}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </ActionModal>

      {/* Модалка завершения */}
      <ActionModal
        visible={showCompleteModal}
        title="Завершить возврат"
        onClose={() => setShowCompleteModal(false)}
        onConfirm={handleComplete}
        confirmText="Завершить"
        loading={isCompleting}
      >
        <Text style={styles.modalDescription}>
          Подтвердите завершение возврата. Товар будет списан со склада.
        </Text>
        <TextInput
          style={styles.modalInput}
          placeholder="Заметки (необязательно)"
          placeholderTextColor={Color.textSecondary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </ActionModal>
    </SafeAreaView>
  );
};

/**
 * Компонент информационной карточки
 */
const InfoCard = ({ title, children }) => (
  <View style={styles.infoCard}>
    <Text style={styles.infoCardTitle}>{title}</Text>
    <View style={styles.infoCardContent}>{children}</View>
  </View>
);

/**
 * Компонент строки информации
 */
const InfoRow = ({ label, value, highlight }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>
      {value}
    </Text>
  </View>
);

/**
 * Компонент модального окна для действий
 */
const ActionModal = ({
  visible,
  title,
  onClose,
  onConfirm,
  confirmText,
  loading,
  danger,
  children,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
        <Text style={styles.modalTitle}>{title}</Text>
        {children}
        <View style={styles.modalActions}>
          <Pressable
            style={[styles.modalButton, styles.modalButtonCancel]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.modalButtonTextCancel}>Отмена</Text>
          </Pressable>
          <Pressable
            style={[
              styles.modalButton,
              danger ? styles.modalButtonDanger : styles.modalButtonPrimary,
              loading && styles.modalButtonDisabled,
            ]}
            onPress={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Color.colorLightMode} />
            ) : (
              <Text style={styles.modalButtonTextPrimary}>{confirmText}</Text>
            )}
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  scrollContent: {
    padding: Padding.medium,
    paddingBottom: Padding.large * 2,
  },

  // Заголовок
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Padding.medium,
  },
  returnNumber: {
    fontSize: FontSize.xxxlarge,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Color.purpleSoft,
  },

  // Изображение
  imageContainer: {
    alignItems: 'center',
    marginBottom: Padding.medium,
  },
  productImage: {
    width: normalize(200),
    height: normalize(200),
    borderRadius: Border.br_base,
    backgroundColor: Color.secondary,
  },

  // Информационные карточки
  infoCard: {
    backgroundColor: Color.colorLightMode,
    borderRadius: Border.br_base,
    padding: Padding.medium,
    marginBottom: 12,
    ...Shadow.card,
  },
  infoCardTitle: {
    fontSize: FontSize.size_lg,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Color.textPrimary,
    marginBottom: Padding.small,
  },
  infoCardContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: Color.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  infoValueHighlight: {
    color: Color.purpleSoft,
    fontSize: FontSize.size_md,
    fontWeight: '700',
  },
  reasonText: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.regular,
    color: Color.textPrimary,
    lineHeight: 20,
  },
  rejectionText: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: Color.error,
    lineHeight: 20,
  },
  notesText: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Действия
  actionsContainer: {
    gap: 12,
    marginTop: Padding.medium,
  },
  actionButton: {
    borderRadius: Border.radius.medium,
    paddingVertical: 14,
    alignItems: 'center',
    ...Shadow.button,
  },
  approveButton: {
    backgroundColor: Color.success,
  },
  rejectButton: {
    backgroundColor: Color.error,
  },
  completeButton: {
    backgroundColor: Color.purpleSoft,
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Color.colorLightMode,
  },

  // Модалка
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Padding.large,
  },
  modalContent: {
    backgroundColor: Color.colorLightMode,
    borderRadius: Border.br_base,
    padding: Padding.large,
    width: '100%',
    maxWidth: 400,
    ...Shadow.heavy,
  },
  modalTitle: {
    fontSize: FontSize.size_xl,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Color.textPrimary,
    marginBottom: Padding.medium,
  },
  modalDescription: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
    marginBottom: Padding.medium,
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: Color.secondary,
    borderRadius: Border.radius.medium,
    padding: Padding.small,
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.regular,
    color: Color.textPrimary,
    marginBottom: Padding.medium,
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: Border.radius.medium,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Color.secondary,
  },
  modalButtonPrimary: {
    backgroundColor: Color.purpleSoft,
    ...Shadow.button,
  },
  modalButtonDanger: {
    backgroundColor: Color.error,
    ...Shadow.button,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonTextCancel: {
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: Color.textPrimary,
  },
  modalButtonTextPrimary: {
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Color.colorLightMode,
  },

  // Загрузка и ошибка
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Padding.medium,
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Padding.large,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: Padding.medium,
  },
  errorTitle: {
    fontSize: FontSize.size_lg,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Color.textPrimary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
    textAlign: 'center',
    marginBottom: Padding.large,
  },
  retryButton: {
    backgroundColor: Color.purpleSoft,
    borderRadius: Border.radius.medium,
    paddingVertical: 12,
    paddingHorizontal: 24,
    ...Shadow.button,
  },
  retryButtonText: {
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: Color.colorLightMode,
  },
});

