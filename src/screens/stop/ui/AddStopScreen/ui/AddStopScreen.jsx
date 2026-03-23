import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';

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
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';

const MapContent = React.memo(({
    mapRef,
    locationData,
    setLocationData,
    handleMapCancel,
    handleLocationConfirm,
    onDetectLocation,
    isLocationLoading,
    onMapReady
}) => (
    <View style={mapStyles.container}>
        <MapView
            ref={mapRef}
            style={mapStyles.map}
            initialRegion={locationData.mapRegion}
            onMapReady={onMapReady}
            onRegionChangeComplete={(region) =>
                setLocationData(prev => ({ ...prev, mapRegion: region }))
            }
            onPress={(e) => {
                const coordinate = e?.nativeEvent?.coordinate;
                if (!coordinate) {
                    return;
                }
                const { latitude, longitude } = coordinate;
                setLocationData(prev => ({
                    ...prev,
                    markerPosition: { latitude, longitude }
                }));
            }}
        >
            {locationData.markerPosition && (
                <Marker coordinate={locationData.markerPosition} />
            )}
        </MapView>

        <View style={mapStyles.buttonContainer}>
            <TouchableOpacity
                style={[mapStyles.button, mapStyles.cancelButton]}
                onPress={handleMapCancel}
                activeOpacity={0.7}
            >
                <Text style={[mapStyles.buttonText, mapStyles.cancelButtonText]}>Отмена</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
                style={[mapStyles.button, mapStyles.confirmButton, !locationData.markerPosition && mapStyles.buttonDisabled]}
                onPress={() => {
                    if (locationData.markerPosition) {
                        const coordinates = `${locationData.markerPosition.latitude},${locationData.markerPosition.longitude}`;
                        handleLocationConfirm(coordinates);
                    }
                }}
                disabled={!locationData.markerPosition}
                activeOpacity={0.7}
            >
                <Text style={mapStyles.buttonText}>Подтвердить</Text>
            </TouchableOpacity>
        </View>

        <TouchableOpacity
            style={[mapStyles.myLocationButton, isLocationLoading && mapStyles.buttonDisabled]}
            onPress={onDetectLocation}
            disabled={isLocationLoading}
            activeOpacity={0.7}
        >
            <Text style={mapStyles.myLocationButtonText}>
                {isLocationLoading ? 'Определяем...' : 'Мое местоположение'}
            </Text>
        </TouchableOpacity>

        {!locationData.markerPosition && (
            <View style={mapStyles.hintContainer}>
                <Text style={mapStyles.hintText}>Нажмите на карту для выбора точки</Text>
            </View>
        )}
    </View>
));

export const AddStopScreen = ({ navigation, route }) => {
    const prevRouteParamsRef = useRef(null);
    const isProcessingRouteParams = useRef(false);
    const isInitialized = useRef(false);
    const lastUpdateTime = useRef(0);

    const dispatch = useDispatch();
    const { showAlert, showWarning, showError } = useCustomAlert();
    const isLoading = useSelector(selectDriverLoading);
    const isDistrictLoading = useSelector(selectDistrictLoading);
    const error = useSelector(selectDriverError);
    const districts = useSelector(selectDistricts);
    const districtsForDropdown = useSelector(selectDistrictsForDropdown);
    const userRole = useSelector(state => state.auth?.user?.role || 'DRIVER');

    const [formSubmitted, setFormSubmitted] = useState(false);
    const [mapModalVisible, setMapModalVisible] = useState(false);
    const [isLocationLoading, setIsLocationLoading] = useState(false);
    const mapRef = useRef(null);
    const mapReadyRef = useRef(false);
    const pendingRegionRef = useRef(null);
    const [locationData, setLocationData] = useState({
        mapRegion: {
            latitude: 43.2269,
            longitude: 44.7646,
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

    const formatAddressFromGeocode = useCallback((address) => {
        if (!address) return '';
        const locality = address.city || address.district || address.subregion || '';
        const street = address.street || address.name || '';
        const house = address.streetNumber || '';
        const streetLine = [street, house].filter(Boolean).join(' ');
        return [locality, streetLine].filter(Boolean).join(', ');
    }, []);

    const fetchAddressByCoordinates = useCallback(async (latitude, longitude) => {
        try {
            const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
            return formatAddressFromGeocode(address);
        } catch (error) {
            console.warn('Ошибка при определении адреса:', error?.message || error);
            return '';
        }
    }, [formatAddressFromGeocode]);

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

        isProcessingRouteParams.current = true;
        prevRouteParamsRef.current = { ...route.params };

        const locationString = route.params.selectedLocation;
        const addressString = route.params.addressString;

        if (locationString) {
            handleLocationUpdate(locationString);
        }
        
        if (addressString) {
            setAddressFromMap(addressString);
        }

        setTimeout(() => {
            navigation.setParams({
                selectedLocation: undefined,
                addressString: undefined,
                timestamp: undefined
            });

            isProcessingRouteParams.current = false;

        }, 300);
    }, [route.params, handleLocationUpdate, navigation, addressFromMap, locationData.mapLocation]);

    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;

        const loadInitialData = async () => {
            try {
                const promises = [dispatch(fetchAllDistricts())];

                if (isAdminOrEmployee) {
                    promises.push(dispatch(fetchAllDrivers()));
                }

                await Promise.all(promises);

            } catch (error) {
                logData('AddStopScreen: Ошибка при загрузке начальных данных', error);
            }
        };

        loadInitialData();
    }, [dispatch, isAdminOrEmployee]);

    useFocusEffect(
        React.useCallback(() => {
            if (error) {
                dispatch(clearDriverError());
            }
            return () => {
                setFormSubmitted(false);
            };
        }, [dispatch, error])
    );

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

                    const targetRegion = {
                        latitude: lat,
                        longitude: lng,
                        latitudeDelta: locationData.mapRegion.latitudeDelta || 0.01,
                        longitudeDelta: locationData.mapRegion.longitudeDelta || 0.01
                    };

                    if (mapReadyRef.current) {
                        animateToRegionSafe(targetRegion);
                    } else {
                        pendingRegionRef.current = targetRegion;
                    }
                }
            } catch (error) {
                logData('AddStopScreen: Ошибка при обработке существующих координат', error);
            }
        }
        setMapModalVisible(true);
    }, [animateToRegionSafe, locationData.mapRegion.latitudeDelta, locationData.mapRegion.longitudeDelta]);

    const handleLocationConfirm = useCallback(async (coordinates) => {
        handleLocationUpdate(coordinates);
        setMapModalVisible(false);

        try {
            const [lat, lng] = coordinates.split(',').map(coord => parseFloat(coord.trim()));
            if (!isNaN(lat) && !isNaN(lng)) {
                setIsLocationLoading(true);
                const formattedAddress = await fetchAddressByCoordinates(lat, lng);
                if (formattedAddress) {
                    setAddressFromMap(formattedAddress);
                }
            }
        } finally {
            setIsLocationLoading(false);
        }
    }, [handleLocationUpdate, fetchAddressByCoordinates]);

    const handleMapCancel = useCallback(() => {
        setMapModalVisible(false);
    }, []);

    const animateToRegionSafe = useCallback((targetRegion) => {
        if (!targetRegion) return;
        const animate = () => {
            if (mapRef.current?.animateToRegion) {
                mapRef.current.animateToRegion(targetRegion, 600);
            } else if (mapRef.current?.animateCamera) {
                mapRef.current.animateCamera({
                    center: {
                        latitude: targetRegion.latitude,
                        longitude: targetRegion.longitude
                    }
                }, { duration: 600 });
            }
        };

        requestAnimationFrame(animate);
        setTimeout(animate, 300);
    }, []);

    const handleDetectCurrentLocation = useCallback(async () => {
        const openLocationSettings = async () => {
            try {
                await Linking.openSettings();
            } catch (settingsError) {
                logData('AddStopScreen: Ошибка открытия настроек геолокации', settingsError);
                showError('Ошибка', 'Не удалось открыть настройки. Откройте их вручную и выдайте доступ к геолокации.');
            }
        };

        const showLocationPermissionAlert = () => {
            showAlert({
                type: 'warning',
                title: 'Доступ к геолокации',
                message: 'Разрешите доступ к местоположению в настройках устройства, чтобы определить текущую позицию.',
                buttons: [
                    {
                        text: 'Открыть настройки',
                        style: 'primary',
                        onPress: () => setTimeout(() => openLocationSettings(), 250),
                    },
                    { text: 'Отмена', style: 'cancel' }
                ],
                autoClose: false,
                showCloseButton: true,
            });
        };

        const ensureLocationPermission = async () => {
            let permission = await Location.getForegroundPermissionsAsync();

            if (permission.status === 'granted') {
                return true;
            }

            if (permission.canAskAgain) {
                permission = await Location.requestForegroundPermissionsAsync();
                if (permission.status === 'granted') {
                    return true;
                }
            }

            if (Platform.OS === 'ios') {
                showLocationPermissionAlert();
            } else {
                showWarning(
                    'Доступ к геолокации',
                    'Разрешите доступ к местоположению, чтобы определить текущую позицию.'
                );
            }

            return false;
        };

        try {
            if (isLocationLoading) return;
            setIsLocationLoading(true);

            const hasPermission = await ensureLocationPermission();
            if (!hasPermission) {
                return;
            }

            const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
            });
            const { latitude, longitude } = position.coords;
            const coordinates = `${latitude},${longitude}`;

            const formattedAddress = await fetchAddressByCoordinates(latitude, longitude);

            setLocationData(prev => ({
                ...prev,
                mapLocation: coordinates,
                markerPosition: { latitude, longitude },
                mapRegion: {
                    ...prev.mapRegion,
                    latitude,
                    longitude
                }
            }));

            if (formattedAddress) {
                setAddressFromMap(formattedAddress);
            }

            const targetRegion = {
                latitude,
                longitude,
                latitudeDelta: locationData.mapRegion.latitudeDelta || 0.01,
                longitudeDelta: locationData.mapRegion.longitudeDelta || 0.01
            };

            if (mapReadyRef.current && mapRef.current?.animateToRegion) {
                animateToRegionSafe(targetRegion);
            } else {
                pendingRegionRef.current = targetRegion;
            }
        } catch (error) {
            console.warn('Ошибка при определении местоположения:', error?.message || error);
            showError('Ошибка', 'Не удалось определить местоположение. Попробуйте еще раз.');
        } finally {
            setIsLocationLoading(false);
        }
    }, [
        animateToRegionSafe,
        fetchAddressByCoordinates,
        isLocationLoading,
        locationData.mapRegion.latitudeDelta,
        locationData.mapRegion.longitudeDelta,
        showAlert,
        showError,
        showWarning
    ]);

    const handleMapReady = useCallback(() => {
        mapReadyRef.current = true;
        const pendingRegion = pendingRegionRef.current;
        if (pendingRegion) {
            animateToRegionSafe(pendingRegion);
            pendingRegionRef.current = null;
        }
    }, [animateToRegionSafe]);

    if ((isLoading || isDistrictLoading) && !formSubmitted && districts.length === 0) {
        return <LoadingState />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <AddStopHeader />
            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                showsHorizontalScrollIndicator={false}
                scrollEnabled={true}
                bounces={true}
                nestedScrollEnabled={true}
                automaticallyAdjustContentInsets={false}
                contentInsetAdjustmentBehavior="never"
                contentInset={{ top: 0, left: 0, bottom: 0, right: 0 }}
                keyboardDismissMode="on-drag"
                scrollEventThrottle={16}
            >
                <StopForm
                    districts={districtsForDropdown}
                    onMapOpen={handleMapModalOpen}
                    useModalMap={true}
                    locationData={locationData}
                    setLocationData={setLocationData}
                    formSubmitted={formSubmitted}
                    setFormSubmitted={setFormSubmitted}
                    userRole={userRole}
                    isLocationLoading={isLocationLoading}
                    setIsLocationLoading={setIsLocationLoading}
                    addressFromMap={addressFromMap}
                />
            </ScrollView>

            <ReusableModal
                visible={mapModalVisible}
                onClose={handleMapCancel}
                title="Выберите точку на карте"
                height={80}
                additionalStyles={mapStyles.modalContainer}
            >
                <MapContent
                    mapRef={mapRef}
                    locationData={locationData}
                    setLocationData={setLocationData}
                    handleMapCancel={handleMapCancel}
                    handleLocationConfirm={handleLocationConfirm}
                    onDetectLocation={handleDetectCurrentLocation}
                    isLocationLoading={isLocationLoading}
                    onMapReady={handleMapReady}
                />
            </ReusableModal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 250,
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
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 3.84,
        elevation: 5,
    },
    confirmButton: {
        backgroundColor: Color.success,
    },
    cancelButton: {
        backgroundColor: '#ffffff',
        borderWidth: 1.5,
        borderColor: Color.success,
    },
    buttonDisabled: {
        backgroundColor: '#cccccc',
        opacity: 0.6,
    },
    buttonText: {
        color: 'white',
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        fontSize: 16,
    },
    cancelButtonText: {
        color: Color.success,
    },
    hintContainer: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    hintText: {
        color: 'white',
        fontFamily: FontFamily.sFProText,
        fontSize: 14,
        textAlign: 'center',
    },
    myLocationButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: '#ffffff',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
        zIndex: 10,
    },
    myLocationButtonText: {
        color: '#000',
        fontFamily: FontFamily.sFProText,
        fontSize: 12,
        fontWeight: '600',
    },
});