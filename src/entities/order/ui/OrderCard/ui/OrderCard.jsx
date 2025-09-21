import React, { useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { OrderApi } from '@entities/order/api/orderApi';
import { formatAmount, formatOrderNumber, isPriorityOrder } from "@entities/order/lib/utils";
import { PROCESSING_STAGE_LABELS, PROCESSING_STAGE_COLORS, PROCESSING_STAGE_ICONS  } from "@entities/order/lib/constants";

const { width } = Dimensions.get('window');

// Функция для правильного склонения слова "коробка"
const getBoxesText = (count) => {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'коробка';
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return 'коробки';
    } else {
        return 'коробок';
    }
};

const ORDER_STATUS_COLORS = {
    PENDING: '#FFA726',
    CONFIRMED: '#42A5F5',
    IN_DELIVERY: '#5C6BC0',
    DELIVERED: '#66BB6A',
    CANCELLED: '#EF5350',
    RETURNED: '#78909C'
};

const ORDER_STATUS_ICONS = {
    PENDING: 'schedule',
    CONFIRMED: 'check-circle',
    IN_DELIVERY: 'local-shipping',
    DELIVERED: 'done-all',
    CANCELLED: 'cancel',
    RETURNED: 'undo'
};

const getOrderProgress = (status) => {
    const progressMap = {
        PENDING: 25,
        CONFIRMED: 50,
        IN_DELIVERY: 75,
        DELIVERED: 100,
        CANCELLED: 0,
        RETURNED: 0
    };
    return progressMap[status] || 0;
};

/**
 * Карточка заказа для отображения в списках
 * @param {Object} props
 * @param {Object} props.order - Данные заказа
 * @param {Function} props.onPress - Обработчик нажатия на карточку
 * @param {boolean} props.showClient - Показывать ли информацию о клиенте (для персонала)
 * @param {boolean} props.showActions - Показывать ли кнопки действий
 * @param {Function} props.onStatusUpdate - Обработчик изменения статуса
 * @param {Function} props.onDownloadInvoice - Обработчик скачивания накладной
 * @param {Function} props.onTakeOrder - Обработчик "взять в работу"
 * @param {Function} props.onReleaseOrder - Обработчик "снять назначение"
 * @param {boolean} props.canTake - Можно ли брать в работу (нет назначения)
 * @param {boolean} props.isTakenByMe - Назначено на текущего сотрудника
 * @param {boolean} props.downloadingInvoice - Флаг загрузки накладной
 * @param {Object} props.style - Дополнительные стили
 * @param {boolean} props.showProcessingInfo - Показывать ли информацию об обработке
 * @param {Object} props.processingStage - Данные этапа обработки
 */
export const OrderCard = ({
                              order,
                              onPress,
                              showClient = false,
                              showActions = false,
                              onStatusUpdate,

                              onDownloadInvoice,
                              onTakeOrder,
                              onReleaseOrder,
                              canTake = true,
                              isTakenByMe = false,
                              downloadingInvoice = false,
                              style,
                              showProcessingInfo = false,
                              processingStage = null,
                              showEmployeeInfo = false,
                              showStatusHistory = false,
                              showProcessingHistory = false,
                              isRecentlyProcessed = false,
                              isHistoryOrder = false
                          }) => {
    if (!order) return null;

    const isPriority = isPriorityOrder(order);
    const formattedNumber = formatOrderNumber(order.orderNumber);
    const formattedAmount = formatAmount(order.totalAmount);
    const statusColor = ORDER_STATUS_COLORS[order.status];
    const statusIcon = ORDER_STATUS_ICONS[order.status];
    const progress = getOrderProgress(order.status);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return 'Сегодня';
        } else if (diffDays === 2) {
            return 'Вчера';
        } else if (diffDays <= 7) {
            return `${diffDays - 1} дн. назад`;
        } else {
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
    };

    const getFirstProductImage = () => {
        if (order.orderItems && order.orderItems.length > 0) {
            const firstItem = order.orderItems[0];
            if (firstItem.product && firstItem.product.images && firstItem.product.images.length > 0) {
                return firstItem.product.images[0];
            }
        }
        return null;
    };

    const renderClientInfo = () => {
        if (!showClient || !order.client) return null;

        return (
            <View style={styles.clientInfo}>
                <Icon name="person" size={16} color="#666" />
                <Text style={styles.clientName}>{order.client.name}</Text>
                {order.client.phone && (
                    <Text style={styles.clientPhone}>{order.client.phone}</Text>
                )}
            </View>
        );
    };

    const renderOrderItems = () => {
        if (!order.orderItems || order.orderItems.length === 0) return null;

        const totalItems = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);

        return (
            <View style={styles.orderItems}>
                {order.orderItems.slice(0, 2).map((item, index) => (
                    <View key={index} style={styles.itemInfo}>
                        <Text style={styles.itemName}>
                            {item.product?.name || 'Товар'}
                        </Text>
                        <Text style={styles.itemQuantity}>
                            {item.quantity} {getBoxesText(item.quantity)}
                        </Text>
                    </View>
                ))}
                {order.orderItems.length > 2 && (
                    <Text style={styles.additionalItems}>
                        +{order.orderItems.length - 2} товар(ов)
                    </Text>
                )}
            </View>
        );
    };

    const renderProcessingInfo = () => {
        if (!showProcessingInfo || !processingStage) return null;

        const stageLabel = PROCESSING_STAGE_LABELS[processingStage.stage];
        const stageColor = PROCESSING_STAGE_COLORS[processingStage.stage];
        const stageIcon = PROCESSING_STAGE_ICONS[processingStage.stage];

        return (
            <View style={styles.processingInfo}>
                <View style={styles.processingHeader}>
                    <Text style={styles.processingIcon}>{stageIcon}</Text>
                    <Text style={[styles.processingStage, { color: stageColor }]}>
                        {stageLabel}
                    </Text>
                </View>
                
                {processingStage.assignedTo && (
                    <View style={styles.assignedInfo}>
                        <Icon name="person" size={14} color="#666" />
                        <Text style={styles.assignedText}>
                            Назначен: {processingStage.employee?.user?.name || 'Неизвестно'}
                        </Text>
                    </View>
                )}
                
                {processingStage.startedAt && (
                    <View style={styles.timeInfo}>
                        <Icon name="schedule" size={14} color="#666" />
                        <Text style={styles.timeText}>
                            Начало: {new Date(processingStage.startedAt).toLocaleTimeString()}
                        </Text>
                    </View>
                )}
                
                {processingStage.isDelayed && (
                    <View style={styles.delayInfo}>
                        <Icon name="warning" size={14} color="#dc3545" />
                        <Text style={styles.delayText}>Задержка</Text>
                    </View>
                )}
            </View>
        );
    };

    const renderEmployeeInfo = () => {
        // Показываем информацию о назначенном сотруднике
        if (!order.assignedTo) return null;

        return (
            <View style={styles.employeeInfo}>
                <View style={styles.employeeHeader}>
                    <Icon name="person" size={16} color="#667eea" />
                    <Text style={styles.employeeTitle}>Текущий ответственный</Text>
                </View>
                <View style={styles.employeeDetails}>
                    <Text style={styles.employeeName}>{order.assignedTo.name}</Text>
                    {order.assignedTo.position && (
                        <Text style={styles.employeePosition}>{order.assignedTo.position}</Text>
                    )}
                </View>
            </View>
        );
    };

    const renderStatusHistory = () => {
        // Показываем последние изменения статуса с информацией о сотруднике
        if (!order.statusHistory || order.statusHistory.length === 0) return null;

        const lastStatusChange = order.statusHistory[0]; // Самый последний
        if (!lastStatusChange) return null;

        return (
            <View style={styles.statusHistory}>
                <View style={styles.historyHeader}>
                    <Icon name="history" size={16} color="#666" />
                    <Text style={styles.historyTitle}>Последнее изменение</Text>
                </View>
                <View style={styles.historyDetails}>
                    <Text style={styles.historyStatus}>
                        {OrderApi.getStatusLabel(lastStatusChange.status)}
                    </Text>
                    <Text style={styles.historyDate}>
                        {new Date(lastStatusChange.createdAt).toLocaleString()}
                    </Text>
                    {lastStatusChange.comment && (
                        <Text style={styles.historyComment}>
                            {lastStatusChange.comment}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    // Функция для анализа истории статусов и извлечения информации о сотрудниках
    const getProcessingHistory = useCallback(() => {
        if (!order.statusHistory || order.statusHistory.length === 0) return [];

        const processingSteps = [];
        const statusOrder = ['PENDING', 'CONFIRMED', 'IN_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'];
        
        // Анализируем каждый статус в истории
        order.statusHistory.forEach((historyItem, index) => {
            const { status, comment, createdAt } = historyItem;
            
            // Определяем роль сотрудника по статусу
            let role = '';
            let roleLabel = '';
            
            switch (status) {
                case 'CONFIRMED':
                    role = 'PICKER';
                    roleLabel = 'Сборщик';
                    break;
                case 'IN_DELIVERY':
                    role = 'PACKER';
                    roleLabel = 'Упаковщик';
                    break;
                case 'DELIVERED':
                    role = 'COURIER';
                    roleLabel = 'Курьер';
                    break;
                case 'CANCELLED':
                    role = 'MANAGER';
                    roleLabel = 'Менеджер';
                    break;
                case 'RETURNED':
                    role = 'COURIER';
                    roleLabel = 'Курьер';
                    break;
                default:
                    role = 'UNKNOWN';
                    roleLabel = 'Сотрудник';
            }

            // Извлекаем информацию о сотруднике из комментария
            let employeeName = '';
            let employeePosition = '';
            
            if (comment) {
                // Ищем паттерны в комментариях для извлечения информации о сотрудниках
                const patterns = [
                    /обработано сотрудником (.+?) \((.+?)\)/i,
                    /назначен сотруднику (.+?) \((.+?)\)/i,
                    /назначен сотруднику (.+?)/i,
                    /принят сотрудником (.+?) на склад/i,
                    /автоматически назначен сотруднику (.+?) \((.+?)\)/i,
                    /заказ переназначен сотруднику (.+?) \((.+?)\)/i,
                    /(.+?) \((.+?)\)/i,
                    /(.+?)/i
                ];
                
                for (const pattern of patterns) {
                    const match = comment.match(pattern);
                    if (match) {
                        if (match[2]) {
                            employeeName = match[1].trim();
                            employeePosition = match[2].trim();
                        } else {
                            employeeName = match[1].trim();
                        }
                        break;
                    }
                }
            }

            processingSteps.push({
                status,
                role,
                roleLabel,
                employeeName,
                employeePosition,
                comment,
                createdAt,
                order: statusOrder.indexOf(status)
            });
        });

        // Сортируем по порядку статусов
        processingSteps.sort((a, b) => a.order - b.order);
        
        return processingSteps;
    }, [order.statusHistory]);

    // Функция для отображения полной истории обработки
    const renderProcessingHistory = () => {
        if (!showProcessingHistory) return null;

        const processingSteps = getProcessingHistory();
        if (processingSteps.length === 0) return null;

        return (
            <View style={styles.processingHistory}>
                <View style={styles.historyHeader}>
                    <Icon name="people" size={16} color="#667eea" />
                    <Text style={styles.historyTitle}>История обработки</Text>
                </View>
                
                {processingSteps.map((step, index) => (
                    <View key={index} style={[
                        styles.processingStep,
                        index === processingSteps.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }
                    ]}>
                        <View style={styles.stepHeader}>
                            <View style={styles.stepRole}>
                                <Text style={styles.stepRoleLabel}>{step.roleLabel}</Text>
                                <Text style={styles.stepStatus}>
                                    {OrderApi.getStatusLabel(step.status)}
                                </Text>
                            </View>
                            <Text style={styles.stepDate}>
                                {new Date(step.createdAt).toLocaleString()}
                            </Text>
                        </View>
                        
                        {step.employeeName && (
                            <View style={styles.stepEmployee}>
                                <Icon name="person" size={14} color="#666" />
                                <Text style={styles.stepEmployeeName}>
                                    {step.employeeName}
                                </Text>
                                {step.employeePosition && (
                                    <Text style={styles.stepEmployeePosition}>
                                        {step.employeePosition}
                                    </Text>
                                )}
                            </View>
                        )}
                        
                        {step.comment && (
                            <Text style={styles.stepComment}>
                                {step.comment}
                            </Text>
                        )}
                    </View>
                ))}
            </View>
        );
    };

    const renderActions = () => {
        if (!showActions) return null;

        return (
            <View style={styles.actions}>
                {onTakeOrder && (order.status === 'PENDING' || order.status === 'CONFIRMED' || order.status === 'IN_DELIVERY') && (
                    isTakenByMe ? (
                        onReleaseOrder ? (
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => onReleaseOrder(order.id)}
                            >
                                <Icon name="backspace" size={16} color="#ef5350" />
                                <Text style={styles.actionText}>Снять</Text>
                            </TouchableOpacity>
                        ) : null
                    ) : (
                        <TouchableOpacity
                            style={[styles.actionButton, !canTake && styles.actionButtonDisabled]}
                            onPress={() => canTake && onTakeOrder(order.id)}
                            disabled={!canTake}
                        >
                            <Icon name="handshake" size={16} color={canTake ? '#4CAF50' : '#bbb'} />
                            <Text style={[styles.actionText, !canTake && styles.actionTextDisabled]}>
                                {canTake ? 'Взять' : 'Занят'}
                            </Text>
                        </TouchableOpacity>
                    )
                )}
                {onStatusUpdate && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => onStatusUpdate(order.id)}
                    >
                        <Icon name="edit" size={16} color="#667eea" />
                        <Text style={styles.actionText}>Статус</Text>
                    </TouchableOpacity>
                )}
                
                
                
                {onDownloadInvoice && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => onDownloadInvoice(order.id)}
                        disabled={downloadingInvoice}
                    >
                        {downloadingInvoice ? (
                            <Icon name="hourglass-empty" size={16} color="#666" />
                        ) : (
                            <Icon name="download" size={16} color="#28a745" />
                        )}
                        <Text style={styles.actionText}>
                            {downloadingInvoice ? 'Загрузка...' : 'Накладная'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <TouchableOpacity
            style={[styles.container, isPriority && styles.priorityContainer, isHistoryOrder && styles.historyOrderContainer, style]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>{formattedNumber}</Text>
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                    {isRecentlyProcessed && (
                        <View style={styles.recentlyProcessedBadge}>
                            <Icon name="check-circle" size={12} color="#4CAF50" />
                            <Text style={styles.recentlyProcessedText}>Обработан</Text>
                        </View>
                    )}
                    {isHistoryOrder && (
                        <View style={styles.historyOrderBadge}>
                            <Icon name="history" size={12} color="#1976d2" />
                            <Text style={styles.historyOrderText}>История</Text>
                        </View>
                    )}
                </View>

                <View style={styles.statusContainer}>
                    <View style={[styles.statusIndicator, { backgroundColor: statusColor }]}>
                        <Icon name={statusIcon} size={16} color="#fff" />
                    </View>
                    <Text style={styles.statusText}>
                        {OrderApi.getStatusLabel(order.status)}
                    </Text>
                </View>
            </View>

            {renderClientInfo()}
            {renderOrderItems()}
            {renderProcessingInfo()}
            {showEmployeeInfo && renderEmployeeInfo()}
            {showStatusHistory && renderStatusHistory()}
            {showProcessingHistory && renderProcessingHistory()}

            <View style={styles.footer}>
                <View style={styles.amountContainer}>
                    <Text style={styles.amountLabel}>Сумма:</Text>
                    <Text style={styles.amount}>{formattedAmount}</Text>
                </View>
                
                {order.deliveryAddress && (
                    <View style={styles.addressContainer}>
                        <Icon name="location-on" size={14} color="#666" />
                        <Text style={styles.address} numberOfLines={1}>
                            {order.deliveryAddress}
                        </Text>
                    </View>
                )}
            </View>

            {renderActions()}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    priorityContainer: {
        borderLeftWidth: 4,
        borderLeftColor: '#ff6f00',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    orderInfo: {
        flex: 1,
    },
    orderNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    orderDate: {
        fontSize: 12,
        color: '#718096',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusIndicator: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4a5568',
    },
    clientInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    clientName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4a5568',
    },
    clientPhone: {
        fontSize: 12,
        color: '#718096',
    },
    orderItems: {
        marginBottom: 12,
    },
    itemInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    itemName: {
        fontSize: 14,
        color: '#4a5568',
        fontWeight: '600',
    },
    itemQuantity: {
        fontSize: 12,
        color: '#718096',
        fontWeight: '500',
    },
    additionalItems: {
        fontSize: 12,
        color: '#718096',
        fontWeight: '500',
    },
    processingInfo: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    processingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    processingIcon: {
        fontSize: 18,
        color: '#666',
    },
    processingStage: {
        fontSize: 13,
        fontWeight: '600',
    },
    assignedInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    assignedText: {
        fontSize: 12,
        color: '#666',
    },
    timeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    timeText: {
        fontSize: 12,
        color: '#666',
    },
    delayInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    delayText: {
        fontSize: 12,
        color: '#dc3545',
        fontWeight: '600',
    },
    employeeInfo: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    employeeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    employeeTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4a5568',
    },
    employeeDetails: {
        marginLeft: 24,
    },
    employeeName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2d3748',
        marginBottom: 2,
    },
    employeePosition: {
        fontSize: 12,
        color: '#718096',
    },
    statusHistory: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    historyTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4a5568',
    },
    historyDetails: {
        marginLeft: 24,
    },
    historyStatus: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2d3748',
        marginBottom: 2,
    },
    historyDate: {
        fontSize: 12,
        color: '#718096',
        marginBottom: 4,
    },
    historyComment: {
        fontSize: 12,
        color: '#718096',
        fontStyle: 'italic',
    },
    processingHistory: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    processingStep: {
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    stepHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    stepRole: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    stepRoleLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4a5568',
    },
    stepStatus: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2d3748',
    },
    stepDate: {
        fontSize: 12,
        color: '#718096',
    },
    stepEmployee: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    stepEmployeeName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2d3748',
    },
    stepEmployeePosition: {
        fontSize: 11,
        color: '#718096',
    },
    stepComment: {
        fontSize: 12,
        color: '#718096',
        fontStyle: 'italic',
        marginTop: 4,
        lineHeight: 16,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    amountLabel: {
        fontSize: 14,
        color: '#718096',
        fontWeight: '600',
    },
    amount: {
        fontSize: 16,
        fontWeight: '700',
        color: '#667eea',
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
        marginLeft: 12,
    },
    address: {
        fontSize: 12,
        color: '#718096',
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        backgroundColor: '#e3f2fd',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#bbdefb',
        gap: 6,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#667eea',
    },
    recentlyProcessedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#e8f5e8',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: 4,
        alignSelf: 'flex-start',
    },
    recentlyProcessedText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#4CAF50',
    },
    historyOrderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: 4,
        alignSelf: 'flex-start',
    },
    historyOrderText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#1976d2',
    },
    historyOrderContainer: {
        borderLeftWidth: 3,
        borderLeftColor: '#1976d2',
        backgroundColor: '#fafafa',
    },
});

export default OrderCard;