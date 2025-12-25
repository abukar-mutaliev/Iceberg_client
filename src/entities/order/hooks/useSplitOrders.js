import { useState, useCallback } from 'react';
import { OrderApi } from '@entities/order';

export const useSplitOrders = () => {
    const [splitOrders, setSplitOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Загрузить информацию о разделенных заказах по номеру оригинального заказа
     */
    const loadSplitOrderInfo = useCallback(async (originalOrderNumber) => {
        if (!originalOrderNumber) {
            setError('Номер заказа не указан');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await OrderApi.getSplitOrderInfo(originalOrderNumber);
            
            if (response.status === 'success') {
                setSplitOrders(response.data || []);
                return response.data || [];
            } else {
                throw new Error(response.message || 'Не удалось загрузить информацию о разделенных заказах');
            }
        } catch (err) {
            console.error('Ошибка загрузки информации о разделенных заказах:', err);
            setError(err.message || 'Ошибка загрузки');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Проверить возможность разделения заказа
     */
    const checkSplitPossibility = useCallback(async (orderId) => {
        if (!orderId) {
            setError('ID заказа не указан');
            return null;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await OrderApi.checkOrderSplitPossibility(orderId);
            
            if (response.status === 'success') {
                return response.data;
            } else {
                throw new Error(response.message || 'Не удалось проверить возможность разделения');
            }
        } catch (err) {
            console.error('Ошибка проверки возможности разделения:', err);
            setError(err.message || 'Ошибка проверки');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Очистить состояние
     */
    const clearState = useCallback(() => {
        setSplitOrders([]);
        setError(null);
        setLoading(false);
    }, []);

    /**
     * Проверить, является ли заказ частью разделенного заказа
     */
    const isSplitOrder = useCallback((order) => {
        if (!order?.orderNumber) return false;
        return order.orderNumber.includes('-IMMEDIATE') || order.orderNumber.includes('-WAITING');
    }, []);

    /**
     * Получить тип разделенного заказа
     */
    const getSplitOrderType = useCallback((order) => {
        if (!isSplitOrder(order)) return null;
        
        if (order.orderNumber.includes('-IMMEDIATE')) {
            return 'IMMEDIATE';
        } else if (order.orderNumber.includes('-WAITING')) {
            return 'WAITING';
        }
        
        return null;
    }, [isSplitOrder]);

    /**
     * Получить оригинальный номер заказа из разделенного
     */
    const getOriginalOrderNumber = useCallback((order) => {
        if (!isSplitOrder(order)) return order?.orderNumber;
        
        return order.orderNumber
            .replace('-IMMEDIATE', '')
            .replace('-WAITING', '');
    }, [isSplitOrder]);

    /**
     * Группировать заказы по оригинальным номерам
     */
    const groupOrdersByOriginal = useCallback((orders) => {
        const grouped = {};
        
        orders.forEach(order => {
            const originalNumber = getOriginalOrderNumber(order);
            if (!grouped[originalNumber]) {
                grouped[originalNumber] = [];
            }
            grouped[originalNumber].push(order);
        });
        
        return grouped;
    }, [getOriginalOrderNumber]);

    /**
     * Получить статистику разделенных заказов
     */
    const getSplitOrdersStats = useCallback((orders) => {
        const immediateOrders = orders.filter(order => getSplitOrderType(order) === 'IMMEDIATE');
        const waitingOrders = orders.filter(order => getSplitOrderType(order) === 'WAITING');
        
        return {
            total: orders.length,
            immediate: immediateOrders.length,
            waiting: waitingOrders.length,
            totalAmount: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
            immediateAmount: immediateOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
            waitingAmount: waitingOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
        };
    }, [getSplitOrderType]);

    return {
        // Состояние
        splitOrders,
        loading,
        error,
        
        // Методы
        loadSplitOrderInfo,
        checkSplitPossibility,
        clearState,
        
        // Утилиты
        isSplitOrder,
        getSplitOrderType,
        getOriginalOrderNumber,
        groupOrdersByOriginal,
        getSplitOrdersStats,
    };
};
