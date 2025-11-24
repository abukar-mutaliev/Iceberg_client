import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Color } from "@/styles/GlobalStyles";
import { selectCurrentUserRole } from '@entities/auth';
import { processReward } from '@entities/reward/model/slice';

const StatusColors = {
    PENDING: {
        background: '#FFF4E6',
        border: '#FFD0A6',
        text: '#B8620E'
    },
    APPROVED: {
        background: '#E8F5E8',
        border: '#A8D4A8',
        text: '#2E7D32'
    },
    PAID: {
        background: '#E3F2FD',
        border: '#90CAF9',
        text: '#1565C0'
    },
    CANCELLED: {
        background: '#FFEBEE',
        border: '#FFCDD2',
        text: '#C62828'
    }
};

const StatusLabels = {
    PENDING: 'Ожидание',
    APPROVED: 'Одобрено',
    PAID: 'Выплачено',
    CANCELLED: 'Отменено'
};

const RewardTypeLabels = {
    ORDER_COMPLETION: 'За заказ',
    BONUS: 'Бонус',
    PENALTY: 'Штраф'
};

export const RewardCard = ({ reward, showDetails = false, showEmployee = false, style }) => {
    const dispatch = useDispatch();
    const userRole = useSelector(selectCurrentUserRole);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedAction, setSelectedAction] = useState(null);
    const [comment, setComment] = useState('');
    const [processing, setProcessing] = useState(false);
    
    const statusColor = StatusColors[reward.status] || StatusColors.PENDING;
    const isNegative = reward.amount < 0;
    const isAdmin = userRole === 'ADMIN';
    const canProcess = isAdmin && reward.status === 'PENDING';

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const months = [
            'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
            'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
        ];

        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${day} ${month} ${year}, ${hours}:${minutes}`;
    };

    const formatAmount = (amount) => {
        const formatted = Math.abs(amount).toFixed(0);
        return isNegative ? `-${formatted}` : `+${formatted}`;
    };

    const handleActionPress = (action) => {
        setSelectedAction(action);
        setComment('');
        setModalVisible(true);
    };

    const handleConfirmAction = async () => {
        if (!selectedAction) return;
        
        setProcessing(true);
        try {
            await dispatch(processReward({
                id: reward.id,
                status: selectedAction,
                comment: comment.trim() || undefined
            })).unwrap();
            
            setModalVisible(false);
            Alert.alert(
                'Готово',
                `Вознаграждение ${selectedAction === 'APPROVED' ? 'одобрено' : selectedAction === 'PAID' ? 'помечено как выплаченное' : 'отклонено'}`
            );
        } catch (error) {
            Alert.alert('Ошибка', error);
        } finally {
            setProcessing(false);
        }
    };

    const getActionTitle = () => {
        switch (selectedAction) {
            case 'APPROVED': return 'Одобрить вознаграждение';
            case 'PAID': return 'Отметить как выплаченное';
            case 'CANCELLED': return 'Отклонить вознаграждение';
            default: return 'Обработать вознаграждение';
        }
    };

    return (
        <>
            <View style={[styles.container, style]}>
                <View style={styles.header}>
                    <View style={styles.typeContainer}>
                        <Text style={styles.typeText}>
                            {RewardTypeLabels[reward.rewardSettings?.rewardType] || 'Неизвестно'}
                        </Text>
                        {reward.order && (
                            <Text style={styles.orderText}>#{reward.order.orderNumber}</Text>
                        )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor.background, borderColor: statusColor.border }]}>
                        <Text style={[styles.statusText, { color: statusColor.text }]}>
                            {StatusLabels[reward.status]}
                        </Text>
                    </View>
                </View>

                {/* Информация о сотруднике - показывается только в режиме администратора */}
                {showEmployee && reward.employee && (
                    <View style={styles.employeeContainer}>
                        <View style={styles.employeeInfo}>
                            <Text style={styles.employeeName}>👤 {reward.employee.name}</Text>
                            <Text style={styles.employeePosition}>{reward.employee.position}</Text>
                            {reward.employee.warehouse && (
                                <Text style={styles.employeeWarehouse}>
                                    🏢 {reward.employee.warehouse.name}
                                    {reward.employee.warehouse.district && ` (${reward.employee.warehouse.district.name})`}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                <View style={styles.amountContainer}>
                    <Text style={[styles.amountText, isNegative && styles.negativeAmount]}>
                        {formatAmount(reward.amount)} ₽
                    </Text>
                    <Text style={styles.dateText}>{formatDate(reward.createdAt)}</Text>
                </View>

                {showDetails && reward.description && (
                    <View style={styles.descriptionContainer}>
                        <Text style={styles.descriptionText}>{reward.description}</Text>
                    </View>
                )}

                {canProcess && (
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.approveButton]}
                            onPress={() => handleActionPress('APPROVED')}
                        >
                            <Text style={styles.actionButtonText}>✓ Одобрить</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.paidButton]}
                            onPress={() => handleActionPress('PAID')}
                        >
                            <Text style={styles.actionButtonText}>💰 Выплатить</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => handleActionPress('CANCELLED')}
                        >
                            <Text style={styles.actionButtonText}>✗ Отклонить</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Модальное окно подтверждения */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{getActionTitle()}</Text>
                        
                        <View style={styles.rewardInfo}>
                            <Text style={styles.rewardInfoText}>
                                Сумма: {formatAmount(reward.amount)} ₽
                            </Text>
                            <Text style={styles.rewardInfoText}>
                                Тип: {RewardTypeLabels[reward.rewardSettings?.rewardType] || 'Неизвестно'}
                            </Text>
                            {showEmployee && reward.employee && (
                                <>
                                    <Text style={styles.rewardInfoText}>
                                        Сотрудник: {reward.employee.name}
                                    </Text>
                                    <Text style={styles.rewardInfoText}>
                                        Должность: {reward.employee.position}
                                    </Text>
                                    {reward.employee.warehouse && (
                                        <Text style={styles.rewardInfoText}>
                                            Склад: {reward.employee.warehouse.name}
                                        </Text>
                                    )}
                                </>
                            )}
                        </View>

                        <Text style={styles.commentLabel}>Комментарий (необязательно):</Text>
                        <TextInput
                            style={styles.commentInput}
                            value={comment}
                            onChangeText={setComment}
                            placeholder="Добавить комментарий..."
                            multiline
                            maxLength={500}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                                disabled={processing}
                            >
                                <Text style={styles.cancelButtonText}>Отмена</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={handleConfirmAction}
                                disabled={processing}
                            >
                                {processing ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.confirmButtonText}>Подтвердить</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    typeContainer: {
        flex: 1,
    },
    typeText: {
        fontSize: 16,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: 2,
    },
    orderText: {
        fontSize: 14,
        color: Color.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    employeeContainer: {
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
        marginBottom: 12,
    },
    employeeInfo: {
        flexDirection: 'column',
    },
    employeeName: {
        fontSize: 16,
        fontWeight: '700',
        color: Color.textPrimary,
        marginBottom: 2,
    },
    employeePosition: {
        fontSize: 14,
        color: Color.textSecondary,
        marginBottom: 2,
    },
    employeeWarehouse: {
        fontSize: 14,
        color: Color.textSecondary,
    },
    amountContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    amountText: {
        fontSize: 20,
        fontWeight: '700',
        color: Color.primary,
    },
    negativeAmount: {
        color: '#e74c3c',
    },
    dateText: {
        fontSize: 14,
        color: Color.textSecondary,
    },
    descriptionContainer: {
        marginTop: 8,
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    descriptionText: {
        fontSize: 14,
        color: Color.textSecondary,
        lineHeight: 20,
    },
    actionsContainer: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    approveButton: {
        backgroundColor: '#d4edda',
        borderColor: '#c3e6cb',
        borderWidth: 1,
    },
    paidButton: {
        backgroundColor: '#cce5ff',
        borderColor: '#99d6ff',
        borderWidth: 1,
    },
    rejectButton: {
        backgroundColor: '#f8d7da',
        borderColor: '#f5c6cb',
        borderWidth: 1,
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Color.textPrimary,
        textAlign: 'center',
        marginBottom: 16,
    },
    rewardInfo: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    rewardInfoText: {
        fontSize: 14,
        color: Color.textSecondary,
        marginBottom: 4,
    },
    commentLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: 8,
    },
    commentInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    confirmButton: {
        backgroundColor: Color.primary,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Color.textSecondary,
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});

export default RewardCard;