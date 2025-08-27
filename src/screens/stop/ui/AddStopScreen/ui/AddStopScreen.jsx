import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, Alert, TouchableOpacity, Text } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';

import { Color, FontFamily } from '@app/styles/GlobalStyles';
import {
    selectDriverError,
    selectDriverLoading,
    clearDriverError,
    fetchAllDrivers
} from "@entities/driver";

import {
    selectDistricts,
    selectDistrictLoading,
    selectDistrictError,
    selectDistrictsForDropdown
} from "@entities/district";

import { fetchAllDistricts } from "@entities/district";
import { AddStopHeader } from './AddStopHeader';
import { LoadingState } from '@shared/ui/states/LoadingState';
import { StopForm } from "@features/driver/addDriverStop";
import { logData } from '@shared/lib/logger';
import { ReusableModal } from '@shared/ui/Modal';
import MapView, { Marker } from 'react-native-maps';
import { parseCoordinates } from '@/shared/lib/coordinatesHelper';

export const AddStopScreen = ({ navigation, route }) => {
    // Рефы для отслеживания состояния и предотвращения лишних перерисовок
    const prevRouteParamsRef = useRef(null);
    const isProcessingRouteParams = useRef(false);
    const isInitialized = useRef(false);
    const lastUpdateTime = useRef(0);

    const dispatch = useDispatch();
    const isLoading = useSelector(selectDriverLoading);
    const isDistrictLoading = useSelector(selectDistrictLoading);
    const error = useSelector(selectDriverError);
    const districts = useSelector(selectDistricts);
    const districtsForDropdown = useSelector(selectDistrictsForDropdown);
    const userRole = useSelector(state => state.auth?.user?.role || 'DRIVER');

    const [formSubmitted, setFormSubmitted] = useState(false);
    const [mapModalVisible, setMapModalVisible] = useState(false);
    const [isLocationLoading, setIsLocationLoading] = useState(false);
    const [locationData, setLocationData] = useState({
        mapRegion: {
            latitude: 55.751244,
            longitude: 37.618423,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        },
        markerPosition: null,
        mapLocation: '',
    });
    const [addressFromMap, setAddressFromMap] = useState('');

    const isAdminOrEmployee = useMemo(() =>
            userRole === 'ADMIN' || userRole === 'EMPLOYEE',
        [userRole]
    );

    const handleLocationUpdate = useCallback((coordinates) => {
        if (!coordinates) return;

        const now = Date.now();
        if (now - lastUpdateTime.current < 300) return;
        lastUpdateTime.current = now;

        try {
            const [lat, lng] = coordinates.split(',').map(coord => parseFloat(coord.trim()));

            if (!isNaN(lat) && !isNaN(lng)) {
                setLocationData(prev => {
                    if (prev.mapLocation === coordinates) return prev;

                    return {
                        ...prev,
                        mapLocation: coordinates,
                        markerPosition: { latitude: lat, longitude: lng },
                        mapRegion: {
                            ...prev.mapRegion,
                            latitude: lat,
                            longitude: lng
                        }
                    };
                });
                logData('AddStopScreen: Координаты успешно обновлены', coordinates);
            } else {
                logData('AddStopScreen: Неверный формат координат', coordinates);
            }
        } catch (error) {
            logData('AddStopScreen: Ошибка при обработке координат', error);
        }
    }, []);

    useEffect(() => {
        const shouldProcessRouteParams =
            route.params?.selectedLocation &&
            route.params?.timestamp &&
            !isProcessingRouteParams.current;

        if (!shouldProcessRouteParams) {
            return;
        }

        const isSameParams =
            prevRouteParamsRef.current?.selectedLocation === route.params.selectedLocation &&
            prevRouteParamsRef.current?.timestamp === route.params.timestamp;

        if (isSameParams) {
            return;
        }

        // Блокируем повторную обработку
        isProcessingRouteParams.current = true;

        // Сохраняем текущие параметры для сравнения в будущем
        prevRouteParamsRef.current = { ...route.params };

        // Получаем и обрабатываем параметры маршрута
        const locationString = route.params.selectedLocation;
        const addressString = route.params.addressString;
        
        logData('AddStopScreen: Получены координаты из параметров навигации', {
            locationString,
            addressString,
            timestamp: route.params.timestamp
        });

        // Обновляем состояние с координатами
        if (locationString) {
            handleLocationUpdate(locationString);
        }
        
        if (addressString) {
            setAddressFromMap(addressString);
            logData('AddStopScreen: Получен адрес из параметров навигации', addressString);
        }


        setTimeout(() => {
            navigation.setParams({
                selectedLocation: undefined,
                addressString: undefined,
                timestamp: undefined
            });

            isProcessingRouteParams.current = false;
            
            logData('AddStopScreen: Проверка передачи адреса в форму', {
                addressPassedToForm: addressFromMap,
                coordinates: locationData.mapLocation
            });
        }, 300);
    }, [route.params, handleLocationUpdate, navigation, addressFromMap, locationData.mapLocation]);

    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;

        const loadInitialData = async () => {
            try {
                logData('AddStopScreen: Загрузка начальных данных');
                const promises = [dispatch(fetchAllDistricts())];

                if (isAdminOrEmployee) {
                    promises.push(dispatch(fetchAllDrivers()));
                }

                await Promise.all(promises);

                logData('AddStopScreen: Начальные данные загружены успешно');
            } catch (error) {
                logData('AddStopScreen: Ошибка при загрузке начальных данных', error);
            }
        };

        loadInitialData();
    }, [dispatch, isAdminOrEmployee]);

    // Очистка ошибок при фокусе на экране
    useFocusEffect(
        React.useCallback(() => {
            if (error) {
                dispatch(clearDriverError());
            }
            return () => {
                // Очистка при уходе с экрана
                setFormSubmitted(false);
            };
        }, [dispatch, error])
    );

    // Обработчики для карты - мемоизируем
    const handleMapModalOpen = useCallback((existingLocation) => {
        if (existingLocation) {
            try {
                const [lat, lng] = existingLocation.split(',').map(coord => parseFloat(coord.trim()));
                if (!isNaN(lat) && !isNaN(lng)) {
                    setLocationData(prev => ({
                        ...prev,
                        markerPosition: { latitude: lat, longitude: lng },
                        mapRegion: {
                            ...prev.mapRegion,
                            latitude: lat,
                            longitude: lng
                        }
                    }));
                }
            } catch (error) {
                logData('AddStopScreen: Ошибка при обработке существующих координат', error);
            }
        }
        setMapModalVisible(true);
    }, []);

    const handleLocationConfirm = useCallback((coordinates) => {
        handleLocationUpdate(coordinates);
        setMapModalVisible(false);
    }, [handleLocationUpdate]);

    // Отображение загрузки только во время инициализации данных
    if ((isLoading || isDistrictLoading) && !formSubmitted && districts.length === 0) {
        return <LoadingState />;
    }

    // Компонент карты для модального окна - выносим в отдельный компонент
    const MapContent = React.memo(() => (
        <View style={mapStyles.container}>
            <MapView
                style={mapStyles.map}
                region={locationData.mapRegion}
                onRegionChangeComplete={(region) => setLocationData(prev => ({ ...prev, mapRegion: region }))}
                onPress={(e) => setLocationData(prev => ({
                    ...prev,
                    markerPosition: e.nativeEvent.coordinate
                }))}
            >
                {locationData.markerPosition && (
                    <Marker coordinate={locationData.markerPosition} />
                )}
            </MapView>

            <View style={mapStyles.buttonContainer}>
                <TouchableOpacity
                    style={mapStyles.confirmButton}
                    onPress={() => {
                        if (locationData.markerPosition) {
                            const coordinates = `${locationData.markerPosition.latitude},${locationData.markerPosition.longitude}`;
                            handleLocationConfirm(coordinates);
                        }
                    }}
                    disabled={!locationData.markerPosition}
                >
                    <Text style={mapStyles.buttonText}>Подтвердить</Text>
                </TouchableOpacity>
            </View>
        </View>
    ));

    return (
        <SafeAreaView style={styles.container}>
            <AddStopHeader />

            <StopForm
                districts={districtsForDropdown}
                onMapOpen={handleMapModalOpen}
                locationData={locationData}
                setLocationData={setLocationData}
                formSubmitted={formSubmitted}
                setFormSubmitted={setFormSubmitted}
                userRole={userRole}
                isLocationLoading={isLocationLoading}
                setIsLocationLoading={setIsLocationLoading}
                addressFromMap={addressFromMap}
            />

            <ReusableModal
                visible={mapModalVisible}
                onClose={() => setMapModalVisible(false)}
                title="Выберите точку на карте"
                height={80}
                additionalStyles={mapStyles.modalContainer}
            >
                <MapContent />
            </ReusableModal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
});

const mapStyles = StyleSheet.create({
    modalContainer: {
        padding: 0,
    },
    container: {
        flex: 1,
        position: 'relative',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    },
    confirmButton: {
        backgroundColor: Color.success,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        fontSize: 16,
    },
});