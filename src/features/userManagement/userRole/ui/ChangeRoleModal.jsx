import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, FlatList, Animated, ScrollView, KeyboardAvoidingView, Platform, Dimensions, Keyboard } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import CustomButton from '@shared/ui/Button/CustomButton';
import { USER_ROLES_DISPLAY } from '@entities/user/model/constants';
import { WarehousePicker } from '@shared/ui/Pickers/WarehousePicker';
import { MultiDistrictPicker } from '@shared/ui/Pickers/MultiDistrictPicker';
import { useAdmin } from '@entities/admin';
import { useDistrict } from '@entities/district';
import { useWarehouses } from '@entities/warehouse/hooks/useWarehouses';
import { PROCESSING_ROLES, PROCESSING_ROLE_LABELS } from '@entities/admin/lib/constants';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Компонент для выбора должности (processing role)
const ProcessingRolePicker = ({
    processingRoles,
    processingRoleLabels,
    selectedProcessingRole,
    setSelectedProcessingRole,
    showProcessingRolePicker,
    setShowProcessingRolePicker
}) => {
    const [searchText, setSearchText] = useState('');
    const [filteredRoles, setFilteredRoles] = useState(processingRoles);
    const [modalVisible, setModalVisible] = useState(false);
    const slideAnimation = useRef(new Animated.Value(0)).current;

    // Handle modal visibility with animation
    useEffect(() => {
        if (showProcessingRolePicker) {
            setModalVisible(true);
            Animated.timing(slideAnimation, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true
            }).start();
        } else {
            Animated.timing(slideAnimation, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true
            }).start(() => {
                setModalVisible(false);
            });
        }
    }, [showProcessingRolePicker]);

    // Calculate animation values
    const translateY = slideAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0]
    });

    // Обновление списка должностей при изменении поиска
    useEffect(() => {
        if (!searchText) {
            setFilteredRoles(processingRoles);
            return;
        }

        const filtered = processingRoles.filter(role =>
            processingRoleLabels[role]?.toLowerCase().includes(searchText.toLowerCase())
        );
        setFilteredRoles(filtered);
    }, [searchText, processingRoles, processingRoleLabels]);

    // Найти название выбранной должности
    const selectedRoleName = React.useMemo(() => {
        if (!selectedProcessingRole) return 'Выберите должность (необязательно)';
        return processingRoleLabels[selectedProcessingRole] || 'Выберите должность (необязательно)';
    }, [selectedProcessingRole, processingRoleLabels]);

    // Обработчик выбора должности
    const handleSelect = (role) => {
        const newRole = role === selectedProcessingRole ? null : role;
        console.log('[ProcessingRolePicker] Выбор должности:', { 
            currentRole: selectedProcessingRole, 
            selectedRole: role, 
            newRole 
        });
        setSelectedProcessingRole(newRole);
        setShowProcessingRolePicker(false);
        setSearchText('');
    };

    // Обработчик очистки выбора
    const handleClear = () => {
        setSelectedProcessingRole(null);
        setShowProcessingRolePicker(false);
        setSearchText('');
    };

    return (
        <View style={pickerStyles.container}>
            <Text style={pickerStyles.label}>Должность (необязательно):</Text>
            <TouchableOpacity
                style={pickerStyles.pickerButton}
                onPress={() => setShowProcessingRolePicker(true)}
            >
                <Text style={[
                    pickerStyles.pickerButtonText,
                    selectedProcessingRole ? pickerStyles.selectedText : null
                ]}>
                    {selectedRoleName}
                </Text>
            </TouchableOpacity>
            {selectedProcessingRole && (
                <TouchableOpacity
                    style={pickerStyles.clearButton}
                    onPress={handleClear}
                >
                    <Text style={pickerStyles.clearButtonText}>Очистить</Text>
                </TouchableOpacity>
            )}
            <View style={pickerStyles.inputUnderline} />

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="none"
                onRequestClose={() => setShowProcessingRolePicker(false)}
            >
                <Animated.View
                    style={[
                        pickerStyles.modalBackdrop,
                        {
                            opacity: slideAnimation
                        }
                    ]}
                >
                    <TouchableOpacity
                        style={pickerStyles.backdropTouchable}
                        activeOpacity={1}
                        onPress={() => setShowProcessingRolePicker(false)}
                    />

                    <Animated.View
                        style={[
                            pickerStyles.modalContent,
                            {
                                transform: [{ translateY: translateY }]
                            }
                        ]}
                    >
                        <View style={pickerStyles.header}>
                            <Text style={pickerStyles.modalTitle}>Выберите должность</Text>
                            <TouchableOpacity
                                style={pickerStyles.closeButton}
                                onPress={() => setShowProcessingRolePicker(false)}
                            >
                                <Text style={pickerStyles.closeButtonText}>Закрыть</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={pickerStyles.searchContainer}>
                            <TextInput
                                style={pickerStyles.searchInput}
                                placeholder="Поиск должности..."
                                value={searchText}
                                onChangeText={setSearchText}
                                placeholderTextColor="#999"
                            />
                        </View>

                        <FlatList
                            data={filteredRoles}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        pickerStyles.roleItem,
                                        selectedProcessingRole === item && pickerStyles.selectedItem
                                    ]}
                                    onPress={() => handleSelect(item)}
                                >
                                    <Text style={[
                                        pickerStyles.roleName,
                                        selectedProcessingRole === item && pickerStyles.selectedItemText
                                    ]}>
                                        {processingRoleLabels[item]}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={() => (
                                <View style={pickerStyles.emptyContainer}>
                                    <Text style={pickerStyles.emptyText}>
                                        {searchText ? 'Должности не найдены' : 'Список должностей пуст'}
                                    </Text>
                                </View>
                            )}
                        />
                    </Animated.View>
                </Animated.View>
            </Modal>
        </View>
    );
};

const pickerStyles = StyleSheet.create({
    container: {
        marginBottom: normalize(20),
        width: '100%',
    },
    label: {
        fontSize: normalizeFont(15),
        fontWeight: '600',
        color: Color.dark,
        opacity: 0.4,
        marginBottom: 0,
        fontFamily: FontFamily.sFProText,
    },
    pickerButton: {
        height: normalize(30),
        justifyContent: 'center',
    },
    pickerButtonText: {
        fontSize: normalizeFont(FontSize.size_xs),
        color: '#999',
        fontFamily: FontFamily.sFProText,
    },
    selectedText: {
        color: Color.dark,
    },
    clearButton: {
        marginTop: normalize(5),
        alignSelf: 'flex-start',
    },
    clearButtonText: {
        fontSize: normalizeFont(FontSize.size_xs),
        color: Color.main,
        fontFamily: FontFamily.sFProText,
    },
    inputUnderline: {
        height: 1,
        backgroundColor: '#000',
        marginTop: 0,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    backdropTouchable: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContent: {
        width: '100%',
        maxHeight: '80%',
        backgroundColor: 'white',
        borderTopLeftRadius: Border.br_3xs,
        borderTopRightRadius: Border.br_3xs,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: normalizeFont(18),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    closeButton: {
        padding: normalize(5),
    },
    closeButtonText: {
        color: Color.main,
        fontSize: normalizeFont(16),
        fontFamily: FontFamily.sFProText,
    },
    searchContainer: {
        padding: normalize(10),
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    searchInput: {
        height: normalize(50),
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: Border.br_3xs,
        paddingHorizontal: normalize(10),
        fontFamily: FontFamily.sFProText,
    },
    roleItem: {
        padding: normalize(15),
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    selectedItem: {
        backgroundColor: Color.main,
    },
    roleName: {
        fontSize: normalizeFont(16),
        fontWeight: '500',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    selectedItemText: {
        color: 'white',
    },
    emptyContainer: {
        padding: normalize(20),
        alignItems: 'center',
    },
    emptyText: {
        fontSize: normalizeFont(16),
        color: '#999',
        fontFamily: FontFamily.sFProText,
    },
});

export const ChangeRoleModal = ({ visible, user, onClose, onSubmit }) => {
    const [selectedRole, setSelectedRole] = useState('');
    const [userData, setUserData] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const scrollViewRef = useRef(null);
    
    // Состояние для выбора склада, районов и должности для сотрудника
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [showWarehousePicker, setShowWarehousePicker] = useState(false);
    const [selectedEmployeeDistricts, setSelectedEmployeeDistricts] = useState([]);
    const [showEmployeeDistrictPicker, setShowEmployeeDistrictPicker] = useState(false);
    const [selectedProcessingRole, setSelectedProcessingRole] = useState(null);
    const [showProcessingRolePicker, setShowProcessingRolePicker] = useState(false);

    // Состояние для выбора склада и районов для водителя
    const [selectedDriverWarehouse, setSelectedDriverWarehouse] = useState(null);
    const [showDriverWarehousePicker, setShowDriverWarehousePicker] = useState(false);
    const [selectedDriverDistricts, setSelectedDriverDistricts] = useState([]);
    const [showDriverDistrictPicker, setShowDriverDistrictPicker] = useState(false);

    // Хуки для загрузки данных
    const { warehouses, loadWarehouses } = useAdmin();
    const { districts, loadDistricts } = useDistrict();
    const {
        warehouses: allWarehouses,
        loading: allWarehousesLoading,
        loadWarehouses: loadAllWarehouses
    } = useWarehouses({ autoLoad: false });

    const warehouseOptions = (warehouses.items && warehouses.items.length > 0)
        ? warehouses.items
        : allWarehouses;
    const warehousesLoading = warehouses.isLoading || allWarehousesLoading;

    // Загрузка данных при открытии модального окна
    useEffect(() => {
        if (visible) {
            loadWarehouses();
            loadDistricts();
            loadAllWarehouses(true);
        }
    }, [visible]);

    // Функция для извлечения существующих данных пользователя
    const getUserExistingData = () => {
        if (!user) return { name: '', phone: '', address: '' };
        
        // Пытаемся получить имя, телефон и адрес из разных источников в зависимости от роли
        let existingName = '';
        let existingPhone = '';
        let existingAddress = '';
        
        // Проверяем разные возможные источники данных для имени
        if (user.profile?.name) {
            existingName = user.profile.name;
        } else if (user.client?.name) {
            existingName = user.client.name;
        } else if (user.employee?.name) {
            existingName = user.employee.name;
        } else if (user.admin?.name) {
            existingName = user.admin.name;
        } else if (user.driver?.name) {
            existingName = user.driver.name;
        }
        
        // Сначала проверяем телефон пользователя (из таблицы User - телефон регистрации)
        if (user.phone) {
            existingPhone = user.phone;
        } else if (user.profile?.phone) {
            existingPhone = user.profile.phone;
        } else if (user.client?.phone) {
            existingPhone = user.client.phone || '';
        } else if (user.employee?.phone) {
            // Игнорируем значение "Не указано" - это не настоящий телефон
            const employeePhone = user.employee.phone;
            existingPhone = (employeePhone && employeePhone.toLowerCase() !== 'не указано') ? employeePhone : '';
        } else if (user.admin?.phone) {
            existingPhone = user.admin.phone || '';
        } else if (user.driver?.phone) {
            existingPhone = user.driver.phone || '';
        } else if (user.supplier?.phone) {
            existingPhone = user.supplier.phone || '';
        }
        
        // Проверяем разные возможные источники данных для адреса
        if (user.profile?.address) {
            existingAddress = user.profile.address;
        } else if (user.client?.address) {
            existingAddress = user.client.address || '';
        } else if (user.employee?.address) {
            // Игнорируем значение "Не указано" - это не настоящий адрес
            const employeeAddress = user.employee.address;
            existingAddress = (employeeAddress && employeeAddress.toLowerCase() !== 'не указано') ? employeeAddress : '';
        } else if (user.admin?.address) {
            existingAddress = user.admin.address || '';
        } else if (user.driver?.address) {
            existingAddress = user.driver.address || '';
        } else if (user.supplier?.address) {
            existingAddress = user.supplier.address || '';
        }
        
        return { name: existingName, phone: existingPhone, address: existingAddress };
    };

    // При открытии модального окна сбрасываем выбранную роль и инициализируем данные
    useEffect(() => {
        if (visible && user) {
            setSelectedRole('');
            setFieldErrors({});
            const existingData = getUserExistingData();
            // Очищаем "Не указано" из телефона и адреса, чтобы поля ввода были пустыми
            if (existingData.phone && existingData.phone.toLowerCase() === 'не указано') {
                existingData.phone = '';
            }
            if (existingData.address && existingData.address.toLowerCase() === 'не указано') {
                existingData.address = '';
            }
            setUserData(existingData);
            setSelectedWarehouse(null);
            setSelectedEmployeeDistricts([]);
            
            // Инициализируем processingRole из существующих данных пользователя
            if (user.employee?.processingRole) {
                setSelectedProcessingRole(user.employee.processingRole);
            } else if (user.profile?.processingRole) {
                setSelectedProcessingRole(user.profile.processingRole);
            } else {
                setSelectedProcessingRole(null);
            }
            setSelectedDriverWarehouse(null);
            setSelectedDriverDistricts([]);
        }
    }, [visible, user]);

    // Отслеживание состояния клавиатуры
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (event) => {
                setKeyboardVisible(true);
                // Прокручиваем к концу при открытии клавиатуры
                setTimeout(() => {
                    if (scrollViewRef.current) {
                        scrollViewRef.current.scrollToEnd({ animated: true });
                    }
                }, 100);
            }
        );
        
        const keyboardDidHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
            }
        );

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    // Список ролей
    const roles = [
        { value: 'ADMIN', label: 'Администратор' },
        { value: 'CLIENT', label: 'Клиент' },
        { value: 'EMPLOYEE', label: 'Сотрудник' },
        { value: 'SUPPLIER', label: 'Поставщик' },
        { value: 'DRIVER', label: 'Водитель' }
    ].filter(role => !user || role.value !== user.role);

    // Обработчик изменения данных пользователя
    const handleUserDataChange = (key, value) => {
        setUserData(prev => ({ ...prev, [key]: value }));
        if (fieldErrors[key]) {
            setFieldErrors(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    };

    // Обработчик изменения выбранного склада
    const handleWarehouseChange = (warehouseId) => {
        setSelectedWarehouse(warehouseId);
        if (fieldErrors.warehouseId) {
            setFieldErrors(prev => {
                const next = { ...prev };
                delete next.warehouseId;
                return next;
            });
        }
    };

    // Обработчик изменения выбранных районов для сотрудника
    const handleEmployeeDistrictsChange = (districts) => {
        setSelectedEmployeeDistricts(districts);
        if (fieldErrors.employeeDistricts) {
            setFieldErrors(prev => {
                const next = { ...prev };
                delete next.employeeDistricts;
                return next;
            });
        }
    };

    // Обработчик изменения выбранного склада для водителя
    const handleDriverWarehouseChange = (warehouseId) => {
        setSelectedDriverWarehouse(warehouseId);
    };

    // Обработчик изменения выбранных районов для водителя
    const handleDriverDistrictsChange = (districts) => {
        setSelectedDriverDistricts(districts);
        if (fieldErrors.driverDistricts) {
            setFieldErrors(prev => {
                const next = { ...prev };
                delete next.driverDistricts;
                return next;
            });
        }
    };

    // Отображаем дополнительные поля в зависимости от выбранной роли
    const renderRoleFields = () => {
        const hasExistingName = !!userData.name;
        // Проверяем наличие телефона: проверяем только user.phone (телефон регистрации)
        // Если у пользователя нет зарегистрированного телефона, поле ввода должно показываться
        // и не скрываться при редактировании, даже если userData.phone становится пустым
        const userPhone = user?.phone ? String(user.phone).trim() : null;
        const isValidPhone = (phone) => phone && phone.length > 0 && phone.toLowerCase() !== 'не указано';
        // Проверяем только user.phone - если его нет, поле должно показываться всегда
        const hasExistingPhone = isValidPhone(userPhone);
        
        if (__DEV__) {
            console.log('[ChangeRoleModal] Phone check:', {
                userPhoneRaw: user?.phone,
                userPhone,
                hasExistingPhone,
                showPhoneField: !hasExistingPhone,
                selectedRole,
                userDataPhone: userData?.phone
            });
        }
        
        switch (selectedRole) {
            case 'ADMIN':
                return (
                    <>
                        {!hasExistingPhone && (
                            <>
                                <Text style={styles.modalLabel}>Телефон:</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={userData.phone || ''}
                                    onChangeText={(text) => handleUserDataChange('phone', text)}
                                    placeholder="Введите телефон (необязательно)"
                                    keyboardType="phone-pad"
                                />
                                {fieldErrors.phone && <Text style={styles.fieldError}>{fieldErrors.phone}</Text>}
                            </>
                        )}
                    </>
                );
            case 'CLIENT':
                return (
                    <>
                        {!hasExistingName && (
                            <>
                                <Text style={styles.modalLabel}>Имя клиента:</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={userData.name || ''}
                                    onChangeText={(text) => handleUserDataChange('name', text)}
                                    placeholder="Введите имя клиента"
                                />
                                {fieldErrors.name && <Text style={styles.fieldError}>{fieldErrors.name}</Text>}
                            </>
                        )}
                        {!hasExistingPhone && (
                            <>
                                <Text style={styles.modalLabel}>Телефон:</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={userData.phone || ''}
                                    onChangeText={(text) => handleUserDataChange('phone', text)}
                                    placeholder="Введите телефон (необязательно)"
                                    keyboardType="phone-pad"
                                />
                                {fieldErrors.phone && <Text style={styles.fieldError}>{fieldErrors.phone}</Text>}
                            </>
                        )}
                    </>
                );
            case 'EMPLOYEE':
                return (
                    <>
                        {!hasExistingPhone && (
                            <>
                                <Text style={styles.modalLabel}>Телефон:</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={userData.phone || ''}
                                    onChangeText={(text) => handleUserDataChange('phone', text)}
                                    placeholder="Введите телефон (необязательно)"
                                    keyboardType="phone-pad"
                                />
                                {fieldErrors.phone && <Text style={styles.fieldError}>{fieldErrors.phone}</Text>}
                            </>
                        )}

                        <Text style={styles.modalLabel}>Адрес:</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={userData.address || ''}
                            onChangeText={(text) => handleUserDataChange('address', text)}
                            placeholder="Введите адрес (необязательно)"
                        />
                        {fieldErrors.address && <Text style={styles.fieldError}>{fieldErrors.address}</Text>}

                        {/* Компонент выбора склада для сотрудника */}
                        <WarehousePicker
                            warehouses={warehouseOptions || []}
                            selectedWarehouse={selectedWarehouse}
                            setSelectedWarehouse={handleWarehouseChange}
                            showWarehousePicker={showWarehousePicker}
                            setShowWarehousePicker={setShowWarehousePicker}
                            error={null}
                            disabled={warehousesLoading}
                        />
                        {fieldErrors.warehouseId && <Text style={styles.fieldError}>{fieldErrors.warehouseId}</Text>}

                        {/* Компонент выбора районов для сотрудника */}
                        <MultiDistrictPicker
                            districts={districts || []}
                            selectedDistricts={selectedEmployeeDistricts}
                            setSelectedDistricts={handleEmployeeDistrictsChange}
                            showDistrictPicker={showEmployeeDistrictPicker}
                            setShowDistrictPicker={setShowEmployeeDistrictPicker}
                            error={null}
                            disabled={false}
                        />
                        {fieldErrors.employeeDistricts && <Text style={styles.fieldError}>{fieldErrors.employeeDistricts}</Text>}

                        {/* Выбор должности для сотрудника */}
                        <ProcessingRolePicker
                            processingRoles={Object.values(PROCESSING_ROLES)}
                            processingRoleLabels={PROCESSING_ROLE_LABELS}
                            selectedProcessingRole={selectedProcessingRole}
                            setSelectedProcessingRole={setSelectedProcessingRole}
                            showProcessingRolePicker={showProcessingRolePicker}
                            setShowProcessingRolePicker={setShowProcessingRolePicker}
                        />
                    </>
                );
            case 'SUPPLIER':
                return (
                    <>
                        <Text style={styles.modalLabel}>Название компании:</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={userData.companyName || ''}
                            onChangeText={(text) => handleUserDataChange('companyName', text)}
                            placeholder="Введите название компании"
                        />
                        {fieldErrors.companyName && <Text style={styles.fieldError}>{fieldErrors.companyName}</Text>}
                        <Text style={styles.modalLabel}>Контактное лицо:</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={userData.contactPerson || ''}
                            onChangeText={(text) => handleUserDataChange('contactPerson', text)}
                            placeholder="Введите контактное лицо"
                        />
                        {fieldErrors.contactPerson && <Text style={styles.fieldError}>{fieldErrors.contactPerson}</Text>}
                        {!hasExistingPhone && (
                            <>
                                <Text style={styles.modalLabel}>Телефон:</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={userData.phone || ''}
                                    onChangeText={(text) => handleUserDataChange('phone', text)}
                                    placeholder="Введите телефон (необязательно)"
                                    keyboardType="phone-pad"
                                />
                                {fieldErrors.phone && <Text style={styles.fieldError}>{fieldErrors.phone}</Text>}
                            </>
                        )}
                    </>
                );
            case 'DRIVER':
                return (
                    <>
                        {!hasExistingName && (
                            <>
                                <Text style={styles.modalLabel}>Имя водителя:</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={userData.name || ''}
                                    onChangeText={(text) => handleUserDataChange('name', text)}
                                    placeholder="Введите имя водителя"
                                />
                                {fieldErrors.name && <Text style={styles.fieldError}>{fieldErrors.name}</Text>}
                            </>
                        )}

                        {!hasExistingPhone && (
                            <>
                                <Text style={styles.modalLabel}>Телефон:</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={userData.phone || ''}
                                    onChangeText={(text) => handleUserDataChange('phone', text)}
                                    placeholder="Введите телефон (необязательно)"
                                    keyboardType="phone-pad"
                                />
                                {fieldErrors.phone && <Text style={styles.fieldError}>{fieldErrors.phone}</Text>}
                            </>
                        )}

                        {/* Компонент выбора склада для водителя */}
                        <WarehousePicker
                            warehouses={warehouseOptions || []}
                            selectedWarehouse={selectedDriverWarehouse}
                            setSelectedWarehouse={handleDriverWarehouseChange}
                            showWarehousePicker={showDriverWarehousePicker}
                            setShowWarehousePicker={setShowDriverWarehousePicker}
                            error={null}
                            disabled={warehousesLoading}
                        />

                        {/* Компонент выбора районов для водителя */}
                        <MultiDistrictPicker
                            districts={districts || []}
                            selectedDistricts={selectedDriverDistricts}
                            setSelectedDistricts={handleDriverDistrictsChange}
                            showDistrictPicker={showDriverDistrictPicker}
                            setShowDistrictPicker={setShowDriverDistrictPicker}
                            error={null}
                            disabled={false}
                        />
                        {fieldErrors.driverDistricts && <Text style={styles.fieldError}>{fieldErrors.driverDistricts}</Text>}
                    </>
                );
            default:
                return null;
        }
    };

    const getValidationErrors = () => {
        const errors = {};
        const trimValue = (value) => (value || '').trim();

        if (!selectedRole) {
            errors.selectedRole = 'Выберите новую роль';
            return errors;
        }

        const hasName = !!trimValue(userData.name);

        switch (selectedRole) {
            case 'ADMIN':
                if (!hasName) {
                    errors.name = 'Имя пользователя обязательно';
                } else if (trimValue(userData.name).length < 2) {
                    errors.name = 'Имя должно содержать минимум 2 символа';
                }
                break;
            case 'CLIENT':
                if (!hasName) {
                    errors.name = 'Имя клиента обязательно';
                } else if (trimValue(userData.name).length < 2) {
                    errors.name = 'Имя клиента должно содержать минимум 2 символа';
                }
                break;
            case 'DRIVER':
                if (!hasName) {
                    errors.name = 'Имя водителя обязательно';
                } else if (trimValue(userData.name).length < 2) {
                    errors.name = 'Имя водителя должно содержать минимум 2 символа';
                }
                if (selectedDriverDistricts.length === 0) {
                    errors.driverDistricts = 'Выберите минимум один район';
                }
                break;
            case 'EMPLOYEE':
                if (!selectedWarehouse) {
                    errors.warehouseId = 'Выберите склад';
                }
                if (selectedEmployeeDistricts.length === 0) {
                    errors.employeeDistricts = 'Выберите минимум один район';
                }
                break;
            case 'SUPPLIER': {
                const companyName = trimValue(userData.companyName);
                const contactPerson = trimValue(userData.contactPerson);
                if (!companyName) {
                    errors.companyName = 'Название компании обязательно';
                } else if (companyName.length < 2) {
                    errors.companyName = 'Название компании должно содержать минимум 2 символа';
                }
                if (!contactPerson) {
                    errors.contactPerson = 'Контактное лицо обязательно';
                } else if (contactPerson.length < 2) {
                    errors.contactPerson = 'Контактное лицо должно содержать минимум 2 символа';
                }
                break;
            }
            default:
                break;
        }

        return errors;
    };

    // Подготовка данных для отправки
    const prepareSubmitData = () => {
        const data = {};
        
        // Всегда передаем имя, если оно есть (из существующих данных или введенное)
        // Имя должно быть указано при регистрации, поэтому оно должно быть в userData
        if (userData.name && userData.name.trim()) {
            data.name = userData.name.trim();
        }
        
        // Всегда передаем телефон, если он есть (приоритет: user.phone - телефон регистрации)
        // Используем телефон пользователя, если он был зарегистрирован с телефоном
        const phoneToUse = user?.phone || userData.phone;
        if (phoneToUse && phoneToUse.trim()) {
            data.phone = phoneToUse.trim();
        }
        
        // Всегда передаем адрес, если он есть (из существующих данных или введенный)
        const addressToUse = userData.address;
        if (addressToUse && addressToUse.trim()) {
            data.address = addressToUse.trim();
        }
        
        if (selectedRole === 'EMPLOYEE') {
            data.warehouseId = selectedWarehouse;
            data.districts = selectedEmployeeDistricts;
            if (selectedProcessingRole) {
                data.processingRole = selectedProcessingRole;
                console.log('[ChangeRoleModal] processingRole будет передан:', selectedProcessingRole);
            } else {
                console.log('[ChangeRoleModal] processingRole НЕ выбран, selectedProcessingRole:', selectedProcessingRole);
            }
        }
        
        if (selectedRole === 'DRIVER') {
            data.warehouseId = selectedDriverWarehouse;
            data.districts = selectedDriverDistricts;
        }

        if (selectedRole === 'SUPPLIER') {
            if (userData.companyName?.trim()) {
                data.companyName = userData.companyName.trim();
            }
            if (userData.contactPerson?.trim()) {
                data.contactPerson = userData.contactPerson.trim();
            }
        }
        
        console.log('[ChangeRoleModal] prepareSubmitData результат:', { selectedRole, data, selectedProcessingRole });
        return data;
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardAvoidingView}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                    enabled={Platform.OS === 'ios'}
                >
                    <View style={[
                        styles.modalContent,
                        keyboardVisible && styles.modalContentKeyboardVisible
                    ]}>
                        <Text style={styles.modalTitle}>Изменить роль пользователя</Text>

                        <ScrollView
                            ref={scrollViewRef}
                            style={styles.scrollView}
                            contentContainerStyle={[
                                styles.scrollViewContent,
                                keyboardVisible && styles.scrollViewContentKeyboardVisible
                            ]}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="interactive"
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                            bounces={true}
                        >
                            <View style={styles.modalUserInfo}>
                                <Text style={styles.modalUserName}>{user?.email}</Text>
                                <Text style={styles.modalUserRole}>Текущая роль: {USER_ROLES_DISPLAY[user?.role] || user?.role}</Text>
                            </View>

                            <Text style={styles.modalLabel}>Выберите новую роль:</Text>
                            <View style={styles.roleButtonsContainer}>
                                {roles.map(role => (
                                    <TouchableOpacity
                                        key={role.value}
                                        style={[
                                            styles.roleButton,
                                            selectedRole === role.value && styles.roleButtonSelected
                                        ]}
                                        onPress={() => {
                                            setSelectedRole(role.value);
                                            if (fieldErrors.selectedRole) {
                                                setFieldErrors(prev => {
                                                    const next = { ...prev };
                                                    delete next.selectedRole;
                                                    return next;
                                                });
                                            }
                                        }}
                                    >
                                        <Text style={[
                                            styles.roleButtonText,
                                            selectedRole === role.value && styles.roleButtonTextSelected
                                        ]}>
                                            {role.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {fieldErrors.selectedRole && (
                                <Text style={styles.fieldError}>{fieldErrors.selectedRole}</Text>
                            )}

                            {selectedRole && (
                                <>
                                    {(userData.name || user?.phone || userData.phone) && (
                                        <View style={styles.infoContainer}>
                                            <Text style={styles.infoText}>
                                                {userData.name && `Имя: ${userData.name}`}
                                                {(userData.name && (user?.phone || userData.phone)) && '\n'}
                                                {(user?.phone || userData.phone) && `Телефон: ${user?.phone || userData.phone}`}
                                                {((user?.phone || userData.phone) && (user?.address || userData.address)) && '\n'}
                                                {(user?.address || userData.address) && `Адрес: ${user?.address || userData.address}`}
                                            </Text>
                                            <Text style={styles.infoSubtext}>
                                                Существующие данные будут сохранены
                                            </Text>
                                        </View>
                                    )}
                                    {renderRoleFields()}
                                </>
                            )}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <CustomButton
                                title="Отмена"
                                onPress={onClose}
                                outlined={true}
                                color={Color.grey7D7D7D}
                                style={styles.modalButton}
                            />
                            <CustomButton
                                title="Изменить"
                                onPress={() => {
                                    const errors = getValidationErrors();
                                    setFieldErrors(errors);
                                    if (Object.keys(errors).length > 0) {
                                        return;
                                    }
                                    onSubmit(user.id, selectedRole, prepareSubmitData());
                                }}
                                disabled={false}
                                color={Color.blue2}
                                style={styles.modalButton}
                            />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    // Стили остаются теми же
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: normalize(16),
        justifyContent: 'center',
    },
    keyboardAvoidingView: {
        width: '100%',
        flex: 1,
        justifyContent: 'center',
    },
    modalContent: {
        backgroundColor: Color.colorLightMode,
        borderRadius: Border.radius.medium,
        padding: normalize(16),
        width: '100%',
        maxHeight: SCREEN_HEIGHT * 0.9,
        ...Shadow.medium,
    },
    modalContentKeyboardVisible: {
        maxHeight: SCREEN_HEIGHT * 0.95,
    },
    scrollView: {
    },
    scrollViewContent: {
        paddingBottom: normalize(40),
    },
    scrollViewContentKeyboardVisible: {
        paddingBottom: normalize(120),
    },
    modalTitle: {
        fontSize: normalizeFont(FontSize.size_lg),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: normalize(16),
        textAlign: 'center',
    },
    modalUserInfo: {
        backgroundColor: Color.colorLightMode,
        borderRadius: Border.radius.small,
        padding: normalize(12),
        marginBottom: normalize(16),
    },
    modalUserName: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        color: Color.textPrimary,
    },
    modalUserRole: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginTop: normalize(4),
    },
    modalLabel: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        color: Color.textPrimary,
        marginBottom: normalize(8),
    },
    roleButtonsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: normalize(16),
    },
    roleButton: {
        backgroundColor: Color.colorLightMode,
        borderRadius: Border.radius.small,
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(8),
        marginRight: normalize(8),
        marginBottom: normalize(8),
        borderWidth: 1,
        borderColor: Color.border,
    },
    roleButtonSelected: {
        backgroundColor: Color.blue2,
        borderColor: Color.blue2,
    },
    roleButtonText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textPrimary,
    },
    roleButtonTextSelected: {
        color: Color.colorLightMode,
        fontWeight: '500',
    },
    modalInput: {
        backgroundColor: Color.colorLightMode,
        borderRadius: Border.radius.small,
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(10),
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textPrimary,
        marginBottom: normalize(16),
        borderWidth: 1,
        borderColor: Color.border,
    },
    fieldError: {
        fontSize: normalizeFont(FontSize.size_xs),
        color: '#D93025',
        marginTop: normalize(-12),
        marginBottom: normalize(12),
        fontFamily: FontFamily.sFProText,
    },
    infoContainer: {
        backgroundColor: Color.blue2 + '15', // Полупрозрачный синий фон
        borderRadius: Border.radius.small,
        padding: normalize(12),
        marginBottom: normalize(16),
        borderWidth: 1,
        borderColor: Color.blue2 + '30',
    },
    infoText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        color: Color.activeBlue,
        marginBottom: normalize(4),
    },
    infoSubtext: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.activeBlue,
        fontStyle: 'italic',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: normalize(8),
    },
    modalButton: {
        flex: 1,
        marginHorizontal: normalize(4),
    }
});

export default ChangeRoleModal;