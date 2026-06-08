import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Clipboard } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { useCustomAlert } from '@shared/ui/CustomAlert';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

/**
 * Компонент отображения информации о доставке.
 * После упрощения системы:
 *  - DELIVERY: фиксированная цена (по умолчанию 200 ₽);
 *  - PICKUP: бесплатно;
 *  - никаких "бесплатной доставки от X" и расстояний.
 */
export const DeliveryInfo = ({
    deliveryType = 'DELIVERY',
    deliveryCost = 0,
    calculating = false,
    warehouseName = null,
    warehouseAddress = null
}) => {
    const { showInfo } = useCustomAlert();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const handleCopyWarehouseAddress = useCallback(() => {
        if (!warehouseAddress) return;
        Clipboard.setString(warehouseAddress);
        showInfo('Скопировано', 'Адрес склада скопирован в буфер обмена');
    }, [warehouseAddress, showInfo]);

    if (deliveryType === 'PICKUP') {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Icon name="store" size={24} color={colors.primary} />
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
                                    <Icon name="content-copy" size={16} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    }

    if (calculating) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Расчёт доставки...</Text>
                        <Text style={styles.headerSubtitle}>Пожалуйста, подождите</Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Icon name="local-shipping" size={24} color={colors.primary} />
                </View>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Стоимость доставки</Text>
                    <Text style={styles.headerSubtitle}>
                        Доставка по всем районам — единая цена
                    </Text>
                </View>
            </View>

            <View style={styles.priceContainer}>
                <Text style={styles.price}>
                    {`${Number(deliveryCost || 0).toFixed(0)} ₽`}
                </Text>
            </View>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.22 : 0.06,
        shadowRadius: isDark ? 8 : 4,
        elevation: isDark ? 3 : 2
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '1A',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    headerTextContainer: {
        flex: 1
    },
    headerTitle: {
        fontSize: FontSize.size_base || 16,
        fontFamily: FontFamily.sFProDisplayMedium || 'SF Pro Display Medium',
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 2
    },
    headerSubtitle: {
        fontSize: FontSize.size_sm || 14,
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        color: colors.textSecondary
    },
    pickupAddressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 6,
        gap: 8
    },
    pickupAddress: {
        flex: 1,
        fontSize: FontSize.size_sm || 14,
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        color: colors.textSecondary,
        lineHeight: 20
    },
    copyButtonInline: {
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primary + '14',
        borderWidth: 1,
        borderColor: colors.primary + '26',
        marginTop: 2
    },
    priceContainer: {
        alignItems: 'flex-end'
    },
    price: {
        fontSize: 28,
        fontFamily: FontFamily.sFProDisplayMedium || 'SF Pro Display Medium',
        fontWeight: '700',
        color: colors.textPrimary
    }
});
