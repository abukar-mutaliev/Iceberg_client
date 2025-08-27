import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import UniversalMapView, { Marker } from '@shared/ui/Map/UniversalMapView';
import { PROVIDER_GOOGLE } from 'react-native-maps';
import { selectUser } from '@entities/auth/model/selectors';
import { formatTimeRange } from "@shared/lib/dateFormatters";
import { getBaseUrl } from '@shared/api/api';
import { logData } from '@shared/lib/logger';
import {BackButton} from "@shared/ui/Button/BackButton";

const placeholderImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };

const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;

    if (typeof photoPath !== 'string') {
        return photoPath.uri;
    }

    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
        const url = photoPath.replace('https://', 'http://');
        logData('Используем полный URL фото', url, 'StopDetailsContent');
        return url;
    }

    const baseUrl = getBaseUrl();
    const fullUrl = `${baseUrl}${photoPath}`;
    logData('Формируем полный URL фото', {
        baseUrl,
        photoPath,
        fullUrl
    }, 'StopDetailsContent');
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
                    console.log('JSON парсинг не удался, пробуем другие форматы');
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
        console.error('Ошибка при парсинге координат:', error);
    }

    return null;
};

export const StopDetailsContent = ({ stop, navigation }) => {
    const user = useSelector(selectUser);
    const defaultCoords = { latitude: 43.172837, longitude: 44.811913 };
    const [mapCoordinates, setMapCoordinates] = useState(defaultCoords);

    const canEdit = ['DRIVER', 'ADMIN', 'EMPLOYEE'].includes(user?.role);

    // Добавляем проверку на существование остановки
    if (!stop) {
        console.error('Stop data is null or undefined');
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Данные остановки не найдены</Text>
            </View>
        );
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'Не указано';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (error) {
            console.error('Ошибка форматирования даты:', error);
            return 'Неверная дата';
        }
    };

    const formatTime = (dateString) => {
        if (!dateString) return 'Не указано';
        try {
            const date = new Date(dateString);
            return date.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Ошибка форматирования времени:', error);
            return 'Неверное время';
        }
    };

    const formatDateTime = (dateString) => {
        return `${formatTime(dateString)}, ${formatDate(dateString)}`;
    };

    const handleEditPress = () => {
        navigation.navigate('EditStop', { stopId: stop.id });
    };

    useEffect(() => {
        if (!stop) {
            console.error('Stop is null in useEffect');
            return;
        }

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
            console.log('Успешно распарсены координаты:', parsedCoords);
            setMapCoordinates(parsedCoords);
        } else {
            console.log('Не удалось распарсить координаты, используем координаты по умолчанию');
            console.log('Исходные данные mapLocation:', stop.mapLocation);
            setMapCoordinates(defaultCoords);
        }
    }, [stop]);

    return (
        <ScrollView style={styles.container}>
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

                {/* Пустой элемент для баланса с кнопкой назад */}
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
                        onError={(error) => {
                            console.log('Ошибка загрузки изображения:', error);
                        }}
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
                    <Text style={styles.mapTitle}>Местоположение</Text>
                    <UniversalMapView
                        style={styles.map}
                        initialRegion={{
                            latitude: mapCoordinates.latitude,
                            longitude: mapCoordinates.longitude,
                            latitudeDelta: 0.005,
                            longitudeDelta: 0.005,
                        }}
                        onError={(error) => {
                            console.log('[StopDetailsContent] Ошибка карты:', error);
                        }}
                        onMapReady={() => {
                            console.log('[StopDetailsContent] Карта готова');
                        }}
                        showsUserLocation={false}
                        showsMyLocationButton={false}
                        toolbarEnabled={false}
                        provider={PROVIDER_GOOGLE}
                    >
                        <Marker
                            coordinate={{
                                latitude: mapCoordinates.latitude,
                                longitude: mapCoordinates.longitude,
                            }}
                            title={stop.address || 'Остановка'}
                        />
                    </UniversalMapView>
                </View>

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
    mapTitle: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
        marginBottom: 8,
        fontWeight: '500',
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
});