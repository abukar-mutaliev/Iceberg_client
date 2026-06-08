import React, { useMemo, useState, useEffect, useCallback } from 'react';
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
    ScrollView,
    StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import { AdminHeader } from '@widgets/admin/AdminHeader';
import { SearchBar } from '@shared/ui/SearchBar';
import IconUser from '@shared/ui/Icon/Profile/IconPersona';
import { useCustomAlert } from '@shared/ui/CustomAlert';
import { adminApi } from '@entities/admin/api/adminApi';
import { districtApi } from '@entities/district/api/districtApi';
import CustomButton from '@shared/ui/Button/CustomButton';
import { ProcessingRoleAssignment } from '@entities/admin/ui/ProcessingRoleAssignment';
import {
    PROCESSING_ROLES,
    PROCESSING_ROLE_LABELS,
    PROCESSING_ROLE_DESCRIPTIONS
} from '@entities/admin/lib/constants';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const STATUS_LABELS = {
    PENDING: 'На рассмотрении',
    APPROVED: 'Одобрена',
    REJECTED: 'Отклонена'
};

const ROLE_LABELS = {
    EMPLOYEE: 'Сотрудник',
    DRIVER: 'Водитель',
    SUPPLIER: 'Поставщик'
};

const EMPLOYEE_PROCESSING_ROLE_OPTIONS = Object.values(PROCESSING_ROLES).map((value) => ({
    value,
    label: PROCESSING_ROLE_LABELS[value] || value,
    description: PROCESSING_ROLE_DESCRIPTIONS[value] || ''
}));

export const StaffApplicationsScreen = () => {
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const inputThemeProps = useMemo(() => ({
        placeholderTextColor: colors.textTertiary,
        keyboardAppearance: colors.keyboardAppearance
    }), [colors]);
    const { showError, showSuccess } = useCustomAlert();
    
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
    const [selectedProcessingRole, setSelectedProcessingRole] = useState(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [selectedWarehouses, setSelectedWarehouses] = useState([]);
    const [selectedDistricts, setSelectedDistricts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Модальное окно отклонения
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    
    // Модальные окна для выбора
    const [processingRoleSelectVisible, setProcessingRoleSelectVisible] = useState(false);
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
            const phoneMatch = (app.user?.phone || app.user?.client?.phone || '')
                .toLowerCase()
                .includes(searchLower);
            
            return nameMatch || emailMatch || phoneMatch;
        });

        setFilteredApplications(filtered);
    };

    const getClientInfo = useCallback((application) => {
        const user = application?.user || {};
        const client = user.client || {};
        const profile = user.profile || {};

        return {
            id: user.id,
            name: client.name || profile.name || user.name || 'Пользователь',
            phone: user.phone || client.phone || profile.phone || 'Телефон не указан',
            email: user.email || 'Email не указан',
            address: client.address || profile.address || user.address || '',
        };
    }, []);

    const handleOpenUserProfile = useCallback((application) => {
        const userId = application?.user?.id;
        if (!userId) {
            showError('Ошибка', 'Не удалось открыть профиль: пользователь не указан');
            return;
        }

        navigation.navigate('UserPublicProfile', {
            userId,
            fromScreen: 'StaffApplications',
        });
    }, [navigation, showError]);

    const handleOpenApprove = (application) => {
        setSelectedApplication(application);
        setSelectedProcessingRole(null);
        setSelectedWarehouse(null);
        setSelectedWarehouses([]);
        // Устанавливаем районы из заявки, если они есть
        setSelectedDistricts(application.districts || []);
        setProcessingRoleSelectVisible(false);
        setApproveModalVisible(true);
    };

    const handleOpenReject = (application) => {
        setSelectedApplication(application);
        setRejectionReason('');
        setRejectModalVisible(true);
    };

    const loadApprovedEmployeeId = async (userId) => {
        const userRes = await adminApi.getUserById(userId);
        const user = userRes?.data?.data?.user
            || userRes?.data?.user
            || userRes?.user
            || userRes?.data;

        return user?.employee?.id || user?.profile?.id || null;
    };

    const handleApprove = async () => {
        const requestData = {};

        if (selectedApplication.desiredRole === 'EMPLOYEE') {
            if (!selectedProcessingRole) {
                showError('Ошибка', 'Необходимо выбрать должность сотрудника');
                return;
            }
            if (selectedWarehouses.length === 0) {
                showError('Ошибка', 'Необходимо выбрать хотя бы один склад работы');
                return;
            }
            if (selectedDistricts.length === 0) {
                showError('Ошибка', 'Необходимо выбрать хотя бы один район обслуживания');
                return;
            }
            requestData.warehouseIds = selectedWarehouses.map(warehouse => warehouse.id);
            requestData.districts = selectedDistricts.map(d => d.id);
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

            if (selectedApplication.desiredRole === 'EMPLOYEE' && selectedProcessingRole) {
                try {
                    const employeeId = await loadApprovedEmployeeId(selectedApplication.user?.id);

                    if (!employeeId) {
                        throw new Error('Не удалось получить ID сотрудника после одобрения заявки');
                    }

                    await adminApi.assignProcessingRole(employeeId, selectedProcessingRole);
                } catch (roleError) {
                    console.error('Ошибка назначения должности после одобрения заявки:', roleError);
                    showError(
                        'Заявка одобрена частично',
                        'Сотрудник создан, но должность не была назначена. Ее можно назначить позже в разделе "Должности сотрудников".'
                    );
                }
            }
            
            showSuccess(
                'Заявка одобрена!',
                `Пользователь ${selectedApplication.user?.client?.name} теперь ${ROLE_LABELS[selectedApplication.desiredRole]}`
            );
            
            setApproveModalVisible(false);
            setProcessingRoleSelectVisible(false);
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

    const toggleWarehouseSelection = (warehouse) => {
        setSelectedWarehouses(prev => {
            const isSelected = prev.some(item => item.id === warehouse.id);
            return isSelected
                ? prev.filter(item => item.id !== warehouse.id)
                : [...prev, warehouse];
        });
    };

    const handleToggleAllWarehouses = () => {
        setSelectedWarehouses(prev => (
            prev.length === warehouses.length ? [] : warehouses
        ));
    };

    const getSelectedWarehousesLabel = () => {
        if (selectedWarehouses.length === 0) return 'Выберите склады';
        if (selectedWarehouses.length === warehouses.length) return 'Все склады';
        if (selectedWarehouses.length === 1) return selectedWarehouses[0].name;
        return `Выбрано: ${selectedWarehouses.length}`;
    };

    const selectedProcessingRoleOption = EMPLOYEE_PROCESSING_ROLE_OPTIONS.find(
        (role) => role.value === selectedProcessingRole
    );

    const getStatusColor = useCallback((status) => {
        if (status === 'APPROVED') return colors.success;
        if (status === 'REJECTED') return colors.error;
        return colors.warning;
    }, [colors]);

    // Рендер карточки заявки
    const renderApplicationCard = ({ item }) => {
        const isPending = item.status === 'PENDING';
        const clientInfo = getClientInfo(item);
        
        console.log('🎴 Рендер карточки заявки:', {
            id: item.id,
            status: item.status,
            hasDistricts: !!item.districts,
            districtsType: typeof item.districts,
            districtsLength: item.districts?.length,
            districtsValue: item.districts
        });

        return (
            <TouchableOpacity
                style={styles.applicationCard}
                activeOpacity={0.85}
                onPress={() => handleOpenUserProfile(item)}
            >
                {/* Заголовок карточки */}
                <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>
                            {clientInfo.name}
                        </Text>
                        <Text style={styles.userEmail}>{clientInfo.email}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>
                            {STATUS_LABELS[item.status]}
                        </Text>
                    </View>
                </View>

                <View style={styles.clientDetails}>
                    <View style={styles.clientDetailRow}>
                        <Text style={styles.clientDetailLabel}>Имя:</Text>
                        <Text style={styles.clientDetailValue}>{clientInfo.name}</Text>
                    </View>
                    <View style={styles.clientDetailRow}>
                        <Text style={styles.clientDetailLabel}>Телефон:</Text>
                        <Text style={styles.clientDetailValue}>{clientInfo.phone}</Text>
                    </View>
                    <View style={styles.clientDetailRow}>
                        <Text style={styles.clientDetailLabel}>Email:</Text>
                        <Text style={styles.clientDetailValue}>{clientInfo.email}</Text>
                    </View>
                    {clientInfo.address ? (
                        <View style={styles.clientDetailRow}>
                            <Text style={styles.clientDetailLabel}>Адрес:</Text>
                            <Text style={styles.clientDetailValue}>{clientInfo.address}</Text>
                        </View>
                    ) : null}
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
            </TouchableOpacity>
        );
    };

    // Рендер пустого списка
    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <IconUser width={48} height={48} color={colors.textSecondary} />
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
                                    <Text style={styles.inputLabel}>Должность *</Text>
                                    <TouchableOpacity
                                        style={styles.selectButton}
                                        onPress={() => setProcessingRoleSelectVisible(true)}
                                    >
                                        <Text style={selectedProcessingRole ? styles.selectButtonTextSelected : styles.selectButtonText}>
                                            {selectedProcessingRoleOption?.label || 'Выберите должность'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Склады работы *</Text>
                                    <TouchableOpacity
                                        style={styles.selectButton}
                                        onPress={() => setWarehouseSelectVisible(true)}
                                    >
                                        <Text style={selectedWarehouses.length > 0 ? styles.selectButtonTextSelected : styles.selectButtonText}>
                                            {getSelectedWarehousesLabel()}
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
                                color={colors.textSecondary}
                                disabled={isSubmitting}
                                style={{ flex: 1 }}
                            />
                            <CustomButton
                                title={isSubmitting ? 'Обработка...' : 'Одобрить'}
                                onPress={handleApprove}
                                color={colors.success}
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
                            {...inputThemeProps}
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
                            color={colors.textSecondary}
                            disabled={isSubmitting}
                            style={{ flex: 1 }}
                        />
                        <CustomButton
                            title={isSubmitting ? 'Обработка...' : 'Отклонить'}
                            onPress={handleReject}
                            color={colors.error}
                            disabled={isSubmitting}
                            style={{ flex: 1 }}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Модальное окно выбора склада
    const renderWarehouseSelectModal = () => {
        const isEmployeeSelection = selectedApplication?.desiredRole === 'EMPLOYEE';
        const allWarehousesSelected = warehouses.length > 0 && selectedWarehouses.length === warehouses.length;

        return (
        <Modal
            visible={warehouseSelectVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setWarehouseSelectVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>
                        {isEmployeeSelection ? 'Выберите склады' : 'Выберите склад'}
                    </Text>
                    {isEmployeeSelection && (
                        <TouchableOpacity
                            style={[styles.selectItem, allWarehousesSelected && styles.selectItemSelected]}
                            onPress={handleToggleAllWarehouses}
                        >
                            <View style={styles.checkboxContainer}>
                                <View style={[styles.checkbox, allWarehousesSelected && styles.checkboxChecked]}>
                                    {allWarehousesSelected && <Text style={styles.checkmark}>✓</Text>}
                                </View>
                                <Text style={styles.selectItemText}>
                                    {allWarehousesSelected ? 'Снять все склады' : 'Выбрать все склады'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    <FlatList
                        data={warehouses}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => {
                            const isSelected = isEmployeeSelection
                                ? selectedWarehouses.some(warehouse => warehouse.id === item.id)
                                : selectedWarehouse?.id === item.id;

                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.selectItem,
                                        isSelected && styles.selectItemSelected
                                    ]}
                                    onPress={() => {
                                        if (isEmployeeSelection) {
                                            toggleWarehouseSelection(item);
                                        } else {
                                            setSelectedWarehouse(item);
                                            setWarehouseSelectVisible(false);
                                        }
                                    }}
                                >
                                    {isEmployeeSelection ? (
                                        <View style={styles.checkboxContainer}>
                                            <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                                                {isSelected && <Text style={styles.checkmark}>✓</Text>}
                                            </View>
                                            <View style={styles.selectItemInfo}>
                                                <Text style={styles.selectItemText}>{item.name}</Text>
                                                <Text style={styles.selectItemSubtext}>{item.address}</Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <>
                                            <Text style={styles.selectItemText}>{item.name}</Text>
                                            <Text style={styles.selectItemSubtext}>{item.address}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                    <CustomButton
                        title={isEmployeeSelection ? 'Готово' : 'Закрыть'}
                        onPress={() => setWarehouseSelectVisible(false)}
                        outlined={!isEmployeeSelection}
                        color={isEmployeeSelection ? colors.primary : colors.textSecondary}
                    />
                </View>
            </View>
        </Modal>
        );
    };

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
                        color={colors.primary}
                    />
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
            <AdminHeader
                title="Заявки на присоединение"
                icon={<IconUser width={24} height={24} color={colors.primary} />}
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
                    <Text style={[styles.statValue, { color: colors.warning }]}>{statistics.pending || 0}</Text>
                    <Text style={styles.statLabel}>Ожидают</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.success }]}>{statistics.approved || 0}</Text>
                    <Text style={styles.statLabel}>Одобрено</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.error }]}>{statistics.rejected || 0}</Text>
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
                    <ActivityIndicator size="large" color={colors.primary} />
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
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                            progressBackgroundColor={colors.surface}
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
            <ProcessingRoleAssignment
                employee={selectedApplication ? {
                    id: selectedApplication.id,
                    name: selectedApplication.user?.client?.name || 'Пользователь',
                    email: selectedApplication.user?.email || ''
                } : null}
                onAssign={(_, processingRole) => {
                    setSelectedProcessingRole(processingRole);
                    setProcessingRoleSelectVisible(false);
                }}
                onCancel={() => setProcessingRoleSelectVisible(false)}
                visible={processingRoleSelectVisible}
                loading={isSubmitting}
                roleOptions={EMPLOYEE_PROCESSING_ROLE_OPTIONS}
            />
        </SafeAreaView>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: normalize(16),
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: normalizeFont(24),
        fontWeight: 'bold',
        color: colors.primary,
        fontFamily: FontFamily.sFProDisplay,
    },
    statLabel: {
        fontSize: normalizeFont(12),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(4),
    },
    filtersContainer: {
        flexDirection: 'row',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(12),
        backgroundColor: colors.surface,
        gap: normalize(8),
    },
    filterButton: {
        flex: 1,
        paddingVertical: normalize(8),
        paddingHorizontal: normalize(12),
        borderRadius: Border.radius.small,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    filterButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterButtonText: {
        fontSize: normalizeFont(12),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    filterButtonTextActive: {
        color: colors.textInverse,
    },
    listContainer: {
        paddingHorizontal: normalize(20),
        paddingBottom: normalize(20),
    },
    applicationCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: Border.radius.medium,
        padding: normalize(16),
        marginVertical: normalize(8),
        borderWidth: isDark ? 1 : 0,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.25 : Shadow.light.shadowOpacity,
        shadowRadius: isDark ? 6 : Shadow.light.shadowRadius,
        elevation: isDark ? 2 : Shadow.light.elevation,
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
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProDisplay,
        marginBottom: normalize(4),
    },
    userEmail: {
        fontSize: normalizeFont(14),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    clientDetails: {
        backgroundColor: colors.surfaceSecondary,
        borderRadius: Border.radius.small,
        padding: normalize(12),
        marginBottom: normalize(12),
        borderWidth: isDark ? 1 : 0,
        borderColor: colors.border,
    },
    clientDetailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: normalize(6),
    },
    clientDetailLabel: {
        width: normalize(74),
        fontSize: normalizeFont(12),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    clientDetailValue: {
        flex: 1,
        fontSize: normalizeFont(13),
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        lineHeight: normalize(18),
    },
    statusBadge: {
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(6),
        borderRadius: Border.radius.small,
    },
    statusText: {
        fontSize: normalizeFont(12),
        color: colors.textInverse,
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
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginRight: normalize(8),
    },
    roleValue: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: colors.primary,
        fontFamily: FontFamily.sFProDisplay,
    },
    districtsContainer: {
        marginBottom: normalize(12),
    },
    sectionLabel: {
        fontSize: normalizeFont(14),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(8),
    },
    districtChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: normalize(8),
    },
    districtChip: {
        backgroundColor: colors.primary,
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(4),
        borderRadius: Border.radius.small,
    },
    districtChipText: {
        fontSize: normalizeFont(12),
        color: colors.textInverse,
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
    },
    infoSection: {
        marginBottom: normalize(12),
    },
    infoLabel: {
        fontSize: normalizeFont(12),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(4),
    },
    infoText: {
        fontSize: normalizeFont(14),
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        lineHeight: normalize(20),
    },
    dateText: {
        fontSize: normalizeFont(12),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(8),
    },
    rejectionSection: {
        backgroundColor: colors.errorSubtle,
        padding: normalize(12),
        borderRadius: Border.radius.small,
        marginTop: normalize(8),
        borderWidth: 1,
        borderColor: colors.errorBorder,
    },
    rejectionLabel: {
        fontSize: normalizeFont(12),
        color: colors.error,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(4),
    },
    rejectionText: {
        fontSize: normalizeFont(14),
        color: colors.textPrimary,
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
        backgroundColor: colors.success,
    },
    rejectButton: {
        backgroundColor: colors.error,
    },
    actionButtonText: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: colors.textInverse,
        fontFamily: FontFamily.sFProDisplay,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: normalizeFont(14),
        color: colors.textSecondary,
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
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProDisplay,
        marginTop: normalize(16),
    },
    emptySubtitle: {
        fontSize: normalizeFont(14),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginTop: normalize(8),
        paddingHorizontal: normalize(20),
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.modalOverlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(20),
    },
    modalContainer: {
        backgroundColor: colors.cardBackground,
        borderRadius: Border.radius.large,
        padding: normalize(20),
        width: '100%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: normalizeFont(20),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProDisplay,
        marginBottom: normalize(8),
    },
    modalSubtitle: {
        fontSize: normalizeFont(16),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(8),
    },
    modalRole: {
        fontSize: normalizeFont(14),
        color: colors.primary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(8),
    },
    modalNote: {
        fontSize: normalizeFont(12),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        fontStyle: 'italic',
        marginBottom: normalize(20),
        backgroundColor: colors.surfaceSecondary,
        padding: normalize(8),
        borderRadius: Border.radius.small,
    },
    inputContainer: {
        marginBottom: normalize(16),
    },
    inputLabel: {
        fontSize: normalizeFont(14),
        fontWeight: '500',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(8),
    },
    textInput: {
        borderWidth: 1,
        borderColor: colors.inputBorder,
        borderRadius: Border.radius.medium,
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(10),
        fontSize: normalizeFont(14),
        color: colors.textPrimary,
        backgroundColor: colors.inputBackground,
        fontFamily: FontFamily.sFProText,
    },
    textArea: {
        minHeight: normalize(80),
        textAlignVertical: 'top',
    },
    selectButton: {
        borderWidth: 1,
        borderColor: colors.inputBorder,
        backgroundColor: colors.inputBackground,
        borderRadius: Border.radius.medium,
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(12),
    },
    selectButtonText: {
        fontSize: normalizeFont(14),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    selectButtonTextSelected: {
        fontSize: normalizeFont(14),
        color: colors.textPrimary,
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
        borderBottomColor: colors.border,
    },
    selectItemSelected: {
        backgroundColor: colors.surfaceSecondary,
    },
    selectItemText: {
        fontSize: normalizeFont(14),
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
    },
    selectItemInfo: {
        flex: 1,
    },
    selectItemSubtext: {
        fontSize: normalizeFont(12),
        color: colors.textSecondary,
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
        borderColor: colors.border,
        borderRadius: Border.radius.small,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    checkmark: {
        fontSize: normalizeFont(14),
        color: colors.textInverse,
        fontWeight: 'bold',
    },
});

export default StaffApplicationsScreen;

