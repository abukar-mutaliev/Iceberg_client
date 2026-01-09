import React, { memo, useCallback, useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, TouchableOpacity, Modal, Linking, Platform, ActivityIndicator } from 'react-native';
import { Color, Border, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { getImageUrl } from '@shared/api/api';
import Icon from 'react-native-vector-icons/MaterialIcons';

const placeholderImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };

// Функция для форматирования времени понятным языком
const formatFriendlyTime = (startTime, endTime) => {
    if (!startTime || !endTime) return { main: 'Время не указано', sub: null, isNow: false };
    
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    // Проверяем, сейчас ли водитель на месте
    const isNow = start <= now && now <= end;
    
    // Форматируем время (часы:минуты)
    const formatTime = (date) => {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };
    
    const startTimeStr = formatTime(start);
    const endTimeStr = formatTime(end);
    
    // Получаем сегодняшнюю и завтрашнюю дату для сравнения
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    
    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);
    
    if (isNow) {
        // Сейчас на месте
        const minutesLeft = Math.round((end - now) / (1000 * 60));
        if (minutesLeft <= 60) {
            return {
                main: '🟢 Сейчас на месте',
                sub: `Ещё ${minutesLeft} мин до ${endTimeStr}`,
                isNow: true
            };
        } else {
            const hoursLeft = Math.floor(minutesLeft / 60);
            const minsLeft = minutesLeft % 60;
            return {
                main: '🟢 Сейчас на месте',
                sub: minsLeft > 0 ? `Ещё ${hoursLeft} ч ${minsLeft} мин` : `Ещё ${hoursLeft} ч`,
                isNow: true
            };
        }
    } else if (start > now) {
        // Будет в будущем
        if (startDay.getTime() === today.getTime()) {
            // Сегодня
            return {
                main: `⏰ Сегодня ${startTimeStr}`,
                sub: `до ${endTimeStr}`,
                isNow: false
            };
        } else if (startDay.getTime() === tomorrow.getTime()) {
            // Завтра
            return {
                main: `📅 Завтра ${startTimeStr}`,
                sub: `до ${endTimeStr}`,
                isNow: false
            };
        } else {
            // Другой день
            const dayName = start.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
            return {
                main: `📅 ${dayName}`,
                sub: `${startTimeStr} - ${endTimeStr}`,
                isNow: false
            };
        }
    } else {
        // Уже прошло
        return {
            main: '⏱ Уже был',
            sub: `${startTimeStr} - ${endTimeStr}`,
            isNow: false,
            isPast: true
        };
    }
};

const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;
    if (typeof photoPath !== 'string') return photoPath.uri;
    // Всегда используем getImageUrl для нормализации URL (включая замену старых IP-адресов)
    // getImageUrl умеет обрабатывать как относительные, так и полные URL
    return getImageUrl(photoPath);
};

// Модальное окно выбора способа связи
const ContactDriverModal = ({ visible, onClose, driverName, driverPhone, onChat, isChatLoading }) => {
    const handleCall = useCallback(() => {
        if (!driverPhone) return;
        
        const phoneNumber = driverPhone.replace(/[^0-9+]/g, '');
        const phoneUrl = Platform.select({
            ios: `tel:${phoneNumber}`,
            android: `tel:${phoneNumber}`
        });
        
        Linking.canOpenURL(phoneUrl)
            .then(supported => {
                if (supported) {
                    Linking.openURL(phoneUrl);
                    onClose();
                }
            })
            .catch(() => {});
    }, [driverPhone, onClose]);

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View style={styles.modalDriverIcon}>
                            <Icon name="local-shipping" size={32} color="#fff" />
                        </View>
                        <Text style={styles.modalTitle}>Связаться с водителем</Text>
                        {driverName && (
                            <Text style={styles.modalDriverName}>{driverName}</Text>
                        )}
                    </View>
                    
                    <View style={styles.modalActions}>
                        {driverPhone && (
                            <TouchableOpacity
                                style={[styles.modalButton, styles.callModalButton]}
                                onPress={handleCall}
                                activeOpacity={0.8}
                            >
                                <View style={styles.modalButtonIcon}>
                                    <Icon name="phone" size={24} color="#fff" />
                                </View>
                                <View style={styles.modalButtonText}>
                                    <Text style={styles.modalButtonTitle}>Позвонить</Text>
                                    <Text style={styles.modalButtonSubtitle}>{driverPhone}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity
                            style={[styles.modalButton, styles.chatModalButton]}
                            onPress={onChat}
                            activeOpacity={0.8}
                            disabled={isChatLoading}
                        >
                            <View style={styles.modalButtonIcon}>
                                {isChatLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Icon name="chat" size={24} color="#fff" />
                                )}
                            </View>
                            <View style={styles.modalButtonText}>
                                <Text style={styles.modalButtonTitle}>Написать в чат</Text>
                                <Text style={styles.modalButtonSubtitle}>Отправить сообщение</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity
                        style={styles.modalCloseButton}
                        onPress={onClose}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.modalCloseText}>Отмена</Text>
                    </TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
    );
};

const StopCardComponent = ({ stop, onPress, width, compact = true, showContactButton = false, onContactDriver }) => {
    const [imageError, setImageError] = React.useState(false);
    const [contactModalVisible, setContactModalVisible] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Получаем данные о водителе (важно: до ранних возвратов нельзя использовать хуки)
    const driverName = stop?.driver?.name || stop?.driverName;
    const driverPhone = stop?.driver?.phone || stop?.driverPhone;
    const hasDriverInfo = driverName || driverPhone;

    if (!stop || !stop.stopId) {
        return null;
    }

    const handlePress = useCallback(() => {
        if (__DEV__) {
            console.log('StopCard: handlePress called', {
                hasOnPress: !!onPress,
                stopId: stop.stopId,
                stopData: stop
            });
        }
        
        if (onPress && stop.stopId) {
            const numericId = typeof stop.stopId === 'string' ? parseInt(stop.stopId, 10) : stop.stopId;
            if (__DEV__) {
                console.log('StopCard: Calling onPress with stopId', numericId);
            }
            onPress(numericId);
        } else {
            if (__DEV__) {
                console.warn('StopCard: Cannot call onPress', {
                    hasOnPress: !!onPress,
                    hasStopId: !!stop.stopId
                });
            }
        }
    }, [onPress, stop.stopId, stop]);

    const handleImageError = useCallback(() => {
        if (__DEV__) {
            console.log('StopCard: Image load error for stop', stop.stopId);
        }
        setImageError(true);
    }, [stop.stopId]);

    const handleContactPress = useCallback(() => {
        // Если есть данные о водителе - показываем модальное окно
        if (driverName || driverPhone) {
            setContactModalVisible(true);
        } else {
            // Если данных нет - открываем страницу остановки
            if (onPress && stop.stopId) {
                const numericId = typeof stop.stopId === 'string' ? parseInt(stop.stopId, 10) : stop.stopId;
                onPress(numericId);
            }
        }
    }, [driverName, driverPhone, onPress, stop.stopId]);

    const handleCloseModal = useCallback(() => {
        setContactModalVisible(false);
    }, []);

    const handleChat = useCallback(async () => {
        if (onContactDriver) {
            setIsChatLoading(true);
            try {
                await onContactDriver('chat', stop);
                setContactModalVisible(false);
            } catch (error) {
                console.error('Error starting chat:', error);
            } finally {
                setIsChatLoading(false);
            }
        }
    }, [onContactDriver, stop]);

    const photoUri = useMemo(() => {
        // Сбрасываем ошибку при изменении фото
        setImageError(false);
        
        if (stop.photo) {
            const url = getPhotoUrl(stop.photo);
            if (__DEV__) {
                console.log('StopCard: Photo URL', {
                    original: stop.photo,
                    formatted: url
                });
            }
            return url;
        }
        return null;
    }, [stop.photo]);

    // Понятное время для пользователя
    const friendlyTime = useMemo(() => {
        return formatFriendlyTime(stop.startTime, stop.endTime);
    }, [stop.startTime, stop.endTime]);

    const containerStyle = width ? [styles.compactContainer, { width }] : styles.compactContainer;

    return (
        <>
            <Pressable
                style={containerStyle}
                onPress={handlePress}
            >
                {/* Изображение остановки */}
                <View style={styles.compactImageContainer}>
                    {photoUri && !imageError ? (
                        <Image
                            style={styles.compactStopImage}
                            resizeMode="cover"
                            source={{ uri: photoUri }}
                            defaultSource={placeholderImage}
                            onError={handleImageError}
                        />
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <Text style={styles.placeholderIcon}>🚚</Text>
                        </View>
                    )}
                    {friendlyTime.isNow && (
                        <View style={styles.statusBadge}>
                            <View style={styles.activeIndicator} />
                            <Text style={styles.statusText}>На месте</Text>
                        </View>
                    )}
                </View>

                {/* Контент остановки */}
                <View style={styles.compactContentContainer}>
                    {/* Район */}
                    {stop.district && (
                        <Text style={styles.districtText} numberOfLines={1}>
                            📍 {stop.district.name}
                        </Text>
                    )}

                    {/* Адрес */}
                    <Text style={styles.compactTitle} numberOfLines={2} ellipsizeMode="tail">
                        {stop.address || 'Адрес не указан'}
                    </Text>

                    {/* Понятное время */}
                    <View style={[styles.friendlyTimeContainer, friendlyTime.isNow && styles.friendlyTimeNow]}>
                        <Text style={[styles.friendlyTimeMain, friendlyTime.isNow && styles.friendlyTimeMainNow]}>
                            {friendlyTime.main}
                        </Text>
                        {friendlyTime.sub && (
                            <Text style={[styles.friendlyTimeSub, friendlyTime.isNow && styles.friendlyTimeSubNow]}>
                                {friendlyTime.sub}
                            </Text>
                        )}
                    </View>

                    {/* Кнопка связаться с водителем */}
                    {showContactButton && (
                        <TouchableOpacity
                            style={styles.contactButton}
                            onPress={handleContactPress}
                            activeOpacity={0.7}
                        >
                            <Icon name="phone-in-talk" size={16} color="#fff" />
                            <Text style={styles.contactButtonText}>Связаться с водителем</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Pressable>
            
            {/* Модальное окно связи с водителем */}
            <ContactDriverModal
                visible={contactModalVisible}
                onClose={handleCloseModal}
                driverName={driverName}
                driverPhone={driverPhone}
                onChat={handleChat}
                isChatLoading={isChatLoading}
            />
        </>
    );
};

const arePropsEqual = (prevProps, nextProps) => {
    if (prevProps === nextProps) return true;
    if (prevProps.width !== nextProps.width) return false;
    if (prevProps.compact !== nextProps.compact) return false;
    if (prevProps.onPress !== nextProps.onPress) return false;

    const prevStop = prevProps.stop;
    const nextStop = nextProps.stop;

    if (prevStop === nextStop) return true;
    if (!prevStop || !nextStop) return false;

    return (
        prevStop.stopId === nextStop.stopId &&
        prevStop.address === nextStop.address &&
        prevStop.startTime === nextStop.startTime &&
        prevStop.endTime === nextStop.endTime &&
        prevStop.photo === nextStop.photo
    );
};

export const StopCard = memo(StopCardComponent, arePropsEqual);

const styles = StyleSheet.create({
    compactContainer: {
        width: 250,
        borderWidth: 0.5,
        borderColor: Color.purpleSoft,
        borderRadius: Border.br_xl,
        backgroundColor: Color.colorLightMode,
        overflow: 'hidden',
    },
    compactImageContainer: {
        width: '100%',
        height: 150,
        position: 'relative',
        backgroundColor: '#F9F9F9',
    },
    compactStopImage: {
        width: '100%',
        height: '100%',
    },
    placeholderContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E8E8E8',
    },
    placeholderIcon: {
        fontSize: 48,
    },
    statusBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        backgroundColor: '#4CAF50',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    activeIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFF',
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        fontFamily: FontFamily.sFProText,
        fontWeight: '700',
        color: '#FFF',
    },
    compactContentContainer: {
        padding: 12,
    },
    districtText: {
        fontFamily: FontFamily.sFProText,
        fontSize: 11,
        fontWeight: '600',
        color: Color.blue2,
        marginBottom: 4,
    },
    compactTitle: {
        fontFamily: FontFamily.sFProText,
        fontSize: 14,
        fontWeight: '600',
        color: Color.purpleSoft,
        marginBottom: 8,
        lineHeight: 18,
    },
    // Понятное время
    friendlyTimeContainer: {
        backgroundColor: '#F5F7FA',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginBottom: 8,
    },
    friendlyTimeNow: {
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    friendlyTimeMain: {
        fontFamily: FontFamily.sFProText,
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
    },
    friendlyTimeMainNow: {
        color: '#2E7D32',
    },
    friendlyTimeSub: {
        fontFamily: FontFamily.sFProText,
        fontSize: 12,
        fontWeight: '500',
        color: '#666',
        marginTop: 2,
    },
    friendlyTimeSubNow: {
        color: '#4CAF50',
    },
    // Кнопка связаться
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Color.blue2,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginTop: 4,
        gap: 6,
    },
    contactButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    // Модальное окно
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
    },
    modalHeader: {
        backgroundColor: Color.blue2,
        paddingVertical: 24,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    modalDriverIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontFamily: FontFamily.sFProText,
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    modalDriverName: {
        fontFamily: FontFamily.sFProText,
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.9)',
    },
    modalActions: {
        padding: 16,
        gap: 12,
    },
    modalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 14,
        gap: 14,
    },
    callModalButton: {
        backgroundColor: '#34C759',
    },
    chatModalButton: {
        backgroundColor: Color.blue2,
    },
    modalButtonIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalButtonText: {
        flex: 1,
    },
    modalButtonTitle: {
        fontFamily: FontFamily.sFProText,
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 2,
    },
    modalButtonSubtitle: {
        fontFamily: FontFamily.sFProText,
        fontSize: 13,
        fontWeight: '400',
        color: 'rgba(255, 255, 255, 0.8)',
    },
    modalCloseButton: {
        paddingVertical: 16,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#E8E8E8',
    },
    modalCloseText: {
        fontFamily: FontFamily.sFProText,
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    // Старые стили для совместимости
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    timeIcon: {
        fontSize: 12,
        marginRight: 4,
    },
    timeText: {
        fontFamily: FontFamily.sFProText,
        fontSize: 12,
        fontWeight: '500',
        color: Color.colorCornflowerblue,
    },
    truckInfoContainer: {
        marginTop: 4,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E8E8E8',
    },
    truckText: {
        fontFamily: FontFamily.sFProText,
        fontSize: 11,
        fontWeight: '500',
        color: Color.colorCornflowerblue,
        marginBottom: 2,
    },
    truckNumberText: {
        fontFamily: FontFamily.sFProText,
        fontSize: 11,
        fontWeight: '600',
        color: Color.purpleSoft,
    },
});

