import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    SafeAreaView,
    TouchableOpacity,
    RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import WarehouseService from '@entities/warehouse/api/warehouseApi';
import { AdminHeader } from '@widgets/admin/AdminHeader';
import IconBack from '@shared/ui/Icon/BackArrowIcon/BackArrowIcon';
import IconWarehouse from '@shared/ui/Icon/Warehouse/IconWarehouse';
import { MapPinIcon } from '@shared/ui/Icon/DistrictManagement/MapPinIcon';

export const WarehouseListScreen = () => {
    const navigation = useNavigation();
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const loadWarehouses = useCallback(async () => {
        try {
            setError(null);
            const response = await WarehouseService.getWarehouses({ isActive: true });
            setWarehouses(response.data?.warehouses || response.data || []);
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
        navigation.navigate('WarehouseStatistics', {
            warehouseId: warehouse.id,
            warehouseName: warehouse.name
        });
    }, [navigation]);

    const renderWarehouseItem = ({ item }) => {
        return (
            <TouchableOpacity
                style={styles.warehouseItem}
                onPress={() => handleWarehousePress(item)}
                activeOpacity={0.7}
            >
                <View style={styles.warehouseContent}>
                    <View style={styles.warehouseHeader}>
                        <View style={styles.iconContainer}>
                            <IconWarehouse width={24} height={24} color={Color.blue2} />
                        </View>
                        <View style={styles.warehouseInfo}>
                            <Text style={styles.warehouseName}>{item.name}</Text>
                            <View style={styles.addressContainer}>
                                <MapPinIcon size={14} color={Color.textSecondary} />
                                <Text style={styles.warehouseAddress}>{item.address}</Text>
                            </View>
                            {item.district && (
                                <Text style={styles.districtName}>
                                    Район: {item.district.name}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>
                <View style={styles.arrowContainer}>
                    <Text style={styles.arrow}>→</Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <AdminHeader
                    title="Выбор склада"
                    icon={<IconBack width={24} height={24} color={Color.blue2} />}
                    onBack={() => navigation.goBack()}
                />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Color.blue2} />
                    <Text style={styles.loadingText}>Загрузка складов...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <AdminHeader
                    title="Выбор склада"
                    icon={<IconBack width={24} height={24} color={Color.blue2} />}
                    onBack={() => navigation.goBack()}
                />
                <View style={styles.centered}>
                    <Text style={styles.errorText}>Ошибка: {error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={loadWarehouses}>
                        <Text style={styles.retryButtonText}>Повторить</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <AdminHeader
                title="Выбор склада"
                icon={<IconBack width={24} height={24} color={Color.blue2} />}
                onBack={() => navigation.goBack()}
            />

            <FlatList
                data={warehouses}
                renderItem={renderWarehouseItem}
                keyExtractor={(item) => `warehouse-${item.id}`}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Склады не найдены</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: FontSize.size_md,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    errorText: {
        fontSize: FontSize.size_md,
        color: Color.colorCrimson,
        textAlign: 'center',
        marginBottom: 16,
        fontFamily: FontFamily.sFProText,
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: Color.blue2,
        borderRadius: Border.br_base,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    warehouseItem: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: Border.br_base,
        padding: 16,
        marginBottom: 12,
        ...Shadow.shadow_sm,
        alignItems: 'center',
    },
    warehouseContent: {
        flex: 1,
    },
    warehouseHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        marginRight: 12,
    },
    warehouseInfo: {
        flex: 1,
    },
    warehouseName: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.bold,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: 4,
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    warehouseAddress: {
        fontSize: FontSize.size_sm,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginLeft: 4,
    },
    districtName: {
        fontSize: FontSize.size_sm,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    arrowContainer: {
        marginLeft: 12,
    },
    arrow: {
        fontSize: FontSize.size_lg,
        color: Color.blue2,
    },
    emptyContainer: {
        paddingVertical: 48,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: FontSize.size_md,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
});







