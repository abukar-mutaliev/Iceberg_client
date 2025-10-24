import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute } from '@react-navigation/native';
import {
    fetchAllDistricts,
    fetchDistrictById,
    createDistrict,
    updateDistrict,
    deleteDistrict,
    clearDistrictError,
    selectDistrict as selectDistrictAction
} from '@entities/district';
import { fetchWarehouses } from '@entities/warehouse';
import {
    selectDistricts,
    selectDistrictLoading,
    selectDistrictError,
    selectDistrictsWithStats
} from '@entities/district';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { AdminHeader } from '@widgets/admin/AdminHeader';
import { useNavigation } from '@react-navigation/native';
import { DistrictListItem } from './DistrictListItem';
import { AddDistrictModal } from './AddDistrictModal';
import { WarehouseListItem } from './WarehouseListItem';
import { AddWarehouseModal } from './AddWarehouseModal';
import { ErrorState } from "@shared/ui/states/ErrorState";
import IconDistrict from "@shared/ui/Icon/DistrictManagement/IconDistrict";
import IconWarehouse from "@shared/ui/Icon/Warehouse/IconWarehouse";
import { IconSearch } from '@shared/ui/Icon/DistrictManagement/IconSearch';

export const DistrictsManagementScreen = () => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const route = useRoute();
    const { openAddModal } = route.params || {};

    const districts = useSelector(selectDistrictsWithStats) || [];
    const isLoading = useSelector(selectDistrictLoading);
    const error = useSelector(selectDistrictError);

    const [isAddModalVisible, setAddModalVisible] = useState(false);
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [operationInProgress, setOperationInProgress] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredDistricts, setFilteredDistricts] = useState([]);
    
    // Состояние для управления табами
    const [activeTab, setActiveTab] = useState('districts'); // 'districts' или 'warehouses'
    
    // Состояние для управления складами
    const [warehouses, setWarehouses] = useState([]);
    const [filteredWarehouses, setFilteredWarehouses] = useState([]);
    const [isWarehouseModalVisible, setWarehouseModalVisible] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [warehousesLoading, setWarehousesLoading] = useState(false);

    // Открываем модальное окно при получении параметра
    useEffect(() => {
        if (openAddModal) {
            setAddModalVisible(true);
        }
    }, [openAddModal]);

    const loadDistricts = useCallback(async () => {
        setRefreshing(true);
        try {
            dispatch(clearDistrictError());
            await dispatch(fetchAllDistricts()).unwrap();
        } catch (err) {
            console.error('Error loading districts:', err);
            Alert.alert(
                'Ошибка загрузки',
                'Не удалось загрузить список районов. Попробуйте еще раз.',
                [{ text: 'OK' }]
            );
        } finally {
            setRefreshing(false);
        }
    }, [dispatch]);

    useEffect(() => {
        loadDistricts();
    }, [loadDistricts]);

    // Фильтрация районов при изменении поискового запроса
    useEffect(() => {
        if (!searchQuery.trim() || !districts.length) {
            setFilteredDistricts(districts);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = districts.filter(district =>
            district.name.toLowerCase().includes(query) ||
            (district.description && district.description.toLowerCase().includes(query))
        );

        setFilteredDistricts(filtered);
    }, [searchQuery, districts]);

    // Фильтрация складов при изменении поискового запроса
    useEffect(() => {
        if (!searchQuery.trim() || !warehouses.length) {
            setFilteredWarehouses(warehouses);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = warehouses.filter(warehouse =>
            warehouse.name.toLowerCase().includes(query) ||
            warehouse.address.toLowerCase().includes(query) ||
            (warehouse.district && warehouse.district.name.toLowerCase().includes(query))
        );

        setFilteredWarehouses(filtered);
    }, [searchQuery, warehouses]);

    const handleBackPress = () => {
        console.log('DistrictsManagement: Going back');
        
        // Проверяем, можем ли мы вернуться назад
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            // Если нет возможности вернуться назад, переходим к профилю
            console.log('DistrictsManagement: Going back to Profile');
            navigation.navigate('Main', {
                screen: 'ProfileTab',
                params: {
                    screen: 'ProfileMain'
                }
            });
        }
    };

    const handleAddDistrict = () => {
        setSelectedDistrict(null);
        setAddModalVisible(true);
    };

    const handleEditDistrict = (district) => {
        setSelectedDistrict(district);
        setAddModalVisible(true);
    };

    const handleDeleteDistrict = (districtId) => {
        Alert.alert(
            'Подтверждение',
            'Вы действительно хотите удалить этот район?',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        setOperationInProgress(true);
                        try {
                            await dispatch(deleteDistrict(districtId)).unwrap();
                            Alert.alert('Успех', 'Район успешно удален');
                            await loadDistricts();
                        } catch (err) {
                            Alert.alert('Ошибка', typeof err === 'string' ? err : 'Не удалось удалить район');
                        } finally {
                            setOperationInProgress(false);
                        }
                    }
                }
            ]
        );
    };

    const handleModalClose = () => {
        setAddModalVisible(false);
        setSelectedDistrict(null);
    };

    const handleDistrictFormSubmit = async (formData) => {
        setOperationInProgress(true);
        try {
            if (selectedDistrict) {
                await dispatch(updateDistrict({
                    id: selectedDistrict.id,
                    districtData: formData
                })).unwrap();
                Alert.alert('Успех', 'Район успешно обновлен');
            } else {
                await dispatch(createDistrict(formData)).unwrap();
                Alert.alert('Успех', 'Район успешно создан');
            }

            setAddModalVisible(false);
            await loadDistricts();
            return true;
        } catch (error) {
            const errorMessage = typeof error === 'string' ? error : 'Произошла ошибка при сохранении района';
            Alert.alert('Ошибка', errorMessage);
            return false;
        } finally {
            setOperationInProgress(false);
        }
    };

    // Функции для работы со складами
    const loadWarehouses = useCallback(async () => {
        setWarehousesLoading(true);
        try {
            // Используем Redux для загрузки складов
            const response = await dispatch(fetchWarehouses(true)).unwrap();
            const warehouses = response.data || [];
            
            console.log('Загружены склады:', warehouses.length);
            setWarehouses(warehouses);
            setFilteredWarehouses(warehouses);
        } catch (err) {
            console.error('Error loading warehouses:', err);
            Alert.alert('Ошибка загрузки', 'Не удалось загрузить список складов');
        } finally {
            setWarehousesLoading(false);
        }
    }, [dispatch]);

    const handleAddWarehouse = () => {
        setSelectedWarehouse(null);
        setWarehouseModalVisible(true);
    };

    const handleEditWarehouse = (warehouse) => {
        setSelectedWarehouse(warehouse);
        setWarehouseModalVisible(true);
    };

    const handleDeleteWarehouse = (warehouseId) => {
        Alert.alert(
            'Подтверждение',
            'Вы действительно хотите удалить этот склад?',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        setOperationInProgress(true);
                        try {
                            // Здесь будет вызов API для удаления склада
                            setWarehouses(prev => prev.filter(w => w.id !== warehouseId));
                            setFilteredWarehouses(prev => prev.filter(w => w.id !== warehouseId));
                            Alert.alert('Успех', 'Склад успешно удален');
                        } catch (err) {
                            Alert.alert('Ошибка', 'Не удалось удалить склад');
                        } finally {
                            setOperationInProgress(false);
                        }
                    }
                }
            ]
        );
    };

    const handleWarehouseFormSubmit = async (formData) => {
        setOperationInProgress(true);
        try {
            // Здесь будет вызов API для создания/обновления склада
            if (selectedWarehouse) {
                // Обновление склада
                setWarehouses(prev => prev.map(w => 
                    w.id === selectedWarehouse.id ? { ...w, ...formData } : w
                ));
                Alert.alert('Успех', 'Склад успешно обновлен');
            } else {
                // Создание склада
                const newWarehouse = {
                    id: Date.now(), // Временный ID
                    ...formData,
                    _count: { employees: 0, orders: 0 }
                };
                setWarehouses(prev => [...prev, newWarehouse]);
                Alert.alert('Успех', 'Склад успешно создан');
            }

            setWarehouseModalVisible(false);
            await loadWarehouses();
            return true;
        } catch (error) {
            const errorMessage = typeof error === 'string' ? error : 'Произошла ошибка при сохранении склада';
            Alert.alert('Ошибка', errorMessage);
            return false;
        } finally {
            setOperationInProgress(false);
        }
    };

    const handleWarehouseModalClose = () => {
        setWarehouseModalVisible(false);
        setSelectedWarehouse(null);
    };

    const renderDistrictItem = ({ item }) => (
        <DistrictListItem
            district={item}
            onEdit={() => handleEditDistrict(item)}
            onDelete={() => handleDeleteDistrict(item.id)}
        />
    );

    const renderWarehouseItem = ({ item }) => (
        <WarehouseListItem
            warehouse={item}
            onEdit={() => handleEditWarehouse(item)}
            onDelete={() => handleDeleteWarehouse(item.id)}
        />
    );

    return (
        <View style={styles.container}>
            <AdminHeader
                title="Управление районами и складами"
                onBack={handleBackPress}
                icon={<IconDistrict width={24} height={24} color={Color.blue2} />}
            />

            {/* Табы */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'districts' && styles.activeTab]}
                    onPress={() => {
                        setActiveTab('districts');
                        setSearchQuery('');
                    }}
                >
                    <IconDistrict width={20} height={20} color={activeTab === 'districts' ? Color.colorLightMode : Color.blue2} />
                    <Text style={[styles.tabText, activeTab === 'districts' && styles.activeTabText]}>
                        Районы
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'warehouses' && styles.activeTab]}
                    onPress={() => {
                        setActiveTab('warehouses');
                        setSearchQuery('');
                        if (warehouses.length === 0) {
                            loadWarehouses();
                        }
                    }}
                >
                    <IconWarehouse width={20} height={20} color={activeTab === 'warehouses' ? Color.colorLightMode : Color.blue2} />
                    <Text style={[styles.tabText, activeTab === 'warehouses' && styles.activeTabText]}>
                        Склады
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>
                        {activeTab === 'districts' ? 'Список районов' : 'Список складов'}
                    </Text>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={activeTab === 'districts' ? handleAddDistrict : handleAddWarehouse}
                        disabled={operationInProgress}
                    >
                        <Text style={styles.addButtonText}>
                            {activeTab === 'districts' ? 'Добавить район' : 'Добавить склад'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Поиск */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputContainer}>
                        <IconSearch width={20} height={20} color={Color.grey7D7D7D} style={styles.searchIcon} />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder={activeTab === 'districts' ? 'Поиск районов...' : 'Поиск складов...'}
                            placeholderTextColor={Color.grey7D7D7D}
                            style={styles.searchInput}
                            clearButtonMode="while-editing"
                        />
                    </View>
                </View>

                {/* Контент в зависимости от активной вкладки */}
                {activeTab === 'districts' ? (
                    // Контент для районов
                    isLoading && !refreshing ? (
                        <View style={styles.centered}>
                            <ActivityIndicator size="large" color={Color.blue2} />
                            <Text style={styles.loadingText}>Загрузка районов...</Text>
                        </View>
                    ) : error ? (
                        <ErrorState
                            message={error || 'Ошибка загрузки районов'}
                            onRetry={loadDistricts}
                            buttonText="Повторить"
                        />
                    ) : filteredDistricts.length === 0 ? (
                        <View style={styles.centered}>
                            {searchQuery ? (
                                <Text style={styles.emptyText}>Районы не найдены</Text>
                            ) : (
                                <>
                                    <Text style={styles.emptyText}>Районы отсутствуют</Text>
                                    <TouchableOpacity
                                        style={styles.addEmptyButton}
                                        onPress={handleAddDistrict}
                                    >
                                        <Text style={styles.addButtonText}>Добавить первый район</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    ) : (
                        <FlatList
                            data={filteredDistricts}
                            renderItem={renderDistrictItem}
                            keyExtractor={(item) => item.id.toString()}
                            contentContainerStyle={styles.listContainer}
                            refreshing={refreshing}
                            onRefresh={loadDistricts}
                        />
                    )
                ) : (
                    // Контент для складов
                    warehousesLoading ? (
                        <View style={styles.centered}>
                            <ActivityIndicator size="large" color={Color.blue2} />
                            <Text style={styles.loadingText}>Загрузка складов...</Text>
                        </View>
                    ) : filteredWarehouses.length === 0 ? (
                        <View style={styles.centered}>
                            {searchQuery ? (
                                <Text style={styles.emptyText}>Склады не найдены</Text>
                            ) : (
                                <>
                                    <Text style={styles.emptyText}>Склады отсутствуют</Text>
                                    <TouchableOpacity
                                        style={styles.addEmptyButton}
                                        onPress={handleAddWarehouse}
                                    >
                                        <Text style={styles.addButtonText}>Добавить первый склад</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    ) : (
                        <FlatList
                            data={filteredWarehouses}
                            renderItem={renderWarehouseItem}
                            keyExtractor={(item) => item.id.toString()}
                            contentContainerStyle={styles.listContainer}
                            refreshing={warehousesLoading}
                            onRefresh={loadWarehouses}
                        />
                    )
                )}
            </View>

            <AddDistrictModal
                visible={isAddModalVisible}
                onClose={handleModalClose}
                onSubmit={handleDistrictFormSubmit}
                district={selectedDistrict}
                isSubmitting={operationInProgress}
            />

            <AddWarehouseModal
                visible={isWarehouseModalVisible}
                onClose={handleWarehouseModalClose}
                onSubmit={handleWarehouseFormSubmit}
                warehouse={selectedWarehouse}
                isSubmitting={operationInProgress}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: Color.colorLightMode,
        borderBottomWidth: 1,
        borderBottomColor: Color.border,
        paddingHorizontal: normalize(16),
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: normalize(12),
        paddingHorizontal: normalize(16),
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        backgroundColor: Color.blue2,
        borderBottomColor: Color.blue2,
    },
    tabText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.blue2,
        marginLeft: normalize(8),
    },
    activeTabText: {
        color: Color.colorLightMode,
    },
    content: {
        flex: 1,
        padding: normalize(16),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(16),
    },
    title: {
        fontSize: normalizeFont(FontSize.size_lg),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
    },
    searchContainer: {
        marginBottom: normalize(16),
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: Border.radius.small,
        paddingHorizontal: normalize(12),
        height: normalize(44),
        borderWidth: 1,
        borderColor: Color.border,
    },
    searchIcon: {
        marginRight: normalize(8),
    },
    searchInput: {
        flex: 1,
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textPrimary,
        padding: 0,
        height: '100%',
    },
    addButton: {
        backgroundColor: Color.blue2,
        paddingVertical: normalize(8),
        paddingHorizontal: normalize(12),
        borderRadius: Border.radius.small,
    },
    addEmptyButton: {
        backgroundColor: Color.blue2,
        paddingVertical: normalize(10),
        paddingHorizontal: normalize(16),
        borderRadius: Border.radius.small,
        marginTop: normalize(16),
    },
    addButtonText: {
        color: Color.colorLightMode,
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginTop: normalize(10),
    },
    emptyText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
    },
    listContainer: {
        paddingBottom: normalize(16),
    },
});