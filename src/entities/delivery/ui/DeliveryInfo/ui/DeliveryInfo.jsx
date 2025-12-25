import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Clipboard } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { useCustomAlert } from '@shared/ui/CustomAlert';

/**
 * Компонент отображения информации о доставке
 * @param {Object} props
 * @param {string} props.deliveryType - Тип доставки ('DELIVERY' или 'PICKUP')
 * @param {number} props.deliveryCost - Стоимость доставки
 * @param {number} props.deliveryDistance - Расстояние доставки в км
 * @param {boolean} props.isFreeDelivery - Флаг бесплатной доставки
 * @param {boolean} props.calculating - Идет ли расчет
 * @param {string} props.warehouseName - Название склада
 * @param {Object} props.freeDeliveryInfo - Информация о порогах бесплатной доставки
 * @param {string} props.warehouseAddress - Адрес склада для самовывоза
 */
export const DeliveryInfo = ({ 
    deliveryType = 'DELIVERY',
    deliveryCost = 0,
    deliveryDistance = null,
    isFreeDelivery = false,
    calculating = false,
    warehouseName = null,
    freeDeliveryInfo = null,
    warehouseAddress = null,
}) => {
    const { showInfo } = useCustomAlert();

    const handleCopyWarehouseAddress = useCallback(() => {
        if (!warehouseAddress) return;
        Clipboard.setString(warehouseAddress);
        showInfo('Скопировано', 'Адрес склада скопирован в буфер обмена');
    }, [warehouseAddress, showInfo]);

    // Если самовывоз
    if (deliveryType === 'PICKUP') {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Icon name="store" size={24} color="#667eea" />
                    </View>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Самовывоз</Text>
                        <Text style={styles.headerSubtitle}>
                            {warehouseName || 'Забрать в магазине'}
                        </Text>
                        {warehouseAddress && (
                            <View style={styles.pickupAddressRow}>
                                <Text style={styles.pickupAddress} numberOfLines={3}>
                                    {warehouseAddress}
                                </Text>
                                <TouchableOpacity
                                    style={styles.copyButtonInline}
                                    onPress={handleCopyWarehouseAddress}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Icon name="content-copy" size={16} color="#667eea" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
                
                {/* Для самовывоза стоимость не отображаем */}
            </View>
        );
    }

    // Если идет расчет
    if (calculating) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <ActivityIndicator size="small" color="#667eea" />
                    </View>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Расчет доставки...</Text>
                        <Text style={styles.headerSubtitle}>Пожалуйста, подождите</Text>
                    </View>
                </View>
            </View>
        );
    }

    // Если доставка
    const hasDeliveryInfo = deliveryDistance !== null && deliveryCost !== null && deliveryCost > 0;

    // Если нет информации о доставке, не показываем компонент
    if (!hasDeliveryInfo) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Icon name="local-shipping" size={24} color="#667eea" />
                </View>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>
                        {isFreeDelivery ? 'Бесплатная доставка' : 'Стоимость доставки'}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {deliveryDistance.toFixed(1)} км
                        {warehouseName && ` • ${warehouseName}`}
                    </Text>
                </View>
            </View>
            
            <View style={styles.priceContainer}>
                <Text style={isFreeDelivery ? styles.freePrice : styles.price}>
                    {isFreeDelivery ? '0 ₽' : `${deliveryCost.toFixed(0)} ₽`}
                </Text>
            </View>

            {/* Информация о бесплатной доставке */}
            {freeDeliveryInfo && !isFreeDelivery && freeDeliveryInfo.minOrderAmountForFreeDelivery && (
                <View style={styles.freeDeliveryHint}>
                    <Icon name="info-outline" size={18} color="#667eea" style={styles.hintIcon} />
                    <Text style={styles.freeDeliveryHintText}>
                        {freeDeliveryInfo.message}
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: '#f0f0f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: FontSize.size_base || 16,
        fontFamily: FontFamily.sFProDisplayMedium || 'SF Pro Display Medium',
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    headerSubtitle: {
        fontSize: FontSize.size_sm || 14,
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        color: '#666',
    },
    pickupAddressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 6,
        gap: 8,
    },
    pickupAddress: {
        flex: 1,
        fontSize: FontSize.size_sm || 14,
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        color: '#4a5568',
        lineHeight: 20,
    },
    copyButtonInline: {
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(102, 126, 234, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(102, 126, 234, 0.15)',
        marginTop: 2,
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    price: {
        fontSize: 28,
        fontFamily: FontFamily.sFProDisplayMedium || 'SF Pro Display Medium',
        fontWeight: '700',
        color: '#1a1a1a',
    },
    freePrice: {
        fontSize: 28,
        fontFamily: FontFamily.sFProDisplayMedium || 'SF Pro Display Medium',
        fontWeight: '700',
        color: '#28a745',
    },
    freeDeliveryHint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: 'rgba(102, 126, 234, 0.05)',
        padding: 12,
        borderRadius: 8,
        marginHorizontal: -4,
    },
    hintIcon: {
        marginRight: 8,
        marginTop: 1,
    },
    freeDeliveryHintText: {
        flex: 1,
        fontSize: FontSize.size_sm || 14,
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        color: '#667eea',
        lineHeight: 20,
        fontWeight: '500',
    },
});

