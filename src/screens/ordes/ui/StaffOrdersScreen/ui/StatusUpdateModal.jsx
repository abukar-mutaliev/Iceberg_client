import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { TextInput } from 'react-native';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUS_ICONS, CONSTANTS } from '@entities/order';

export const StatusUpdateModal = ({
    visible,
    selectedOrder,
    availableStatuses,
    selectedStatus,
    statusComment,
    updatingStatus,
    canViewAllOrders,
    onClose,
    onStatusSelect,
    onCommentChange,
    onConfirm
}) => {
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
                            <Icon name="tune" size={24} color="#667eea" />
                            <Text style={styles.modalTitle}>
                                {canViewAllOrders ? 'Изменить статус заказа' : 'Завершить этап обработки'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.modalCloseButton}
                            activeOpacity={0.7}
                        >
                            <Icon name="close" size={24} color="#a0aec0" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        <View style={styles.currentStatusContainer}>
                            <Text style={styles.currentStatusLabel}>Текущий статус:</Text>
                            <Text style={styles.currentStatusText}>
                                {ORDER_STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
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
                                                { backgroundColor: (ORDER_STATUS_COLORS[statusOption.value] || '#667eea') + '20' }
                                            ]}>
                                                <Icon
                                                    name={ORDER_STATUS_ICONS[statusOption.value] || 'help'}
                                                    size={20}
                                                    color={ORDER_STATUS_COLORS[statusOption.value] || '#667eea'}
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
                                            <Icon name="check" size={20} color="#667eea" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.newStatusContainer}>
                                <Text style={styles.newStatusLabel}>Информация:</Text>
                                <View style={styles.infoContainer}>
                                    <Text style={styles.infoText}>
                                        При нажатии "Завершить этап" заказ автоматически перейдет к следующему сотруднику в цепочке обработки.
                                    </Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.commentContainer}>
                            <Text style={styles.commentLabel}>Комментарий (необязательно):</Text>
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Введите комментарий к изменению статуса..."
                                value={statusComment}
                                onChangeText={onCommentChange}
                                multiline
                                numberOfLines={3}
                                maxLength={CONSTANTS.COMMENT_MAX_LENGTH}
                            />
                            <Text style={styles.commentCounter}>
                                {statusComment.length}/{CONSTANTS.COMMENT_MAX_LENGTH}
                            </Text>
                        </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                        {!canViewAllOrders && ['PICKER','PACKER','COURIER'].includes(selectedOrder?.employeeRole) &&
                         CONSTANTS.CANCELLABLE_STATUSES.includes(selectedOrder?.status) && (
                            <TouchableOpacity
                                style={styles.modalDangerButton}
                                onPress={async () => {
                                    // TODO: Implement cancel order logic
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
                                <ActivityIndicator color="#fff" />
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

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
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
        color: '#2d3748',
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
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    currentStatusLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    currentStatusText: {
        fontSize: 16,
        color: '#1a1a1a',
        fontWeight: '600',
    },
    newStatusContainer: {
        marginBottom: 20,
    },
    newStatusLabel: {
        fontSize: 14,
        color: '#1a1a1a',
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
        backgroundColor: '#f8f9ff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    statusOptionSelected: {
        backgroundColor: '#e3f2fd',
        borderColor: '#667eea',
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
        backgroundColor: '#f1f5f9',
    },
    statusOptionText: {
        fontSize: 16,
        color: '#2d3748',
        fontWeight: '500',
        flex: 1,
    },
    statusOptionTextSelected: {
        color: '#667eea',
        fontWeight: '700',
    },
    infoContainer: {
        backgroundColor: '#f0f2ff',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#667eea',
    },
    infoText: {
        fontSize: 14,
        color: '#1a1a1a',
        lineHeight: 20,
    },
    commentContainer: {
        marginBottom: 20,
    },
    commentLabel: {
        fontSize: 14,
        color: '#1a1a1a',
        marginBottom: 8,
        fontWeight: '600',
    },
    commentInput: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#1a1a1a',
        backgroundColor: '#fff',
        textAlignVertical: 'top',
        minHeight: 80,
    },
    commentCounter: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
        marginTop: 4,
    },
    modalActions: {
        flexDirection: 'column',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 12,
    },
    modalConfirmButton: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#667eea',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    modalConfirmButtonText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    modalDangerButton: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#dc3545',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    modalDangerButtonText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    modalCancelButton: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        alignItems: 'center',
        minHeight: 44,
        justifyContent: 'center',
    },
    modalCancelButtonText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    modalButtonDisabled: {
        backgroundColor: '#ccc',
        opacity: 0.6,
    },
});
