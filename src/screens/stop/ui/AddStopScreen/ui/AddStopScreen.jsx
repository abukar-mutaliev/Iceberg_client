import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, Alert, ActivityIndicator, Dimensions, TouchableOpacity, Text } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import {
    fetchDriverDistricts,
    selectDriverDistricts,
    selectDriverError,
    selectDriverLoading,
    clearDriverError,
    fetchAllDrivers // Добавляем импорт для получения всех водителей
} from "@entities/driver";
import { AddStopHeader } from './AddStopHeader';
import { LoadingState } from '@shared/ui/states/LoadingState';
import { StopForm } from "@features/driver/addDriverStop";
import { logData } from '@shared/lib/logger';
import { ReusableModal } from '@shared/ui/Modal';
import MapView, { Marker } from 'react-native-maps';

export const AddStopScreen = ({ navigation, route }) => {
    const dispatch = useDispatch();
    const isLoading = useSelector(selectDriverLoading);
    const error = useSelector(selectDriverError);
    const districts = useSelector(selectDriverDistricts);
    const userRole = useSelector(state => state.auth?.user?.role || 'DRIVER');
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [mapModalVisible, setMapModalVisible] = useState(false);
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

    const isAdminOrEmployee = userRole === 'ADMIN' || userRole === 'EMPLOYEE';

    // Отслеживаем параметры навигации для получения координат от MapScreen
    useEffect(() => {
        if (route.params?.selectedLocation) {
            const locationString = route.params.selectedLocation;
            logData('AddStopScreen: Получены координаты из параметров навигации', locationString);

            handleLocationUpdate(locationString);

            // Очищаем параметры, чтобы избежать повторной обработки
            navigation.setParams({ selectedLocation: undefined, timestamp: undefined });
        }
    }, [route.params?.selectedLocation, route.params?.timestamp]);

    // Функция для обновления координат
    const handleLocationUpdate = (coordinates) => {
        try {
            const [lat, lng] = coordinates.split(',').map(coord => parseFloat(coord.trim()));

            if (!isNaN(lat) && !isNaN(lng)) {
                setLocationData(prev => ({
                    ...prev,
                    mapLocation: coordinates,
                    markerPosition: { latitude: lat, longitude: lng },
                    mapRegion: {
                        ...prev.mapRegion,
                        latitude: lat,
                        longitude: lng
                    }
                }));
                logData('AddStopScreen: Координаты успешно обновлены', coordinates);
            } else {
                logData('AddStopScreen: Неверный формат координат', coordinates);
            }
        } catch (error) {
            logData('AddStopScreen: Ошибка при обработке координат', error);
        }
    };

    // Загружаем районы и список водителей (если пользователь админ или сотрудник)
    useEffect(() => {
        dispatch(fetchDriverDistricts());

        // Если пользователь админ или сотрудник, загружаем список всех водителей
        if (isAdminOrEmployee) {
            dispatch(fetchAllDrivers());
        }
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

    // Обработчики для карты
    const handleMapModalOpen = (existingLocation) => {
        if (existingLocation) {
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
        }
        setMapModalVisible(true);
    };

    const handleLocationConfirm = (coordinates, address) => {
        handleLocationUpdate(coordinates);
        setMapModalVisible(false);
    };

    // Отображение загрузки
    if (isLoading && !formSubmitted && districts.length === 0) {
        return <LoadingState />;
    }

    // Компонент карты для модального окна
    const MapContent = () => (
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
    );

    return (
        <SafeAreaView style={styles.container}>
            <AddStopHeader />

            <StopForm
                districts={districts}
                onMapOpen={handleMapModalOpen}
                locationData={locationData}
                setLocationData={setLocationData}
                formSubmitted={formSubmitted}
                setFormSubmitted={setFormSubmitted}
                userRole={userRole}
            />

            {/* Используем ReusableModal вместо MapModalContainer */}
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
        backgroundColor: Color.main,
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