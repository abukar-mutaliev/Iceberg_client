import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '@entities/auth/model/selectors';
import { useCartAuth } from "../../../hooks/useCartAuth";

/**
 * Компонент для отслеживания изменений авторизации и автоматического объединения корзин
 * Должен быть размещен в корне приложения (в AppContainer)
 */
export const CartAuthHandler = () => {
    const { handleAuthStateChange } = useCartAuth();
    
    // Отслеживаем состояние авторизации
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const userId = useSelector(state => (isAuthenticated ? state.auth?.user?.id : undefined));
    
    // Храним предыдущее состояние авторизации
    const prevAuthState = useRef(isAuthenticated);
    const prevUserId = useRef(userId);

    useEffect(() => {
        const wasAuthenticated = prevAuthState.current;
        const nowAuthenticated = isAuthenticated;
        const wasUserId = prevUserId.current;
        const nowUserId = userId;

        // Проверяем, изменилось ли состояние авторизации
        if (wasAuthenticated !== nowAuthenticated || wasUserId !== nowUserId) {
            console.log('🔐 CartAuthHandler: Auth state changed', {
                wasAuthenticated,
                nowAuthenticated,
                wasUserId,
                nowUserId
            });

            // Вызываем обработчик изменения состояния авторизации
            handleAuthStateChange(wasAuthenticated, nowAuthenticated);

            // Обновляем сохраненное состояние
            prevAuthState.current = nowAuthenticated;
            prevUserId.current = nowUserId;
        }
    }, [isAuthenticated, userId, handleAuthStateChange]);

    // Инициализация при первом запуске
    useEffect(() => {
        console.log('🔐 CartAuthHandler: Initialized', {
            isAuthenticated,
            userId
        });
        
        prevAuthState.current = isAuthenticated;
        prevUserId.current = userId;
    }, []);

    // Компонент не рендерит ничего - только отслеживает состояние
    return null;
}; 