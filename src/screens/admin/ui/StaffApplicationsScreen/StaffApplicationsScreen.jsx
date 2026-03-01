import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Modal,
    TextInput,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import { AdminHeader } from '@widgets/admin/AdminHeader';
import { SearchBar } from '@shared/ui/SearchBar';
import IconUser from '@shared/ui/Icon/Profile/IconPersona';
import { useCustomAlert } from '@shared/ui/CustomAlert';
import { adminApi } from '@entities/admin/api/adminApi';
import { districtApi } from '@entities/district/api/districtApi';
import CustomButton from '@shared/ui/Button/CustomButton';

const STATUS_LABELS = {
    PENDING: 'На рассмотрении',
    APPROVED: 'Одобрена',
    REJECTED: 'Отклонена'
};

const STATUS_COLORS = {
    PENDING: Color.orange,
    APPROVED: Color.green,
    REJECTED: Color.red
};

const ROLE_LABELS = {
    EMPLOYEE: 'Сотрудник',
    DRIVER: 'Водитель',
    SUPPLIER: 'Поставщик'
};

export const StaffApplicationsScreen = () => {
    const navigation = useNavigation();
    const { showError, showSuccess, showAlert } = useCustomAlert();
    
    const [applications, setApplications] = useState([]);
    const [statistics, setStatistics] = useState({});
    const [filteredApplications, setFilteredApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('PENDING');
    
    // Модальное окно одобрения
    const [approveModalVisible, setApproveModalVisible] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [position, setPosition] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [selectedDistricts, setSelectedDistricts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Модальное окно отклонения
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    
    // Модальные окна для выбора
    const [warehouseSelectVisible, setWarehouseSelectVisible] = useState(false);
    const [districtsSelectVisible, setDistrictsSelectVisible] = useState(false);

    // Загрузка данных при монтировании
    useEffect(() => {
        loadData();
    }, [statusFilter]);

    // Фильтрация при изменении поиска
    useEffect(() => {
        filterApplications();
    }, [searchQuery, applications]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [applicationsRes, statsRes, warehousesRes, districtsRes] = await Promise.all([
                adminApi.getStaffApplications({ status: statusFilter }),
                adminApi.getStaffApplicationsStatistics(),
                adminApi.getWarehousesForSelection(),
                districtApi.getAllDistricts()
            ]);
            
            console.log('📊 Загруженные заявки:', {
                count: applicationsRes.data?.applications?.length || 0,
                firstApplication: applicationsRes.data?.applications?.[0],
                districts: applicationsRes.data?.applications?.[0]?.districts
            });
            
            setApplications(applicationsRes.data?.applications || []);
            setStatistics(statsRes.data || {});
            const warehousesList = warehousesRes?.data?.data?.warehouses
                || warehousesRes?.data?.warehouses
                || warehousesRes?.warehouses
                || warehousesRes?.data
                || [];
            const districtsList = districtsRes?.data?.data?.districts
                || districtsRes?.data?.districts
                || districtsRes?.districts
                || districtsRes?.data
                || [];
            setWarehouses(Array.isArray(warehousesList) ? warehousesList : []);
            setDistricts(Array.isArray(districtsList) ? districtsList : []);
        } catch (error) {
            console.error('Ошибка загрузки заявок:', error);
            showError('Ошибка', 'Не удалось загрузить список заявок');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const filterApplications = () => {
        if (!searchQuery.trim()) {
            setFilteredApplications(applications);
            return;
        }

        const filtered = applications.filter(app => {
            const searchLower = searchQuery.toLowerCase();
            const nameMatch = app.user?.client?.name?.toLowerCase().includes(searchLower);
            const emailMatch = app.user?.email?.toLowerCase().includes(searchLower);
            
            return nameMatch || emailMatch;
        });

        setFilteredApplications(filtered);
    };

    const handleOpenApprove = (application) => {
        setSelectedApplication(application);
        setPosition('');
        setSelectedWarehouse(null);
        // Устанавливаем районы из заявки, если они есть
        setSelectedDistricts(application.districts || []);
        setApproveModalVisible(true);
    };

    const handleOpenReject = (application) => {
        setSelectedApplication(application);
        setRejectionReason('');
        setRejectModalVisible(true);
    };

    const handleApprove = async () => {
        const requestData = {};

        if (selectedApplication.desiredRole === 'EMPLOYEE') {
            if (!selectedWarehouse) {
                showError('Ошибка', 'Необходимо выбрать склад работы');
                return;
            }
            if (selectedDistricts.length === 0) {
                showError('Ошибка', 'Необходимо выбрать хотя бы один район обслуживания');
                return;
            }
            requestData.warehouseId = selectedWarehouse.id;
            requestData.districts = selectedDistricts.map(d => d.id);
            if (position) requestData.position = position;
        }

        if (selectedApplication.desiredRole === 'DRIVER') {
            if (selectedDistricts.length === 0) {
                showError('Ошибка', 'Необходимо выбрать хотя бы один район обслуживания');
                return;
            }
            requestData.districts = selectedDistricts.map(d => d.id);
            if (selectedWarehouse) {
                requestData.warehouseId = selectedWarehouse.id;
            }
        }

        try {
            setIsSubmitting(true);
            await adminApi.approveStaffApplication(selectedApplication.id, requestData);
            
            showSuccess(
                'Заявка одобрена!',
                `Пользователь ${selectedApplication.user?.client?.name} теперь ${ROLE_LABELS[selectedApplication.desiredRole]}`
            );
            
            setApproveModalVisible(false);
            await loadData();
        } catch (error) {
            console.error('Ошибка одобрения заявки:', error);
            showError(
                'Ошибка',
                error.response?.data?.message || 'Не удалось одобрить заявку'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason || rejectionReason.trim() === '') {
            showError('Ошибка', 'Необходимо указать причину отклонения');
            return;
        }

        try {
            setIsSubmitting(true);
            await adminApi.rejectStaffApplication(selectedApplication.id, { rejectionReason });
            
            showSuccess('Заявка отклонена', 'Заявка успешно отклонена');
            
            setRejectModalVisible(false);
            await loadData();
        } catch (error) {
            console.error('Ошибка отклонения заявки:', error);
            showError(
                'Ошибка',
                error.response?.data?.message || 'Не удалось отклонить заявку'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleDistrictSelection = (district) => {
        setSelectedDistricts(prev => {
            const isSelected = prev.some(d => d.id === district.id);
            if (isSelected) {
                return prev.filter(d => d.id !== district.id);
            } else {
                return [...prev, district];
            }
        });
    };

    // Рендер карточки заявки
    const renderApplicationCard = ({ item }) => {
        const isPending = item.status === 'PENDING';
        
        console.log('🎴 Рендер карточки заявки:', {
            id: item.id,
            status: item.status,
            hasDistricts: !!item.districts,
            districtsType: typeof item.districts,
            districtsLength: item.districts?.length,
            districtsValue: item.districts
        });

        return (
            <View style={styles.applicationCard}>
                {/* Заголовок карточки */}
                <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>
                            {item.user?.client?.name || 'Пользователь'}
                        </Text>
                        <Text style={styles.userEmail}>{item.user?.email}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
                        <Text style={styles.statusText}>
                            {STATUS_LABELS[item.status]}
                        </Text>
                    </View>
                </View>

                {/* Желаемая роль */}
                <View style={styles.roleContainer}>
                    <Text style={styles.roleLabel}>Желаемая роль:</Text>
                    <Text style={styles.roleValue}>{ROLE_LABELS[item.desiredRole]}</Text>
                </View>

                {/* Районы */}
                {item.districts && item.districts.length > 0 && (
                    <View style={styles.districtsContainer}>
                        <Text style={styles.sectionLabel}>Районы:</Text>
                        <View style={styles.districtChips}>
                            {item.districts.map((district) => (
                                <View key={district.id} style={styles.districtChip}>
                                    <Text style={styles.districtChipText}>{district.name}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Дополнительная информация */}
                {item.reason && (
                    <View style={styles.infoSection}>
                        <Text style={styles.infoLabel}>Причина:</Text>
                        <Text style={styles.infoText}>{item.reason}</Text>
                    </View>
                )}

                {item.experience && (
                    <View style={styles.infoSection}>
                        <Text style={styles.infoLabel}>Опыт работы:</Text>
                        <Text style={styles.infoText}>{item.experience}</Text>
                    </View>
                )}

                {item.additionalInfo && (
                    <View style={styles.infoSection}>
                        <Text style={styles.infoLabel}>Дополнительно:</Text>
                        <Text style={styles.infoText}>{item.additionalInfo}</Text>
                    </View>
                )}

                {/* Дата подачи */}
                <Text style={styles.dateText}>
                    Подана: {new Date(item.createdAt).toLocaleString('ru-RU')}
                </Text>

                {/* Причина отклонения */}
                {item.status === 'REJECTED' && item.rejectionReason && (
                    <View style={[styles.infoSection, styles.rejectionSection]}>
                        <Text style={styles.rejectionLabel}>Причина отклонения:</Text>
                        <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
                    </View>
                )}

                {/* Кнопки действий */}
                {isPending && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.approveButton]}
                            onPress={() => handleOpenApprove(item)}
                        >
                            <Text style={styles.actionButtonText}>Одобрить</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => handleOpenReject(item)}
                        >
                            <Text style={styles.actionButtonText}>Отклонить</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    // Рендер пустого списка
    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <IconUser width={48} height={48} color={Color.textSecondary} />
            <Text style={styles.emptyTitle}>
                {searchQuery ? 'Заявки не найдены' : 'Нет заявок'}
            </Text>
            <Text style={styles.emptySubtitle}>
                {searchQuery 
                    ? `По запросу "${searchQuery}" ничего не найдено`
                    : `Заявок со статусом "${STATUS_LABELS[statusFilter]}" пока нет`
                }
            </Text>
        </View>
    );

    // Модальное окно одобрения
    const renderApproveModal = () => (
        <Modal
            visible={approveModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setApproveModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.modalTitle}>Одобрение заявки</Text>
                        <Text style={styles.modalSubtitle}>
                            {selectedApplication?.user?.client?.name || 'Пользователь'}
                        </Text>
                        <Text style={styles.modalRole}>
                            Желаемая роль: {ROLE_LABELS[selectedApplication?.desiredRole]}
                        </Text>
                        <Text style={styles.modalNote}>
                            Пользователь сможет войти используя свои регистрационные данные
                        </Text>

                        {/* Отображение районов, указанных клиентом */}
                        {selectedApplication?.districts && selectedApplication.districts.length > 0 && (
                            <View style={styles.infoSection}>
                                <Text style={styles.infoLabel}>Районы, указанные клиентом:</Text>
                                <View style={styles.districtChips}>
                                    {selectedApplication.districts.map((district) => (
                                        <View key={district.id} style={styles.districtChip}>
                                            <Text style={styles.districtChipText}>{district.name}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Для сотрудника - должность, склад и районы */}
                        {selectedApplication?.desiredRole === 'EMPLOYEE' && (
                            <>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Должность</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={position}
                                        onChangeText={setPosition}
                                        placeholder="Введите должность"
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Склад работы *</Text>
                                    <TouchableOpacity
                                        style={styles.selectButton}
                                        onPress={() => setWarehouseSelectVisible(true)}
                                    >
                                        <Text style={selectedWarehouse ? styles.selectButtonTextSelected : styles.selectButtonText}>
                                            {selectedWarehouse ? selectedWarehouse.name : 'Выберите склад'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Районы обслуживания *</Text>
                                    <TouchableOpacity
                                        style={styles.selectButton}
                                        onPress={() => setDistrictsSelectVisible(true)}
                                    >
                                        <Text style={selectedDistricts.length > 0 ? styles.selectButtonTextSelected : styles.selectButtonText}>
                                            {selectedDistricts.length > 0 
                                                ? `Выбрано: ${selectedDistricts.length}` 
                                                : 'Выберите районы'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {/* Для водителя - районы и опционально склад */}
                        {selectedApplication?.desiredRole === 'DRIVER' && (
                            <>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Склад (необязательно)</Text>
                                    <TouchableOpacity
                                        style={styles.selectButton}
                                        onPress={() => setWarehouseSelectVisible(true)}
                                    >
                                        <Text style={selectedWarehouse ? styles.selectButtonTextSelected : styles.selectButtonText}>
                                            {selectedWarehouse ? selectedWarehouse.name : 'Выберите склад'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Районы обслуживания *</Text>
                                    <TouchableOpacity
                                        style={styles.selectButton}
                                        onPress={() => setDistrictsSelectVisible(true)}
                                    >
                                        <Text style={selectedDistricts.length > 0 ? styles.selectButtonTextSelected : styles.selectButtonText}>
                                            {selectedDistricts.length > 0 
                                                ? `Выбрано: ${selectedDistricts.length}` 
                                                : 'Выберите районы'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        <View style={styles.modalButtons}>
                            <CustomButton
                                title="Отмена"
                                onPress={() => setApproveModalVisible(false)}
                                outlined
                                color={Color.textSecondary}
                                disabled={isSubmitting}
                                style={{ flex: 1 }}
                            />
                            <CustomButton
                                title={isSubmitting ? 'Обработка...' : 'Одобрить'}
                                onPress={handleApprove}
                                color={Color.green}
                                disabled={isSubmitting}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    // Модальное окно отклонения
    const renderRejectModal = () => (
        <Modal
            visible={rejectModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setRejectModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Отклонение заявки</Text>
                    <Text style={styles.modalSubtitle}>
                        {selectedApplication?.user?.client?.name || 'Пользователь'}
                    </Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Причина отклонения *</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            value={rejectionReason}
                            onChangeText={setRejectionReason}
                            placeholder="Укажите причину отклонения заявки"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    <View style={styles.modalButtons}>
                        <CustomButton
                            title="Отмена"
                            onPress={() => setRejectModalVisible(false)}
                            outlined
                            color={Color.textSecondary}
                            disabled={isSubmitting}
                            style={{ flex: 1 }}
                        />
                        <CustomButton
                            title={isSubmitting ? 'Обработка...' : 'Отклонить'}
                            onPress={handleReject}
                            color={Color.red}
                            disabled={isSubmitting}
                            style={{ flex: 1 }}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Модальное окно выбора склада
    const renderWarehouseSelectModal = () => (
        <Modal
            visible={warehouseSelectVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setWarehouseSelectVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Выберите склад</Text>
                    <FlatList
                        data={warehouses}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.selectItem,
                                    selectedWarehouse?.id === item.id && styles.selectItemSelected
                                ]}
                                onPress={() => {
                                    setSelectedWarehouse(item);
                                    setWarehouseSelectVisible(false);
                                }}
                            >
                                <Text style={styles.selectItemText}>{item.name}</Text>
                                <Text style={styles.selectItemSubtext}>{item.address}</Text>
                            </TouchableOpacity>
                        )}
                    />
                    <CustomButton
                        title="Закрыть"
                        onPress={() => setWarehouseSelectVisible(false)}
                        outlined
                        color={Color.textSecondary}
                    />
                </View>
            </View>
        </Modal>
    );

    // Модальное окно выбора районов
    const renderDistrictsSelectModal = () => (
        <Modal
            visible={districtsSelectVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setDistrictsSelectVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Выберите районы</Text>
                    <Text style={styles.modalSubtitle}>
                        Выбрано: {selectedDistricts.length}
                    </Text>
                    <FlatList
                        data={districts}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => {
                            const isSelected = selectedDistricts.some(d => d.id === item.id);
                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.selectItem,
                                        isSelected && styles.selectItemSelected
                                    ]}
                                    onPress={() => toggleDistrictSelection(item)}
                                >
                                    <View style={styles.checkboxContainer}>
                                        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                                            {isSelected && <Text style={styles.checkmark}>✓</Text>}
                                        </View>
                                        <Text style={styles.selectItemText}>{item.name}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                    <CustomButton
                        title="Готово"
                        onPress={() => setDistrictsSelectVisible(false)}
                        color={Color.blue2}
                    />
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <AdminHeader
                title="Заявки на присоединение"
                icon={<IconUser width={24} height={24} color={Color.blue2} />}
                onBackPress={() => navigation.goBack()}
            />

            <SearchBar
                placeholder="Поиск по имени или email..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onClear={() => setSearchQuery('')}
            />

            {/* Статистика */}
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{statistics.total || 0}</Text>
                    <Text style={styles.statLabel}>Всего</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: Color.orange }]}>{statistics.pending || 0}</Text>
                    <Text style={styles.statLabel}>Ожидают</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: Color.success }]}>{statistics.approved || 0}</Text>
                    <Text style={styles.statLabel}>Одобрено</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: Color.red }]}>{statistics.rejected || 0}</Text>
                    <Text style={styles.statLabel}>Отклонено</Text>
                </View>
            </View>

            {/* Фильтры по статусу */}
            <View style={styles.filtersContainer}>
                {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
                    <TouchableOpacity
                        key={status}
                        style={[
                            styles.filterButton,
                            statusFilter === status && styles.filterButtonActive
                        ]}
                        onPress={() => setStatusFilter(status)}
                    >
                        <Text style={[
                            styles.filterButtonText,
                            statusFilter === status && styles.filterButtonTextActive
                        ]}>
                            {STATUS_LABELS[status]}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Color.blue2} />
                    <Text style={styles.loadingText}>Загрузка заявок...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredApplications}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderApplicationCard}
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

            {/* Модальные окна */}
            {renderApproveModal()}
            {renderRejectModal()}
            {renderWarehouseSelectModal()}
            {renderDistrictsSelectModal()}
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
        justifyContent: 'space-around',
        paddingVertical: normalize(16),
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: Color.border,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: normalizeFont(24),
        fontWeight: 'bold',
        color: Color.blue2,
        fontFamily: FontFamily.sFProDisplay,
    },
    statLabel: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(4),
    },
    filtersContainer: {
        flexDirection: 'row',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(12),
        backgroundColor: '#FFFFFF',
        gap: normalize(8),
    },
    filterButton: {
        flex: 1,
        paddingVertical: normalize(8),
        paddingHorizontal: normalize(12),
        borderRadius: Border.radius.small,
        borderWidth: 1,
        borderColor: Color.border,
        alignItems: 'center',
    },
    filterButtonActive: {
        backgroundColor: Color.blue2,
        borderColor: Color.blue2,
    },
    filterButtonText: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    filterButtonTextActive: {
        color: '#FFFFFF',
    },
    listContainer: {
        paddingHorizontal: normalize(20),
        paddingBottom: normalize(20),
    },
    applicationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: Border.radius.medium,
        padding: normalize(16),
        marginVertical: normalize(8),
        ...Shadow.light,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: normalize(12),
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProDisplay,
        marginBottom: normalize(4),
    },
    userEmail: {
        fontSize: normalizeFont(14),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    statusBadge: {
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(6),
        borderRadius: Border.radius.small,
    },
    statusText: {
        fontSize: normalizeFont(12),
        color: '#FFFFFF',
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
    },
    roleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(12),
    },
    roleLabel: {
        fontSize: normalizeFont(14),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginRight: normalize(8),
    },
    roleValue: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: Color.blue2,
        fontFamily: FontFamily.sFProDisplay,
    },
    districtsContainer: {
        marginBottom: normalize(12),
    },
    sectionLabel: {
        fontSize: normalizeFont(14),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(8),
    },
    districtChips: {
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
        fontSize: normalizeFont(12),
        color: '#FFFFFF',
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
    },
    infoSection: {
        marginBottom: normalize(12),
    },
    infoLabel: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(4),
    },
    infoText: {
        fontSize: normalizeFont(14),
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        lineHeight: normalize(20),
    },
    dateText: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(8),
    },
    rejectionSection: {
        backgroundColor: '#FFF0F0',
        padding: normalize(12),
        borderRadius: Border.radius.small,
        marginTop: normalize(8),
    },
    rejectionLabel: {
        fontSize: normalizeFont(12),
        color: Color.red,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(4),
    },
    rejectionText: {
        fontSize: normalizeFont(14),
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: normalize(8),
        marginTop: normalize(12),
    },
    actionButton: {
        flex: 1,
        paddingVertical: normalize(10),
        borderRadius: Border.radius.medium,
        alignItems: 'center',
    },
    approveButton: {
        backgroundColor: Color.green,
    },
    rejectButton: {
        backgroundColor: Color.red,
    },
    actionButtonText: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: '#FFFFFF',
        fontFamily: FontFamily.sFProDisplay,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: normalizeFont(14),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(8),
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: normalize(40),
    },
    emptyTitle: {
        fontSize: normalizeFont(18),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProDisplay,
        marginTop: normalize(16),
    },
    emptySubtitle: {
        fontSize: normalizeFont(14),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginTop: normalize(8),
        paddingHorizontal: normalize(20),
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(20),
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: Border.radius.large,
        padding: normalize(20),
        width: '100%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: normalizeFont(20),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProDisplay,
        marginBottom: normalize(8),
    },
    modalSubtitle: {
        fontSize: normalizeFont(16),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(8),
    },
    modalRole: {
        fontSize: normalizeFont(14),
        color: Color.blue2,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(8),
    },
    modalNote: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        fontStyle: 'italic',
        marginBottom: normalize(20),
        backgroundColor: '#F5F5F5',
        padding: normalize(8),
        borderRadius: Border.radius.small,
    },
    inputContainer: {
        marginBottom: normalize(16),
    },
    inputLabel: {
        fontSize: normalizeFont(14),
        fontWeight: '500',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(8),
    },
    textInput: {
        borderWidth: 1,
        borderColor: Color.border,
        borderRadius: Border.radius.medium,
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(10),
        fontSize: normalizeFont(14),
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    textArea: {
        minHeight: normalize(80),
        textAlignVertical: 'top',
    },
    selectButton: {
        borderWidth: 1,
        borderColor: Color.border,
        borderRadius: Border.radius.medium,
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(12),
    },
    selectButtonText: {
        fontSize: normalizeFont(14),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    selectButtonTextSelected: {
        fontSize: normalizeFont(14),
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: normalize(12),
        marginTop: normalize(20),
    },
    selectItem: {
        paddingVertical: normalize(12),
        paddingHorizontal: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: Color.border,
    },
    selectItemSelected: {
        backgroundColor: '#F0F8FF',
    },
    selectItemText: {
        fontSize: normalizeFont(14),
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    selectItemSubtext: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(4),
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(12),
    },
    checkbox: {
        width: normalize(20),
        height: normalize(20),
        borderWidth: 2,
        borderColor: Color.border,
        borderRadius: Border.radius.small,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: Color.blue2,
        borderColor: Color.blue2,
    },
    checkmark: {
        fontSize: normalizeFont(14),
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
});

export default StaffApplicationsScreen;

