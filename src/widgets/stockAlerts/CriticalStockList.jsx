import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    Image,
} from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily } from '@app/styles/GlobalStyles';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const ModernCriticalStockItem = ({ item, onPress, styles, colors }) => {
    const safeItem = {
        productId: String(item?.productId || ''),
        productName: String(item?.productName || ''),
        warehouseId: String(item?.warehouseId || ''),
        warehouseName: String(item?.warehouseName || ''),
        currentQuantity: Number(item?.currentQuantity) || 0,
        threshold: Number(item?.threshold) || 0,
        salesRate: Number(item?.salesRate) || 0,
        isFastMoving: Boolean(item?.isFastMoving || false),
        unit: String(item?.unit || 'шт'),
        imageUrl: item?.imageUrl || null
    };

    const getUrgencyConfig = () => {
        const ratio = safeItem.currentQuantity / safeItem.threshold;
        if (ratio <= 1) {
            return {
                color: '#FF3B30',
                icon: 'error',
                label: 'Критично',
                bg: '#FF3B3015'
            };
        }
        if (ratio <= 1.5) {
            return {
                color: '#FF9500',
                icon: 'warning',
                label: 'Мало',
                bg: '#FF950015'
            };
        }
        return {
            color: '#FFCC00',
            icon: 'info',
            label: 'Контроль',
            bg: '#FFCC0015'
        };
    };

    const config = getUrgencyConfig();
    const daysLeft = safeItem.salesRate > 0
        ? Math.floor(safeItem.currentQuantity / safeItem.salesRate)
        : null;

    return (
        <TouchableOpacity
            style={[styles.itemCard, { borderLeftColor: config.color }]}
            onPress={() => onPress && onPress(safeItem)}
            activeOpacity={0.7}
        >
            <View style={styles.itemMainContent}>
                <View style={styles.itemLeft}>
                    {/* Изображение товара */}
                    <View style={styles.productImageContainer}>
                        {safeItem.imageUrl ? (
                            <Image
                                source={{ uri: safeItem.imageUrl }}
                                style={styles.productImage}
                                resizeMode="cover"
                                onError={(error) => {
                                    // Обработка ошибки загрузки изображения - изображение будет заменено на placeholder
                                }}
                            />
                        ) : (
                            <View style={[styles.productImagePlaceholder, { backgroundColor: config.bg }]}>
                                <Icon name="inventory" size={normalize(20)} color={config.color} />
                            </View>
                        )}
                    </View>

                    <View style={styles.itemInfo}>
                        <Text style={styles.itemName} numberOfLines={2}>
                            {safeItem.productName}
                        </Text>
                        <View style={styles.warehouseRow}>
                            <Icon name="location-on" size={normalize(12)} color={colors.textTertiary} />
                            <Text style={styles.warehouseName}>{safeItem.warehouseName}</Text>
                        </View>
                        <View style={styles.salesInfoRow}>
                            <Icon name="trending-up" size={normalize(12)} color={colors.textTertiary} />
                            <Text style={styles.salesRateText}>
                                {safeItem.isFastMoving ? 'Быстро продающийся' : 'Медленно продающийся'} • {safeItem.salesRate} {safeItem.unit}/день
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                    <Text style={[styles.statusText, { color: config.color }]}>
                        {String(config.label)}
                    </Text>
                </View>
            </View>

            <View style={styles.itemMetrics}>
                <View style={styles.metric}>
                    <Text style={styles.metricLabel}>{String('Остаток')}</Text>
                    <Text style={[styles.metricValue, { color: config.color }]}>
                        {String(safeItem.currentQuantity)} {safeItem.unit}
                    </Text>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metric}>
                    <Text style={styles.metricLabel}>{String('Минимум')}</Text>
                    <Text style={styles.metricValue}>
                        {String(safeItem.threshold)} {safeItem.unit}
                    </Text>
                </View>

                {daysLeft !== null && (
                    <>
                        <View style={styles.metricDivider} />
                        <View style={styles.metric}>
                            <Text style={styles.metricLabel}>{String('Хватит на')}</Text>
                            <Text style={[
                                styles.metricValue,
                                { color: daysLeft < 3 ? '#FF3B30' : '#34C759' }
                            ]}>
                                {String(daysLeft)} дн.
                            </Text>
                        </View>
                    </>
                )}
            </View>
        </TouchableOpacity>
    );
};

const ModernCriticalStockList = ({ items, loading, onItemPress }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const [visibleItemsCount, setVisibleItemsCount] = useState(5);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>{String('Загрузка товаров...')}</Text>
            </View>
        );
    }

    if (!items || items.length === 0) {
        return null;
    }

    const visibleItems = items.slice(0, visibleItemsCount);
    const hasMoreItems = items.length > visibleItemsCount;

    const handleShowMore = () => {
        setVisibleItemsCount(prev => prev + 15);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={[styles.iconCircle, { backgroundColor: '#FF3B3015' }]}>
                        <Icon name="inventory" size={normalize(24)} color="#FF3B30" />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>{String('Требуют внимания')}</Text>
                        <Text style={styles.headerSubtitle}>{String('Критические товары')}</Text>
                    </View>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{String(items.length)}</Text>
                </View>
            </View>

            <FlatList
                data={visibleItems}
                keyExtractor={(item, index) => `${item.productId}-${item.warehouseId}-${index}`}
                renderItem={({ item }) => (
                    <ModernCriticalStockItem
                        item={item}
                        onPress={onItemPress}
                        styles={styles}
                        colors={colors}
                    />
                )}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
            />

            {hasMoreItems && (
                <TouchableOpacity style={styles.showMoreButton} onPress={handleShowMore}>
                    <Text style={styles.showMoreText}>
                        {String('Показать еще')} {String(Math.min(15, items.length - visibleItemsCount))} {String('товаров')}
                    </Text>
                    <Icon name="arrow-forward" size={normalize(16)} color={colors.primary} />
                </TouchableOpacity>
            )}
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        backgroundColor: colors.cardBackground,
        borderRadius: normalize(16),
        padding: normalize(12),
        marginBottom: normalize(12),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.border,
    },
    loadingContainer: {
        backgroundColor: colors.cardBackground,
        borderRadius: normalize(16),
        padding: normalize(32),
        marginBottom: normalize(16),
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.border,
    },
    loadingText: {
        fontSize: normalizeFont(14),
        color: colors.textSecondary,
        marginTop: normalize(8),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(16),
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconCircle: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: normalize(10),
    },
    headerTitle: {
        fontSize: normalizeFont(18),
        fontFamily: FontFamily.sFProTextBold,
        color: colors.textPrimary,
        marginBottom: normalize(2),
    },
    headerSubtitle: {
        fontSize: normalizeFont(13),
        color: colors.textSecondary,
    },
    countBadge: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: normalize(10),
        paddingVertical: normalize(4),
        borderRadius: normalize(12),
        minWidth: normalize(32),
        alignItems: 'center',
    },
    countText: {
        color: '#FFFFFF',
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.sFProTextBold,
    },
    itemCard: {
        backgroundColor: colors.surfaceSecondary,
        borderRadius: normalize(12),
        padding: normalize(14),
        marginBottom: normalize(10),
        borderLeftWidth: normalize(4),
    },
    itemMainContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: normalize(12),
    },
    itemLeft: {
        flex: 1,
        flexDirection: 'row',
        marginRight: normalize(8),
    },
    productImageContainer: {
        marginRight: normalize(12),
    },
    productImage: {
        width: normalize(50),
        height: normalize(50),
        borderRadius: normalize(8),
        backgroundColor: colors.surfaceSecondary,
    },
    productImagePlaceholder: {
        width: normalize(50),
        height: normalize(50),
        borderRadius: normalize(8),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: normalizeFont(15),
        fontFamily: FontFamily.sFProTextBold,
        color: colors.textPrimary,
        marginBottom: normalize(4),
        lineHeight: normalize(20),
    },
    warehouseRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    warehouseName: {
        fontSize: normalizeFont(13),
        color: colors.textSecondary,
        marginLeft: normalize(4),
    },
    salesInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: normalize(2),
    },
    salesRateText: {
        fontSize: normalizeFont(11),
        color: colors.textSecondary,
        marginLeft: normalize(4),
    },
    statusBadge: {
        paddingHorizontal: normalize(10),
        paddingVertical: normalize(4),
        borderRadius: normalize(8),
    },
    statusText: {
        fontSize: normalizeFont(12),
        fontFamily: FontFamily.sFProTextBold,
    },
    itemMetrics: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: normalize(8),
        padding: normalize(10),
    },
    metric: {
        flex: 1,
        alignItems: 'center',
    },
    metricLabel: {
        fontSize: normalizeFont(11),
        color: colors.textSecondary,
        marginBottom: normalize(4),
    },
    metricValue: {
        fontSize: normalizeFont(15),
        fontFamily: FontFamily.sFProTextBold,
        color: colors.textPrimary,
    },
    metricDivider: {
        width: 1,
        height: normalize(24),
        backgroundColor: colors.divider,
    },
    showMoreButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: normalize(12),
        marginTop: normalize(8),
    },
    showMoreText: {
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.sFProTextBold,
        color: colors.primary,
        marginRight: normalize(8),
    },
});

export default ModernCriticalStockList;