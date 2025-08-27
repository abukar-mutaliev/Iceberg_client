import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Color } from '@app/styles/GlobalStyles';
import {
    selectDriverLoading,
    selectDriverError,
    clearDriverError
} from "@entities/driver";

import {
    selectDistricts,
    selectDistrictsForDropdown
} from "@entities/district";

import { fetchAllDistricts } from "@entities/district";
import { LoadingState } from '@shared/ui/states/LoadingState';
import { ErrorState } from '@shared/ui/states/ErrorState';
import { logData } from '@shared/lib/logger';
import { EditStopForm } from "@features/driver/editDriverStop";
import {
    fetchDriverStops,
    selectStopById,
    updateStop
} from "@entities/stop";
import { parseCoordinates } from '@/shared/lib/coordinatesHelper';

export const EditStopScreen = ({ route, navigation }) => {
    const dispatch = useDispatch();
    const { stopId, selectedLocation, addressString, timestamp, navId } = route.params || {};

    const lastParamsRef = useRef({ selectedLocation, addressString, timestamp, navId });
    const screenInstanceId = useRef(Math.random().toString(36).substr(2, 9)).current;
    const prevLocationRef = useRef(selectedLocation);

    const [currentLocation, setCurrentLocation] = useState(selectedLocation);
    const [currentAddress, setCurrentAddress] = useState(addressString);

    const [locationChanged, setLocationChanged] = useState(false);

    useEffect(() => {
        logData('EditStopScreen: Компонент инициализирован', {
            stopId,
            selectedLocation,
            addressString,
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

    useEffect(() => {
        const hasChanged = selectedLocation !== lastParamsRef.current.selectedLocation ||
            addressString !== lastParamsRef.current.addressString ||
            timestamp !== lastParamsRef.current.timestamp ||
            navId !== lastParamsRef.current.navId;

        if (hasChanged && selectedLocation && selectedLocation !== prevLocationRef.current) {
            logData('EditStopScreen: Получены новые параметры маршрута', {
                selectedLocation,
                addressString,
                previousLocation: lastParamsRef.current.selectedLocation,
                previousAddress: lastParamsRef.current.addressString,
                timestamp,
                navId,
                instanceId: screenInstanceId
            });

            try {
                const parsedCoords = parseCoordinates(selectedLocation);
                
                if (parsedCoords) {
                    const formattedLocation = `${parsedCoords.latitude},${parsedCoords.longitude}`;
                    
                    logData('EditStopScreen: Координаты нормализованы', {
                        original: selectedLocation,
                        normalized: formattedLocation,
                        instanceId: screenInstanceId
                    });
                    
                    setCurrentLocation(formattedLocation);
                } else {
                    setCurrentLocation(selectedLocation);
                }
            } catch (error) {
                logData('EditStopScreen: Ошибка при обработке координат', {
                    error: error.message,
                    selectedLocation,
                    instanceId: screenInstanceId
                });
                setCurrentLocation(selectedLocation);
            }

            if (addressString) {
                setCurrentAddress(addressString);
            }

            lastParamsRef.current = { selectedLocation, addressString, timestamp, navId };
            prevLocationRef.current = selectedLocation;

            setLocationChanged(true);
            
            setFormKey(`edit-stop-form-${stopId}-${Date.now()}`);
        }
    }, [selectedLocation, addressString, timestamp, navId, stopId]);

    useEffect(() => {
        if (locationChanged) {
            setLocationChanged(false);
        }
    }, [locationChanged]);

    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [isScreenFocused, setIsScreenFocused] = useState(true);
    const [formKey, setFormKey] = useState(`edit-stop-form-${stopId}-${Date.now()}`);

    const stopData = useSelector(state => selectStopById(state, stopId));
    const isDriverLoading = useSelector(selectDriverLoading);
    const districts = useSelector(selectDistricts);
    const districtsForDropdown = useSelector(selectDistrictsForDropdown);
    const error = useSelector(selectDriverError);

    useEffect(() => {
        navigation.setOptions({
            title: 'Редактирование остановки'
        });

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
            dispatch(fetchAllDistricts());
        }
    }, [dispatch, districts.length]);

    const handleClose = () => {
        logData('Закрытие редактирования остановки', { stopId });
        
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('StopsScreen');
        }
    };

    const handleSave = (formData) => {
        logData('Сохранение данных остановки из EditStopScreen', { stopId });

        return dispatch(updateStop({ stopId, stopData: formData }))
            .unwrap()
            .then((result) => {
                logData('Успешное сохранение остановки', { stopId, result });
                return result;
            })
            .catch((error) => {
                logData('Ошибка при сохранении остановки', { stopId, error });
                throw error;
            });
    };

    // Сохраняем координаты в память устройства для отладки
    useEffect(() => {
        if (currentLocation) {
            try {
                logData('EditStopScreen: Сохранены координаты для остановки', {
                    stopId,
                    coordinates: currentLocation,
                    timestamp: new Date().toISOString(),
                    instanceId: screenInstanceId
                });
            } catch (error) {
                logData('EditStopScreen: Ошибка при сохранении координат', {
                    error: error.message,
                    instanceId: screenInstanceId
                });
            }
        }
    }, [currentLocation, stopId]);

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

    let availableDistricts = districtsForDropdown;

    if (availableDistricts.length === 0 && stopData?.district) {
        availableDistricts = [{
            id: stopData.district.id,
            name: stopData.district.name,
            value: stopData.district.id,
            label: stopData.district.name
        }];
    }

    return (
        <SafeAreaView style={styles.container}>
            {isScreenFocused && stopData && (
                <EditStopForm
                    stopData={{
                        ...stopData,
                        ...(currentLocation ? { mapLocation: currentLocation } : {}),
                        ...(currentAddress ? { address: currentAddress } : {})
                    }}
                    onClose={handleClose}
                    onSave={handleSave}
                    districts={availableDistricts}
                    key={formKey}
                    locationChanged={locationChanged}
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