import React, { memo, useCallback, useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { Color, Border, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { getImageUrl } from '@shared/api/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CachedImage } from '@entities/chat/ui/CachedImage/CachedImage';

const placeholderImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };

const getImageUrlForWarehouse = (imagePath) => {
    if (!imagePath) return null;
    if (typeof imagePath !== 'string') return imagePath.uri;
    return getImageUrl(imagePath);
};

const WarehouseCardComponent = ({ warehouse, onPress, width, compact = true }) => {
    const [imageError, setImageError] = useState(false);

    if (!warehouse || !warehouse.id) {
        return null;
    }

    // Получаем информацию о графике работы на сегодня
    const getTodaySchedule = useMemo(() => {
        // Проверяем наличие workingHours
        if (!warehouse.workingHours) {
            return null;
        }

        if (!Array.isArray(warehouse.workingHours)) {
            return null;
        }

        if (warehouse.workingHours.length === 0) {
            return null;
        }

        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = воскресенье, 1 = понедельник, ..., 6 = суббота
        
        const todaySchedule = warehouse.workingHours.find(wh => {
            const whDay = typeof wh.dayOfWeek === 'string' ? parseInt(wh.dayOfWeek, 10) : wh.dayOfWeek;
            return whDay === dayOfWeek;
        });
        
        if (!todaySchedule) {
            return null;
        }

        if (!todaySchedule.isOpen) {
            return 'Выходной';
        }

        const openTime = todaySchedule.openTime || '';
        const closeTime = todaySchedule.closeTime || '';
        
        if (openTime && closeTime) {
            return `${openTime} - ${closeTime}`;
        } else if (openTime) {
            return `Открыто с ${openTime}`;
        } else if (closeTime) {
            return `До ${closeTime}`;
        }

        return 'Работает';
    }, [warehouse.workingHours]);

    const handlePress = useCallback(() => {
        if (onPress && warehouse.id) {
            const numericId = typeof warehouse.id === 'string' ? parseInt(warehouse.id, 10) : warehouse.id;
            onPress(numericId);
        }
    }, [onPress, warehouse.id]);

    const handleImageError = useCallback(() => {
        setImageError(true);
    }, []);

    const imageUri = useMemo(() => {
        setImageError(false);
        if (warehouse.image) {
            return getImageUrlForWarehouse(warehouse.image);
        }
        return null;
    }, [warehouse.image]);

    const containerStyle = width ? [styles.compactContainer, { width }] : styles.compactContainer;
    const isActive = warehouse.isActive !== false;

    return (
        <Pressable
            style={containerStyle}
            onPress={handlePress}
        >
            {/* Изображение склада */}
            <View style={styles.compactImageContainer}>
                {imageUri && !imageError ? (
                    <CachedImage
                        source={{ uri: imageUri }}
                        style={styles.compactWarehouseImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.placeholderContainer}>
                        <Icon name="warehouse" size={48} color={Color.blue2} />
                    </View>
                )}
                {!isActive && (
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>Закрыт</Text>
                    </View>
                )}
            </View>

            {/* Контент склада */}
            <View style={styles.compactContentContainer}>
                {/* Район */}
                {warehouse.district && (
                    <Text style={styles.districtText} numberOfLines={1}>
                        📍 {typeof warehouse.district === 'object' ? warehouse.district.name : warehouse.district}
                    </Text>
                )}

                {/* Название склада */}
                <Text style={styles.compactTitle} numberOfLines={2} ellipsizeMode="tail">
                    {warehouse.name || 'Склад без названия'}
                </Text>

                {/* Адрес */}
                {warehouse.address && (
                    <View style={styles.addressContainer}>
                        <Icon name="location-on" size={14} color={Color.blue2} style={styles.addressIcon} />
                        <Text style={styles.addressText} numberOfLines={2} ellipsizeMode="tail">
                            {warehouse.address}
                        </Text>
                    </View>
                )}

                {/* График работы на сегодня */}
                {getTodaySchedule ? (
                    <View style={styles.deliveryRadiusContainer}>
                        <Icon name="access-time" size={14} color={Color.purpleSoft} style={styles.radiusIcon} />
                        <Text style={styles.deliveryRadiusText}>
                            Сегодня: {getTodaySchedule}
                        </Text>
                    </View>
                ) : warehouse.workingHours && Array.isArray(warehouse.workingHours) && warehouse.workingHours.length > 0 ? (
                    <View style={styles.deliveryRadiusContainer}>
                        <Icon name="access-time" size={14} color={Color.purpleSoft} style={styles.radiusIcon} />
                        <Text style={styles.deliveryRadiusText}>
                            График работы настроен
                        </Text>
                    </View>
                ) : null}

                {/* Статус активности */}
                <View style={[styles.statusContainer, isActive ? styles.statusActive : styles.statusInactive]}>
                    <View style={[styles.statusIndicator, isActive ? styles.statusIndicatorActive : styles.statusIndicatorInactive]} />
                    <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
                        {isActive ? 'Открыт' : 'Закрыт'}
                    </Text>
                </View>
            </View>
        </Pressable>
    );
};

const arePropsEqual = (prevProps, nextProps) => {
    if (prevProps === nextProps) return true;
    if (prevProps.width !== nextProps.width) return false;
    if (prevProps.compact !== nextProps.compact) return false;
    if (prevProps.onPress !== nextProps.onPress) return false;

    const prevWarehouse = prevProps.warehouse;
    const nextWarehouse = nextProps.warehouse;

    if (prevWarehouse === nextWarehouse) return true;
    if (!prevWarehouse || !nextWarehouse) return false;

    return (
        prevWarehouse.id === nextWarehouse.id &&
        prevWarehouse.name === nextWarehouse.name &&
        prevWarehouse.address === nextWarehouse.address &&
        prevWarehouse.image === nextWarehouse.image &&
        prevWarehouse.isActive === nextWarehouse.isActive
    );
};

export const WarehouseCard = memo(WarehouseCardComponent, arePropsEqual);

const styles = StyleSheet.create({
    compactContainer: {
        width: 250,
        borderWidth: 0.5,
        borderColor: Color.blue2,
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
    compactWarehouseImage: {
        width: '100%',
        height: '100%',
    },
    placeholderContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E8F0FE',
    },
    statusBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        backgroundColor: '#FF5252',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
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
        marginBottom: 6,
    },
    compactTitle: {
        fontFamily: FontFamily.sFProText,
        fontSize: 16,
        fontWeight: '700',
        color: Color.purpleSoft,
        marginBottom: 8,
        lineHeight: 20,
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
        gap: 6,
    },
    addressIcon: {
        marginTop: 2,
    },
    addressText: {
        flex: 1,
        fontFamily: FontFamily.sFProText,
        fontSize: 13,
        fontWeight: '500',
        color: '#666',
        lineHeight: 18,
    },
    deliveryRadiusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    radiusIcon: {
        marginTop: 1,
    },
    deliveryRadiusText: {
        fontFamily: FontFamily.sFProText,
        fontSize: 12,
        fontWeight: '500',
        color: Color.purpleSoft,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        alignSelf: 'flex-start',
        gap: 6,
    },
    statusActive: {
        backgroundColor: '#E8F5E9',
    },
    statusInactive: {
        backgroundColor: '#FFEBEE',
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusIndicatorActive: {
        backgroundColor: '#4CAF50',
    },
    statusIndicatorInactive: {
        backgroundColor: '#F44336',
    },
    statusTextActive: {
        fontFamily: FontFamily.sFProText,
        fontSize: 12,
        fontWeight: '600',
        color: '#2E7D32',
    },
    statusTextInactive: {
        fontFamily: FontFamily.sFProText,
        fontSize: 12,
        fontWeight: '600',
        color: '#C62828',
    },
});
