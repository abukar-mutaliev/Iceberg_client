// Improved UserAddScreen with all required fields from Prisma schema
import React, {useEffect, useState} from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    SafeAreaView,
    Switch
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import IconPersona from '@shared/ui/Icon/Profile/IconPersona';
import CustomButton from '@shared/ui/Button/CustomButton';

import { useAuth } from "@entities/auth/hooks/useAuth";
import { useAdmin } from "@entities/admin";
import { AdminHeader } from "@widgets/admin/AdminHeader";
import { DistrictPicker } from '@shared/ui/Pickers/DistrictPicker';
import { WarehousePicker } from '@shared/ui/Pickers/WarehousePicker';
import { MultiDistrictPicker } from '@shared/ui/Pickers/MultiDistrictPicker';
import { useDistrict } from '@entities/district';

export const UserAddScreen = () => {
    const navigation = useNavigation();
    const { currentUser, hasPermission } = useAuth() || { currentUser: null, hasPermission: () => false };

    // Использование хука useDistrict с деструктуризацией нужных методов и данных
    const {
        districts,
        loadDistricts,
        isLoading: districtsLoading,
        error: districtError
    } = useDistrict();

    const {
        addStaff,
        addAdmin,
        warehouses,
        loadWarehouses,
        operation: { isLoading = false, error = null, success = null }
    } = useAdmin() || { operation: {} };

    // Состояние для формы
    const [role, setRole] = useState('');
    const [userData, setUserData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        gender: null
    });

    // Состояние для выбора района для Driver и Client
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [showDistrictPicker, setShowDistrictPicker] = useState(false);

    // Состояние для выбора района для Client
    const [selectedClientDistrict, setSelectedClientDistrict] = useState(null);
    const [showClientDistrictPicker, setShowClientDistrictPicker] = useState(false);

    // Состояние для выбора склада для Employee
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [showWarehousePicker, setShowWarehousePicker] = useState(false);

    // Состояние для выбора районов для Employee (мультивыбор)
    const [selectedEmployeeDistricts, setSelectedEmployeeDistricts] = useState([]);
    const [showEmployeeDistrictPicker, setShowEmployeeDistrictPicker] = useState(false);

    // Состояние для ошибок валидации и серверных ошибок
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState(null);

    // Загрузка списка районов при монтировании компонента
    useEffect(() => {
        loadDistricts();
        loadWarehouses();
    }, []);

    // Проверяем права доступа
    useEffect(() => {
        if (!currentUser || (currentUser?.role !== 'ADMIN' && !hasPermission('manage:users'))) {
            Alert.alert(
                'Доступ запрещен',
                'У вас нет прав для доступа к этому разделу',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        }
    }, [currentUser, hasPermission, navigation]);

    // Обработка сообщений об успехе или ошибке операции
    useEffect(() => {
        if (success) {
            Alert.alert('Успешно', success, [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        }

        if (error) {
            console.log('Получена ошибка от сервера:', error);
            const fieldErrors = parseServerErrors(error);
            
            if (fieldErrors.general) {
                setServerError(fieldErrors.general);
                Alert.alert('Ошибка', fieldErrors.general);
            } else {
                // Показываем ошибки под соответствующими полями
                setErrors(prevErrors => ({ ...prevErrors, ...fieldErrors }));
                Alert.alert('Ошибка', 'Проверьте правильность заполнения полей');
            }
        }
    }, [success, error]);

    // Обработка ошибок районов
    useEffect(() => {
        if (districtError) {
            Alert.alert('Ошибка загрузки районов', districtError);
        }
    }, [districtError]);

    // Функция для парсинга серверных ошибок
    const parseServerErrors = (error) => {
        const fieldErrors = {};
        
        if (typeof error === 'string') {
            // Обработка текстовых ошибок
            const lowerError = error.toLowerCase();
            
            // Email ошибки
            if (lowerError.includes('пользователь с таким email уже существует') ||
                lowerError.includes('email уже используется') ||
                lowerError.includes('email already exists') ||
                lowerError.includes('email') && (lowerError.includes('already') || lowerError.includes('существует') || lowerError.includes('занят'))) {
                fieldErrors.email = 'Этот email уже используется';
            } else if (lowerError.includes('введите корректный email') ||
                      lowerError.includes('invalid email') ||
                      lowerError.includes('email') && (lowerError.includes('invalid') || lowerError.includes('неверный') || lowerError.includes('некорректный'))) {
                fieldErrors.email = 'Неверный формат email';
            
            // Пароль ошибки
            } else if (lowerError.includes('пароль должен содержать минимум') ||
                      lowerError.includes('password') && lowerError.includes('minimum') ||
                      lowerError.includes('пароль слишком короткий')) {
                fieldErrors.password = 'Пароль должен содержать минимум 6 символов';
            } else if (lowerError.includes('пароль должен содержать заглавные') ||
                      lowerError.includes('password') && lowerError.includes('uppercase') ||
                      lowerError.includes('пароль слабый') ||
                      lowerError.includes('password') && lowerError.includes('weak')) {
                fieldErrors.password = 'Пароль должен содержать заглавные, строчные буквы и цифры';
            
            // Телефон ошибки
            } else if (lowerError.includes('телефон уже используется') ||
                      lowerError.includes('phone already exists') ||
                      lowerError.includes('phone') && (lowerError.includes('already') || lowerError.includes('существует') || lowerError.includes('занят'))) {
                fieldErrors.phone = 'Этот телефон уже используется';
            } else if (lowerError.includes('введите корректный номер телефона') ||
                      lowerError.includes('invalid phone')) {
                fieldErrors.phone = 'Введите корректный номер телефона';
            
            // ИНН ошибки
            } else if (lowerError.includes('инн уже используется') ||
                      lowerError.includes('inn already exists') ||
                      lowerError.includes('inn') && (lowerError.includes('already') || lowerError.includes('существует') || lowerError.includes('занят'))) {
                fieldErrors.inn = 'Этот ИНН уже используется';
            
            // ОГРН ошибки
            } else if (lowerError.includes('огрн уже используется') ||
                      lowerError.includes('ogrn already exists') ||
                      lowerError.includes('ogrn') && (lowerError.includes('already') || lowerError.includes('существует') || lowerError.includes('занят'))) {
                fieldErrors.ogrn = 'Этот ОГРН уже используется';
            
            // Имя ошибки
            } else if (lowerError.includes('имя обязательно') ||
                      lowerError.includes('name') && lowerError.includes('required') ||
                      lowerError.includes('имя должно содержать минимум')) {
                fieldErrors.name = 'Имя обязательно и должно содержать минимум 2 символа';
            
            // Должность ошибки
            } else if (lowerError.includes('должность обязательна') ||
                      lowerError.includes('position') && lowerError.includes('required') ||
                      lowerError.includes('должность должна содержать минимум')) {
                fieldErrors.position = 'Должность обязательна и должна содержать минимум 2 символа';
            
            // Компания ошибки
            } else if (lowerError.includes('название компании обязательно') ||
                      lowerError.includes('company name') && lowerError.includes('required')) {
                fieldErrors.companyName = 'Название компании обязательно';
            } else if (lowerError.includes('контактное лицо обязательно') ||
                      lowerError.includes('contact person') && lowerError.includes('required')) {
                fieldErrors.contactPerson = 'Контактное лицо обязательно';
            
            // Склад ошибки
            } else if (lowerError.includes('склад не найден') ||
                      lowerError.includes('warehouse not found') ||
                      lowerError.includes('warehouse') && lowerError.includes('not found')) {
                fieldErrors.warehouse = 'Выбранный склад не найден';
            
            // Районы ошибки
            } else if (lowerError.includes('для сотрудников обязательно указать районы') ||
                      lowerError.includes('районы обслуживания') && lowerError.includes('обязательно') ||
                      lowerError.includes('выбрать хотя бы один район') ||
                      lowerError.includes('districts') && lowerError.includes('required')) {
                fieldErrors.employeeDistricts = 'Выберите хотя бы один район обслуживания';
            } else if (lowerError.includes('район не найден') ||
                      lowerError.includes('district not found') ||
                      lowerError.includes('district') && lowerError.includes('not found')) {
                fieldErrors.employeeDistricts = 'Один из выбранных районов не найден';
            
            // Адрес ошибки
            } else if (lowerError.includes('адрес должен содержать минимум') ||
                      lowerError.includes('address') && lowerError.includes('minimum')) {
                fieldErrors.address = 'Адрес должен содержать минимум 5 символов';
            
            } else {
                // Общая ошибка, если не удалось определить поле
                fieldErrors.general = error;
            }
        } else if (error && typeof error === 'object') {
            // Обработка структурированных ошибок
            if (error.details && Array.isArray(error.details)) {
                error.details.forEach(detail => {
                    if (detail.field && detail.message) {
                        fieldErrors[detail.field] = detail.message;
                    }
                });
            } else if (error.field && error.message) {
                fieldErrors[error.field] = error.message;
            } else if (error.message) {
                // Рекурсивно обрабатываем сообщение как строку
                return parseServerErrors(error.message);
            } else {
                fieldErrors.general = JSON.stringify(error);
            }
        } else {
            fieldErrors.general = String(error);
        }
        
        return fieldErrors;
    };

    // Обработчик изменения полей формы
    const handleInputChange = (field, value) => {
        setUserData({ ...userData, [field]: value });
        // Сбрасываем ошибку для этого поля, если она была
        if (errors[field]) {
            setErrors(prevErrors => ({ ...prevErrors, [field]: null }));
        }
        // Сбрасываем серверную ошибку при изменении полей
        if (serverError) {
            setServerError(null);
        }
    };

    // Обработчик изменения выбранного склада
    const handleWarehouseChange = (warehouseId) => {
        setSelectedWarehouse(warehouseId);
        // Сбрасываем ошибку склада, если она была
        if (errors.warehouse) {
            setErrors(prevErrors => ({ ...prevErrors, warehouse: null }));
        }
        // Сбрасываем серверную ошибку
        if (serverError) {
            setServerError(null);
        }
    };

    // Обработчик изменения выбранных районов для сотрудника
    const handleEmployeeDistrictsChange = (districts) => {
        setSelectedEmployeeDistricts(districts);
        // Сбрасываем ошибку районов, если она была
        if (errors.employeeDistricts) {
            setErrors(prevErrors => ({ ...prevErrors, employeeDistricts: null }));
        }
        // Сбрасываем серверную ошибку
        if (serverError) {
            setServerError(null);
        }
    };

    // Обработчик изменения выбранного района для клиента
    const handleClientDistrictChange = (districtId) => {
        setSelectedClientDistrict(districtId);
        // Сбрасываем ошибку района, если она была
        if (errors.clientDistrict) {
            setErrors(prevErrors => ({ ...prevErrors, clientDistrict: null }));
        }
        // Сбрасываем серверную ошибку
        if (serverError) {
            setServerError(null);
        }
    };

    // Обработчик изменения выбранного района для водителя
    const handleDriverDistrictChange = (districtId) => {
        setSelectedDistrict(districtId);
        // Сбрасываем ошибку района, если она была
        if (errors.district) {
            setErrors(prevErrors => ({ ...prevErrors, district: null }));
        }
        // Сбрасываем серверную ошибку
        if (serverError) {
            setServerError(null);
        }
    };

    // Валидация формы
    const validateForm = () => {
        const newErrors = {};

        // Проверка email
        if (!userData.email) {
            newErrors.email = 'Email обязателен';
        } else if (!/\S+@\S+\.\S+/.test(userData.email)) {
            newErrors.email = 'Некорректный email';
        }

        // Проверка пароля
        if (!userData.password) {
            newErrors.password = 'Пароль обязателен';
        } else if (userData.password.length < 6) {
            newErrors.password = 'Пароль должен содержать не менее 6 символов';
        }

        // Проверка подтверждения пароля
        if (!userData.confirmPassword) {
            newErrors.confirmPassword = 'Подтвердите пароль';
        } else if (userData.password !== userData.confirmPassword) {
            newErrors.confirmPassword = 'Пароли не совпадают';
        }

        // Проверка роли
        if (!role) {
            newErrors.role = 'Выберите роль пользователя';
        }

        // Проверка дополнительных полей в зависимости от роли
        if (role === 'ADMIN' && !userData.name) {
            newErrors.name = 'Имя администратора обязательно';
        }

        if (role === 'CLIENT' && !userData.name) {
            newErrors.name = 'Имя клиента обязательно';
        }

        if (role === 'EMPLOYEE') {
            if (selectedEmployeeDistricts.length === 0) {
                newErrors.employeeDistricts = 'Выберите хотя бы один район обслуживания';
            }
            if (!selectedWarehouse) {
                newErrors.warehouse = 'Выберите склад работы';
            }
        }

        if (role === 'SUPPLIER') {
            if (!userData.companyName) {
                newErrors.companyName = 'Название компании обязательно';
            }
            if (!userData.contactPerson) {
                newErrors.contactPerson = 'Контактное лицо обязательно';
            }
        }

        if (role === 'DRIVER') {
            if (!userData.name) {
                newErrors.name = 'Имя водителя обязательно';
            }
            if (!selectedDistrict) {
                newErrors.district = 'Выберите район обслуживания';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Обработчик отправки формы
    const handleSubmit = () => {
        // Сбрасываем серверную ошибку при новой отправке
        setServerError(null);

        if (!validateForm()) {
            return;
        }

        // Подготавливаем данные для отправки
        const { confirmPassword, ...dataToSend } = userData;

        // Добавляем районы для водителя
        if (role === 'DRIVER' && selectedDistrict) {
            dataToSend.districts = [selectedDistrict];
        }

        // Добавляем район для клиента
        if (role === 'CLIENT' && selectedClientDistrict) {
            dataToSend.districtId = selectedClientDistrict;
        }

        // Добавляем склад для сотрудника
        if (role === 'EMPLOYEE' && selectedWarehouse) {
            dataToSend.warehouseId = selectedWarehouse;
        }

        // Добавляем районы для сотрудника
        if (role === 'EMPLOYEE' && selectedEmployeeDistricts.length > 0) {
            dataToSend.districts = selectedEmployeeDistricts;
        }

        // Отправляем запрос в зависимости от выбранной роли
        try {
            if (role === 'ADMIN') {
                addAdmin(dataToSend)
                    .catch(err => {
                        console.error('Ошибка при создании администратора:', err);
                        const fieldErrors = parseServerErrors(err.message || err);
                        
                        if (fieldErrors.general) {
                            setServerError(fieldErrors.general);
                            Alert.alert('Ошибка', fieldErrors.general);
                        } else {
                            // Показываем ошибки под соответствующими полями
                            setErrors(prevErrors => ({ ...prevErrors, ...fieldErrors }));
                            Alert.alert('Ошибка', 'Проверьте правильность заполнения полей');
                        }
                    });
            } else {
                addStaff({ ...dataToSend, role })
                    .catch(err => {
                        console.error('Ошибка при создании пользователя:', err);
                        const fieldErrors = parseServerErrors(err.message || err);
                        
                        if (fieldErrors.general) {
                            setServerError(fieldErrors.general);
                            Alert.alert('Ошибка', fieldErrors.general);
                        } else {
                            // Показываем ошибки под соответствующими полями
                            setErrors(prevErrors => ({ ...prevErrors, ...fieldErrors }));
                            Alert.alert('Ошибка', 'Проверьте правильность заполнения полей');
                        }
                    });
            }
        } catch (err) {
            console.error('Непредвиденная ошибка:', err);
            const fieldErrors = parseServerErrors(err.message || err);
            
            if (fieldErrors.general) {
                setServerError(fieldErrors.general);
                Alert.alert('Ошибка', fieldErrors.general);
            } else {
                setErrors(prevErrors => ({ ...prevErrors, ...fieldErrors }));
                Alert.alert('Ошибка', 'Произошла непредвиденная ошибка');
            }
        }
    };

    // Список ролей
    const roles = [
        { value: 'ADMIN', label: 'Администратор' },
        { value: 'CLIENT', label: 'Клиент' },
        { value: 'EMPLOYEE', label: 'Сотрудник' },
        { value: 'SUPPLIER', label: 'Поставщик' },
        { value: 'DRIVER', label: 'Водитель' }
    ];

    // Список полов пользователя
    const genderOptions = [
        { value: 'MALE', label: 'Мужской' },
        { value: 'FEMALE', label: 'Женский' },
        { value: 'OTHER', label: 'Другой' },
        { value: 'PREFER_NOT_TO_SAY', label: 'Не указывать' }
    ];

    // Отображаем дополнительные поля в зависимости от выбранной роли
    const renderRoleFields = () => {
        switch (role) {
            case 'ADMIN':
                return (
                    <>
                        <Text style={styles.inputLabel}>Имя администратора:</Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            value={userData.name || ''}
                            onChangeText={(text) => handleInputChange('name', text)}
                            placeholder="Введите имя администратора"
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

                        <Text style={styles.inputLabel}>Телефон:</Text>
                        <TextInput
                            style={styles.input}
                            value={userData.phone || ''}
                            onChangeText={(text) => handleInputChange('phone', text)}
                            placeholder="Введите телефон (необязательно)"
                            keyboardType="phone-pad"
                        />

                        <Text style={styles.inputLabel}>Адрес:</Text>
                        <TextInput
                            style={styles.input}
                            value={userData.address || ''}
                            onChangeText={(text) => handleInputChange('address', text)}
                            placeholder="Введите адрес (необязательно)"
                        />

                        <View style={styles.switchContainer}>
                            <Text style={styles.inputLabel}>Суперадмин:</Text>
                            <Switch
                                value={userData.isSuperAdmin || false}
                                onValueChange={(value) => handleInputChange('isSuperAdmin', value)}
                                trackColor={{ false: "#767577", true: Color.blue2 }}
                                thumbColor={userData.isSuperAdmin ? "#fff" : "#f4f3f4"}
                            />
                        </View>
                    </>
                );
            case 'CLIENT':
                return (
                    <>
                        <Text style={styles.inputLabel}>Имя клиента:</Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            value={userData.name || ''}
                            onChangeText={(text) => handleInputChange('name', text)}
                            placeholder="Введите имя клиента"
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

                        <Text style={styles.inputLabel}>Телефон:</Text>
                        <TextInput
                            style={styles.input}
                            value={userData.phone || ''}
                            onChangeText={(text) => handleInputChange('phone', text)}
                            placeholder="Введите телефон (необязательно)"
                            keyboardType="phone-pad"
                        />

                        <Text style={styles.inputLabel}>Адрес:</Text>
                        <TextInput
                            style={styles.input}
                            value={userData.address || ''}
                            onChangeText={(text) => handleInputChange('address', text)}
                            placeholder="Введите адрес (необязательно)"
                        />

                        {/* Компонент выбора района для клиента */}
                        <DistrictPicker
                            districts={districts}
                            selectedDistrict={selectedClientDistrict}
                            setSelectedDistrict={handleClientDistrictChange}
                            showDistrictPicker={showClientDistrictPicker}
                            setShowDistrictPicker={setShowClientDistrictPicker}
                            error={errors.clientDistrict}
                        />
                    </>
                );
            case 'EMPLOYEE':
                return (
                    <>
                        <Text style={styles.inputLabel}>Телефон:</Text>
                        <TextInput
                            style={styles.input}
                            value={userData.phone || ''}
                            onChangeText={(text) => handleInputChange('phone', text)}
                            placeholder="Введите телефон (необязательно)"
                            keyboardType="phone-pad"
                        />

                        <Text style={styles.inputLabel}>Адрес:</Text>
                        <TextInput
                            style={styles.input}
                            value={userData.address || ''}
                            onChangeText={(text) => handleInputChange('address', text)}
                            placeholder="Введите адрес (необязательно)"
                        />

                        {/* Компонент выбора склада для сотрудника */}
                        <WarehousePicker
                            warehouses={warehouses.items || []}
                            selectedWarehouse={selectedWarehouse}
                            setSelectedWarehouse={handleWarehouseChange}
                            showWarehousePicker={showWarehousePicker}
                            setShowWarehousePicker={setShowWarehousePicker}
                            error={errors.warehouse}
                            disabled={warehouses.isLoading}
                        />

                        {/* Компонент выбора районов для сотрудника */}
                        <MultiDistrictPicker
                            districts={districts || []}
                            selectedDistricts={selectedEmployeeDistricts}
                            setSelectedDistricts={handleEmployeeDistrictsChange}
                            showDistrictPicker={showEmployeeDistrictPicker}
                            setShowDistrictPicker={setShowEmployeeDistrictPicker}
                            error={errors.employeeDistricts}
                            disabled={districtsLoading}
                        />
                    </>
                );
            case 'SUPPLIER':
                return (
                    <>
                        <Text style={styles.inputLabel}>Название компании:</Text>
                        <TextInput
                            style={[styles.input, errors.companyName && styles.inputError]}
                            value={userData.companyName || ''}
                            onChangeText={(text) => handleInputChange('companyName', text)}
                            placeholder="Введите название компании"
                        />
                        {errors.companyName && <Text style={styles.errorText}>{errors.companyName}</Text>}

                        <Text style={styles.inputLabel}>Контактное лицо:</Text>
                        <TextInput
                            style={[styles.input, errors.contactPerson && styles.inputError]}
                            value={userData.contactPerson || ''}
                            onChangeText={(text) => handleInputChange('contactPerson', text)}
                            placeholder="Введите контактное лицо"
                        />
                        {errors.contactPerson && <Text style={styles.errorText}>{errors.contactPerson}</Text>}

                        <Text style={styles.inputLabel}>Телефон:</Text>
                        <TextInput
                            style={styles.input}
                            value={userData.phone || ''}
                            onChangeText={(text) => handleInputChange('phone', text)}
                            placeholder="Введите телефон (необязательно)"
                            keyboardType="phone-pad"
                        />

                        <Text style={styles.inputLabel}>Адрес:</Text>
                        <TextInput
                            style={styles.input}
                            value={userData.address || ''}
                            onChangeText={(text) => handleInputChange('address', text)}
                            placeholder="Введите адрес (необязательно)"
                        />

                        <Text style={styles.inputLabel}>ИНН:</Text>
                        <TextInput
                            style={styles.input}
                            value={userData.inn || ''}
                            onChangeText={(text) => handleInputChange('inn', text)}
                            placeholder="Введите ИНН (необязательно)"
                            keyboardType="numeric"
                        />

                        <Text style={styles.inputLabel}>ОГРН:</Text>
                        <TextInput
                            style={styles.input}
                            value={userData.ogrn || ''}
                            onChangeText={(text) => handleInputChange('ogrn', text)}
                            placeholder="Введите ОГРН (необязательно)"
                            keyboardType="numeric"
                        />

                        <Text style={styles.inputLabel}>Банковский счет:</Text>
                        <TextInput
                            style={styles.input}
                            value={userData.bankAccount || ''}
                            onChangeText={(text) => handleInputChange('bankAccount', text)}
                            placeholder="Введите номер счета (необязательно)"
                            keyboardType="numeric"
                        />

                        <Text style={styles.inputLabel}>БИК:</Text>
                        <TextInput
                            style={styles.input}
                            value={userData.bik || ''}
                            onChangeText={(text) => handleInputChange('bik', text)}
                            placeholder="Введите БИК (необязательно)"
                            keyboardType="numeric"
                        />
                    </>
                );
            case 'DRIVER':
                return (
                    <>
                        <Text style={styles.inputLabel}>Имя водителя:</Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            value={userData.name || ''}
                            onChangeText={(text) => handleInputChange('name', text)}
                            placeholder="Введите имя водителя"
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

                        <Text style={styles.inputLabel}>Телефон:</Text>
                        <TextInput
                            style={styles.input}
                            value={userData.phone || ''}
                            onChangeText={(text) => handleInputChange('phone', text)}
                            placeholder="Введите телефон (необязательно)"
                            keyboardType="phone-pad"
                        />

                        <Text style={styles.inputLabel}>Адрес:</Text>
                        <TextInput
                            style={styles.input}
                            value={userData.address || ''}
                            onChangeText={(text) => handleInputChange('address', text)}
                            placeholder="Введите адрес (необязательно)"
                        />

                        {/* Компонент выбора района для водителя */}
                        <DistrictPicker
                            districts={districts}
                            selectedDistrict={selectedDistrict}
                            setSelectedDistrict={handleDriverDistrictChange}
                            showDistrictPicker={showDistrictPicker}
                            setShowDistrictPicker={setShowDistrictPicker}
                            error={errors.district}
                        />
                    </>
                );
            default:
                return null;
        }
    };

    // Рендер основных полей пользователя
    const renderCommonUserFields = () => {
        return (
            <>
                <Text style={styles.inputLabel}>Пол:</Text>
                <View style={styles.genderButtonsContainer}>
                    {genderOptions.map(item => (
                        <TouchableOpacity
                            key={item.value}
                            style={[
                                styles.genderButton,
                                userData.gender === item.value && styles.genderButtonSelected
                            ]}
                            onPress={() => handleInputChange('gender', item.value)}
                        >
                            <Text style={[
                                styles.genderButtonText,
                                userData.gender === item.value && styles.genderButtonTextSelected
                            ]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <AdminHeader
                title="Добавление пользователя"
                icon={<IconPersona width={24} height={24} color={Color.blue2} />}
                onBackPress={() => navigation.goBack()}
            />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <View style={styles.form}>
                    {/* Отображаем серверную ошибку, если она есть */}
                    {serverError && (
                        <View style={styles.serverErrorContainer}>
                            <Text style={styles.serverErrorText}>{serverError}</Text>
                        </View>
                    )}

                    <Text style={styles.formLabel}>Основная информация</Text>

                    <Text style={styles.inputLabel}>Email:</Text>
                    <TextInput
                        style={[styles.input, errors.email && styles.inputError]}
                        value={userData.email}
                        onChangeText={(text) => handleInputChange('email', text)}
                        placeholder="Введите email пользователя"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

                    <Text style={styles.inputLabel}>Пароль:</Text>
                    <TextInput
                        style={[styles.input, errors.password && styles.inputError]}
                        value={userData.password}
                        onChangeText={(text) => handleInputChange('password', text)}
                        placeholder="Введите пароль"
                        secureTextEntry
                    />
                    {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

                    <Text style={styles.inputLabel}>Подтверждение пароля:</Text>
                    <TextInput
                        style={[styles.input, errors.confirmPassword && styles.inputError]}
                        value={userData.confirmPassword}
                        onChangeText={(text) => handleInputChange('confirmPassword', text)}
                        placeholder="Подтвердите пароль"
                        secureTextEntry
                    />
                    {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

                    <Text style={styles.inputLabel}>Роль пользователя:</Text>
                    <View style={styles.roleButtonsContainer}>
                        {roles.map(item => (
                            <TouchableOpacity
                                key={item.value}
                                style={[
                                    styles.roleButton,
                                    role === item.value && styles.roleButtonSelected
                                ]}
                                onPress={() => setRole(item.value)}
                            >
                                <Text style={[
                                    styles.roleButtonText,
                                    role === item.value && styles.roleButtonTextSelected
                                ]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}

                    {/* Общие поля для всех пользователей */}
                    {renderCommonUserFields()}

                    {role && (
                        <>
                            <Text style={[styles.formLabel, { marginTop: normalize(16) }]}>
                                Данные профиля
                            </Text>
                            {renderRoleFields()}
                        </>
                    )}
                </View>
                <View style={styles.footer}>
                    <CustomButton
                        title="Создать"
                        onPress={handleSubmit}
                        color={Color.blue2}
                        loading={isLoading || districtsLoading}
                        disabled={isLoading || districtsLoading}
                    />
                    <CustomButton
                        title="Отмена"
                        onPress={() => navigation.goBack()}
                        outlined={true}
                        color={Color.grey7D7D7D}
                        style={{ marginRight: normalize(8) }}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

// Стили
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(16),
    },
    form: {
        backgroundColor: Color.colorLightMode,
        borderRadius: Border.radius.medium,
        padding: normalize(16),
        ...Shadow.light,
    },
    serverErrorContainer: {
        backgroundColor: '#FFEBEE',  // светло-красный фон
        borderRadius: Border.radius.small,
        padding: normalize(12),
        marginBottom: normalize(16),
        borderWidth: 1,
        borderColor: '#FFCDD2',  // более темный оттенок красного для границы
    },
    serverErrorText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: '#D32F2F',  // темно-красный текст
        fontWeight: '500',
    },
    formLabel: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: normalize(16),
    },
    inputLabel: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        color: Color.textPrimary,
        marginBottom: normalize(8),
    },
    input: {
        backgroundColor: Color.backgroundLight,
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
    inputError: {
        borderColor: 'red',
    },
    errorText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: 'red',
        marginTop: normalize(-12),
        marginBottom: normalize(16),
    },
    roleButtonsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: normalize(16),
    },
    roleButton: {
        backgroundColor: Color.backgroundLight,
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
    genderButtonsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: normalize(16),
    },
    genderButton: {
        backgroundColor: Color.backgroundLight,
        borderRadius: Border.radius.small,
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(8),
        marginRight: normalize(8),
        marginBottom: normalize(8),
        borderWidth: 1,
        borderColor: Color.border,
    },
    genderButtonSelected: {
        backgroundColor: Color.blue2,
        borderColor: Color.blue2,
    },
    genderButtonText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textPrimary,
    },
    genderButtonTextSelected: {
        color: Color.colorLightMode,
        fontWeight: '500',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(16),
        paddingVertical: normalize(8),
        paddingHorizontal: normalize(2),
    },
    footer: {
        flexDirection: 'column',
        padding: normalize(16),
        borderTopWidth: 1,
        borderTopColor: Color.border,
        backgroundColor: Color.colorLightMode,
        gap: normalize(16),
    }
});