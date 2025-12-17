import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, SafeAreaView } from 'react-native';
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
import { ReusableModal } from '@shared/ui/Modal';
import MapView, { Marker } from 'react-native-maps';
import { parseCoordinates } from '@/shared/lib/coordinatesHelper';

export const AddStopScreen = ({ navigation, route }) => {
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
            }
        } catch (error) {
            // Ошибка при обработке координат
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
                // Ошибка при загрузке начальных данных
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

    if ((isLoading || isDistrictLoading) && !formSubmitted && districts.length === 0) {
        return <LoadingState />;
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