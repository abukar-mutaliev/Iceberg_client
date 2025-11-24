import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Platform, Alert, Linking, TouchableWithoutFeedback } from 'react-native';
import { useSelector } from 'react-redux';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import UniversalMapView, { Marker } from '@shared/ui/Map/UniversalMapView';
import { selectUser } from '@entities/auth/model/selectors';
import { formatTimeRange } from "@shared/lib/dateFormatters";
import { getBaseUrl } from '@shared/api/api';
import { logData } from '@shared/lib/logger';
import {BackButton} from "@shared/ui/Button/BackButton";
import { StopProductsList } from '@entities/stop/ui/StopProductsList';

const placeholderImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };

const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;

    if (typeof photoPath !== 'string') {
        return photoPath.uri;
    }

    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
        const url = photoPath.replace('https://', 'http://');
        return url;
    }

    const baseUrl = getBaseUrl();
    const fullUrl = `${baseUrl}${photoPath}`;
    return fullUrl;
};

// Безопасная функция для парсинга координат
const parseMapLocation = (mapLocation) => {
    if (!mapLocation) {
        return null;
    }

    try {
        // Если это уже объект с координатами
        if (typeof mapLocation === 'object' && mapLocation.latitude && mapLocation.longitude) {
            const lat = parseFloat(mapLocation.latitude);
            const lng = parseFloat(mapLocation.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                return { latitude: lat, longitude: lng };
            }
        }

        // Если это строка
        if (typeof mapLocation === 'string') {
            const trimmed = mapLocation.trim();

            // Пробуем парсить как JSON
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                try {
                    const parsed = JSON.parse(trimmed);

                    // Если это массив [lat, lng]
                    if (Array.isArray(parsed) && parsed.length >= 2) {
                        const lat = parseFloat(parsed[0]);
                        const lng = parseFloat(parsed[1]);
                        if (!isNaN(lat) && !isNaN(lng)) {
                            return { latitude: lat, longitude: lng };
                        }
                    }

                    // Если это объект с latitude/longitude
                    if (parsed && typeof parsed === 'object') {
                        const lat = parseFloat(parsed.latitude || parsed.lat);
                        const lng = parseFloat(parsed.longitude || parsed.lng);
                        if (!isNaN(lat) && !isNaN(lng)) {
                            return { latitude: lat, longitude: lng };
                        }
                    }
                } catch (jsonError) {
                    // Продолжаем с другими форматами
                }
            }

            // Пробуем формат "lat,lng"
            if (trimmed.includes(',')) {
                const parts = trimmed.split(',');
                if (parts.length >= 2) {
                    const lat = parseFloat(parts[0].trim());
                    const lng = parseFloat(parts[1].trim());
                    if (!isNaN(lat) && !isNaN(lng)) {
                        return { latitude: lat, longitude: lng };
                    }
                }
            }

            // Пробуем извлечь координаты с помощью регулярного выражения
            const regex = /latitude"?:\s*(-?\d+\.?\d*),?\s*"?longitude"?:\s*(-?\d+\.?\d*)/i;
            const match = trimmed.match(regex);
            if (match && match[1] && match[2]) {
                const lat = parseFloat(match[1]);
                const lng = parseFloat(match[2]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    return { latitude: lat, longitude: lng };
                }
            }
        }
    } catch (error) {
        // Ошибка парсинга координат - используем координаты по умолчанию
    }

    return null;
};

export const StopDetailsContent = ({ stop, navigation }) => {
    const user = useSelector(selectUser);
    const defaultCoords = { latitude: 43.172837, longitude: 44.811913 };
    const [mapCoordinates, setMapCoordinates] = useState(defaultCoords);
    const [mapLoaded, setMapLoaded] = useState(false);
    const canEdit = ['DRIVER', 'ADMIN', 'EMPLOYEE'].includes(user?.role);


    if (!stop) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Данные остановки не найдены</Text>
            </View>
        );
    }

    const handleEditPress = () => {
        navigation.navigate('EditStop', { stopId: stop.id });
    };

    const handleMarkerPress = () => {
        const { latitude, longitude } = mapCoordinates;
        const address = stop.address || 'Остановка';

        const url = Platform.select({
            ios: `maps://app?daddr=${latitude},${longitude}&dirflg=d&saddr=Current%20Location`,
            android: `geo:${latitude},${longitude}?q=${encodeURIComponent(address)}`
        });

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
                Linking.openURL(webUrl);
            }
        }).catch(err => {
            Alert.alert('Ошибка', 'Не удалось открыть приложение карт');
        });
    };



    useEffect(() => {
        if (!stop) {
            return;
        }

        // Сбрасываем состояние загрузки при изменении остановки
        setMapLoaded(false);

        // Логируем данные остановки для отладки
        logData('Детали остановки', {
            id: stop.id,
            photo: stop.photo,
            photoType: typeof stop.photo,
            hasPhoto: !!stop.photo,
            mapLocation: stop.mapLocation,
            mapLocationType: typeof stop.mapLocation
        }, 'StopDetailsContent');

        // Парсим координаты
        const parsedCoords = parseMapLocation(stop.mapLocation);

        if (parsedCoords) {
            setMapCoordinates(parsedCoords);
        } else {
            setMapCoordinates(defaultCoords);
        }

        // Добавляем таймаут на случай долгой загрузки карты
    }, [stop]);

    return (
        <ScrollView
            style={styles.container}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={true}
            bounces={true}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustContentInsets={false}
            contentInsetAdjustmentBehavior="never"
            contentInset={{ top: 0, left: 0, bottom: 0, right: 0 }}
            keyboardDismissMode="on-drag"
        >
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <BackButton />
                </TouchableOpacity>

                <View style={styles.titleContainer}>
                    <Text style={styles.districtName}>
                        {stop.district?.name || 'Район не указан'}
                    </Text>
                </View>

                <View style={styles.backButton} />
            </View>

            <View style={styles.content}>
                <View style={styles.addressContainer}>
                    <Text style={styles.address}>{stop.address || 'Адрес не указан'}</Text>
                </View>

                <View style={styles.dateTimeContainer}>
                    <Text style={styles.dateTime}>
                        {stop.startTime && stop.endTime
                            ? formatTimeRange(stop.startTime, stop.endTime)
                            : 'Время не указано'
                        }
                    </Text>
                </View>

                {stop.photo && (
                    <Image
                        source={{ uri: getPhotoUrl(stop.photo) }}
                        style={styles.photo}
                        resizeMode="cover"
                        defaultSource={placeholderImage}
                    />
                )}

                {!stop.photo && (
                    <View style={styles.photoPlaceholder}>
                        <Text style={styles.photoPlaceholderText}>Нет изображения</Text>
                    </View>
                )}

                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoLabelContainer}>
                            <Text style={styles.infoLabel}>Модель:</Text>
                        </View>
                        <View style={styles.infoValueContainer}>
                            <Text style={styles.infoValue}>{stop.truckModel || 'Не указано'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoLabelContainer}>
                            <Text style={styles.infoLabel}>Номер:</Text>
                        </View>
                        <View style={styles.infoValueContainer}>
                            <Text style={styles.infoValue}>{stop.truckNumber || 'Не указано'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoLabelContainer}>
                            <Text style={styles.infoLabel}>Район:</Text>
                        </View>
                        <View style={styles.infoValueContainer}>
                            <Text style={styles.infoValue}>{stop.district?.name || 'Не указано'}</Text>
                        </View>
                    </View>
                </View>

                {stop.description && (
                    <View style={styles.descriptionContainer}>
                        <Text style={styles.description}>{stop.description}</Text>
                    </View>
                )}

                <View style={styles.mapContainer}>
                    <View style={styles.mapHeader}>
                        <Text style={styles.mapTitle}>Местоположение</Text>
                    </View>
                    <View
                        style={styles.mapWrapper}
                        pointerEvents="box-only"
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <UniversalMapView
                            style={styles.map}
                            initialRegion={{
                                latitude: mapCoordinates.latitude,
                                longitude: mapCoordinates.longitude,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                            }}
                            onMapReady={() => {
                                setMapLoaded(true);
                            }}
                            onError={(error) => {
                                setMapLoaded(false);
                            }}
                            showsUserLocation={false}
                            showsMyLocationButton={false}
                            toolbarEnabled={false}
                            zoomEnabled={true}
                            scrollEnabled={true}
                            rotateEnabled={true}
                            pitchEnabled={true}
                            mapType="standard"
                            minZoomLevel={10}
                            maxZoomLevel={20}
                        >
                            <Marker
                                coordinate={{
                                    latitude: mapCoordinates.latitude,
                                    longitude: mapCoordinates.longitude,
                                }}
                                title={stop.address || 'Остановка'}
                                description="Нажмите для навигации"
                                onPress={handleMarkerPress}
                                pinColor="#3B43A2"
                            />
                        </UniversalMapView>
                    </View>
                    {!mapLoaded && (
                        <View style={styles.mapLoadingContainer}>
                            <Text style={styles.mapLoadingText}>
                                Загружаем карту...
                            </Text>
                        </View>
                    )}
                </View>

                {/* Отображение товаров остановки */}
                <StopProductsList
                    stopId={stop.id}
                    isActive={
                        stop.startTime &&
                        stop.endTime &&
                        new Date(stop.startTime) <= new Date() &&
                        new Date() <= new Date(stop.endTime)
                    }
                />

                {canEdit && (
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={handleEditPress}
                    >
                        <Text style={styles.editButtonText}>Редактировать</Text>
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    errorText: {
        fontSize: FontSize.size_md,
        color: 'red',
        textAlign: 'center',
        marginTop: 50,
        fontFamily: FontFamily.sFProText || "system",
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingTop: 24,
    },
    backButton: {
        padding: 15,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    districtName: {
        fontSize: FontSize.size_md,
        fontWeight: '500',
        color: Color.dark,
        fontFamily: FontFamily.sFProText || "system",
        textAlign: 'center',
    },
    content: {
        padding: 16,
    },
    addressContainer: {
        marginBottom: 8,
    },
    address: {
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.sFProText || "system",
        color: Color.dark,
        letterSpacing: 0.9,
    },
    dateTimeContainer: {
        marginBottom: 16,
    },
    dateTime: {
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.sFProText || "system",
        color: Color.dark,
        lineHeight: 30,
    },
    photo: {
        width: '100%',
        height: 250,
        borderRadius: 8,
        marginBottom: 16,
    },
    photoPlaceholder: {
        width: '100%',
        height: 250,
        borderRadius: 8,
        marginBottom: 16,
        backgroundColor: '#f2f2f2',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
    },
    photoPlaceholderText: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: '#999',
    },
    infoSection: {
        marginTop: 16,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    infoLabelContainer: {
        width: 80,
    },
    infoLabel: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: Color.blue2,
        letterSpacing: 0.8,
    },
    infoValueContainer: {
        flex: 1,
    },
    infoValue: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
        letterSpacing: 0.8,
    },
    descriptionContainer: {
        marginTop: 16,
        marginBottom: 24,
    },
    description: {
        fontSize: 14,
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
        letterSpacing: 0.7,
        lineHeight: 17,
    },
    mapContainer: {
        height: 250,
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
    },
    mapWrapper: {
        flex: 1,
        position: 'relative',
    },
    mapHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingTop: 8,
    },
    mapTitleContainer: {
        flex: 1,
    },
    mapTitle: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
        fontWeight: '500',
    },
    mapSubtitle: {
        fontSize: FontSize.size_xs,
        fontFamily: FontFamily.sFProText,
        color: '#666',
        marginTop: 2,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    editButton: {
        backgroundColor: Color.blue2,
        height: 40,
        borderRadius: Border.br_3xs,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    editButtonText: {
        color: Color.colorLightMode,
        fontSize: FontSize.size_md,
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
    },
    mapLoadingContainer: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000,
    },
    mapLoadingText: {
        fontSize: FontSize.size_md,
        color: '#3B43A2',
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
});