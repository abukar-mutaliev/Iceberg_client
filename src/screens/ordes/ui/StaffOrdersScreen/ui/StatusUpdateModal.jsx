import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { TextInput } from 'react-native';
import { ORDER_STATUS_COLORS, ORDER_STATUS_ICONS, CONSTANTS, getStageCompletionHint, getStatusLabel } from '@entities/order';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { useOrderDetailsScreenBackground } from '@shared/ui/OrderDetailsStyles';

const ON_PRIMARY_COLOR = '#FFFFFF';

export const StatusUpdateModal = ({
    visible,
    selectedOrder,
    availableStatuses,
    selectedStatus,
    statusComment,
    updatingStatus,
    canViewAllOrders,
    employeeProcessingRole,
    onClose,
    onStatusSelect,
    onCommentChange,
    onConfirm
}) => {
    const { colors, isDark } = useTheme();
    const screenBackground = useOrderDetailsScreenBackground();
    const styles = useMemo(
        () => createStyles(colors, isDark, screenBackground),
        [colors, isDark, screenBackground]
    );
    const headerIconColor = isDark ? ON_PRIMARY_COLOR : colors.primary;
    const closeIconColor = isDark ? 'rgba(255, 255, 255, 0.75)' : colors.textTertiary;
    const selectedCheckColor = isDark ? ON_PRIMARY_COLOR : colors.primary;
    const statusAccentColor = isDark ? screenBackground : colors.primary;

    if (!selectedOrder) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View style={styles.modalTitleContainer}>
                            <Icon name="tune" size={24} color={headerIconColor} />
                            <Text style={styles.modalTitle}>
                                {canViewAllOrders ? 'Изменить статус заказа' : 'Завершить этап обработки'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.modalCloseButton}
                            activeOpacity={0.7}
                        >
                            <Icon name="close" size={24} color={closeIconColor} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        <View style={styles.currentStatusContainer}>
                            <Text style={styles.currentStatusLabel}>Текущий статус:</Text>
                            <Text style={styles.currentStatusText}>
                                {getStatusLabel(selectedOrder.status)}
                            </Text>
                        </View>

                        {canViewAllOrders ? (
                            <View style={styles.newStatusContainer}>
                                <Text style={styles.newStatusLabel}>Новый статус:</Text>
                                {availableStatuses.map((statusOption) => (
                                    <TouchableOpacity
                                        key={statusOption.value}
                                        style={[
                                            styles.statusOption,
                                            selectedStatus === statusOption.value && styles.statusOptionSelected
                                        ]}
                                        onPress={() => onStatusSelect(statusOption.value)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.statusOptionContent}>
                                            <View style={[
                                                styles.statusIconContainer,
                                                { backgroundColor: (ORDER_STATUS_COLORS[statusOption.value] || statusAccentColor) + '20' }
                                            ]}>
                                                <Icon
                                                    name={ORDER_STATUS_ICONS[statusOption.value] || 'help'}
                                                    size={20}
                                                    color={ORDER_STATUS_COLORS[statusOption.value] || statusAccentColor}
                                                />
                                            </View>
                                            <Text style={[
                                                styles.statusOptionText,
                                                selectedStatus === statusOption.value && styles.statusOptionTextSelected
                                            ]}>
                                                {statusOption.label}
                                            </Text>
                                        </View>
                                        {selectedStatus === statusOption.value && (
                                            <Icon name="check" size={20} color={selectedCheckColor} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.newStatusContainer}>
                                <Text style={styles.newStatusLabel}>Следующий этап:</Text>
                                <View style={styles.infoContainer}>
                                    <Text style={styles.infoText}>
                                        {getStageCompletionHint(employeeProcessingRole, selectedOrder.status)}
                                    </Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.commentContainer}>
                            <Text style={styles.commentLabel}>Комментарий (необязательно):</Text>
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Введите комментарий к изменению статуса..."
                                placeholderTextColor={colors.textTertiary}
                                value={statusComment}
                                onChangeText={onCommentChange}
                                multiline
                                numberOfLines={3}
                                maxLength={CONSTANTS.COMMENT_MAX_LENGTH}
                                keyboardAppearance={colors.keyboardAppearance}
                                selectionColor={statusAccentColor}
                            />
                            <Text style={styles.commentCounter}>
                                {statusComment.length}/{CONSTANTS.COMMENT_MAX_LENGTH}
                            </Text>
                        </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                        {!canViewAllOrders && ['PICKER', 'COURIER'].includes(employeeProcessingRole) &&
                         CONSTANTS.CANCELLABLE_STATUSES.includes(selectedOrder?.status) && (
                            <TouchableOpacity
                                style={styles.modalDangerButton}
                                onPress={async () => {
                                    onClose();
                                }}
                                disabled={updatingStatus}
                            >
                                <Text style={styles.modalDangerButtonText}>Отменить заказ</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.modalConfirmButton,
                                (canViewAllOrders && !selectedStatus || updatingStatus) && styles.modalButtonDisabled
                            ]}
                            onPress={onConfirm}
                            disabled={(canViewAllOrders && !selectedStatus) || updatingStatus}
                        >
                            {updatingStatus ? (
                                <ActivityIndicator color={ON_PRIMARY_COLOR} />
                            ) : (
                                <Text style={styles.modalConfirmButtonText}>
                                    {canViewAllOrders ? 'Изменить статус' : 'Завершить этап'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalCancelButton}
                            onPress={onClose}
                            disabled={updatingStatus}
                        >
                            <Text style={styles.modalCancelButtonText}>Отмена</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const createStyles = (colors, isDark, screenBackground) => {
    const headerBackground = isDark ? screenBackground : colors.cardBackground;
    const headerBorderColor = isDark ? 'rgba(255, 255, 255, 0.15)' : colors.border;
    const accentColor = isDark ? screenBackground : colors.primary;
    const selectedOptionBackground = isDark ? screenBackground : (colors.primarySoft || (colors.primary + '14'));
    const selectedOptionBorder = isDark ? screenBackground : colors.primary;
    const infoBackground = isDark ? 'rgba(255, 255, 255, 0.1)' : (colors.primarySoft || (colors.primary + '14'));
    const infoBorderColor = isDark ? ON_PRIMARY_COLOR : colors.primary;

    return StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.65)' : (colors.overlay || 'rgba(0, 0, 0, 0.5)'),
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.cardBackground,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: isDark ? 0.35 : 0.1,
        shadowRadius: 12,
        elevation: 20,
        borderWidth: isDark ? 1 : 0,
        borderColor: colors.border,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        backgroundColor: headerBackground,
        borderBottomWidth: 1,
        borderBottomColor: headerBorderColor,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    modalTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: isDark ? ON_PRIMARY_COLOR : colors.textPrimary,
    },
    modalCloseButton: {
        padding: 4,
    },
    modalBody: {
        maxHeight: 520,
        padding: 20,
    },
    currentStatusContainer: {
        marginBottom: 20,
        padding: 12,
        backgroundColor: isDark ? colors.surfaceElevated || colors.surface : colors.surface,
        borderRadius: 8,
        borderWidth: isDark ? 1 : 0,
        borderColor: colors.border,
    },
    currentStatusLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    currentStatusText: {
        fontSize: 16,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    newStatusContainer: {
        marginBottom: 20,
    },
    newStatusLabel: {
        fontSize: 14,
        color: colors.textPrimary,
        marginBottom: 12,
        fontWeight: '600',
    },
    statusOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginBottom: 8,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statusOptionSelected: {
        backgroundColor: selectedOptionBackground,
        borderColor: selectedOptionBorder,
    },
    statusOptionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    statusIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surfaceSecondary || colors.surface,
    },
    statusOptionText: {
        fontSize: 16,
        color: colors.textPrimary,
        fontWeight: '500',
        flex: 1,
    },
    statusOptionTextSelected: {
        color: isDark ? ON_PRIMARY_COLOR : colors.primary,
        fontWeight: '700',
    },
    infoContainer: {
        backgroundColor: infoBackground,
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: infoBorderColor,
    },
    infoText: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    commentContainer: {
        marginBottom: 20,
    },
    commentLabel: {
        fontSize: 14,
        color: colors.textPrimary,
        marginBottom: 8,
        fontWeight: '600',
    },
    commentInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: colors.textPrimary,
        backgroundColor: isDark ? colors.surfaceElevated || colors.surface : colors.surface,
        textAlignVertical: 'top',
        minHeight: 80,
    },
    commentCounter: {
        fontSize: 12,
        color: colors.textTertiary,
        textAlign: 'right',
        marginTop: 4,
    },
    modalActions: {
        flexDirection: 'column',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 12,
    },
    modalConfirmButton: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: accentColor,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    modalConfirmButtonText: {
        fontSize: 14,
        color: ON_PRIMARY_COLOR,
        fontWeight: '600',
    },
    modalDangerButton: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: colors.error,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    modalDangerButtonText: {
        fontSize: 14,
        color: colors.textInverse,
        fontWeight: '600',
    },
    modalCancelButton: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: isDark ? 'transparent' : colors.surface,
        borderWidth: 1,
        borderColor: isDark ? ON_PRIMARY_COLOR : colors.border,
        alignItems: 'center',
        minHeight: 44,
        justifyContent: 'center',
    },
    modalCancelButtonText: {
        fontSize: 14,
        color: isDark ? ON_PRIMARY_COLOR : colors.textSecondary,
        fontWeight: '600',
    },
    modalButtonDisabled: {
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : (colors.surfaceSecondary || colors.border),
        opacity: 0.6,
    },
});
};
