import React, { useEffect, useState } from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { selectDriverLoading, selectDriverError } from '@entities/driver';
import { StopDetailsContent } from './StopDetailsContent';
import { LoadingState } from '@shared/ui/states/LoadingState';
import { ErrorState } from '@shared/ui/states/ErrorState';
import { selectStopById, selectStops, fetchAllStops } from "@entities/stop";

export const StopDetailsScreen = ({ navigation }) => {
    const route = useRoute();
    const dispatch = useDispatch();
    const { stopId } = route.params || {};

    const [isLoadingStops, setIsLoadingStops] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [forceLoading, setForceLoading] = useState(true);

    const stop = useSelector(state => selectStopById(state, stopId));
    const allStops = useSelector(selectStops);
    const isLoading = useSelector(selectDriverLoading);
    const error = useSelector(selectDriverError);

    console.log('🔍 StopDetailsScreen state:', {
        stopId,
        hasStop: !!stop,
        allStopsCount: allStops?.length || 0,
        isLoading,
        isLoadingStops,
        retryCount,
        error
    });

    // КРИТИЧНО: Принудительная загрузка данных при монтировании
    useEffect(() => {
        const loadStopsImmediately = async () => {
            if (!stopId) {
                console.error('❌ No stopId provided');
                setForceLoading(false);
                return;
            }

            console.log('🚀 FORCE loading stops for stopId:', stopId);
            setIsLoadingStops(true);
            setForceLoading(true);

            try {
                console.log('📡 Dispatching fetchAllStops...');
                const result = await dispatch(fetchAllStops()).unwrap();
                console.log('✅ Stops loaded successfully, count:', result?.length || 'unknown');
                setRetryCount(0);

                // Даем время на обновление селектора
                setTimeout(() => {
                    setForceLoading(false);
                }, 500);

            } catch (error) {
                console.error('❌ Error loading stops:', error);
                setRetryCount(prev => prev + 1);
                setForceLoading(false);
            } finally {
                setIsLoadingStops(false);
            }
        };

        loadStopsImmediately();
    }, [stopId, dispatch]);

    // Дополнительная проверка после загрузки данных
    useEffect(() => {
        if (stopId && allStops.length > 0 && !stop && retryCount < 3) {
            console.log('⚠️ Stop still not found after loading, retry count:', retryCount);

            const timer = setTimeout(() => {
                console.log('🔄 Retrying to find stop in loaded data...');
                setRetryCount(prev => prev + 1);

                // Ищем остановку вручную в загруженных данных
                const foundStop = allStops.find(s => s.id === parseInt(stopId));
                console.log('🔍 Manual search result:', foundStop ? 'found' : 'not found');

                if (!foundStop && retryCount < 2) {
                    // Повторная загрузка если остановка все еще не найдена
                    loadStopsData();
                }
            }, 1000 * (retryCount + 1)); // Увеличиваем задержку с каждой попыткой

            return () => clearTimeout(timer);
        }
    }, [stopId, stop, allStops.length, retryCount]);

    // Фокус на экране - дополнительная проверка
    useFocusEffect(
        React.useCallback(() => {
            console.log('👁️ Screen focused, stopId:', stopId, 'hasStop:', !!stop);

            if (!stop && stopId && !isLoadingStops && allStops.length === 0) {
                console.log('🔄 Screen focused without data, loading...');
                loadStopsData();
            }
        }, [stopId, stop, isLoadingStops, allStops.length])
    );

    // Функция для ручной загрузки данных
    const loadStopsData = async () => {
        if (isLoadingStops) {
            console.log('🚫 Already loading, skipping...');
            return;
        }

        setIsLoadingStops(true);
        console.log('🔄 Manual loading stops data...');

        try {
            await dispatch(fetchAllStops()).unwrap();
            console.log('✅ Manual stops loaded successfully');
            setRetryCount(0);
        } catch (error) {
            console.error('❌ Error in manual loading:', error);
            setRetryCount(prev => prev + 1);
        } finally {
            setIsLoadingStops(false);
        }
    };

    const handleRetry = () => {
        console.log('🔄 Manual retry triggered by user');
        setRetryCount(0);
        setForceLoading(true);
        loadStopsData();
    };

    const handleGoBack = () => {
        console.log('🔙 Going back to previous screen');
        navigation.goBack();
    };

    // Показываем загрузку если данные загружаются или принудительная загрузка
    if (isLoading || isLoadingStops || forceLoading) {
        return <LoadingState />;
    }

    // Если нет stopId в параметрах
    if (!stopId) {
        console.error('❌ No stopId in route params');
        return (
            <ErrorState
                message="Не указан идентификатор остановки"
                onRetry={handleGoBack}
                buttonText="Вернуться назад"
            />
        );
    }

    // Если остановка все еще не найдена после загрузки
    if (!stop && stopId) {
        const errorMessage = allStops.length === 0
            ? "Не удалось загрузить данные остановок"
            : `Остановка #${stopId} не найдена среди ${allStops.length} загруженных остановок`;

        console.error('❌ Stop not found:', {
            stopId,
            allStopsCount: allStops.length,
            retryCount,
            firstFewStops: allStops.slice(0, 3).map(s => ({ id: s.id, address: s.address }))
        });

        return (
            <ErrorState
                message={errorMessage}
                onRetry={handleRetry}
                buttonText={retryCount < 3 ? "Повторить загрузку" : "Обновить данные"}
            />
        );
    }

    // Если есть общая ошибка
    if (error) {
        return (
            <ErrorState
                message={error}
                onRetry={handleGoBack}
                buttonText="Вернуться назад"
            />
        );
    }

    // Показываем контент остановки
    console.log('✅ Showing stop content for:', stop?.address || 'unknown');
    return (
        <SafeAreaView style={styles.container}>
            <StopDetailsContent stop={stop} navigation={navigation} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});