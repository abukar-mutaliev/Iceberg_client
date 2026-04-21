import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
    Dimensions,
    Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import WarehouseService from '@entities/warehouse/api/warehouseApi';
import IconWarehouse from '@shared/ui/Icon/Warehouse/IconWarehouse';
import { MapPinIcon } from '@shared/ui/Icon/DistrictManagement/MapPinIcon';
import { BackButton } from '@shared/ui/Button/BackButton';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ThemedStatusBar } from '@shared/ui/ThemedStatusBar/ThemedStatusBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TABLET_BREAKPOINT = 768;
const isTablet = SCREEN_WIDTH >= TABLET_BREAKPOINT;

export const WarehouseListScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const iconColor = isDark ? colors.primary : Color.blue2;
    const tabBarHeight = 80 + insets.bottom;
    const listBottomPadding = tabBarHeight + 24;

    const renderHeader = useCallback(() => (
        <View style={[styles.header, { paddingTop: normalize(10) }]}>
            <View style={styles.headerBackButtonContainer}>
                <BackButton onPress={() => navigation.goBack()} />
            </View>
            <View style={styles.headerIconContainer}>
                <IconWarehouse width={24} height={24} color={iconColor} />
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>Выбор склада</Text>
        </View>
    ), [styles, insets.top, iconColor, navigation]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const loadWarehouses = useCallback(async () => {
        try {
            setError(null);
            // Убираем фильтр isActive, чтобы показывать все склады, включая закрытые
            const response = await WarehouseService.getWarehouses({});
            const rawWarehouses = response.data?.warehouses || response.data || [];
            const preferredOrder = ['Склад Малгобек', 'Склад Сунжа', 'Склад Назрань'];

            const sortedWarehouses = [...rawWarehouses].sort((a, b) => {
                const aIsMain = a.isMain === true;
                const bIsMain = b.isMain === true;
                if (aIsMain !== bIsMain) {
                    return aIsMain ? -1 : 1;
                }

                const aIndex = preferredOrder.indexOf(a.name);
                const bIndex = preferredOrder.indexOf(b.name);
                if (aIndex !== -1 || bIndex !== -1) {
                    if (aIndex === -1) return 1;
                    if (bIndex === -1) return -1;
                    return aIndex - bIndex;
                }

                return (a.name || '').localeCompare(b.name || '', 'ru');
            });

            setWarehouses(sortedWarehouses);
        } catch (err) {
            console.error('Ошибка загрузки складов:', err);
            setError(err.response?.data?.message || 'Не удалось загрузить склады');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadWarehouses();
    }, [loadWarehouses]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadWarehouses();
    }, [loadWarehouses]);

    const handleWarehousePress = useCallback((warehouse) => {
        navigation.navigate('WarehouseDetails', {
            warehouseId: warehouse.id
        });
    }, [navigation]);

    const renderWarehouseItem = ({ item, index }) => {
        return (
            <TouchableOpacity
                style={[
                    styles.warehouseItem,
                    isTablet && styles.warehouseItemTablet,
                    { 
                        transform: [{ scale: 1 }],
                        opacity: 1,
                    }
                ]}
                onPress={() => handleWarehousePress(item)}
                activeOpacity={0.8}
            >
                <View style={styles.warehouseItemInner}>
                    <View style={styles.cardGradient}>
                        <View style={styles.iconWrapper}>
                            <View style={styles.iconBackground}>
                                <IconWarehouse width={28} height={28} color={iconColor} />
                            </View>
                        </View>

                        <View style={styles.warehouseContent}>
                            <Text style={styles.warehouseName} numberOfLines={1}>
                                {item.name}
                            </Text>
                            
                            <View style={styles.detailsContainer}>
                                <View style={styles.addressRow}>
                                    <View style={styles.iconBadge}>
                                        <MapPinIcon size={12} color={iconColor} />
                                    </View>
                                    <Text style={styles.warehouseAddress} numberOfLines={2}>
                                        {item.address}
                                    </Text>
                                </View>
                                
                                {item.district && (
                                    <View style={styles.districtBadge}>
                                        <Text style={styles.districtText}>
                                            {item.district.name}
                                        </Text>
                                    </View>
                                )}
                                {item.maintenanceMode && (
                                    <View style={styles.maintenanceBadge}>
                                        <Text style={styles.maintenanceText}>
                                            Технические работы
                                        </Text>
                                    </View>
                                )}
                                <View style={[styles.typeBadge, item.isMain ? styles.typeBadgeMain : styles.typeBadgeBranch]}>
                                    <Text style={[styles.typeText, item.isMain ? styles.typeTextMain : styles.typeTextBranch]}>
                                        {item.isMain ? 'Основной' : 'Филиал'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.arrowContainer}>
                            <View style={styles.arrowCircle}>
                                <Text style={styles.arrow}>→</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['left', 'right']}>
                <ThemedStatusBar />
                {renderHeader()}
                <View style={styles.centered}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={iconColor} />
                        <Text style={styles.loadingText}>Загрузка складов...</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.container} edges={['left', 'right']}>
                <ThemedStatusBar />
                {renderHeader()}
                <View style={styles.centered}>
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorEmoji}>⚠️</Text>
                        <Text style={styles.errorTitle}>Ошибка загрузки</Text>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity 
                            style={styles.retryButton} 
                            onPress={loadWarehouses}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.retryButtonText}>Повторить попытку</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
            <ThemedStatusBar />
            {renderHeader()}

            <FlatList
                data={warehouses}
                renderItem={renderWarehouseItem}
                keyExtractor={(item) => `warehouse-${item.id}`}
                contentContainerStyle={[
                    styles.listContent,
                    isTablet && styles.listContentTablet,
                    { paddingBottom: listBottomPadding }
                ]}
                numColumns={isTablet ? 2 : 1}
                key={isTablet ? 'tablet' : 'phone'}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={handleRefresh}
                        tintColor={iconColor}
                        colors={[iconColor]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyEmoji}>📦</Text>
                        <Text style={styles.emptyTitle}>Склады не найдены</Text>
                        <Text style={styles.emptySubtitle}>
                            Попробуйте обновить список
                        </Text>
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: normalize(16),
        paddingBottom: normalize(15),
        borderBottomWidth: 1,
        borderBottomColor: isDark ? colors.divider : Color.border,
        backgroundColor: isDark ? colors.surface : Color.colorLightMode,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0 : 0.08,
                shadowRadius: 4,
            },
            android: {
                elevation: isDark ? 0 : 2,
            },
        }),
    },
    headerBackButtonContainer: {
        marginRight: normalize(8),
    },
    headerIconContainer: {
        marginRight: normalize(12),
    },
    headerTitle: {
        flex: 1,
        fontSize: normalizeFont(FontSize.size_xl),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: isDark ? colors.textPrimary : Color.blue2,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingContainer: {
        alignItems: 'center',
        backgroundColor: isDark ? colors.surface : '#FFFFFF',
        padding: 32,
        borderRadius: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.4 : 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
        ...(isDark && {
            borderWidth: 1,
            borderColor: colors.border,
        }),
    },
    loadingText: {
        marginTop: 16,
        fontSize: FontSize.size_md || 16,
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    errorContainer: {
        alignItems: 'center',
        backgroundColor: isDark ? colors.surface : '#FFFFFF',
        padding: 32,
        borderRadius: 16,
        maxWidth: 320,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.4 : 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
        ...(isDark && {
            borderWidth: 1,
            borderColor: colors.border,
        }),
    },
    errorEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 8,
        fontFamily: FontFamily.bold,
    },
    errorText: {
        fontSize: FontSize.size_md || 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: FontFamily.sFProText,
        lineHeight: 22,
    },
    retryButton: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        backgroundColor: isDark ? colors.primary : (Color.blue2 || '#3B82F6'),
        borderRadius: 12,
        minWidth: 160,
        ...Platform.select({
            ios: {
                shadowColor: isDark ? colors.primary : (Color.blue2 || '#3B82F6'),
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.5 : 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: FontSize.size_md || 16,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        textAlign: 'center',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: 0,
    },
    listContentTablet: {
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    warehouseItem: {
        marginBottom: 16,
        borderRadius: 16,
        backgroundColor: isDark ? colors.surface : '#FFFFFF',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.35 : 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 3,
            },
        }),
        ...(isDark && {
            borderWidth: 1,
            borderColor: colors.border,
        }),
    },
    warehouseItemInner: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: isDark ? colors.surface : '#FFFFFF',
    },
    warehouseItemTablet: {
        flex: 1,
        marginHorizontal: 8,
    },
    cardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: isDark ? colors.surface : '#FFFFFF',
        borderLeftWidth: 4,
        borderLeftColor: isDark ? colors.primary : (Color.blue2 || '#3B82F6'),
    },
    iconWrapper: {
        marginRight: 16,
    },
    iconBackground: {
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: isDark ? 'rgba(124, 127, 232, 0.12)' : '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    warehouseContent: {
        flex: 1,
        marginRight: 12,
    },
    warehouseName: {
        fontSize: isTablet ? 18 : 17,
        fontFamily: FontFamily.bold,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    detailsContainer: {
        gap: 8,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
    },
    iconBadge: {
        width: 20,
        height: 20,
        borderRadius: 6,
        backgroundColor: isDark ? 'rgba(124, 127, 232, 0.12)' : '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    warehouseAddress: {
        flex: 1,
        fontSize: FontSize.size_sm || 14,
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        lineHeight: 20,
    },
    districtBadge: {
        alignSelf: 'flex-start',
        backgroundColor: isDark ? 'rgba(124, 127, 232, 0.15)' : '#F0F9FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(124, 127, 232, 0.35)' : '#BFDBFE',
    },
    districtText: {
        fontSize: 12,
        color: isDark ? '#B7BAFF' : '#1E40AF',
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
    },
    maintenanceBadge: {
        alignSelf: 'flex-start',
        backgroundColor: isDark ? 'rgba(255, 159, 67, 0.15)' : '#FFF7ED',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 159, 67, 0.4)' : '#FED7AA',
    },
    maintenanceText: {
        fontSize: 12,
        color: isDark ? '#FFB784' : '#C2410C',
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
    },
    typeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    typeBadgeMain: {
        backgroundColor: isDark ? 'rgba(74, 222, 128, 0.15)' : '#ECFDF3',
        borderColor: isDark ? 'rgba(74, 222, 128, 0.4)' : '#A7F3D0',
    },
    typeBadgeBranch: {
        backgroundColor: isDark ? 'rgba(236, 72, 153, 0.15)' : '#FDF2F8',
        borderColor: isDark ? 'rgba(236, 72, 153, 0.4)' : '#FBCFE8',
    },
    typeText: {
        fontSize: 12,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
    },
    typeTextMain: {
        color: isDark ? '#86EFAC' : '#047857',
    },
    typeTextBranch: {
        color: isDark ? '#F9A8D4' : '#9D174D',
    },
    arrowContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrowCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isDark ? 'rgba(124, 127, 232, 0.12)' : '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrow: {
        fontSize: 20,
        color: isDark ? colors.primary : (Color.blue2 || '#3B82F6'),
        fontWeight: 'bold',
    },
    emptyContainer: {
        paddingVertical: 80,
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 8,
        fontFamily: FontFamily.bold,
    },
    emptySubtitle: {
        fontSize: FontSize.size_md || 16,
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
    },
});
