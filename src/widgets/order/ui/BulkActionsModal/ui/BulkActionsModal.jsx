import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

/**
 * Модальное окно для массовых операций с заказами
 * @param {Object} props
 * @param {boolean} props.visible - Видимость модального окна
 * @param {Function} props.onClose - Обработчик закрытия
 * @param {Array} props.selectedOrders - Выбранные заказы
 * @param {Function} props.onBulkStatusUpdate - Обработчик массового изменения статуса
 * @param {Function} props.onBulkAssign - Обработчик массового назначения
 * @param {Function} props.onBulkCancel - Обработчик массовой отмены
 */
export const BulkActionsModal = ({
    visible = false,
    onClose,
    selectedOrders = [],
    onBulkStatusUpdate,
    onBulkAssign,
    onBulkCancel
}) => {
    const actions = [
        {
            id: 'status',
            title: 'Изменить статус',
            icon: 'edit',
            onPress: onBulkStatusUpdate,
            color: '#2196f3'
        },
        {
            id: 'assign',
            title: 'Назначить исполнителя',
            icon: 'person-add',
            onPress: onBulkAssign,
            color: '#4caf50'
        },
        {
            id: 'cancel',
            title: 'Отменить заказы',
            icon: 'cancel',
            onPress: onBulkCancel,
            color: '#f44336'
        }
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            Массовые операции ({selectedOrders.length} заказов)
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Icon name="close" size={24} color="#666666" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        {actions.map((action) => (
                            <TouchableOpacity
                                key={action.id}
                                style={[styles.actionButton, { borderLeftColor: action.color }]}
                                onPress={() => {
                                    action.onPress?.(selectedOrders);
                                    onClose();
                                }}
                                activeOpacity={0.7}
                            >
                                <Icon name={action.icon} size={24} color={action.color} />
                                <Text style={styles.actionText}>{action.title}</Text>
                                <Icon name="chevron-right" size={20} color="#666666" />
                            </TouchableOpacity>
                        ))}
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
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '50%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        padding: 16,
        gap: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        borderLeftWidth: 4,
        gap: 12,
    },
    actionText: {
        flex: 1,
        fontSize: 16,
        color: '#1a1a1a',
        fontWeight: '500',
    },
});

