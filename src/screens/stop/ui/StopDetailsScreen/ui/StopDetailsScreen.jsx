import React, { useEffect, useState } from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { selectDriverLoading, selectDriverError } from '@entities/driver';
import { StopDetailsContent } from './StopDetailsContent';
import { LoadingState } from '@shared/ui/states/LoadingState';
import { ErrorState } from '@shared/ui/states/ErrorState';
import { selectStopById, selectStops, fetchAllStops, clearStopCache } from "@entities/stop";

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

    // Функция для ручной загрузки данных
    const loadStopsData = React.useCallback(async () => {
        setIsLoadingStops(true);

        try {
            // Принудительно очищаем кеш
            dispatch(clearStopCache());
            await dispatch(fetchAllStops()).unwrap();
            setRetryCount(0);
        } catch (error) {
            setRetryCount(prev => prev + 1);
        } finally {
            setIsLoadingStops(false);
        }
    }, [dispatch]);

    // КРИТИЧНО: Принудительная загрузка данных при монтировании
    useEffect(() => {
        const loadStopsImmediately = async () => {
            if (!stopId) {
                setForceLoading(false);
                return;
            }

            setIsLoadingStops(true);
            setForceLoading(true);

            try {
                // Принудительно очищаем кеш для получения свежих данных с userId водителя
                dispatch(clearStopCache());
                await dispatch(fetchAllStops()).unwrap();
                setRetryCount(0);

                // Даем время на обновление селектора
                setTimeout(() => {
                    setForceLoading(false);
                }, 500);

            } catch (error) {
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
            const timer = setTimeout(() => {
                setRetryCount(prev => prev + 1);

                // Ищем остановку вручную в загруженных данных
                const foundStop = allStops.find(s => s.id === parseInt(stopId));

                if (!foundStop && retryCount < 2) {
                    // Повторная загрузка если остановка все еще не найдена
                    loadStopsData();
                }
            }, 1000 * (retryCount + 1)); // Увеличиваем задержку с каждой попыткой

            return () => clearTimeout(timer);
        }
    }, [stopId, stop, allStops.length, retryCount, loadStopsData]);

    // Фокус на экране - дополнительная проверка и перезагрузка после редактирования
    useFocusEffect(
        React.useCallback(() => {
            // Загружаем данные только если остановка не найдена и данных нет
            if (!stop && stopId && !isLoadingStops && allStops.length === 0) {
                loadStopsData();
            }
            // НЕ перезагружаем данные автоматически при каждом фокусе - это вызывает бесконечные запросы
            // Перезагрузка происходит только через useEffect при монтировании
        }, [stopId, stop, isLoadingStops, allStops.length, loadStopsData])
    );

    const handleRetry = () => {
        setRetryCount(0);
        setForceLoading(true);
        loadStopsData();
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

    // Показываем загрузку если данные загружаются или принудительная загрузка
    if (isLoading || isLoadingStops || forceLoading) {
        return <LoadingState />;
    }

    // Если нет stopId в параметрах
    if (!stopId) {
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