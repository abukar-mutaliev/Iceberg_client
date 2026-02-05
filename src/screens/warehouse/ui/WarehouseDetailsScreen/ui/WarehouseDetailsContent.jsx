import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, Linking, ActivityIndicator, Clipboard, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import MapView, { Marker } from 'react-native-maps';
import Constants from 'expo-constants';
import { selectUser } from '@entities/auth/model/selectors';
import { logData } from '@shared/lib/logger';
import { BackButton } from "@shared/ui/Button/BackButton";
import WarehouseService from '@entities/warehouse/api/warehouseApi';
import { getImageUrl } from '@shared/api/api';
import { WarehouseProductsList } from './WarehouseProductsList';
import { WarehouseEmployeesList } from './WarehouseEmployeesList';
import { AddWarehouseModal } from '@screens/district/ui/DistrictManagementScreen/AddWarehouseModal';
import { updateWarehouse } from '@entities/warehouse/model/slice';
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';
import { loadUserProfile } from '@entities/auth/model/slice';
import { ShareWarehouseModal } from './ShareWarehouseModal';

// Функция для геокодирования адреса через Nominatim
const geocodeAddress = async (address, districtName = '') => {
    if (!address || !address.trim()) {
        return null;
    }

    try {
        let query = address.trim();
        if (districtName) {
            query = `${query}, ${districtName}, Республика Ингушетия, Россия`;
        } else {
            query = `${query}, Республика Ингушетия, Россия`;
        }

        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=ru`;
        
        logData('Геокодирование адреса склада', { address, query, url });

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'IcebergApp/1.0 (Delivery service)'
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

export const WarehouseDetailsContent = ({ warehouse, warehouseProducts, productsLoading, navigation, onRefresh }) => {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const { showSuccess, showError } = useCustomAlert();
    const insets = useSafeAreaInsets();
    const defaultCoords = { latitude: 43.172837, longitude: 44.811913 };
    const [mapCoordinates, setMapCoordinates] = useState(defaultCoords);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [geocodingError, setGeocodingError] = useState(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    
    // Определяем, запущено ли приложение в Expo Go
    const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
    const isAuthenticated = !!user;
    
    // Проверяем, является ли пользователь суперадмином
    // Используем ту же логику, что и в других экранах (DirectChatScreen, useGroupChatData)
    const isSuperAdmin = useMemo(() => {
        if (!user) return false;
        return user.role === 'ADMIN' && (
            user.admin?.isSuperAdmin || 
            user.profile?.isSuperAdmin || 
            user.isSuperAdmin
        );
    }, [user]);

    if (!warehouse) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Данные склада не найдены</Text>
            </View>
        );
    }

    // Сотрудники уже включены в ответ getWarehouseById
    const employees = warehouse?.employees || [];
    
    // Логирование для отладки
    useEffect(() => {
        if (warehouse) {
            console.log('📦 Warehouse employees data:', {
                warehouseId: warehouse.id,
                warehouseName: warehouse.name,
                employeesCount: employees.length,
                employees: employees.map(emp => ({
                    id: emp.id,
                    name: emp.name,
                    phone: emp.phone,
                    position: emp.position,
                    processingRole: emp.processingRole,
                    hasUser: !!emp.user,
                    userId: emp.user?.id,
                    userEmail: emp.user?.email,
                    userAvatar: emp.user?.avatar,
                    userPhone: emp.user?.phone
                })),
                rawEmployees: employees
            });
        }
    }, [warehouse, employees]);

    // Функция для копирования адреса
    const handleCopyAddress = () => {
        if (!warehouse?.address) {
            Alert.alert('Ошибка', 'Адрес не указан');
            return;
        }
        
        Clipboard.setString(warehouse.address);
        showSuccess('Адрес скопирован');
    };
    
    // Обработчик открытия модального окна редактирования
    const handleEditPress = () => {
        setEditModalVisible(true);
    };

    // Обработчик открытия модального окна репоста
    const handleSharePress = () => {
        if (!isAuthenticated) {
            // Без алертов — сразу на авторизацию
            navigation.navigate('Auth', {
                activeTab: 'login',
                redirectTo: { name: 'WarehouseDetails', params: { warehouseId: warehouse.id } }
            });
            return;
        }
        setShareModalVisible(true);
    };

    // Обработчик закрытия модального окна репоста
    const handleCloseShareModal = () => {
        setShareModalVisible(false);
    };
    
    // Обработчик закрытия модального окна
    const handleCloseEditModal = () => {
        setEditModalVisible(false);
    };
    
    // Обработчик сохранения изменений склада
    const handleWarehouseSubmit = async (formData) => {
        if (!warehouse?.id) {
            showError('Ошибка', 'ID склада не найден');
            return false;
        }
        
        setIsSubmitting(true);
        try {
            await dispatch(updateWarehouse({
                id: warehouse.id,
                warehouseData: formData
            })).unwrap();
            
            showSuccess('Склад успешно обновлен');
            
            // Обновляем данные склада (сервер уже обновил статус синхронно)
            if (onRefresh) {
                await onRefresh();
            }
            
            setEditModalVisible(false);
            return true;
        } catch (error) {
            const errorMessage = typeof error === 'string' 
                ? error 
                : error?.message || 'Не удалось обновить склад';
            showError('Ошибка', errorMessage);
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMarkerPress = () => {
        openNativeMaps();
    };

    const openNativeMaps = () => {
        const { latitude, longitude } = mapCoordinates;
        const address = warehouse.address || 'Склад';

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

    // Загружаем полный профиль пользователя при монтировании, если это админ
    // Это необходимо для получения admin.isSuperAdmin, который может отсутствовать при восстановлении токенов
    useEffect(() => {
        if (user && user.role === 'ADMIN' && !user.admin) {
            console.log('🔄 WarehouseDetailsContent: Loading user profile for admin');
            dispatch(loadUserProfile()).catch(err => {
                console.warn('⚠️ WarehouseDetailsContent: Failed to load user profile:', err);
            });
        }
    }, [user, dispatch]);

    // Загрузка координат для карты
    useEffect(() => {
        if (!warehouse) {
            return;
        }

        setMapLoaded(false);
        setGeocodingError(null);

        const loadCoordinates = async () => {
            // Сначала пробуем использовать координаты из данных склада
            if (warehouse.latitude && warehouse.longitude) {
                const lat = parseFloat(warehouse.latitude);
                const lng = parseFloat(warehouse.longitude);
                if (!isNaN(lat) && !isNaN(lng)) {
                    setMapCoordinates({ latitude: lat, longitude: lng });
                    setMapLoaded(true);
                    return;
                }
            }

            // Если координат нет, используем геокодирование адреса
            if (warehouse.address && warehouse.address.trim()) {
                setIsGeocoding(true);
                
                try {
                    const districtName = warehouse.district?.name || '';
                    const geocoded = await geocodeAddress(warehouse.address, districtName);
                    
                    if (geocoded) {
                        setMapCoordinates({
                            latitude: geocoded.latitude,
                            longitude: geocoded.longitude
                        });
                        setMapLoaded(true);
                        logData('Координаты получены через геокодирование', geocoded);
                    } else {
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
                setMapCoordinates(defaultCoords);
                setMapLoaded(true);
            }
        };

        loadCoordinates();
    }, [warehouse]);

    const bottomPadding = 80 + insets.bottom + 20;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
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
                    <Text style={styles.warehouseName}>
                        {warehouse.name || 'Склад'}
                    </Text>
                </View>

                {isAuthenticated ? (
                    <TouchableOpacity
                        style={styles.shareIconButton}
                        onPress={handleSharePress}
                        activeOpacity={0.7}
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
                        <Text style={styles.address}>{warehouse.address || 'Адрес не указан'}</Text>
                        {warehouse.address && (
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

                {/* Изображение склада */}
                {warehouse.image ? (
                    <Image 
                        source={{ uri: getImageUrl(warehouse.image) }} 
                        style={styles.warehouseImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.photoPlaceholder}>
                        <Icon name="warehouse" size={64} color={Color.blue2} />
                        <Text style={styles.photoPlaceholderText}>Изображение склада</Text>
                    </View>
                )}

                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoLabelContainer}>
                            <Text style={styles.infoLabel}>Район:</Text>
                        </View>
                        <View style={styles.infoValueContainer}>
                            <Text style={styles.infoValue}>{warehouse.district?.name || 'Не указано'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoLabelContainer}>
                            <Text style={styles.infoLabel}>Тип:</Text>
                        </View>
                        <View style={styles.infoValueContainer}>
                            <Text style={styles.infoValue}>{warehouse.isMain ? 'Основной' : 'Филиал'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoLabelContainer}>
                            <Text style={styles.infoLabel}>Адрес:</Text>
                        </View>
                        <View style={[styles.infoValueContainer, styles.addressValueContainer]}>
                            <Text style={styles.infoValue}>{warehouse.address || 'Не указано'}</Text>
                            {warehouse.address && (
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

                    {warehouse.maxDeliveryRadius && (
                        <View style={styles.infoRow}>
                            <View style={styles.infoLabelContainer}>
                                <Text style={styles.infoLabel}>Радиус доставки:</Text>
                            </View>
                            <View style={styles.infoValueContainer}>
                                <Text style={styles.infoValue}>{warehouse.maxDeliveryRadius} км</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.infoRow}>
                        <View style={styles.infoLabelContainer}>
                            <Text style={styles.infoLabel}>Статус:</Text>
                        </View>
                        <View style={styles.infoValueContainer}>
                            <View style={[
                                styles.statusBadge,
                                warehouse.isActive ? styles.statusActive : styles.statusInactive
                            ]}>
                                <Text style={[
                                    styles.statusText,
                                    warehouse.isActive ? styles.statusTextActive : styles.statusTextInactive
                                ]}>
                                    {warehouse.isActive ? 'Открыто' : 'Закрыто'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* График работы */}
                    {warehouse.autoManageStatus && (() => {
                        const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
                        const fullDayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
                        
                        // Создаем полный список всех дней недели (0-6)
                        const allDays = Array.from({ length: 7 }, (_, i) => i);
                        
                        // Создаем полный список дней с информацией о графике
                        // Если день не выбран в графике работы, он считается выходным
                        const allDaysWithSchedule = allDays.map(dayOfWeek => {
                            const existing = warehouse.workingHours?.find(wh => wh.dayOfWeek === dayOfWeek);
                            if (existing) {
                                return existing;
                            } else {
                                // День не выбран - это выходной
                                return {
                                    dayOfWeek,
                                    isOpen: false,
                                    openTime: null,
                                    closeTime: null
                                };
                            }
                        });
                        
                        // Сортируем по дню недели, начиная с понедельника (1)
                        // Воскресенье (0) должен быть последним
                        const sortedHours = allDaysWithSchedule.sort((a, b) => {
                            // Если один из дней - воскресенье (0), он идет последним
                            if (a.dayOfWeek === 0) return 1;
                            if (b.dayOfWeek === 0) return -1;
                            // Остальные дни сортируем по порядку
                            return a.dayOfWeek - b.dayOfWeek;
                        });
                        
                        // Группируем дни с одинаковым графиком
                        const grouped = [];
                        let currentGroup = null;
                        
                        sortedHours.forEach((wh) => {
                            // Создаем ключ, который включает и тип дня (рабочий/выходной) и время
                            // Это предотвратит группировку выходных с рабочими днями
                            const timeKey = wh.isOpen 
                                ? (wh.openTime && wh.closeTime ? `open-${wh.openTime}-${wh.closeTime}` : 'open-24/7')
                                : 'closed';
                            
                            if (!currentGroup || currentGroup.timeKey !== timeKey) {
                                // Начинаем новую группу
                                if (currentGroup) {
                                    grouped.push(currentGroup);
                                }
                                currentGroup = {
                                    timeKey,
                                    days: [wh.dayOfWeek],
                                    isOpen: wh.isOpen,
                                    openTime: wh.openTime,
                                    closeTime: wh.closeTime
                                };
                            } else {
                                // Добавляем день в текущую группу только если это тот же тип дня
                                // (рабочий с рабочим, выходной с выходным)
                                if (currentGroup.isOpen === wh.isOpen) {
                                    currentGroup.days.push(wh.dayOfWeek);
                                } else {
                                    // Разные типы дней - начинаем новую группу
                                    grouped.push(currentGroup);
                                    currentGroup = {
                                        timeKey,
                                        days: [wh.dayOfWeek],
                                        isOpen: wh.isOpen,
                                        openTime: wh.openTime,
                                        closeTime: wh.closeTime
                                    };
                                }
                            }
                        });
                        
                        // Добавляем последнюю группу
                        if (currentGroup) {
                            grouped.push(currentGroup);
                        }
                        
                        // Формируем строку дней для группы
                        const formatDays = (days) => {
                            if (days.length === 1) {
                                return fullDayNames[days[0]];
                            }
                            
                            // Сортируем дни, начиная с понедельника (воскресенье в конце)
                            const sortedDays = [...days].sort((a, b) => {
                                if (a === 0) return 1; // Воскресенье в конец
                                if (b === 0) return -1;
                                return a - b;
                            });
                            
                            // Проверяем, идут ли дни подряд (учитывая, что воскресенье идет после субботы)
                            let isConsecutive = true;
                            for (let i = 1; i < sortedDays.length; i++) {
                                const prev = sortedDays[i - 1];
                                const curr = sortedDays[i];
                                // Проверяем последовательность: 1-2-3-4-5-6-0 (Пн-Вт-Ср-Чт-Пт-Сб-Вс)
                                if (prev === 6 && curr === 0) {
                                    // Суббота -> Воскресенье - это последовательно
                                    continue;
                                } else if (curr !== prev + 1) {
                                    isConsecutive = false;
                                    break;
                                }
                            }
                            
                            if (isConsecutive && sortedDays.length > 1) {
                                // Группа подряд идущих дней
                                return `${fullDayNames[sortedDays[0]]} - ${fullDayNames[sortedDays[sortedDays.length - 1]]}`;
                            } else {
                                // Разрозненные дни
                                return sortedDays.map(d => fullDayNames[d]).join(', ');
                            }
                        };
                        
                        return (
                            <View style={styles.workingHoursSection}>
                                <Text style={styles.workingHoursTitle}>График работы:</Text>
                                {grouped.map((group, index) => (
                                    <View key={index} style={styles.workingHoursRow}>
                                        <Text style={styles.workingHoursDay}>
                                            {formatDays(group.days)}:
                                        </Text>
                                        <Text style={styles.workingHoursTime}>
                                            {group.isOpen 
                                                ? (group.openTime && group.closeTime 
                                                    ? `${group.openTime} - ${group.closeTime}`
                                                    : 'Круглосуточно')
                                                : 'Выходной'
                                            }
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        );
                    })()}
                </View>

                {/* Карта */}
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
                                    title={warehouse.address || 'Склад'}
                                    description="Нажмите для навигации"
                                    onPress={handleMarkerPress}
                                    pinColor="#28C76F"
                                />
                            </MapView>
                        </View>
                    )}
                </View>

                {/* Сотрудники склада */}
                <WarehouseEmployeesList
                    warehouseId={warehouse.id}
                    employees={employees}
                    loading={false}
                    error={null}
                />

                {/* Кнопка редактирования для суперадмина */}
                {isSuperAdmin && (
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={handleEditPress}
                            activeOpacity={0.7}
                        >
                            <Icon name="edit" size={18} color="#fff" style={styles.editIcon} />
                            <Text style={styles.editButtonText}>Редактировать склад</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Товары на складе */}
                <WarehouseProductsList
                    warehouseId={warehouse.id}
                    products={warehouseProducts}
                    loading={productsLoading}
                />
            </View>
            
            {/* Модальное окно редактирования склада */}
            {isSuperAdmin && (
                <AddWarehouseModal
                    visible={editModalVisible}
                    onClose={handleCloseEditModal}
                    onSubmit={handleWarehouseSubmit}
                    warehouse={warehouse}
                    isSubmitting={isSubmitting}
                />
            )}
            
            {/* Модальное окно для выбора чата */}
            <ShareWarehouseModal
                visible={shareModalVisible}
                onClose={handleCloseShareModal}
                warehouseId={warehouse.id}
                warehouse={warehouse}
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
        paddingTop: 0,
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
    warehouseName: {
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
        marginTop: 8,
    },
    warehouseImage: {
        width: '100%',
        height: 250,
        borderRadius: 8,
        marginBottom: 16,
        backgroundColor: '#f2f2f2',
    },
    infoSection: {
        marginTop: 16,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    infoLabelContainer: {
        width: 120,
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
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    statusActive: {
        backgroundColor: '#E8F5E9',
    },
    statusInactive: {
        backgroundColor: '#FFEBEE',
    },
    statusText: {
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
    },
    statusTextActive: {
        color: '#2E7D32',
    },
    statusTextInactive: {
        color: '#C62828',
    },
    mapContainer: {
        height: 250,
        marginBottom: 16,
        marginTop: 16,
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
    mapTitle: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
        fontWeight: '500',
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
    editIconButton: {
        padding: 10,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
        marginBottom: 20,
    },
    editButton: {
        flex: 1,
        height: 44,
        borderRadius: 8,
        backgroundColor: Color.blue2,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    editIcon: {
        marginRight: 0,
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
    autoManageStatusText: {
        fontSize: FontSize.size_xs,
        fontFamily: FontFamily.sFProText,
        color: '#666',
        marginLeft: 8,
        fontStyle: 'italic',
    },
    workingHoursSection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    workingHoursTitle: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: Color.blue2,
        fontWeight: '600',
        marginBottom: 12,
        letterSpacing: 0.8,
    },
    workingHoursRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingVertical: 4,
    },
    workingHoursDay: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
        flex: 1,
        letterSpacing: 0.8,
    },
    workingHoursTime: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
        fontWeight: '500',
        letterSpacing: 0.8,
    },
});
