import { useCallback } from 'react';
import { useNavigation, useNavigationState } from '@react-navigation/native';

/**
 * Хук для принудительного обновления данных главного экрана
 * Используется из других экранов для сигнала о необходимости обновления
 */
export const useMainScreenRefresh = () => {
    const navigation = useNavigation();
    const navigationState = useNavigationState(state => state);

    /**
     * Отправляет сигнал главному экрану о необходимости обновления данных
     * Использует параметры навигации для передачи сигнала
     */
    const triggerMainScreenRefresh = useCallback(() => {
        try {
            // Находим главный экран в стеке навигации
            const mainTabRoute = navigationState?.routes?.find(route => 
                route.name === 'MainTab' || 
                route.state?.routes?.some(subRoute => subRoute.name === 'MainScreen')
            );

            if (mainTabRoute) {
                // Обновляем параметры главного экрана для сигнала об обновлении
                navigation.setParams({
                    refreshMainScreen: Date.now(),
                });
            }
        } catch (error) {
            console.warn('Не удалось отправить сигнал обновления главного экрана:', error);
        }
    }, [navigation, navigationState]);

    /**
     * Навигация на главный экран с принудительным обновлением
     */
    const navigateToMainWithRefresh = useCallback(() => {
        navigation.navigate('MainTab', {
            screen: 'MainScreen',
            params: {
                refreshMainScreen: Date.now(),
            }
        });
    }, [navigation]);

    return {
        triggerMainScreenRefresh,
        navigateToMainWithRefresh,
    };
};

export default useMainScreenRefresh;

