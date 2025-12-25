import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    SafeAreaView,
    RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import { AdminHeader } from '@widgets/admin/AdminHeader';
import { SearchBar } from '@shared/ui/SearchBar';
import { employeeApi } from '@entities/user/api/userApi';
import IconEmployee from '@shared/ui/Icon/Profile/IconPersona';
import { MapPinIcon } from '@shared/ui/Icon/DistrictManagement/MapPinIcon';
import IconEdit from '@shared/ui/Icon/Profile/IconEdit';
import EmployeeDistrictsModal from "@entities/user/ui/EmployeeDistrictsModal/ui/EmployeeDistrictsModal";
import { EmployeeWarehouseModal } from "@entities/user/ui/EmployeeWarehouseModal";

export const EmployeeManagementScreen = () => {
    const navigation = useNavigation();
    
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Состояние для модального окна районов
    const [districtsModalVisible, setDistrictsModalVisible] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    
    // Состояние для модального окна склада
    const [warehouseModalVisible, setWarehouseModalVisible] = useState(false);

    // Загрузка сотрудников при монтировании
    useEffect(() => {
        loadEmployees();
    }, []);

    // Фильтрация сотрудников при изменении поискового запроса
    useEffect(() => {
        filterEmployees();
    }, [searchQuery, employees]);

    // Загрузка списка сотрудников
    const loadEmployees = async () => {
        try {
            setIsLoading(true);
            const response = await employeeApi.getAllEmployees();
            const employeesData = response.data?.employees || [];
            setEmployees(employeesData);
            setFilteredEmployees(employeesData);
        } catch (error) {
            console.error('Ошибка загрузки сотрудников:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить список сотрудников');
        } finally {
            setIsLoading(false);
        }
    };

    // Обновление списка
    const handleRefresh = async () => {
        setRefreshing(true);
        await loadEmployees();
        setRefreshing(false);
    };

    // Фильтрация сотрудников
    const filterEmployees = () => {
        if (!searchQuery.trim()) {
            setFilteredEmployees(employees);
            return;
        }

        const filtered = employees.filter(employee => {
            const searchLower = searchQuery.toLowerCase();
            const nameMatch = employee.name?.toLowerCase().includes(searchLower);
            const positionMatch = employee.position?.toLowerCase().includes(searchLower);
            const phoneMatch = employee.phone?.toLowerCase().includes(searchLower);
            
            return nameMatch || positionMatch || phoneMatch;
        });

        setFilteredEmployees(filtered);
    };

    // Открытие модального окна для редактирования районов
    const handleEditDistricts = (employee) => {
        setSelectedEmployee(employee);
        setDistrictsModalVisible(true);
    };

    // Успешное обновление районов
    const handleDistrictsUpdated = () => {
        loadEmployees(); // Перезагружаем список сотрудников
    };

    // Открытие модального окна для редактирования склада
    const handleEditWarehouse = (employee) => {
        setSelectedEmployee(employee);
        setWarehouseModalVisible(true);
    };

    // Успешное обновление склада
    const handleWarehouseUpdated = () => {
        loadEmployees(); // Перезагружаем список сотрудников
    };

    // Рендер карточки сотрудника
    const renderEmployeeCard = ({ item }) => {
        const districtsCount = item.districts?.length || 0;
        const ordersCount = item._count?.orders || 0;

        return (
            <View style={styles.employeeCard}>
                <View style={styles.employeeHeader}>
                    <View style={styles.employeeAvatar}>
                        <IconEmployee width={24} height={24} color={Color.blue2} />
                    </View>
                    <View style={styles.employeeInfo}>
                        <Text style={styles.employeeName}>{item.name}</Text>
                        <Text style={styles.employeePosition}>
                            {item.position || 'Сотрудник'}
                        </Text>
                        <Text style={styles.employeePhone}>{item.phone}</Text>
                    </View>
                </View>

                <View style={styles.employeeStats}>
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
                            {ordersCount} заказ{ordersCount !== 1 ? 'ов' : ''}
                        </Text>
                    </View>
                </View>

                {/* Информация о складе */}
                {item.warehouse && (
                    <View style={styles.warehouseContainer}>
                        <Text style={styles.warehouseTitle}>Склад работы:</Text>
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
            <IconEmployee width={48} height={48} color={Color.textSecondary} />
            <Text style={styles.emptyTitle}>
                {searchQuery ? 'Сотрудники не найдены' : 'Список сотрудников пуст'}
            </Text>
            <Text style={styles.emptySubtitle}>
                {searchQuery 
                    ? `По запросу "${searchQuery}" ничего не найдено`
                    : 'Сотрудники появятся здесь после добавления'
                }
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <AdminHeader
                title="Районы сотрудников"
                icon={<IconEmployee width={24} height={24} color={Color.blue2} />}
                onBackPress={() => navigation.goBack()}
            />

            <SearchBar
                placeholder="Поиск по имени, должности или телефону..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onClear={() => setSearchQuery('')}
            />

            {/* Статистика */}
            <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                    Всего сотрудников: {employees.length}
                </Text>
                <Text style={styles.statsText}>
                    Найдено: {filteredEmployees.length}
                </Text>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Color.blue2} />
                    <Text style={styles.loadingText}>Загрузка сотрудников...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredEmployees}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderEmployeeCard}
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
            <EmployeeDistrictsModal
                visible={districtsModalVisible}
                employee={selectedEmployee}
                onClose={() => {
                    setDistrictsModalVisible(false);
                    setSelectedEmployee(null);
                }}
                onSuccess={handleDistrictsUpdated}
            />

            {/* Модальное окно для редактирования склада */}
            <EmployeeWarehouseModal
                visible={warehouseModalVisible}
                employee={selectedEmployee}
                onClose={() => {
                    setWarehouseModalVisible(false);
                    setSelectedEmployee(null);
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
    employeeCard: {
        backgroundColor: Color.colorLightMode,
        borderRadius: Border.radius.medium,
        padding: normalize(16),
        marginVertical: normalize(8),
        ...Shadow.light,
    },
    employeeHeader: {
        flexDirection: 'row',
        marginBottom: normalize(12),
    },
    employeeAvatar: {
        width: normalize(48),
        height: normalize(48),
        borderRadius: normalize(24),
        backgroundColor: Color.colorLightGray,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: normalize(12),
    },
    employeeInfo: {
        flex: 1,
    },
    employeeName: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: normalize(2),
    },
    employeePosition: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.blue2,
        fontWeight: '500',
        marginBottom: normalize(2),
    },
    employeePhone: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
    },
    employeeStats: {
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

export default EmployeeManagementScreen; 