import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import {
    selectDriverLoading,
    selectDriverError,
    clearDriverError,
    fetchRouteAssignees
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
    updateStop,
    fetchAllStops,
    clearStopCache,
    activateStop,
    skipStop,
    completeStop,
    cancelStop
} from "@entities/stop";
import { parseCoordinates } from '@/shared/lib/coordinatesHelper';
import { EditStopHeader } from './EditStopHeader';
import { ReusableModal } from '@shared/ui/Modal';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ThemedStatusBar } from '@shared/ui/ThemedStatusBar/ThemedStatusBar';

export const EditStopScreen = ({ route, navigation }) => {
    const dispatch = useDispatch();
    const { stopId, selectedLocation, addressString, timestamp, navId } = route.params || {};
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const mapStyles = useMemo(() => createMapStyles(colors, isDark), [colors, isDark]);

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
    const userRole = useSelector(state => state.auth?.user?.role || 'DRIVER');
    const routeAssignees = useSelector(state => state.driver?.routeAssignees || []);
    const districts = useSelector(selectDistricts);
    const districtsForDropdown = useSelector(selectDistrictsForDropdown);
    const error = useSelector(selectDriverError);
    const [stopWithProducts, setStopWithProducts] = useState(null);
    const scheduleCacheRef = useRef({});
    const scheduleLoadRef = useRef({});
    const [isLifecycleLoading, setIsLifecycleLoading] = useState(false);
    const isAdminOrEmployee = userRole === 'ADMIN' || userRole === 'EMPLOYEE';
    const isDriver = userRole === 'DRIVER';

    const resolvedStopData = useMemo(() => {
        const base = stopWithProducts || stopData;
        if (!base) {
            return null;
        }

        const hasSchedule = Array.isArray(base?.schedule?.daysOfWeek) && base.schedule.daysOfWeek.length > 0;
        if (hasSchedule) {
            scheduleCacheRef.current[base.id] = base.schedule;
        }

        if (!base.schedule && scheduleCacheRef.current[base.id]) {
            return { ...base, schedule: scheduleCacheRef.current[base.id] };
        }

        return base;
    }, [stopWithProducts, stopData]);

    useEffect(() => {
        const loadStopProducts = async () => {
            if (stopData && stopId && (!stopData.products || stopData.products.length === 0)) {
                try {
                    const { stopApi } = await import('@entities/stop/api/stopApi');
                    const response = await stopApi.getStopProducts(stopId);
                    if (response?.data?.data?.products) {
                        setStopWithProducts({
                            ...stopData,
                            products: response.data.data.products
                        });
                    } else {
                        setStopWithProducts(stopData);
                    }
                } catch (err) {
                    console.error('Ошибка загрузки товаров остановки:', err);
                    setStopWithProducts(stopData);
                }
            } else {
                setStopWithProducts(stopData);
            }
        };

        if (stopData) {
            loadStopProducts();
        }
    }, [stopData, stopId]);

    useEffect(() => {
        if (!stopId || !stopData) {
            return;
        }

        const scheduleDays = stopData?.schedule?.daysOfWeek;
        const hasSchedule = Array.isArray(scheduleDays) && scheduleDays.length > 0;

        if (hasSchedule || scheduleLoadRef.current[stopId]) {
            return;
        }

        scheduleLoadRef.current[stopId] = true;

        if (userRole === 'DRIVER') {
            dispatch(fetchDriverStops());
        } else if (isAdminOrEmployee && stopData.driverId) {
            dispatch(fetchDriverStops(stopData.driverId));
        }
    }, [dispatch, stopId, stopData, userRole, isAdminOrEmployee]);


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

    useEffect(() => {
        if (isAdminOrEmployee && routeAssignees.length === 0) {
            dispatch(fetchRouteAssignees());
        }
    }, [dispatch, isAdminOrEmployee, routeAssignees.length]);

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
            .then(async (result) => {
                dispatch(clearStopCache());
                await dispatch(fetchAllStops());
                return result;
            })
            .catch((error) => {
                throw error;
            });
    };

    const stopStatus = (stopWithProducts?.status || stopData?.status || 'SCHEDULED').toUpperCase();

    const refreshStops = useCallback(async () => {
        dispatch(clearStopCache());
        await dispatch(fetchAllStops());
        if (isDriver) {
            dispatch(fetchDriverStops());
        }
    }, [dispatch, isDriver]);

    const runLifecycleAction = useCallback(async (actionType) => {
        if (isLifecycleLoading) return;
        setIsLifecycleLoading(true);
        try {
            if (actionType === 'activate') {
                await dispatch(activateStop(stopId)).unwrap();
            } else if (actionType === 'skip') {
                await dispatch(skipStop({ stopId })).unwrap();
            } else if (actionType === 'complete') {
                await dispatch(completeStop(stopId)).unwrap();
            } else if (actionType === 'cancel') {
                await dispatch(cancelStop({ stopId })).unwrap();
            }
            await refreshStops();
        } catch (error) {
            Alert.alert('Ошибка', error?.message || 'Не удалось обновить статус остановки');
        } finally {
            setIsLifecycleLoading(false);
        }
    }, [dispatch, stopId, isLifecycleLoading, refreshStops]);

    const confirmAction = useCallback((title, message, actionType) => {
        Alert.alert(title, message, [
            { text: 'Отмена', style: 'cancel' },
            { text: 'Продолжить', style: 'destructive', onPress: () => runLifecycleAction(actionType) }
        ]);
    }, [runLifecycleAction]);


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

    const MapContent = React.memo(({
        locationData,
        setLocationData,
        handleMapCancel,
        handleLocationConfirm
    }) => {
        const mapRef = useRef(null);
        const regionUpdateTimeoutRef = useRef(null);

        return (
            <View style={mapStyles.container}>
                <TouchableOpacity
                    style={mapStyles.backButton}
                    onPress={handleMapCancel}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <View style={mapStyles.backButtonCircle}>
                        <Text style={mapStyles.backButtonText}>✕</Text>
                    </View>
                </TouchableOpacity>

                <MapView
                    ref={mapRef}
                    style={mapStyles.map}
                    initialRegion={locationData.mapRegion}
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
        );
    });

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <ThemedStatusBar />
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
                {isScreenFocused && resolvedStopData && (
                    <EditStopForm
                        stopData={{
                            ...resolvedStopData,
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
                        useModalMap={true}
                        isLocationLoading={isLocationLoading}
                        setIsLocationLoading={setIsLocationLoading}
                        addressFromMap={addressFromMap}
                    />
                )}

                {(isDriver || isAdminOrEmployee) && (
                    <View style={styles.lifecycleSection}>
                        <Text style={styles.lifecycleTitle}>Статус остановки</Text>
                        <View style={styles.lifecycleActions}>
                            {stopStatus === 'SCHEDULED' && (
                                <>
                                    <TouchableOpacity
                                        style={[styles.lifecycleButton, styles.lifecyclePrimary, isLifecycleLoading && styles.lifecycleDisabled]}
                                        onPress={() => runLifecycleAction('activate')}
                                        disabled={isLifecycleLoading}
                                    >
                                        <Text style={styles.lifecycleButtonTextPrimary}>Активировать</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.lifecycleButton, styles.lifecycleWarning, isLifecycleLoading && styles.lifecycleDisabled]}
                                        onPress={() => confirmAction('Пропустить остановку', 'Остановка не будет показана в канале маршрутов.', 'skip')}
                                        disabled={isLifecycleLoading}
                                    >
                                        <Text style={styles.lifecycleWarningText}>Пропустить</Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            {stopStatus === 'ACTIVE' && (
                                <>
                                    <TouchableOpacity
                                        style={[styles.lifecycleButton, styles.lifecyclePrimary, isLifecycleLoading && styles.lifecycleDisabled]}
                                        onPress={() => runLifecycleAction('complete')}
                                        disabled={isLifecycleLoading}
                                    >
                                        <Text style={styles.lifecycleButtonTextPrimary}>Завершить</Text>
                                    </TouchableOpacity>
                                    {isAdminOrEmployee && (
                                        <TouchableOpacity
                                            style={[styles.lifecycleButton, styles.lifecycleDanger, isLifecycleLoading && styles.lifecycleDisabled]}
                                            onPress={() => confirmAction('Отменить остановку', 'Остановка будет отменена и удалена из канала.', 'cancel')}
                                            disabled={isLifecycleLoading}
                                        >
                                            <Text style={styles.lifecycleDangerText}>Отменить</Text>
                                        </TouchableOpacity>
                                    )}
                                </>
                            )}

                            {stopStatus === 'SCHEDULED' && isAdminOrEmployee && (
                                <TouchableOpacity
                                    style={[styles.lifecycleButton, styles.lifecycleDanger, isLifecycleLoading && styles.lifecycleDisabled]}
                                    onPress={() => confirmAction('Отменить остановку', 'Остановка будет отменена и удалена из канала.', 'cancel')}
                                    disabled={isLifecycleLoading}
                                >
                                    <Text style={styles.lifecycleDangerText}>Отменить</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>

            <ReusableModal
                visible={mapModalVisible}
                onClose={handleMapCancel}
                title="Выберите точку на карте"
                height={80}
                additionalStyles={mapStyles.modalContainer}
            >
                <MapContent
                    locationData={locationData}
                    setLocationData={setLocationData}
                    handleMapCancel={handleMapCancel}
                    handleLocationConfirm={handleLocationConfirm}
                />
            </ReusableModal>
        </SafeAreaView>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    lifecycleSection: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    lifecycleTitle: {
        fontSize: 16,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 12,
    },
    lifecycleActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    lifecycleButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: isDark ? colors.border : '#E0E0E0',
        backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
    },
    lifecyclePrimary: {
        backgroundColor: isDark ? '#2E8F4A' : Color.success,
        borderColor: isDark ? '#2E8F4A' : Color.success,
    },
    lifecycleWarning: {
        backgroundColor: isDark ? 'rgba(255, 183, 77, 0.15)' : '#FFF3E0',
        borderColor: isDark ? 'rgba(255, 183, 77, 0.5)' : '#FFB74D',
    },
    lifecycleDanger: {
        backgroundColor: isDark ? 'rgba(239, 83, 80, 0.15)' : '#FFEBEE',
        borderColor: isDark ? 'rgba(239, 83, 80, 0.6)' : '#EF5350',
    },
    lifecycleDisabled: {
        opacity: 0.6,
    },
    lifecycleButtonText: {
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        fontSize: 14,
        color: isDark ? colors.textPrimary : '#424242',
    },
    lifecycleWarningText: {
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        fontSize: 14,
        color: isDark ? '#FFB74D' : '#424242',
    },
    lifecycleDangerText: {
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        fontSize: 14,
        color: isDark ? '#EF5350' : '#424242',
    },
    lifecycleButtonTextPrimary: {
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        fontSize: 14,
        color: '#FFFFFF',
    },
});

const createMapStyles = (colors, isDark) => StyleSheet.create({
    modalContainer: {
        padding: 0,
    },
    container: {
        flex: 1,
        position: 'relative',
        backgroundColor: colors.background,
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 10,
    },
    backButtonCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: isDark ? 'rgba(37, 40, 54, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: isDark ? 0.4 : 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    backButtonText: {
        fontSize: 24,
        color: isDark ? colors.textPrimary : '#333',
        fontWeight: '600',
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
        shadowOpacity: isDark ? 0.35 : 0.15,
        shadowRadius: 3.84,
        elevation: 5,
    },
    confirmButton: {
        backgroundColor: isDark ? '#2E8F4A' : Color.success,
    },
    cancelButton: {
        backgroundColor: isDark ? colors.surfaceElevated : '#ffffff',
        borderWidth: 1.5,
        borderColor: isDark ? '#2E8F4A' : Color.success,
    },
    buttonDisabled: {
        backgroundColor: isDark ? '#3A3D4A' : '#cccccc',
        opacity: 0.6,
    },
    buttonText: {
        color: 'white',
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        fontSize: 16,
    },
    cancelButtonText: {
        color: isDark ? '#5FC984' : Color.success,
    },
    hintContainer: {
        position: 'absolute',
        top: 70,
        left: 20,
        right: 20,
        backgroundColor: isDark ? 'rgba(14, 15, 20, 0.85)' : 'rgba(0, 0, 0, 0.75)',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    hintText: {
        color: 'white',
        fontFamily: FontFamily.sFProText,
        fontSize: 14,
        textAlign: 'center',
    },
});
