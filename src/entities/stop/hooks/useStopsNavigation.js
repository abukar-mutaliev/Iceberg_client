import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import { fetchAllStops, selectStops, selectStopById } from '@entities/stop';
import { getBaseUrl } from '@shared/api/api';

export const useStopsNavigation = () => {
    let navigation = null;
    
    // Безопасно получаем навигацию
    try {
        navigation = useNavigation();
    } catch (error) {
        console.warn('Navigation not available in useStopsNavigation:', error.message);
        // Возвращаем заглушку если навигация недоступна
        return {
            navigateToStops: (navigationData) => {
                console.warn('Navigation to stops skipped - no navigation available');
            }
        };
    }
    
    const dispatch = useDispatch();
    const stops = useSelector(selectStops);

    // Для предотвращения множественных вызовов
    const isNavigating = useRef(false);
    const lastNavigationTime = useRef(0);

    const navigateToStops = useCallback(async (navigationData) => {
        if (!navigation) {
            console.warn('Navigation not available in navigateToStops');
            return;
        }

        const {
            stopId,
            forceRefresh,
            source,
            skipDeepLinkCheck,
            timestamp
        } = navigationData || {};

        // Предотвращаем множественные вызовы
        const now = Date.now();
        if (isNavigating.current || (now - lastNavigationTime.current < 1000)) {
            console.log('🚫 Navigation blocked - too frequent or already navigating');
            return;
        }

        isNavigating.current = true;
        lastNavigationTime.current = now;

        try {
            console.log('🧭 navigateToStops called with:', {
                stopId,
                forceRefresh,
                source,
                currentStopsCount: stops?.length || 0,
                skipDeepLinkCheck,
                apiUrl: getBaseUrl() // Логируем используемый API URL
            });

            if (!stopId) {
                console.error('❌ No stopId provided');
                return;
            }

            // Если это навигация из push-уведомления, принудительно обновляем данные
            if (forceRefresh || source === 'push_notification') {
                console.log('🔄 Force refreshing stops data due to push navigation');
                console.log('📡 API URL:', getBaseUrl());

                try {
                    await dispatch(fetchAllStops()).unwrap();
                    console.log('✅ Stops data refreshed successfully from:', getBaseUrl());

                    // Небольшая задержка для завершения загрузки
                    await new Promise(resolve => setTimeout(resolve, 300));
                } catch (error) {
                    console.error('❌ Error refreshing stops from API:', error);
                    console.error('📡 Failed API URL:', getBaseUrl());
                }
            }

            console.log('🚛 Navigating to stop with ID:', stopId);

            // Загружаем актуальные данные остановок если они не загружены
            if (!stops || stops.length === 0) {
                console.log('📥 Loading stops data before navigation from:', getBaseUrl());
                try {
                    await dispatch(fetchAllStops()).unwrap();
                } catch (error) {
                    console.error('❌ Error loading stops:', error);
                }
            }

            // Получаем обновленные данные из store
            const currentStops = useSelector.getState ?
                selectStops(useSelector.getState()) : stops;

            // Проверяем, есть ли остановка в загруженных данных
            const targetStop = currentStops?.find(stop => stop.id === parseInt(stopId));

            if (!targetStop && source === 'push_notification') {
                console.log('🔄 Stop not found, forcing data refresh from API...');
                console.log('📡 Retrying with API:', getBaseUrl());

                // Если остановка не найдена и это push-уведомление, пробуем еще раз
                try {
                    await dispatch(fetchAllStops()).unwrap();
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Получаем обновленные данные еще раз
                    const updatedStops = useSelector.getState ?
                        selectStops(useSelector.getState()) : stops;
                    const retryStop = updatedStops?.find(stop => stop.id === parseInt(stopId));

                    if (!retryStop) {
                        console.error(`❌ Stop ${stopId} still not found after refresh among ${updatedStops?.length || 0} stops`);
                        console.error('📡 API URL used:', getBaseUrl());

                        // Показываем алерт пользователю
                        Alert.alert(
                            'Остановка не найдена',
                            `Остановка #${stopId} еще не загружена. Данные обновляются с сервера...`,
                            [
                                { text: 'OK' },
                                {
                                    text: 'Попробовать снова',
                                    onPress: () => {
                                        setTimeout(() => {
                                            navigateToStops({
                                                ...navigationData,
                                                forceRefresh: true
                                            });
                                        }, 1000);
                                    }
                                }
                            ]
                        );
                        return;
                    }
                } catch (error) {
                    console.error('❌ Error in retry loading from API:', error);
                    console.error('📡 Failed API URL:', getBaseUrl());
                }
            }

            // Выполняем навигацию
            const navigationParams = {
                stopId: parseInt(stopId),
                source: source || 'unknown',
                timestamp: timestamp || Date.now(),
                forceRefresh: forceRefresh || false,
                apiUrl: getBaseUrl()
            };

            if (navigation.getState().routeNames.includes('StopDetails')) {
                navigation.replace('StopDetails', navigationParams);
            } else {
                navigation.navigate('StopDetails', navigationParams);
            }

            console.log('✅ Successfully navigated to StopDetails');

        } catch (error) {
            console.error('❌ Error in navigateToStops:', error);
            console.error('📡 API URL during error:', getBaseUrl());

            Alert.alert(
                'Ошибка навигации',
                'Не удалось перейти к остановке. Проверьте подключение к серверу.',
                [{ text: 'OK' }]
            );
        } finally {
            setTimeout(() => {
                isNavigating.current = false;
            }, 1000);
        }
    }, [navigation, dispatch, stops]);

    return { navigateToStops };
};