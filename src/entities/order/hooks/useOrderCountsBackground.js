import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrderCounts } from '../model/slice';

/**
 * Хук для фоновой загрузки счетчиков заказов
 * Используется на уровне приложения для отображения бейджей
 * независимо от того, на каком экране находится пользователь
 */
export const useOrderCountsBackground = () => {
    const dispatch = useDispatch();
    // Читаем напрямую из Redux state для надёжности
    const currentUser = useSelector(state => state.auth?.user);
    const tokens = useSelector(state => state.auth?.tokens);
    const intervalRef = useRef(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        
        // Проверяем наличие токенов перед загрузкой
        if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
            return;
        }
        
        // Загружаем счетчики для сотрудников и админов
        // Для сотрудников сервер вернёт только заказы их склада
        // Для админов сервер вернёт все заказы
        const isEmployee = currentUser?.role === 'EMPLOYEE';
        const isAdmin = currentUser?.role === 'ADMIN';
        // Для EMPLOYEE проверяем только наличие employeeId (warehouseId может быть null для SUPERVISOR)
        const hasEmployeeData = currentUser?.employee?.id;
        
        // Для ADMIN загружаем сразу, для EMPLOYEE загружаем если есть employee данные
        const shouldLoad = isAdmin || (isEmployee && hasEmployeeData);
        
        if (shouldLoad) {
            // НЕМЕДЛЕННАЯ загрузка счетчиков (без задержки)
            dispatch(fetchOrderCounts());
            
            // Затем обновляем каждые 2 минуты
            intervalRef.current = setInterval(() => {
                if (isMountedRef.current) {
                    dispatch(fetchOrderCounts());
                }
            }, 2 * 60 * 1000); // 2 минуты
        }

        return () => {
            isMountedRef.current = false;
            
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [currentUser?.role, currentUser?.id, currentUser?.employee?.id, currentUser?.employee?.warehouseId, tokens, dispatch]);
};

