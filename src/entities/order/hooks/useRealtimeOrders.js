import { useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useWebSocket } from '@shared/hooks/useWebSocket';
// Импортируем напрямую из slice, чтобы избежать циклической зависимости
import { fetchStaffOrders, fetchOrderCounts } from '../model/slice';

export const useRealtimeOrders = () => {
    const dispatch = useDispatch();
    const lastUpdateRef = useRef(null);
    const lastCountsUpdateRef = useRef(null);

    const handleWebSocketMessage = useCallback((data) => {
        console.log('📨 Received WebSocket message:', data);
        
        const now = Date.now();
        
        // Обновляем счетчики чаще (каждые 500мс) - это легкий запрос
        if (!lastCountsUpdateRef.current || now - lastCountsUpdateRef.current > 500) {
            lastCountsUpdateRef.current = now;
            console.log('📊 Refreshing order counts via WebSocket');
            dispatch(fetchOrderCounts()).catch(err => {
                console.error('❌ Error refreshing order counts:', err);
            });
        }
        
        // Обновляем полные данные реже (каждую секунду)
        if (!lastUpdateRef.current || now - lastUpdateRef.current > 1000) {
            lastUpdateRef.current = now;
            
            console.log('🔄 Refreshing orders data via WebSocket');
            // Обновляем данные заказов
            dispatch(fetchStaffOrders({ forceRefresh: true }));
        }
    }, [dispatch]);

    const handleWebSocketError = useCallback((error) => {
        console.error('❌ WebSocket ошибка в заказах:', error);
    }, []);

    const { isConnected, sendMessage, forceReconnect } = useWebSocket(
        handleWebSocketMessage,
        handleWebSocketError
    );

    const subscribeToOrders = useCallback((filters = {}) => {
        console.log('🔌 Subscribing to orders with filters:', filters);
        return sendMessage({
            type: 'subscribe_orders',
            filters
        });
    }, [sendMessage]);

    const unsubscribeFromOrders = useCallback(() => {
        return sendMessage({
            type: 'unsubscribe_orders'
        });
    }, [sendMessage]);

    return {
        isConnected,
        subscribeToOrders,
        unsubscribeFromOrders,
        forceReconnect
    };
};
