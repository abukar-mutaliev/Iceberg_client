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

    // При открытии модального окна сбрасываем выбранную роль
    useEffect(() => {
        if (visible && user) {
            setSelectedRole('');
            setUserData({});
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
        switch (selectedRole) {
            case 'ADMIN':
                return (
                    <>
                        <Text style={styles.modalLabel}>Имя администратора:</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={userData.name || ''}
                            onChangeText={(text) => handleUserDataChange('name', text)}
                            placeholder="Введите имя администратора"
                        />
                    </>
                );
            case 'CLIENT':
                return (
                    <>
                        <Text style={styles.modalLabel}>Имя клиента:</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={userData.name || ''}
                            onChangeText={(text) => handleUserDataChange('name', text)}
                            placeholder="Введите имя клиента"
                        />
                    </>
                );
            case 'EMPLOYEE':
                return (
                    <>
                        <Text style={styles.modalLabel}>Телефон:</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={userData.phone || ''}
                            onChangeText={(text) => handleUserDataChange('phone', text)}
                            placeholder="Введите телефон (необязательно)"
                            keyboardType="phone-pad"
                        />

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
                    </>
                );
            case 'DRIVER':
                return (
                    <>
                        <Text style={styles.modalLabel}>Имя водителя:</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={userData.name || ''}
                            onChangeText={(text) => handleUserDataChange('name', text)}
                            placeholder="Введите имя водителя"
                        />

                        <Text style={styles.modalLabel}>Телефон:</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={userData.phone || ''}
                            onChangeText={(text) => handleUserDataChange('phone', text)}
                            placeholder="Введите телефон (необязательно)"
                            keyboardType="phone-pad"
                        />

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

        switch (selectedRole) {
            case 'ADMIN':
            case 'CLIENT':
                return !!userData.name;
            case 'DRIVER':
                return !!userData.name && selectedDriverDistricts.length > 0;
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
        const data = { ...userData };
        
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

                    {selectedRole && renderRoleFields()}

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