import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import { AdminHeader } from '@widgets/admin/AdminHeader';
import { SearchBar } from '@shared/ui/SearchBar';
import { userApi } from '@entities/user/api/userApi';
import IconDriver from '@shared/ui/Icon/Profile/IconPersona';
import { MapPinIcon } from '@shared/ui/Icon/DistrictManagement/MapPinIcon';
import IconEdit from '@shared/ui/Icon/Profile/IconEdit';
import { DriverDistrictsModal } from "@entities/user/ui/DriverDistrictsModal";
import { DriverWarehouseModal } from "@entities/user/ui/DriverWarehouseModal";

export const DriverManagementScreen = () => {
    const navigation = useNavigation();
    
    const [drivers, setDrivers] = useState([]);
    const [filteredDrivers, setFilteredDrivers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Состояние для модального окна районов
    const [districtsModalVisible, setDistrictsModalVisible] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState(null);
    
    // Состояние для модального окна склада
    const [warehouseModalVisible, setWarehouseModalVisible] = useState(false);

    // Загрузка водителей при монтировании
    useEffect(() => {
        loadDrivers();
    }, []);

    // Фильтрация водителей при изменении поискового запроса
    useEffect(() => {
        filterDrivers();
    }, [searchQuery, drivers]);

    // Загрузка списка водителей
    const loadDrivers = async () => {
        try {
            setIsLoading(true);
            const response = await userApi.getDrivers({ limit: 100 });
            const driversData = response.data?.staff || response.data?.data?.staff || [];
            
            // Для каждого водителя получаем детальную информацию с районами и складом
            const driversWithDetails = await Promise.all(
                driversData.map(async (user) => {
                    try {
                        const detailResponse = await userApi.getDriverById(user.driver?.id);
                        return {
                            ...user.driver,
                            user: user,
                            ...detailResponse.data?.data || detailResponse.data
                        };
                    } catch (error) {
                        console.error('Ошибка получения деталей водителя:', error);
                        return {
                            ...user.driver,
                            user: user,
                            districts: [],
                            warehouse: null
                        };
                    }
                })
            );
            
            setDrivers(driversWithDetails);
            setFilteredDrivers(driversWithDetails);
        } catch (error) {
            console.error('Ошибка загрузки водителей:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить список водителей');
        } finally {
            setIsLoading(false);
        }
    };

    // Обновление списка
    const handleRefresh = async () => {
        setRefreshing(true);
        await loadDrivers();
        setRefreshing(false);
    };

    // Фильтрация водителей
    const filterDrivers = () => {
        if (!searchQuery.trim()) {
            setFilteredDrivers(drivers);
            return;
        }

        const filtered = drivers.filter(driver => {
            const searchLower = searchQuery.toLowerCase();
            const nameMatch = driver.name?.toLowerCase().includes(searchLower);
            const phoneMatch = driver.phone?.toLowerCase().includes(searchLower);
            const emailMatch = driver.user?.email?.toLowerCase().includes(searchLower);
            
            return nameMatch || phoneMatch || emailMatch;
        });

        setFilteredDrivers(filtered);
    };

    // Открытие модального окна для редактирования районов
    const handleEditDistricts = (driver) => {
        setSelectedDriver(driver);
        setDistrictsModalVisible(true);
    };

    // Успешное обновление районов
    const handleDistrictsUpdated = () => {
        loadDrivers(); // Перезагружаем список водителей
    };

    // Открытие модального окна для редактирования склада
    const handleEditWarehouse = (driver) => {
        setSelectedDriver(driver);
        setWarehouseModalVisible(true);
    };

    // Успешное обновление склада
    const handleWarehouseUpdated = () => {
        loadDrivers(); // Перезагружаем список водителей
    };

    // Рендер карточки водителя
    const renderDriverCard = ({ item }) => {
        const districtsCount = item.districts?.length || 0;
        const stopsCount = item._count?.stops || 0;

        return (
            <View style={styles.driverCard}>
                <View style={styles.driverHeader}>
                    <View style={styles.driverAvatar}>
                        <IconDriver width={24} height={24} color={Color.blue2} />
                    </View>
                    <View style={styles.driverInfo}>
                        <Text style={styles.driverName}>{item.name}</Text>
                        <Text style={styles.driverPhone}>
                            {item.phone || 'Телефон не указан'}
                        </Text>
                        <Text style={styles.driverEmail}>
                            {item.user?.email}
                        </Text>
                    </View>
                </View>

                <View style={styles.driverStats}>
                    <View style={styles.statItem}>
                        <MapPinIcon size={16} color={Color.textSecondary} />
                        <Text style={styles.statText}>
                            {districtsCount === 0 
                                ? 'Районы не назначены' 
                                : `${districtsCount} район${districtsCount > 1 ? 'ов' : ''}`
                            }
                        </Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statText}>
                            🚐 {stopsCount} остановок
                        </Text>
                    </View>
                </View>

                {/* Информация о складе */}
                {item.warehouse && (
                    <View style={styles.warehouseContainer}>
                        <Text style={styles.warehouseTitle}>Склад:</Text>
                        <View style={styles.warehouseInfo}>
                            <Text style={styles.warehouseName}>{item.warehouse.name}</Text>
                            <Text style={styles.warehouseAddress}>{item.warehouse.address}</Text>
                            {item.warehouse.district && (
                                <Text style={styles.warehouseDistrict}>
                                    {item.warehouse.district.name}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Список назначенных районов */}
                {item.districts && item.districts.length > 0 && (
                    <View style={styles.districtsContainer}>
                        <Text style={styles.districtsTitle}>Назначенные районы:</Text>
                        <View style={styles.districtsChips}>
                            {item.districts.map((district) => (
                                <View key={district.id} style={styles.districtChip}>
                                    <Text style={styles.districtChipText}>
                                        {district.name}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Кнопки действий */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.editButton, styles.editButtonHalf]}
                        onPress={() => handleEditDistricts(item)}
                    >
                        <IconEdit width={16} height={16} color={Color.colorLightMode} />
                        <Text style={styles.editButtonText}>Районы</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[styles.editButton, styles.editButtonHalf]}
                        onPress={() => handleEditWarehouse(item)}
                    >
                        <IconEdit width={16} height={16} color={Color.colorLightMode} />
                        <Text style={styles.editButtonText}>Склад</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Рендер пустого списка
    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <IconDriver width={48} height={48} color={Color.textSecondary} />
            <Text style={styles.emptyTitle}>
                {searchQuery ? 'Водители не найдены' : 'Список водителей пуст'}
            </Text>
            <Text style={styles.emptySubtitle}>
                {searchQuery 
                    ? `По запросу "${searchQuery}" ничего не найдено`
                    : 'Водители появятся здесь после добавления'
                }
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <AdminHeader
                title="Районы водителей"
                icon={<IconDriver width={24} height={24} color={Color.blue2} />}
                onBackPress={() => navigation.goBack()}
            />

            <SearchBar
                placeholder="Поиск по имени, телефону или email..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onClear={() => setSearchQuery('')}
            />

            {/* Статистика */}
            <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                    Всего водителей: {drivers.length}
                </Text>
                <Text style={styles.statsText}>
                    Найдено: {filteredDrivers.length}
                </Text>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Color.blue2} />
                    <Text style={styles.loadingText}>Загрузка водителей...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredDrivers}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderDriverCard}
                    ListEmptyComponent={renderEmptyList}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[Color.blue2]}
                        />
                    }
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Модальное окно для редактирования районов */}
            <DriverDistrictsModal
                visible={districtsModalVisible}
                driver={selectedDriver}
                onClose={() => {
                    setDistrictsModalVisible(false);
                    setSelectedDriver(null);
                }}
                onSuccess={handleDistrictsUpdated}
            />

            {/* Модальное окно для редактирования склада */}
            <DriverWarehouseModal
                visible={warehouseModalVisible}
                driver={selectedDriver}
                onClose={() => {
                    setWarehouseModalVisible(false);
                    setSelectedDriver(null);
                }}
                onSuccess={handleWarehouseUpdated}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(12),
        backgroundColor: Color.colorLightGray,
        borderBottomWidth: 1,
        borderBottomColor: Color.border,
    },
    statsText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        fontWeight: '500',
    },
    listContainer: {
        paddingHorizontal: normalize(20),
        paddingBottom: normalize(20),
    },
    driverCard: {
        backgroundColor: Color.colorLightMode,
        borderRadius: Border.radius.medium,
        padding: normalize(16),
        marginVertical: normalize(8),
        ...Shadow.light,
    },
    driverHeader: {
        flexDirection: 'row',
        marginBottom: normalize(12),
    },
    driverAvatar: {
        width: normalize(48),
        height: normalize(48),
        borderRadius: normalize(24),
        backgroundColor: Color.colorLightGray,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: normalize(12),
    },
    driverInfo: {
        flex: 1,
    },
    driverName: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: normalize(2),
    },
    driverPhone: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.blue2,
        fontWeight: '500',
        marginBottom: normalize(2),
    },
    driverEmail: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
    },
    driverStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: normalize(12),
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginLeft: normalize(4),
    },
    districtsContainer: {
        marginBottom: normalize(12),
    },
    districtsTitle: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginBottom: normalize(8),
    },
    districtsChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: normalize(8),
    },
    districtChip: {
        backgroundColor: Color.blue2,
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(4),
        borderRadius: Border.radius.small,
    },
    districtChipText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.colorLightMode,
        fontWeight: '500',
    },
    warehouseContainer: {
        marginBottom: normalize(12),
        padding: normalize(12),
        backgroundColor: Color.colorLightGray,
        borderRadius: Border.radius.small,
    },
    warehouseTitle: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: normalize(6),
    },
    warehouseInfo: {
        marginLeft: normalize(8),
    },
    warehouseName: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.blue2,
        marginBottom: normalize(2),
    },
    warehouseAddress: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginBottom: normalize(2),
    },
    warehouseDistrict: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: normalize(8),
        marginTop: normalize(8),
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Color.blue2,
        paddingVertical: normalize(10),
        borderRadius: Border.radius.medium,
    },
    editButtonHalf: {
        flex: 1,
    },
    editButtonText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.colorLightMode,
        marginLeft: normalize(8),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginTop: normalize(8),
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: normalize(40),
    },
    emptyTitle: {
        fontSize: normalizeFont(FontSize.size_lg),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
        textAlign: 'center',
        marginTop: normalize(16),
    },
    emptySubtitle: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        textAlign: 'center',
        marginTop: normalize(8),
        paddingHorizontal: normalize(20),
    },
});

export default DriverManagementScreen;







