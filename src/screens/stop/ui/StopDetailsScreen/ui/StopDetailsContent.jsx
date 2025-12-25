import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Platform, Alert, Linking, ActivityIndicator, Clipboard } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import MapView, { Marker } from 'react-native-maps';
import Constants from 'expo-constants';
import { selectUser } from '@entities/auth/model/selectors';
import { formatTimeRange, formatTime, formatDate } from "@shared/lib/dateFormatters";
import { getBaseUrl } from '@shared/api/api';
import { logData } from '@shared/lib/logger';
import {BackButton} from "@shared/ui/Button/BackButton";
import { StopProductsList } from '@entities/stop/ui/StopProductsList';
import { ShareStopModal } from './ShareStopModal';
import ChatApi from '@entities/chat/api/chatApi';
import { selectRoomsList } from '@entities/chat/model/selectors';
import { useToast } from '@shared/ui/Toast';

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
    // Убираем ведущий слеш если есть и добавляем /uploads/
    const cleanPath = photoPath.replace(/^\/+/, '');
    const fullUrl = `${baseUrl}/uploads/${cleanPath}`;
    return fullUrl;
};

// Функция для геокодирования адреса через Nominatim
const geocodeAddress = async (address, districtName = '') => {
    if (!address || !address.trim()) {
        return null;
    }

    try {
        // Формируем запрос с учетом района для лучшей точности
        let query = address.trim();
        if (districtName) {
            query = `${query}, ${districtName}, Республика Ингушетия, Россия`;
        } else {
            query = `${query}, Республика Ингушетия, Россия`;
        }

        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=ru`;
        
        logData('Геокодирование адреса остановки', { address, query, url });

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'IcebergApp/1.0 (Delivery service)' // Nominatim требует User-Agent
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const results = await response.json();

        if (results && results.length > 0) {
            const result = {
                latitude: parseFloat(results[0].lat),
                longitude: parseFloat(results[0].lon),
                displayName: results[0].display_name
            };
            
            logData('Адрес успешно геокодирован', result);
            return result;
        }

        logData('Адрес не найден при геокодировании', { address, query });
        return null;
    } catch (error) {
        logData('Ошибка при геокодировании адреса', { address, error: error.message });
        return null;
    }
};

// Безопасная функция для парсинга координат (fallback)
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
        // Ошибка парсинга координат
    }

    return null;
};

// Функция для понятного форматирования времени стоянки
const formatStopTime = (startTime, endTime) => {
    if (!startTime || !endTime) return null;

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;

    const startTimeStr = formatTime(startTime);
    const endTimeStr = formatTime(endTime);
    const startDateStr = formatDate(startTime);
    const endDateStr = formatDate(endTime);

    // Проверяем, находится ли водитель на стоянке сейчас
    const now = new Date();
    const isActive = now >= startDate && now <= endDate;

    return {
        startTime: startTimeStr,
        endTime: endTimeStr,
        startDate: startDateStr,
        endDate: endDateStr,
        isSameDay: startDateStr === endDateStr,
        isActive: isActive,
        endDateTime: endDate
    };
};

export const StopDetailsContent = ({ stop, navigation }) => {
    const user = useSelector(selectUser);
    const rooms = useSelector(selectRoomsList);
    const { showSuccess } = useToast();
    const defaultCoords = { latitude: 43.172837, longitude: 44.811913 };
    const [mapCoordinates, setMapCoordinates] = useState(defaultCoords);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [geocodingError, setGeocodingError] = useState(null);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const canEdit = ['DRIVER', 'ADMIN', 'EMPLOYEE'].includes(user?.role);
    const isAuthenticated = !!user;
    
    // Определяем, запущено ли приложение в Expo Go
    const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
    
    // Данные о водителе
    const driver = stop?.driver;
    const hasDriverInfo = driver && (driver.name || driver.phone);
    const canCallDriver = !!driver?.phone && user?.id !== driver?.userId;
    const canChatWithDriver = isAuthenticated && hasDriverInfo && user?.id !== driver?.userId;
    
    // Проверяем существование чата с водителем
    const existingChatWithDriver = React.useMemo(() => {
        if (!user?.id || !driver?.userId) return null;
        
        return rooms.find(room => {
            if (room.type !== 'DIRECT') return false;
            return room.participants?.some(participant => {
                const participantId = participant?.userId ?? participant?.user?.id ?? participant?.id;
                return participantId === driver.userId;
            });
        });
    }, [rooms, user?.id, driver?.userId]);


    if (!stop) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Данные остановки не найдены</Text>
            </View>
        );
    }

    const goToAuth = (activeTab = 'login') => {
        navigation.navigate('Auth', {
            activeTab,
            redirectTo: { name: 'StopDetails', params: { stopId: stop.id } }
        });
    };

    const handleEditPress = () => {
        navigation.navigate('EditStop', { stopId: stop.id });
    };

    const handleSharePress = () => {
        if (!isAuthenticated) {
            // Без алертов — сразу на авторизацию
            goToAuth('login');
            return;
        }
        setShareModalVisible(true);
    };

    const handleCloseShareModal = () => {
        setShareModalVisible(false);
    };

    // Функция для копирования адреса
    const handleCopyAddress = () => {
        if (!stop?.address) {
            Alert.alert('Ошибка', 'Адрес не указан');
            return;
        }
        
        Clipboard.setString(stop.address);
        showSuccess('Адрес скопирован', {
            duration: 2000,
            position: 'top'
        });
    };

    // Функция для звонка водителю
    const handleCallDriver = () => {
        if (!driver?.phone) {
            Alert.alert('Ошибка', 'Номер телефона водителя не указан');
            return;
        }
        
        const phoneNumber = driver.phone.replace(/[^0-9+]/g, '');
        const phoneUrl = Platform.select({
            ios: `tel:${phoneNumber}`,
            android: `tel:${phoneNumber}`
        });
        
        Linking.canOpenURL(phoneUrl)
            .then(supported => {
                if (supported) {
                    Linking.openURL(phoneUrl);
                } else {
                    Alert.alert('Ошибка', 'Не удалось совершить звонок');
                }
            })
            .catch(err => {
                logData('Ошибка при попытке звонка', err);
                Alert.alert('Ошибка', 'Не удалось совершить звонок');
            });
    };

    // Функция для открытия чата с водителем
    const handleChatWithDriver = async () => {
        if (!isAuthenticated) {
            // Без алертов — сразу на авторизацию
            goToAuth('login');
            return;
        }
        
        if (!driver?.userId) {
            Alert.alert('Ошибка', 'Информация о водителе недоступна');
            return;
        }
        
        const driverName = driver.name || 'Водитель';
        
        // Если чат уже существует, переходим в него
        if (existingChatWithDriver) {
            const rootNavigation =
                navigation?.getParent?.('AppStack') ||
                navigation?.getParent?.()?.getParent?.() ||
                null;

            (rootNavigation || navigation).navigate('ChatRoom', {
                roomId: existingChatWithDriver.id,
                roomTitle: driverName,
                roomData: existingChatWithDriver,
                userId: driver.userId,
                fromScreen: 'StopDetails'
            });
            return;
        }
        
        // Создаем новый чат
        setIsCreatingChat(true);
        
        try {
            const formData = new FormData();
            formData.append('type', 'DIRECT');
            formData.append('title', driverName);
            formData.append('members', JSON.stringify([driver.userId]));
            
            const response = await ChatApi.createRoom(formData);
            const room = response?.data?.room || response?.data;
            
            if (room?.id) {
                const rootNavigation =
                    navigation?.getParent?.('AppStack') ||
                    navigation?.getParent?.()?.getParent?.() ||
                    null;

                (rootNavigation || navigation).navigate('ChatRoom', {
                    roomId: room.id,
                    roomTitle: driverName,
                    roomData: room,
                    userId: driver.userId,
                    fromScreen: 'StopDetails'
                });
            } else {
                Alert.alert('Ошибка', 'Не удалось создать чат с водителем');
            }
        } catch (error) {
            logData('Ошибка при создании чата с водителем', error);
            Alert.alert('Ошибка', 'Не удалось открыть чат с водителем');
        } finally {
            setIsCreatingChat(false);
        }
    };

    const handleMarkerPress = () => {
        openNativeMaps();
    };

    const openNativeMaps = () => {
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
            logData('Ошибка при открытии карт', { error: err });
            Alert.alert('Ошибка', 'Не удалось открыть приложение карт');
        });
    };



    useEffect(() => {
        if (!stop) {
            return;
        }

        // Сбрасываем состояние загрузки при изменении остановки
        setMapLoaded(false);
        setGeocodingError(null);

        const loadCoordinates = async () => {
            // Сначала пробуем использовать mapLocation если есть
            const parsedCoords = parseMapLocation(stop.mapLocation);
            
            if (parsedCoords) {
                logData('Используем координаты из mapLocation', parsedCoords);
                setMapCoordinates(parsedCoords);
                setMapLoaded(true);
                return;
            }

            // Если mapLocation нет или невалидна, используем геокодирование адреса
            if (stop.address && stop.address.trim()) {
                setIsGeocoding(true);
                
                try {
                    const districtName = stop.district?.name || '';
                    const geocoded = await geocodeAddress(stop.address, districtName);
                    
                    if (geocoded) {
                        setMapCoordinates({
                            latitude: geocoded.latitude,
                            longitude: geocoded.longitude
                        });
                        setMapLoaded(true);
                        logData('Координаты получены через геокодирование', geocoded);
                    } else {
                        // Если геокодирование не удалось, используем координаты по умолчанию
                        setMapCoordinates(defaultCoords);
                        setMapLoaded(true);
                        setGeocodingError('Не удалось определить координаты адреса');
                        logData('Геокодирование не удалось, используем координаты по умолчанию');
                    }
                } catch (error) {
                    logData('Ошибка при геокодировании', { error: error.message });
                    setMapCoordinates(defaultCoords);
                    setMapLoaded(true);
                    setGeocodingError('Ошибка при определении координат');
                } finally {
                    setIsGeocoding(false);
                }
            } else {
                // Если адреса нет, используем координаты по умолчанию
                setMapCoordinates(defaultCoords);
                setMapLoaded(true);
            }
        };

        loadCoordinates();
    }, [stop]);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
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

                {isAuthenticated ? (
                    <TouchableOpacity
                        style={styles.shareIconButton}
                        onPress={handleSharePress}
                    >
                        <Icon name="share" size={24} color={Color.purpleSoft} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.shareIconButton}
                        onPress={handleSharePress}
                        activeOpacity={0.7}
                    >
                        <Icon name="share" size={24} color={Color.purpleSoft} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.content}>
                <View style={styles.addressContainer}>
                    <View style={styles.addressWithButton}>
                        <Text style={styles.address}>{stop.address || 'Адрес не указан'}</Text>
                        {stop.address && (
                            <TouchableOpacity
                                style={styles.copyAddressButton}
                                onPress={handleCopyAddress}
                                activeOpacity={0.7}
                            >
                                <Icon name="content-copy" size={18} color={Color.blue2} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {stop.startTime && stop.endTime ? (
                    <View style={styles.dateTimeContainer}>
                        {(() => {
                            const timeInfo = formatStopTime(stop.startTime, stop.endTime);
                            if (!timeInfo) {
                                return (
                                    <Text style={styles.dateTime}>Время не указано</Text>
                                );
                            }
                            return (
                                <View style={styles.timeInfoContainer}>
                                    {/* Блок о том, что водитель сейчас на стоянке */}
                                    {timeInfo.isActive && (
                                        <View style={styles.activeStopBanner}>
                                            <View style={styles.activeStopContent}>
                                                <View style={styles.activeStopIconContainer}>
                                                    <Icon name="location-on" size={24} color="#fff" />
                                                </View>
                                                <View style={styles.activeStopTextContainer}>
                                                    <Text style={styles.activeStopTitle}>
                                                        Водитель сейчас на стоянке
                                                    </Text>
                                                    <Text style={styles.activeStopSubtitle}>
                                                        Будет стоять до {timeInfo.endTime}
                                                        {!timeInfo.isSameDay ? `, ${timeInfo.endDate}` : `, ${timeInfo.startDate}`}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                    
                                    {/* Показываем детальное время только если водитель НЕ на стоянке */}
                                    {!timeInfo.isActive && (
                                        <>
                                            <View style={styles.timeRow}>
                                                <View style={styles.timeIconContainer}>
                                                    <Icon name="schedule" size={22} color={Color.blue2} />
                                                </View>
                                                <View style={styles.timeTextContainer}>
                                                    <Text style={styles.timeLabel}>Начало работы:</Text>
                                                    <Text style={styles.timeValue}>
                                                        {timeInfo.startTime}
                                                        {!timeInfo.isSameDay && `, ${timeInfo.startDate}`}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.timeRow}>
                                                <View style={styles.timeIconContainer}>
                                                    <Icon name="access-time" size={22} color={Color.blue2} />
                                                </View>
                                                <View style={styles.timeTextContainer}>
                                                    <Text style={styles.timeLabel}>Окончание работы:</Text>
                                                    <Text style={styles.timeValue}>
                                                        {timeInfo.endTime}
                                                        {!timeInfo.isSameDay ? `, ${timeInfo.endDate}` : `, ${timeInfo.startDate}`}
                                                    </Text>
                                                </View>
                                            </View>
                                            {timeInfo.isSameDay && (
                                                <Text style={styles.timeDate}>{timeInfo.startDate}</Text>
                                            )}
                                        </>
                                    )}
                                </View>
                            );
                        })()}
                    </View>
                ) : (
                    <View style={styles.dateTimeContainer}>
                        <Text style={styles.dateTime}>Время не указано</Text>
                    </View>
                )}

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

                    <View style={styles.infoRow}>
                        <View style={styles.infoLabelContainer}>
                            <Text style={styles.infoLabel}>Адрес:</Text>
                        </View>
                        <View style={[styles.infoValueContainer, styles.addressValueContainer]}>
                            <Text style={styles.infoValue}>{stop.address || 'Не указано'}</Text>
                            {stop.address && (
                                <TouchableOpacity
                                    style={styles.copyAddressButtonSmall}
                                    onPress={handleCopyAddress}
                                    activeOpacity={0.7}
                                >
                                    <Icon name="content-copy" size={14} color={Color.blue2} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>

                {stop.description && (
                    <View style={styles.descriptionContainer}>
                        <Text style={styles.description}>{stop.description}</Text>
                    </View>
                )}

                {/* Блок информации о водителе и связь с ним */}
                {hasDriverInfo && (
                    <View style={styles.driverSection}>
                        <Text style={styles.driverSectionTitle}>Связь с водителем</Text>
                        <View style={styles.driverHeader}>
                            <View style={styles.driverIconContainer}>
                                <Icon name="local-shipping" size={24} color={Color.blue2} />
                            </View>
                            <View style={styles.driverInfo}>
                                <Text style={styles.driverName}>{driver.name || 'Водитель'}</Text>
                                {driver.phone && (
                                    <Text style={styles.driverPhone}>{driver.phone}</Text>
                                )}
                            </View>
                        </View>
                        
                        {/* Кнопки связи с водителем */}
                        {hasDriverInfo && (
                            <View style={styles.driverActions}>
                                {driver.phone && (
                                    <TouchableOpacity
                                        style={[styles.driverButton, styles.callButton]}
                                        onPress={handleCallDriver}
                                        activeOpacity={0.7}
                                        disabled={!canCallDriver}
                                    >
                                        <Icon name="phone" size={20} color="#fff" />
                                        <Text style={styles.callButtonText}>Позвонить</Text>
                                    </TouchableOpacity>
                                )}

                                {isAuthenticated ? (
                                    <TouchableOpacity
                                        style={[styles.driverButton, styles.chatButton]}
                                        onPress={handleChatWithDriver}
                                        activeOpacity={0.7}
                                        disabled={isCreatingChat || !canChatWithDriver}
                                    >
                                        {isCreatingChat ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <>
                                                <Icon name="chat" size={20} color="#fff" />
                                                <Text style={styles.chatButtonText}>Написать</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.driverButton, styles.chatButton]}
                                        onPress={() => goToAuth('login')}
                                        activeOpacity={0.7}
                                    >
                                        <Icon name="login" size={20} color="#fff" />
                                        <Text style={styles.chatButtonText}>Войти</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.mapContainer}>
                    <View style={styles.mapHeader}>
                        <Text style={styles.mapTitle}>Местоположение</Text>
                        {geocodingError && (
                            <Text style={styles.geocodingErrorText}>
                                {geocodingError}
                            </Text>
                        )}
                    </View>
                    {(isGeocoding || (!mapLoaded && !mapError && !isExpoGo)) ? (
                        <View style={styles.mapLoadingContainer}>
                            <ActivityIndicator size="small" color={Color.blue2} />
                            <Text style={styles.mapLoadingText}>
                                {isGeocoding ? 'Определяем местоположение...' : 'Загружаем карту...'}
                            </Text>
                        </View>
                    ) : (isExpoGo || mapError) ? (
                        <View style={styles.mapFallbackContainer}>
                            <View style={styles.mapFallbackContent}>
                                <Icon name="map" size={48} color={Color.blue2} />
                                <Text style={styles.mapFallbackTitle}>
                                    {isExpoGo ? 'Карта недоступна в Expo Go' : 'Карта не загрузилась'}
                                </Text>
                                <Text style={styles.mapFallbackText}>
                                    {isExpoGo 
                                        ? 'Откройте местоположение в нативном приложении карт'
                                        : 'Нажмите кнопку ниже, чтобы открыть местоположение в нативном приложении карт'
                                    }
                                </Text>
                                <TouchableOpacity
                                    style={styles.mapFallbackButton}
                                    onPress={openNativeMaps}
                                    activeOpacity={0.7}
                                >
                                    <Icon name="navigation" size={20} color="#fff" />
                                    <Text style={styles.mapFallbackButtonText}>
                                        Открыть в картах
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.mapWrapper}>
                            <MapView
                                style={styles.map}
                                initialRegion={{
                                    latitude: mapCoordinates.latitude,
                                    longitude: mapCoordinates.longitude,
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                }}
                                onMapReady={() => {
                                    setMapLoaded(true);
                                    setMapError(false);
                                    logData('Карта успешно загружена', { coordinates: mapCoordinates });
                                }}
                                onError={(error) => {
                                    logData('Ошибка карты', { error, isExpoGo });
                                    setMapLoaded(false);
                                    setMapError(true);
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
                                provider={undefined}
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
                            </MapView>
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

            {/* Модальное окно для выбора чата */}
            <ShareStopModal
                visible={shareModalVisible}
                onClose={handleCloseShareModal}
                stopId={stop.id}
                stop={stop}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    scrollContent: {
        paddingBottom: 20,
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
        justifyContent: 'space-between',
        width: '100%',
        paddingTop: 24,
        paddingHorizontal: 8,
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
    addressWithButton: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    address: {
        flex: 1,
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.sFProText || "system",
        color: Color.dark,
        letterSpacing: 0.9,
        minWidth: 0,
    },
    copyAddressButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E8F0FE',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D0E0F0',
        flexShrink: 0,
        marginTop: 2,
    },
    dateTimeContainer: {
        marginBottom: 16,
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E8EAED',
    },
    dateTime: {
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.sFProText || "system",
        color: Color.dark,
        lineHeight: 30,
    },
    timeInfoContainer: {
        gap: 12,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    timeIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E8F0FE',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    timeTextContainer: {
        flex: 1,
    },
    timeLabel: {
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText || "system",
        color: '#666',
        marginBottom: 4,
        fontWeight: '500',
    },
    timeValue: {
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.sFProText || "system",
        color: Color.dark,
        fontWeight: '600',
        lineHeight: 24,
    },
    timeDate: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText || "system",
        color: Color.blue2,
        marginTop: 8,
        textAlign: 'center',
        fontWeight: '500',
    },
    activeStopBanner: {
        backgroundColor: '#34C759',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#30B050',
    },
    activeStopContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    activeStopIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeStopTextContainer: {
        flex: 1,
    },
    activeStopTitle: {
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.sFProText || "system",
        color: '#fff',
        fontWeight: '700',
        marginBottom: 4,
    },
    activeStopSubtitle: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText || "system",
        color: '#fff',
        fontWeight: '500',
        opacity: 0.95,
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
    addressValueContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    infoValue: {
        flex: 1,
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
        letterSpacing: 0.8,
        minWidth: 0,
    },
    copyAddressButtonSmall: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#E8F0FE',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D0E0F0',
        flexShrink: 0,
        marginTop: 2,
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
        borderRadius: 8,
        overflow: 'hidden',
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
    shareIconButton: {
        padding: 10,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
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
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        gap: 8,
    },
    mapLoadingText: {
        fontSize: FontSize.size_md,
        color: '#3B43A2',
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    geocodingErrorText: {
        fontSize: FontSize.size_xs,
        color: '#ff6b6b',
        fontFamily: FontFamily.sFProText,
        marginTop: 4,
    },
    mapFallbackContainer: {
        height: 250,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapFallbackContent: {
        alignItems: 'center',
        padding: 20,
        maxWidth: '90%',
    },
    mapFallbackTitle: {
        fontSize: FontSize.size_md,
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        marginTop: 12,
        marginBottom: 8,
        textAlign: 'center',
    },
    mapFallbackText: {
        fontSize: FontSize.size_sm,
        color: '#666',
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    mapFallbackButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Color.blue2,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    mapFallbackButtonText: {
        color: '#fff',
        fontSize: FontSize.size_md,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
    },
    // Стили для блока водителя
    driverSection: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E8EAED',
    },
    driverSectionTitle: {
        fontSize: FontSize.size_md,
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        marginBottom: 12,
    },
    driverHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    driverIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E8F0FE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    driverInfo: {
        flex: 1,
    },
    driverName: {
        fontSize: FontSize.size_md,
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        marginBottom: 2,
    },
    driverPhone: {
        fontSize: FontSize.size_sm,
        color: '#666',
        fontFamily: FontFamily.sFProText,
    },
    driverActions: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
    },
    driverButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        gap: 8,
    },
    callButton: {
        backgroundColor: '#34C759',
    },
    callButtonText: {
        color: '#fff',
        fontSize: FontSize.size_sm,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
    },
    chatButton: {
        backgroundColor: Color.blue2,
    },
    chatButtonText: {
        color: '#fff',
        fontSize: FontSize.size_sm,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
    },
});