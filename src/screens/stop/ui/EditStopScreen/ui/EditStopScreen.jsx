import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, SafeAreaView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
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
import { EditStopForm } from "@features/driver/editDriverStop";
import {
    fetchDriverStops,
    selectStopById,
    updateStop
} from "@entities/stop";
import { parseCoordinates } from '@/shared/lib/coordinatesHelper';
import { EditStopHeader } from './EditStopHeader';
import { ReusableModal } from '@shared/ui/Modal';
import MapView, { Marker } from 'react-native-maps';

export const EditStopScreen = ({ route, navigation }) => {
    const dispatch = useDispatch();
    const { stopId, selectedLocation, addressString, timestamp, navId } = route.params || {};

    const lastParamsRef = useRef({ selectedLocation, addressString, timestamp, navId });
    const prevLocationRef = useRef(selectedLocation);

    const [currentLocation, setCurrentLocation] = useState(selectedLocation);
    const [currentAddress, setCurrentAddress] = useState(addressString);

    const [locationChanged, setLocationChanged] = useState(false);
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
    const lastUpdateTime = useRef(0);

    useEffect(() => {
        const hasChanged = selectedLocation !== lastParamsRef.current.selectedLocation ||
            addressString !== lastParamsRef.current.addressString ||
            timestamp !== lastParamsRef.current.timestamp ||
            navId !== lastParamsRef.current.navId;

        if (hasChanged && selectedLocation && selectedLocation !== prevLocationRef.current) {
            try {
                const parsedCoords = parseCoordinates(selectedLocation);
                
                if (parsedCoords) {
                    const formattedLocation = `${parsedCoords.latitude},${parsedCoords.longitude}`;
                    setCurrentLocation(formattedLocation);
                } else {
                    setCurrentLocation(selectedLocation);
                }
            } catch (error) {
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
            dispatch(fetchDriverStops())
                .then(() => setInitialLoadComplete(true))
                .catch(() => setInitialLoadComplete(true));
        } else {
            setInitialLoadComplete(true);
        }
    }, [dispatch, stopId, stopData, navigation]);

    useFocusEffect(
        React.useCallback(() => {
            setIsScreenFocused(true);

            if (error) {
                dispatch(clearDriverError());
            }

            return () => {
                setIsScreenFocused(false);
            };
        }, [dispatch, error])
    );

    useEffect(() => {
        if (districts.length === 0) {
            dispatch(fetchAllDistricts());
        }
    }, [dispatch, districts.length]);

    // Инициализация locationData из stopData
    useEffect(() => {
        if (stopData?.mapLocation && (!locationData.mapLocation || locationData.mapLocation === '')) {
            try {
                const [lat, lng] = stopData.mapLocation.split(',').map(coord => parseFloat(coord.trim()));
                if (!isNaN(lat) && !isNaN(lng)) {
                    setLocationData(prev => ({
                        ...prev,
                        mapLocation: stopData.mapLocation,
                        markerPosition: { latitude: lat, longitude: lng },
                        mapRegion: {
                            ...prev.mapRegion,
                            latitude: lat,
                            longitude: lng
                        }
                    }));
                    setCurrentLocation(stopData.mapLocation);
                }
            } catch (error) {
                // Ошибка при инициализации координат
            }
        }
        if (stopData?.address && !addressFromMap) {
            setAddressFromMap(stopData.address);
            setCurrentAddress(stopData.address);
        }
    }, [stopData?.mapLocation, stopData?.address]);

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
                setCurrentLocation(coordinates);
            }
        } catch (error) {
            // Ошибка при обработке координат
        }
    }, []);

    // Обработка параметров маршрута
    useEffect(() => {
        if (selectedLocation && selectedLocation !== prevLocationRef.current) {
            handleLocationUpdate(selectedLocation);
            prevLocationRef.current = selectedLocation;
        }
        if (addressString) {
            setAddressFromMap(addressString);
            setCurrentAddress(addressString);
        }
    }, [selectedLocation, addressString, handleLocationUpdate]);

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
                // Ошибка при обработке существующих координат
            }
        }
        setMapModalVisible(true);
    }, []);

    const handleLocationConfirm = useCallback((coordinates) => {
        handleLocationUpdate(coordinates);
        setMapModalVisible(false);
    }, [handleLocationUpdate]);

    const handleMapCancel = useCallback(() => {
        setMapModalVisible(false);
    }, []);

    const handleClose = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('StopsScreen');
        }
    };

    const handleSave = (formData) => {
        return dispatch(updateStop({ stopId, stopData: formData }))
            .unwrap()
            .then((result) => {
                return result;
            })
            .catch((error) => {
                throw error;
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

    let availableDistricts = districtsForDropdown;

    if (availableDistricts.length === 0 && stopData?.district) {
        availableDistricts = [{
            id: stopData.district.id,
            name: stopData.district.name,
            value: stopData.district.id,
            label: stopData.district.name
        }];
    }

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

            {!locationData.markerPosition && (
                <View style={mapStyles.hintContainer}>
                    <Text style={mapStyles.hintText}>Нажмите на карту для выбора точки</Text>
                </View>
            )}
        </View>
    ));

    return (
        <SafeAreaView style={styles.container}>
            <EditStopHeader />
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
                {isScreenFocused && stopData && (
                    <EditStopForm
                        stopData={{
                            ...stopData,
                            ...(currentLocation ? { mapLocation: currentLocation } : {}),
                            ...(currentAddress ? { address: currentAddress } : {}),
                            ...(locationData.mapLocation ? { mapLocation: locationData.mapLocation } : {})
                        }}
                        onClose={handleClose}
                        onSave={handleSave}
                        districts={availableDistricts}
                        key={formKey}
                        locationChanged={locationChanged}
                        renderAsScreen={true}
                        locationData={locationData}
                        setLocationData={setLocationData}
                        onMapOpen={handleMapModalOpen}
                        isLocationLoading={isLocationLoading}
                        setIsLocationLoading={setIsLocationLoading}
                        addressFromMap={addressFromMap}
                    />
                )}
            </ScrollView>

            <ReusableModal
                visible={mapModalVisible}
                onClose={handleMapCancel}
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
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
});