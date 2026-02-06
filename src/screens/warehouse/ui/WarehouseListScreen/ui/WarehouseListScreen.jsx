import React, { useState, useEffect, useCallback } from 'react';
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
import { AdminHeader } from '@widgets/admin/AdminHeader';
import IconWarehouse from '@shared/ui/Icon/Warehouse/IconWarehouse';
import { MapPinIcon } from '@shared/ui/Icon/DistrictManagement/MapPinIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TABLET_BREAKPOINT = 768;
const isTablet = SCREEN_WIDTH >= TABLET_BREAKPOINT;

export const WarehouseListScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const tabBarHeight = 80 + insets.bottom;
    const listBottomPadding = tabBarHeight + 24;
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
                                <IconWarehouse width={28} height={28} color={Color.blue2} />
                            </View>
                        </View>

                        <View style={styles.warehouseContent}>
                            <Text style={styles.warehouseName} numberOfLines={1}>
                                {item.name}
                            </Text>
                            
                            <View style={styles.detailsContainer}>
                                <View style={styles.addressRow}>
                                    <View style={styles.iconBadge}>
                                        <MapPinIcon size={12} color={Color.blue2} />
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
                <AdminHeader
                    title="Выбор склада"
                    icon={<IconWarehouse width={24} height={24} color={Color.blue2} />}
                    onBackPress={() => navigation.goBack()}
                    showBackButton={true}
                />
                <View style={styles.centered}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Color.blue2} />
                        <Text style={styles.loadingText}>Загрузка складов...</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.container} edges={['left', 'right']}>
                <AdminHeader
                    title="Выбор склада"
                    icon={<IconWarehouse width={24} height={24} color={Color.blue2} />}
                    onBackPress={() => navigation.goBack()}
                    showBackButton={true}
                />
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
            <AdminHeader
                title="Выбор склада"
                icon={<IconWarehouse width={24} height={24} color={Color.blue2} />}
                onBackPress={() => navigation.goBack()}
                showBackButton={true}
            />

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
                        tintColor={Color.blue2}
                        colors={[Color.blue2]}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode || '#F5F7FA',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingContainer: {
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 32,
        borderRadius: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    loadingText: {
        marginTop: 16,
        fontSize: FontSize.size_md || 16,
        color: Color.textSecondary || '#6B7280',
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    errorContainer: {
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 32,
        borderRadius: 16,
        maxWidth: 320,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    errorEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Color.textPrimary || '#111827',
        marginBottom: 8,
        fontFamily: FontFamily.bold,
    },
    errorText: {
        fontSize: FontSize.size_md || 16,
        color: Color.textSecondary || '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: FontFamily.sFProText,
        lineHeight: 22,
    },
    retryButton: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        backgroundColor: Color.blue2 || '#3B82F6',
        borderRadius: 12,
        minWidth: 160,
        ...Platform.select({
            ios: {
                shadowColor: Color.blue2 || '#3B82F6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
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
        backgroundColor: '#FFFFFF',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    warehouseItemInner: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
    },
    warehouseItemTablet: {
        flex: 1,
        marginHorizontal: 8,
    },
    cardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderLeftWidth: 4,
        borderLeftColor: Color.blue2 || '#3B82F6',
    },
    iconWrapper: {
        marginRight: 16,
    },
    iconBackground: {
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: '#EFF6FF',
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
        color: Color.textPrimary || '#111827',
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
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    warehouseAddress: {
        flex: 1,
        fontSize: FontSize.size_sm || 14,
        color: Color.textSecondary || '#6B7280',
        fontFamily: FontFamily.sFProText,
        lineHeight: 20,
    },
    districtBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#F0F9FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    districtText: {
        fontSize: 12,
        color: '#1E40AF',
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
    },
    maintenanceBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFF7ED',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FED7AA',
    },
    maintenanceText: {
        fontSize: 12,
        color: '#C2410C',
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
        backgroundColor: '#ECFDF3',
        borderColor: '#A7F3D0',
    },
    typeBadgeBranch: {
        backgroundColor: '#FDF2F8',
        borderColor: '#FBCFE8',
    },
    typeText: {
        fontSize: 12,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
    },
    typeTextMain: {
        color: '#047857',
    },
    typeTextBranch: {
        color: '#9D174D',
    },
    arrowContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrowCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrow: {
        fontSize: 20,
        color: Color.blue2 || '#3B82F6',
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
        color: Color.textPrimary || '#111827',
        marginBottom: 8,
        fontFamily: FontFamily.bold,
    },
    emptySubtitle: {
        fontSize: FontSize.size_md || 16,
        color: Color.textSecondary || '#6B7280',
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
    },
});