import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import CustomButton from '@shared/ui/Button/CustomButton';
import { USER_ROLES_DISPLAY } from '@entities/user/model/constants';
import { WarehousePicker } from '@shared/ui/Pickers/WarehousePicker';
import { MultiDistrictPicker } from '@shared/ui/Pickers/MultiDistrictPicker';
import { useAdmin } from '@entities/admin';
import { useDistrict } from '@entities/district';

export const ChangeRoleModal = ({ visible, user, onClose, onSubmit }) => {
    const [selectedRole, setSelectedRole] = useState('');
    const [userData, setUserData] = useState({});
    
    // Состояние для выбора склада и районов для сотрудника
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [showWarehousePicker, setShowWarehousePicker] = useState(false);
    const [selectedEmployeeDistricts, setSelectedEmployeeDistricts] = useState([]);
    const [showEmployeeDistrictPicker, setShowEmployeeDistrictPicker] = useState(false);

    // Состояние для выбора склада и районов для водителя
    const [selectedDriverWarehouse, setSelectedDriverWarehouse] = useState(null);
    const [showDriverWarehousePicker, setShowDriverWarehousePicker] = useState(false);
    const [selectedDriverDistricts, setSelectedDriverDistricts] = useState([]);
    const [showDriverDistrictPicker, setShowDriverDistrictPicker] = useState(false);

    // Хуки для загрузки данных
    const { warehouses, loadWarehouses } = useAdmin();
    const { districts, loadDistricts } = useDistrict();

    // Загрузка данных при открытии модального окна
    useEffect(() => {
        if (visible) {
            loadWarehouses();
            loadDistricts();
        }
    }, [visible]);

    // Функция для извлечения существующих данных пользователя
    const getUserExistingData = () => {
        if (!user) return { name: '', phone: '' };
        
        // Пытаемся получить имя и телефон из разных источников в зависимости от роли
        let existingName = '';
        let existingPhone = '';
        
        // Проверяем разные возможные источники данных
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
        
        if (user.profile?.phone) {
            existingPhone = user.profile.phone;
        } else if (user.client?.phone) {
            existingPhone = user.client.phone || '';
        } else if (user.employee?.phone) {
            existingPhone = user.employee.phone || '';
        } else if (user.admin?.phone) {
            existingPhone = user.admin.phone || '';
        } else if (user.driver?.phone) {
            existingPhone = user.driver.phone || '';
        } else if (user.supplier?.phone) {
            existingPhone = user.supplier.phone || '';
        } else if (user.phone) {
            existingPhone = user.phone;
        }
        
        return { name: existingName, phone: existingPhone };
    };

    // При открытии модального окна сбрасываем выбранную роль и инициализируем данные
    useEffect(() => {
        if (visible && user) {
            setSelectedRole('');
            const existingData = getUserExistingData();
            setUserData(existingData);
            setSelectedWarehouse(null);
            setSelectedEmployeeDistricts([]);
            setSelectedDriverWarehouse(null);
            setSelectedDriverDistricts([]);
        }
    }, [visible, user]);

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
        setUserData({ ...userData, [key]: value });
    };

    // Обработчик изменения выбранного склада
    const handleWarehouseChange = (warehouseId) => {
        setSelectedWarehouse(warehouseId);
    };

    // Обработчик изменения выбранных районов для сотрудника
    const handleEmployeeDistrictsChange = (districts) => {
        setSelectedEmployeeDistricts(districts);
    };

    // Обработчик изменения выбранного склада для водителя
    const handleDriverWarehouseChange = (warehouseId) => {
        setSelectedDriverWarehouse(warehouseId);
    };

    // Обработчик изменения выбранных районов для водителя
    const handleDriverDistrictsChange = (districts) => {
        setSelectedDriverDistricts(districts);
    };

    // Отображаем дополнительные поля в зависимости от выбранной роли
    const renderRoleFields = () => {
        const hasExistingName = !!userData.name;
        const hasExistingPhone = !!userData.phone;
        
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
                            </>
                        )}

                        <Text style={styles.modalLabel}>Адрес:</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={userData.address || ''}
                            onChangeText={(text) => handleUserDataChange('address', text)}
                            placeholder="Введите адрес (необязательно)"
                        />

                        {/* Компонент выбора склада для сотрудника */}
                        <WarehousePicker
                            warehouses={warehouses.items || []}
                            selectedWarehouse={selectedWarehouse}
                            setSelectedWarehouse={handleWarehouseChange}
                            showWarehousePicker={showWarehousePicker}
                            setShowWarehousePicker={setShowWarehousePicker}
                            error={null}
                            disabled={warehouses.isLoading}
                        />

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
                        <Text style={styles.modalLabel}>Контактное лицо:</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={userData.contactPerson || ''}
                            onChangeText={(text) => handleUserDataChange('contactPerson', text)}
                            placeholder="Введите контактное лицо"
                        />
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
                            </>
                        )}

                        {/* Компонент выбора склада для водителя */}
                        <WarehousePicker
                            warehouses={warehouses.items || []}
                            selectedWarehouse={selectedDriverWarehouse}
                            setSelectedWarehouse={handleDriverWarehouseChange}
                            showWarehousePicker={showDriverWarehousePicker}
                            setShowWarehousePicker={setShowDriverWarehousePicker}
                            error={null}
                            disabled={warehouses.isLoading}
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
                    </>
                );
            default:
                return null;
        }
    };

    // Проверка валидности формы
    const isFormValid = () => {
        if (!selectedRole) return false;

        // Проверяем наличие имени в данных (либо существующее, либо введенное)
        const hasName = !!userData.name && userData.name.trim().length > 0;

        switch (selectedRole) {
            case 'ADMIN':
                // Для ADMIN имя обязательно - должно быть указано при регистрации
                return hasName;
            case 'CLIENT':
                // Имя обязательно - либо уже есть у пользователя, либо должно быть введено
                return hasName;
            case 'DRIVER':
                // Имя обязательно, районы обязательны всегда
                return hasName && selectedDriverDistricts.length > 0;
            case 'EMPLOYEE':
                return !!selectedWarehouse && selectedEmployeeDistricts.length > 0;
            case 'SUPPLIER':
                return !!userData.companyName && !!userData.contactPerson;
            default:
                return false;
        }
    };

    // Подготовка данных для отправки
    const prepareSubmitData = () => {
        const data = {};
        
        // Всегда передаем имя, если оно есть (из существующих данных или введенное)
        // Имя должно быть указано при регистрации, поэтому оно должно быть в userData
        if (userData.name && userData.name.trim()) {
            data.name = userData.name.trim();
        }
        
        // Передаем телефон только если он не пустой
        if (userData.phone && userData.phone.trim()) {
            data.phone = userData.phone.trim();
        }
        
        if (selectedRole === 'EMPLOYEE') {
            data.warehouseId = selectedWarehouse;
            data.districts = selectedEmployeeDistricts;
        }
        
        if (selectedRole === 'DRIVER') {
            data.warehouseId = selectedDriverWarehouse;
            data.districts = selectedDriverDistricts;
        }
        
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
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Изменить роль пользователя</Text>

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
                                onPress={() => setSelectedRole(role.value)}
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

                    {selectedRole && (
                        <>
                            {(userData.name || userData.phone) && (
                                <View style={styles.infoContainer}>
                                    <Text style={styles.infoText}>
                                        {userData.name && `Имя: ${userData.name}`}
                                        {userData.name && userData.phone && '\n'}
                                        {userData.phone && `Телефон: ${userData.phone}`}
                                    </Text>
                                    <Text style={styles.infoSubtext}>
                                        Существующие данные будут сохранены
                                    </Text>
                                </View>
                            )}
                            {renderRoleFields()}
                        </>
                    )}

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
                            onPress={() => onSubmit(user.id, selectedRole, prepareSubmitData())}
                            disabled={!isFormValid()}
                            color={Color.blue2}
                            style={styles.modalButton}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    // Стили остаются теми же
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: normalize(16),
    },
    modalContent: {
        backgroundColor: Color.colorLightMode,
        borderRadius: Border.radius.medium,
        padding: normalize(16),
        ...Shadow.medium,
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
        color: Color.textPrimary,
        marginBottom: normalize(4),
    },
    infoSubtext: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
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