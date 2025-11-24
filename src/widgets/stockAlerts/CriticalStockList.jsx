import React, { useState } from 'react';
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
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ModernCriticalStockItem = ({ item, onPress }) => {
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
                            <Icon name="location-on" size={normalize(12)} color="#8E8E93" />
                            <Text style={styles.warehouseName}>{safeItem.warehouseName}</Text>
                        </View>
                        <View style={styles.salesInfoRow}>
                            <Icon name="trending-up" size={normalize(12)} color="#8E8E93" />
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
    const [visibleItemsCount, setVisibleItemsCount] = useState(5);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Color.blue2} />
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
                    <Icon name="arrow-forward" size={normalize(16)} color="#007AFF" />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: normalize(16),
        padding: normalize(12),
        marginBottom: normalize(12),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    loadingContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: normalize(16),
        padding: normalize(32),
        marginBottom: normalize(16),
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    loadingText: {
        fontSize: normalizeFont(14),
        color: '#8E8E93',
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
        color: '#1C1C1E',
        marginBottom: normalize(2),
    },
    headerSubtitle: {
        fontSize: normalizeFont(13),
        color: '#8E8E93',
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
        backgroundColor: '#F8F9FA',
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
        backgroundColor: '#F8F9FA',
    },
    productImagePlaceholder: {
        width: normalize(50),
        height: normalize(50),
        borderRadius: normalize(8),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: normalizeFont(15),
        fontFamily: FontFamily.sFProTextBold,
        color: '#1C1C1E',
        marginBottom: normalize(4),
        lineHeight: normalize(20),
    },
    warehouseRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    warehouseName: {
        fontSize: normalizeFont(13),
        color: '#8E8E93',
        marginLeft: normalize(4),
    },
    salesInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: normalize(2),
    },
    salesRateText: {
        fontSize: normalizeFont(11),
        color: '#8E8E93',
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
        backgroundColor: '#FFFFFF',
        borderRadius: normalize(8),
        padding: normalize(10),
    },
    metric: {
        flex: 1,
        alignItems: 'center',
    },
    metricLabel: {
        fontSize: normalizeFont(11),
        color: '#8E8E93',
        marginBottom: normalize(4),
    },
    metricValue: {
        fontSize: normalizeFont(15),
        fontFamily: FontFamily.sFProTextBold,
        color: '#1C1C1E',
    },
    metricDivider: {
        width: 1,
        height: normalize(24),
        backgroundColor: '#E5E5EA',
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
        color: '#007AFF',
        marginRight: normalize(8),
    },
});

export default ModernCriticalStockList;