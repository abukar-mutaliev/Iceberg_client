import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Platform, Alert, Linking, ActivityIndicator, Clipboard, RefreshControl } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import MapView, { Marker } from 'react-native-maps';
import Constants from 'expo-constants';
import { selectUser } from '@entities/auth/model/selectors';
import { formatTimeRange, formatTime, formatDate } from "@shared/lib/dateFormatters";
import { getImageUrl } from '@shared/api/api';
import { logData } from '@shared/lib/logger';
import { BackButton } from "@shared/ui/Button/BackButton";
import { StopProductsList } from '@entities/stop/ui/StopProductsList';
import { ShareStopModal } from './ShareStopModal';
import ChatApi from '@entities/chat/api/chatApi';
import { selectRoomsList } from '@entities/chat/model/selectors';
import { fetchRooms } from '@entities/chat/model/slice';
import { useToast } from '@shared/ui/Toast';
import { deleteStop } from '@entities/stop';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const placeholderImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };

// Тёмная схема для Google Maps (Android)
const DARK_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#1d2030' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1d2030' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8a92b2' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d1d5db' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8a92b2' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1f3a2a' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2b2f44' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1d2030' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca0b8' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3f5c' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1d2030' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3344' }] },
    { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d92' }] },
];

const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;

    if (typeof photoPath !== 'string') {
        return photoPath.uri;
    }

    return getImageUrl(photoPath);
};

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

        logData('Геокодирование адреса остановки', { address, query, url });

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

const parseMapLocation = (mapLocation) => {
    if (!mapLocation) {
        return null;
    }

    try {
        if (typeof mapLocation === 'object' && mapLocation.latitude && mapLocation.longitude) {
            const lat = parseFloat(mapLocation.latitude);
            const lng = parseFloat(mapLocation.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                return { latitude: lat, longitude: lng };
            }
        }

        if (typeof mapLocation === 'string') {
            const trimmed = mapLocation.trim();

            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                try {
                    const parsed = JSON.parse(trimmed);

                    if (Array.isArray(parsed) && parsed.length >= 2) {
                        const lat = parseFloat(parsed[0]);
                        const lng = parseFloat(parsed[1]);
                        if (!isNaN(lat) && !isNaN(lng)) {
                            return { latitude: lat, longitude: lng };
                        }
                    }

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

const getRelativeDayLabel = (targetDate, baseDate = new Date()) => {
    if (!(targetDate instanceof Date) || isNaN(targetDate.getTime())) {
        return null;
    }

    const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffMs = startOfDay(targetDate).getTime() - startOfDay(baseDate).getTime();
    const diffDays = Math.round(diffMs / 86400000);

    if (diffDays === 0) return 'сегодня';
    if (diffDays === 1) return 'завтра';
    if (diffDays === 2) return 'послезавтра';
    if (diffDays === -1) return 'вчера';

    return formatDate(targetDate);
};

const isSameDay = (left, right) => {
    if (!(left instanceof Date) || isNaN(left.getTime()) || !(right instanceof Date) || isNaN(right.getTime())) {
        return false;
    }
    return (
        left.getFullYear() === right.getFullYear() &&
        left.getMonth() === right.getMonth() &&
        left.getDate() === right.getDate()
    );
};

const parseTimeString = (timeString) => {
    if (!timeString || typeof timeString !== 'string') {
        return null;
    }
    const [hoursPart, minutesPart] = timeString.split(':');
    const hours = Number(hoursPart);
    const minutes = Number(minutesPart);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return null;
    }
    return { hours, minutes };
};

const buildDateWithTime = (baseDate, timeString) => {
    const time = parseTimeString(timeString);
    if (!time) {
        return null;
    }
    const next = new Date(baseDate);
    next.setHours(time.hours, time.minutes, 0, 0);
    return next;
};

const getNextOccurrenceFromSchedule = (schedule, fromDate, minDateTime = null) => {
    if (!schedule?.daysOfWeek?.length) {
        return null;
    }
    const days = schedule.daysOfWeek
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    if (!days.length) {
        return null;
    }
    const minTime = minDateTime ? new Date(minDateTime) : null;
    for (let offset = 0; offset <= 14; offset += 1) {
        const candidate = new Date(fromDate);
        candidate.setDate(candidate.getDate() + offset);
        if (!days.includes(candidate.getDay())) {
            continue;
        }
        const start = buildDateWithTime(candidate, schedule.startTime);
        const end = buildDateWithTime(candidate, schedule.endTime);
        if (start && end) {
            if (minTime && end <= minTime) {
                continue;
            }
            return { startTime: start, endTime: end };
        }
    }
    return null;
};

const getDisplayTimesForStop = (stop) => {
    if (!stop?.startTime || !stop?.endTime) {
        return { startTime: stop?.startTime, endTime: stop?.endTime };
    }

    const schedule = stop.schedule;
    if (!schedule?.daysOfWeek?.length) {
        return { startTime: stop.startTime, endTime: stop.endTime };
    }

    const now = new Date();
    const startDate = new Date(stop.startTime);

    const isSkipToday = (stop.status || '').toUpperCase() === 'SKIPPED' ||
        (stop.skipReason && isSameDay(startDate, now));

    if (!isSkipToday) {
        return { startTime: stop.startTime, endTime: stop.endTime };
    }

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const nextOccurrence = getNextOccurrenceFromSchedule(schedule, tomorrow);
    if (nextOccurrence?.startTime && nextOccurrence?.endTime) {
        return nextOccurrence;
    }

    return { startTime: stop.startTime, endTime: stop.endTime };
};

const formatStopTime = (startTime, endTime) => {
    if (!startTime || !endTime) return null;

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;

    const startTimeStr = formatTime(startTime);
    const endTimeStr = formatTime(endTime);
    const startDateStr = formatDate(startTime);
    const endDateStr = formatDate(endTime);
    const startDayLabel = getRelativeDayLabel(startDate);
    const endDayLabel = getRelativeDayLabel(endDate);

    const now = new Date();
    const isActive = now >= startDate && now <= endDate;

    return {
        startTime: startTimeStr,
        endTime: endTimeStr,
        startDate: startDateStr,
        endDate: endDateStr,
        isSameDay: startDateStr === endDateStr,
        isActive: isActive,
        endDateTime: endDate,
        startDayLabel,
        endDayLabel
    };
};

export const StopDetailsContent = ({ stop, navigation, lifecycleSection, onRefresh, refreshing = false }) => {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const rooms = useSelector(selectRoomsList);
    const { showSuccess, showError } = useToast();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const defaultCoords = { latitude: 43.172837, longitude: 44.811913 };
    const [mapCoordinates, setMapCoordinates] = useState(defaultCoords);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [timeTick, setTimeTick] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeTick(Date.now());
        }, 60 * 1000);
        return () => clearInterval(timer);
    }, []);

    const displayTimes = useMemo(() => {
        if (!stop?.startTime || !stop?.endTime) {
            return getDisplayTimesForStop(stop);
        }

        const now = new Date(timeTick);
        const startDate = new Date(stop.startTime);
        const endDate = new Date(stop.endTime);

        if (startDate >= now || endDate >= now) {
            return { startTime: stop.startTime, endTime: stop.endTime };
        }

        const schedule = stop.schedule;
        if (schedule?.daysOfWeek?.length) {
            const isSkipToday = (stop.status || '').toUpperCase() === 'SKIPPED' ||
                (stop.skipReason && isSameDay(startDate, now));

            const fromDate = new Date(now);
            if (isSkipToday) {
                fromDate.setDate(fromDate.getDate() + 1);
                fromDate.setHours(0, 0, 0, 0);
            }

            const nextOccurrence = getNextOccurrenceFromSchedule(schedule, fromDate, now);
            if (nextOccurrence?.startTime && nextOccurrence?.endTime) {
                return nextOccurrence;
            }
        }

        return getDisplayTimesForStop(stop);
    }, [stop, timeTick]);
    const timeInfo = useMemo(
        () => formatStopTime(displayTimes?.startTime, displayTimes?.endTime),
        [displayTimes]
    );
    const [geocodingError, setGeocodingError] = useState(null);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const isSuperAdmin = !!user?.admin?.isSuperAdmin;
    const isAdminOrEmployee = ['ADMIN', 'EMPLOYEE'].includes(user?.role) || isSuperAdmin;
    const isDriverOwnedStop = !!(
        (user?.id && stop?.driver?.userId === user.id) ||
        (user?.driver?.id && stop?.driverId === user.driver.id)
    );
    const isEmployeeOwnedStop = !!(
        (user?.id && stop?.employee?.userId === user.id) ||
        (user?.employee?.id && stop?.employeeId === user.employee.id)
    );
    const canEdit = isAdminOrEmployee || (user?.role === 'DRIVER' && isDriverOwnedStop) || isEmployeeOwnedStop;
    const canDelete = isAdminOrEmployee || (user?.role === 'DRIVER' && isDriverOwnedStop) || isEmployeeOwnedStop;
    const isAuthenticated = !!user;

    const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

    const contactPerson = stop?.employee || stop?.driver;
    const contactType = stop?.employee ? 'employee' : 'driver';
    const contactRoleLabel = contactType === 'employee' ? 'Сотрудник' : 'Водитель';
    const contactRoleInstrumental = contactType === 'employee' ? 'сотрудником' : 'водителем';
    const hasContactInfo = contactPerson && (contactPerson.name || contactPerson.phone);
    const canCallContact = !!contactPerson?.phone && user?.id !== contactPerson?.userId;

    const accentColor = isDark ? colors.primary : Color.blue2;
    const shareIconColor = isDark ? colors.primary : Color.purpleSoft;

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

    const handleDeletePress = () => {
        Alert.alert(
            'Удаление остановки',
            'Вы уверены, что хотите удалить эту остановку? Это действие нельзя отменить.',
            [
                {
                    text: 'Отмена',
                    style: 'cancel',
                },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            await dispatch(deleteStop(stop.id)).unwrap();
                            showSuccess('Остановка успешно удалена', {
                                duration: 2000,
                                position: 'top'
                            });
                            setTimeout(() => {
                                navigation.goBack();
                            }, 500);
                        } catch (error) {
                            const errorMessage = error?.message || 'Не удалось удалить остановку';
                            showError(errorMessage, {
                                duration: 3000,
                                position: 'top'
                            });
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };

    const handleSharePress = () => {
        if (!isAuthenticated) {
            goToAuth('login');
            return;
        }
        setShareModalVisible(true);
    };

    const handleCloseShareModal = () => {
        setShareModalVisible(false);
    };

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

    const handleCallContact = () => {
        if (!contactPerson?.phone) {
            Alert.alert('Ошибка', `Номер телефона ${contactRoleInstrumental} не указан`);
            return;
        }

        const phoneNumber = contactPerson.phone.replace(/[^0-9+]/g, '');
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

    const handleChatWithContact = async () => {
        if (!isAuthenticated) {
            goToAuth('login');
            return;
        }

        setIsCreatingChat(true);

        try {
            const contactUserId = contactPerson?.userId;

            if (!contactUserId) {
                Alert.alert('Ошибка', `Информация о ${contactRoleInstrumental} недоступна`);
                return;
            }

            const normalizedContactUserId = Number(contactUserId);
            const normalizedCurrentUserId = Number(user?.id);

            if (normalizedContactUserId === normalizedCurrentUserId) {
                Alert.alert('Недоступно', 'Нельзя открыть чат с самим собой');
                return;
            }

            const contactName = contactPerson?.name || contactRoleLabel;

            const isChatWithContact = (room) => {
                const roomData = room?.room || room;
                if (roomData?.type !== 'DIRECT') return false;

                const participants = roomData.participants || [];
                return participants.some(participant => {
                    const participantId = participant?.userId ?? participant?.user?.id ?? participant?.id;
                    if (!participantId) return false;

                    const normalizedParticipantId = Number(participantId);
                    return normalizedParticipantId === normalizedContactUserId &&
                        normalizedParticipantId !== normalizedCurrentUserId;
                });
            };

            let existingChat = (rooms || []).find(isChatWithContact);

            if (!existingChat) {
                try {
                    await dispatch(fetchRooms({ page: 1, forceRefresh: true }));
                } catch (fetchError) {
                    logData('Ошибка при обновлении списка комнат', fetchError);
                }
            }

            if (!existingChat) {
                try {
                    const roomsResponse = await ChatApi.getRooms({ type: 'DIRECT' });
                    const allRooms = roomsResponse?.data?.rooms || roomsResponse?.data?.data?.rooms || [];
                    existingChat = allRooms.find(isChatWithContact);
                } catch (apiError) {
                    logData('Ошибка при получении комнат через API', apiError);
                }
            }

            let roomId;
            let roomObj;

            if (existingChat) {
                roomObj = existingChat.room || existingChat;
                roomId = roomObj.id || existingChat.id;
            } else {
                const formData = new FormData();
                formData.append('type', 'DIRECT');
                formData.append('title', contactName);
                formData.append('members', JSON.stringify([contactUserId]));

                const createResponse = await ChatApi.createRoom(formData);
                roomObj = createResponse?.data?.room || createResponse?.data?.data?.room || createResponse?.data;

                if (!roomObj?.id) {
                    throw new Error('Не удалось создать чат');
                }

                roomId = roomObj.id;

                try {
                    await dispatch(fetchRooms({ page: 1, forceRefresh: true }));
                } catch (updateError) {
                    logData('Ошибка при обновлении списка комнат после создания', updateError);
                }
            }

            const rootNavigation =
                navigation?.getParent?.('AppStack') ||
                navigation?.getParent?.()?.getParent?.() ||
                null;

            (rootNavigation || navigation).navigate('ChatRoom', {
                roomId,
                roomTitle: contactName,
                roomData: roomObj,
                userId: contactUserId,
                currentUserId: user?.id,
                fromScreen: 'StopDetails'
            });
        } catch (error) {
            logData(`Ошибка при открытии чата с ${contactRoleInstrumental}`, error);
            Alert.alert('Ошибка', `Не удалось открыть чат с ${contactRoleInstrumental}. Попробуйте позже.`);
        } finally {
            setIsCreatingChat(false);
        }
    };

    const handleMarkerPress = () => {
        openNativeMaps();
    };

    const openNativeMaps = () => {
        const { latitude, longitude } = mapCoordinates;
        const label = encodeURIComponent(stop.address || 'Остановка');
        const coordinates = `${latitude},${longitude}`;

        const url = Platform.select({
            ios: `maps://app?daddr=${coordinates}&dirflg=d&saddr=Current%20Location`,
            android: `geo:0,0?q=${coordinates}(${label})`
        });

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordinates)}`;
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

        setMapLoaded(false);
        setGeocodingError(null);

        const loadCoordinates = async () => {
            const parsedCoords = parseMapLocation(stop.mapLocation);

            if (parsedCoords) {
                setMapCoordinates(parsedCoords);
                setMapLoaded(true);
                return;
            }

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
            refreshControl={
                onRefresh ? (
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={accentColor}
                        colors={[accentColor]}
                        progressBackgroundColor={isDark ? colors.surfaceElevated : '#fff'}
                    />
                ) : undefined
            }
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
                        <Icon name="share" size={24} color={shareIconColor} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.shareIconButton}
                        onPress={handleSharePress}
                        activeOpacity={0.7}
                    >
                        <Icon name="share" size={24} color={shareIconColor} />
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
                                <Icon name="content-copy" size={18} color={accentColor} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {stop.startTime && stop.endTime ? (
                    <View style={styles.dateTimeContainer}>
                        {!timeInfo ? (
                            <Text style={styles.dateTime}>Время не указано</Text>
                        ) : (
                            <View style={styles.timeInfoContainer}>
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
                                                    {!timeInfo.isSameDay ? `, ${timeInfo.endDayLabel}` : `, ${timeInfo.startDayLabel}`}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {!timeInfo.isActive && (
                                    <View style={styles.timeRow}>
                                        <View style={styles.timeIconContainer}>
                                            <Icon name="schedule" size={22} color={accentColor} />
                                        </View>
                                        <View style={styles.timeTextContainer}>
                                            <Text style={styles.timeLabel}>Следующая остановка:</Text>
                                            <Text style={styles.timeValue}>
                                                {timeInfo.isSameDay
                                                    ? `${timeInfo.startDayLabel} с ${timeInfo.startTime} до ${timeInfo.endTime}`
                                                    : `с ${timeInfo.startDayLabel} ${timeInfo.startTime} до ${timeInfo.endDayLabel} ${timeInfo.endTime}`
                                                }
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.dateTimeContainer}>
                        <Text style={styles.dateTime}>Время не указано</Text>
                    </View>
                )}

                {lifecycleSection}

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
                            <Text style={styles.infoLabel} numberOfLines={1}>Модель:</Text>
                        </View>
                        <View style={styles.infoValueContainer}>
                            <Text style={styles.infoValue}>{stop.truckModel || 'Не указано'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoLabelContainer}>
                            <Text style={styles.infoLabel} numberOfLines={1}>Номер:</Text>
                        </View>
                        <View style={styles.infoValueContainer}>
                            <Text style={styles.infoValue}>{stop.truckNumber || 'Не указано'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoLabelContainer}>
                            <Text style={styles.infoLabel} numberOfLines={1}>Район:</Text>
                        </View>
                        <View style={styles.infoValueContainer}>
                            <Text style={styles.infoValue}>{stop.district?.name || 'Не указано'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoLabelContainer}>
                            <Text style={styles.infoLabel} numberOfLines={1}>Адрес:</Text>
                        </View>
                        <View style={[styles.infoValueContainer, styles.addressValueContainer]}>
                            <Text style={styles.infoValue}>{stop.address || 'Не указано'}</Text>
                            {stop.address && (
                                <TouchableOpacity
                                    style={styles.copyAddressButtonSmall}
                                    onPress={handleCopyAddress}
                                    activeOpacity={0.7}
                                >
                                    <Icon name="content-copy" size={14} color={accentColor} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>

                {(stop.description) && (
                    <View style={styles.descriptionContainer}>
                        {stop.description ? (
                            <Text style={styles.description}>{stop.description}</Text>
                        ) : null}
                    </View>
                )}

                {hasContactInfo && (
                    <View style={styles.driverSection}>
                        <Text style={styles.driverSectionTitle}>Связь с водителем</Text>
                        <View style={styles.driverHeader}>
                            <View style={styles.driverIconContainer}>
                                <Icon
                                    name={contactType === 'employee' ? 'badge' : 'local-shipping'}
                                    size={24}
                                    color={accentColor}
                                />
                            </View>
                            <View style={styles.driverInfo}>
                                <Text style={styles.driverName}>{contactPerson.name || contactRoleLabel}</Text>
                                {contactPerson.phone && (
                                    <Text style={styles.driverPhone}>{contactPerson.phone}</Text>
                                )}
                            </View>
                        </View>

                        {hasContactInfo && (
                            <View style={styles.driverActions}>
                                {contactPerson.phone && (
                                    <TouchableOpacity
                                        style={[styles.driverButton, styles.callButton]}
                                        onPress={handleCallContact}
                                        activeOpacity={0.7}
                                        disabled={!canCallContact}
                                    >
                                        <Icon name="phone" size={20} color="#fff" />
                                        <Text style={styles.callButtonText}>Позвонить</Text>
                                    </TouchableOpacity>
                                )}

                                {isAuthenticated ? (
                                    <TouchableOpacity
                                        style={[styles.driverButton, styles.chatButton]}
                                        onPress={handleChatWithContact}
                                        activeOpacity={0.7}
                                        disabled={isCreatingChat}
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
                            <ActivityIndicator size="small" color={accentColor} />
                            <Text style={styles.mapLoadingText}>
                                {isGeocoding ? 'Определяем местоположение...' : 'Загружаем карту...'}
                            </Text>
                        </View>
                    ) : (isExpoGo || mapError) ? (
                        <View style={styles.mapFallbackContainer}>
                            <View style={styles.mapFallbackContent}>
                                <Icon name="map" size={48} color={accentColor} />
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
                                key={isDark ? 'stop-map-dark' : 'stop-map-light'}
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
                                userInterfaceStyle={isDark ? 'dark' : 'light'}
                                customMapStyle={isDark ? DARK_MAP_STYLE : []}
                            >
                                <Marker
                                    coordinate={{
                                        latitude: mapCoordinates.latitude,
                                        longitude: mapCoordinates.longitude,
                                    }}
                                    title={stop.address || 'Остановка'}
                                    description="Нажмите для навигации"
                                    onPress={handleMarkerPress}
                                    pinColor={isDark ? '#737DFF' : '#3B43A2'}
                                />
                            </MapView>
                        </View>
                    )}
                </View>

                {(canEdit || canDelete) && (
                    <View style={styles.actionButtonsContainer}>
                        {canEdit && (
                            <TouchableOpacity
                                style={[styles.actionButton, styles.editButton]}
                                onPress={handleEditPress}
                                disabled={isDeleting}
                            >
                                <Text style={styles.editButtonText}>Редактировать</Text>
                            </TouchableOpacity>
                        )}
                        {canDelete && (
                            <TouchableOpacity
                                style={[styles.actionButton, styles.deleteButton]}
                                onPress={handleDeletePress}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Icon name="delete" size={18} color="#fff" style={styles.deleteIcon} />
                                        <Text style={styles.deleteButtonText}>Удалить</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            <ShareStopModal
                visible={shareModalVisible}
                onClose={handleCloseShareModal}
                stopId={stop.id}
                stop={stop}
            />
        </ScrollView>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    errorText: {
        fontSize: FontSize.size_md,
        color: colors.error,
        textAlign: 'center',
        marginTop: 50,
        fontFamily: FontFamily.sFProText || "system",
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingTop: 5,
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
        color: colors.textPrimary,
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
        color: colors.textPrimary,
        letterSpacing: 0.9,
        minWidth: 0,
    },
    copyAddressButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: isDark ? 'rgba(115, 125, 255, 0.12)' : '#E8F0FE',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(115, 125, 255, 0.3)' : '#D0E0F0',
        flexShrink: 0,
        marginTop: 2,
    },
    dateTimeContainer: {
        marginBottom: 16,
        backgroundColor: isDark ? colors.surfaceElevated : '#F8F9FA',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: isDark ? colors.border : '#E8EAED',
    },
    dateTime: {
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.sFProText || "system",
        color: colors.textPrimary,
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
        backgroundColor: isDark ? 'rgba(115, 125, 255, 0.12)' : '#E8F0FE',
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
        color: colors.textSecondary,
        marginBottom: 4,
        fontWeight: '500',
    },
    timeValue: {
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.sFProText || "system",
        color: colors.textPrimary,
        fontWeight: '600',
        lineHeight: 24,
    },
    timeDate: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText || "system",
        color: isDark ? colors.primary : Color.blue2,
        marginTop: 8,
        textAlign: 'center',
        fontWeight: '500',
    },
    activeStopBanner: {
        backgroundColor: isDark ? '#2E8F4A' : '#34C759',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: isDark ? '#246B39' : '#30B050',
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
        backgroundColor: isDark ? colors.surfaceElevated : '#f2f2f2',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: isDark ? colors.border : '#e0e0e0',
        borderStyle: 'dashed',
    },
    photoPlaceholderText: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: colors.textTertiary,
    },
    infoSection: {
        marginTop: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoLabelContainer: {
        width: 80,
        flexShrink: 0,
        justifyContent: 'center',
    },
    infoLabel: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: isDark ? colors.primary : Color.blue2,
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
        color: colors.textPrimary,
        letterSpacing: 0.8,
        minWidth: 0,
    },
    copyAddressButtonSmall: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: isDark ? 'rgba(115, 125, 255, 0.12)' : '#E8F0FE',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(115, 125, 255, 0.3)' : '#D0E0F0',
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
        color: colors.textPrimary,
        letterSpacing: 0.7,
        lineHeight: 17,
    },
    nextStopText: {
        marginTop: 8,
        fontSize: 13,
        fontFamily: FontFamily.sFProText,
        color: isDark ? colors.primary : Color.colorCornflowerblue,
        lineHeight: 16,
    },
    mapContainer: {
        height: 250,
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: isDark ? colors.surfaceElevated : '#f0f0f0',
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
        color: colors.textPrimary,
        fontWeight: '500',
    },
    mapSubtitle: {
        fontSize: FontSize.size_xs,
        fontFamily: FontFamily.sFProText,
        color: colors.textSecondary,
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
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
        marginBottom: 20,
    },
    actionButton: {
        flex: 1,
        height: 40,
        borderRadius: Border.br_3xs,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    editButton: {
        backgroundColor: isDark ? colors.primary : Color.blue2,
    },
    editButtonText: {
        color: Color.colorLightMode,
        fontSize: FontSize.size_md,
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
    },
    deleteButton: {
        backgroundColor: isDark ? '#C4392F' : '#FF3B30',
    },
    deleteButtonText: {
        color: Color.colorLightMode,
        fontSize: FontSize.size_md,
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
        marginLeft: 4,
    },
    deleteIcon: {
        marginRight: 2,
    },
    mapLoadingContainer: {
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isDark ? colors.surfaceElevated : '#f0f0f0',
        borderRadius: 8,
        gap: 8,
    },
    mapLoadingText: {
        fontSize: FontSize.size_md,
        color: isDark ? colors.textSecondary : '#3B43A2',
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    geocodingErrorText: {
        fontSize: FontSize.size_xs,
        color: colors.error,
        fontFamily: FontFamily.sFProText,
        marginTop: 4,
    },
    mapFallbackContainer: {
        height: 250,
        backgroundColor: isDark ? colors.surfaceElevated : '#f0f0f0',
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
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        marginTop: 12,
        marginBottom: 8,
        textAlign: 'center',
    },
    mapFallbackText: {
        fontSize: FontSize.size_sm,
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    mapFallbackButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? colors.primary : Color.blue2,
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
    driverSection: {
        backgroundColor: isDark ? colors.surfaceElevated : '#F8F9FA',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: isDark ? colors.border : '#E8EAED',
    },
    driverSectionTitle: {
        fontSize: FontSize.size_md,
        fontWeight: '600',
        color: colors.textPrimary,
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
        backgroundColor: isDark ? 'rgba(115, 125, 255, 0.12)' : '#E8F0FE',
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
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        marginBottom: 2,
    },
    driverPhone: {
        fontSize: FontSize.size_sm,
        color: colors.textSecondary,
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
        backgroundColor: isDark ? '#2E8F4A' : '#34C759',
    },
    callButtonText: {
        color: '#fff',
        fontSize: FontSize.size_sm,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
    },
    chatButton: {
        backgroundColor: isDark ? colors.primary : Color.blue2,
    },
    chatButtonText: {
        color: '#fff',
        fontSize: FontSize.size_sm,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
    },
});
