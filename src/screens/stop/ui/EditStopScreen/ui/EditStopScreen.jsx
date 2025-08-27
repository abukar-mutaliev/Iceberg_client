import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Color } from '@app/styles/GlobalStyles';
import {
    selectDriverLoading,
    selectDriverError,
    clearDriverError,
    selectDriverDistricts
} from "@entities/driver";
import { fetchDriverDistricts } from "@entities/district";
import { LoadingState } from '@shared/ui/states/LoadingState';
import { ErrorState } from '@shared/ui/states/ErrorState';
import { logData } from '@shared/lib/logger';
import { EditStopForm } from "@features/driver/editDriverStop";
import {
    fetchDriverStops,
    selectStopById,
    updateStop
} from "@entities/stop";

export const EditStopScreen = ({ route, navigation }) => {
    const dispatch = useDispatch();
    const { stopId, selectedLocation, timestamp, navId } = route.params || {};

    // Для отслеживания обновлений параметров
    const lastParamsRef = useRef({ selectedLocation, timestamp, navId });
    const screenInstanceId = useRef(Math.random().toString(36).substr(2, 9)).current;
    const prevLocationRef = useRef(selectedLocation);

    // Состояние для хранения выбранных координат, чтобы избежать циклов обновления
    const [currentLocation, setCurrentLocation] = useState(selectedLocation);

    // Логируем монтирование компонента
    useEffect(() => {
        logData('EditStopScreen: Компонент инициализирован', {
            stopId,
            selectedLocation,
            instanceId: screenInstanceId,
            timestamp: new Date().toISOString()
        });

        return () => {
            logData('EditStopScreen: Компонент размонтирован', {
                instanceId: screenInstanceId,
                timestamp: new Date().toISOString()
            });
        };
    }, []);

    // Для отладки выводим полученные параметры и обновляем локальное состояние
    useEffect(() => {
        // Сравниваем с предыдущими значениями
        const hasChanged = selectedLocation !== lastParamsRef.current.selectedLocation ||
                          timestamp !== lastParamsRef.current.timestamp ||
                          navId !== lastParamsRef.current.navId;

        if (hasChanged && selectedLocation && selectedLocation !== prevLocationRef.current) {
            logData('EditStopScreen: Получены новые параметры маршрута', {
                selectedLocation,
                previousLocation: lastParamsRef.current.selectedLocation,
                timestamp,
                navId,
                instanceId: screenInstanceId
            });

            // Обновляем референсы
            lastParamsRef.current = { selectedLocation, timestamp, navId };
            prevLocationRef.current = selectedLocation;

            // Обновляем локальное состояние
            setCurrentLocation(selectedLocation);

            // Обновляем ключ формы при изменении координат
            setFormKey(`edit-stop-form-${stopId}-${Date.now()}`);
        }
    }, [selectedLocation, timestamp, navId, stopId]);

    // Добавляем состояние для отслеживания первоначальной загрузки
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [isScreenFocused, setIsScreenFocused] = useState(true);
    const [formKey, setFormKey] = useState(`edit-stop-form-${stopId}-${Date.now()}`);

    const stopData = useSelector(state => selectStopById(state, stopId));
    const isDriverLoading = useSelector(selectDriverLoading);
    const districts = useSelector(selectDriverDistricts);
    const error = useSelector(selectDriverError);

    useEffect(() => {
        // Настройка заголовка
        navigation.setOptions({
            title: 'Редактирование остановки'
        });

        // Запрашиваем данные только если их еще нет
        if (!stopData && stopId) {
            logData('EditStopScreen: Загрузка данных остановки', {
                stopId,
                instanceId: screenInstanceId
            });
            dispatch(fetchDriverStops())
                .then(() => setInitialLoadComplete(true))
                .catch(() => setInitialLoadComplete(true));
        } else {
            setInitialLoadComplete(true);
        }
    }, [dispatch, stopId, stopData, navigation]);

    // Отслеживаем фокус на экране
    useFocusEffect(
        React.useCallback(() => {
            logData('EditStopScreen: Получил фокус', {
                instanceId: screenInstanceId,
                currentLocation,
                timestamp: new Date().toISOString()
            });
            setIsScreenFocused(true);

            if (error) {
                dispatch(clearDriverError());
            }

            return () => {
                logData('EditStopScreen: Потерял фокус', {
                    instanceId: screenInstanceId,
                    timestamp: new Date().toISOString()
                });
                setIsScreenFocused(false);
            };
        }, [dispatch, error, currentLocation])
    );

    useEffect(() => {
        if (districts.length === 0) {
            logData('Загрузка списка районов для EditStopScreen');
            dispatch(fetchDriverDistricts());
        }
    }, [dispatch, districts.length]);

    // Обработчик закрытия формы
    const handleClose = () => {
        logData('Закрытие редактирования остановки', { stopId });
        navigation.goBack();
    };

    const handleSave = (formData) => {
        logData('Сохранение данных остановки из EditStopScreen', { stopId });

        dispatch(updateStop({ stopId, stopData: formData }))
            .unwrap()
            .then(() => {
                logData('Успешное сохранение остановки', { stopId });
                navigation.goBack();
            })
            .catch((error) => {
                logData('Ошибка при сохранении остановки', { stopId, error });
            });
    };

    if (!initialLoadComplete || (isDriverLoading && !stopData)) {
        return <LoadingState message="Загрузка данных..." />;
    }

    if (error) {
        return (
            <ErrorState
                error={error}
                onRetry={() => dispatch(fetchDriverStops())}
            />
        );
    }

    if (!stopData && !isDriverLoading) {
        return (
            <ErrorState
                message="Остановка не найдена"
                onBack={() => navigation.goBack()}
            />
        );
    }

    let availableDistricts = districts;

    if (availableDistricts.length === 0 && stopData?.district) {
        availableDistricts = [stopData.district];
    }

    // Рендерим форму, только если экран в фокусе и данные готовы
    return (
        <SafeAreaView style={styles.container}>
            {isScreenFocused && stopData && (
                <EditStopForm
                    stopData={{
                        ...stopData,
                        // Используем локальное состояние вместо параметра навигации
                        ...(currentLocation ? { mapLocation: currentLocation } : {})
                    }}
                    onClose={handleClose}
                    onSave={handleSave}
                    districts={availableDistricts}
                    key={formKey} // Используем динамический ключ для пересоздания
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
});