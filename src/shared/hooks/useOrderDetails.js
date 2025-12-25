import { useState, useCallback } from 'react';
import { OrderApi } from '@entities/order';

export const useOrderDetails = (orderId) => {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const loadOrderDetails = useCallback(async (isRefresh = false) => {
        if (!orderId) {
            setError('ID заказа не указан');
            setLoading(false);
            return;
        }

        try {
            if (!isRefresh) {
                setLoading(true);
            }
            setError(null);

            const response = await OrderApi.getOrderById(orderId);

            if (response.status === 'success' && response.data) {
                setOrder(response.data);
            } else {
                throw new Error(`Invalid response: status=${response.status}, hasData=${!!response.data}`);
            }
        } catch (err) {
            console.error('Ошибка загрузки деталей заказа:', err);
            setError(err.message || 'Не удалось загрузить детали заказа');
        } finally {
            setLoading(false);
            if (isRefresh) {
                setRefreshing(false);
            }
        }
    }, [orderId]);

    const refreshOrderDetails = useCallback(() => {
        setRefreshing(true);
        loadOrderDetails(true);
    }, [loadOrderDetails]);

    return {
        order,
        loading,
        refreshing,
        error,
        loadOrderDetails,
        refreshOrderDetails,
        setOrder,
        setError
    };
};


