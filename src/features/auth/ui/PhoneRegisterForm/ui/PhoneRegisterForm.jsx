import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    PixelRatio,
    Platform,
    Modal,
    FlatList,
    ScrollView
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { 
    selectName, 
    setName, 
    selectPhone, 
    setPhone, 
    selectAddress, 
    setAddress, 
    selectGender, 
    setGender,
    selectDistrictId,
    selectCustomDistrict,
    setDistrictId,
    setCustomDistrict,
    initiatePhoneRegister
} from '@entities/auth';
import { CustomTextInput } from '@shared/ui/CustomTextInput/CustomTextInput';
import { api } from '@shared/api/api';
import { retryRequest } from '@shared/api/retryHelper';
import { GlobalAlert } from '@shared/ui/CustomAlert';

const OTHER_DISTRICT_NAME = 'Другой';

export const PhoneRegisterForm = ({ onVerification }) => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const placeholderColor = isDark ? colors.textTertiary : '#888';
    const passwordIconColor = isLoading
        ? (isDark ? colors.textTertiary : '#999')
        : (isDark ? colors.primary : '#3339b0');

    const reduxName = useSelector(selectName) || '';
    const reduxPhone = useSelector(selectPhone) || '';
    const reduxAddress = useSelector(selectAddress) || '';
    const reduxGender = useSelector(selectGender) || '';
    const reduxDistrictId = useSelector(selectDistrictId);
    const reduxCustomDistrict = useSelector(selectCustomDistrict) || '';
    const isLoading = useSelector((state) => state.auth?.isLoading ?? false);

    const [privacyAgreed, setPrivacyAgreed] = useState(false);

    const [name, setLocalName] = useState(reduxName);
    const [phone, setLocalPhone] = useState(reduxPhone);
    const [address, setLocalAddress] = useState(reduxAddress);
    const [gender, setLocalGender] = useState(reduxGender);
    const [districtId, setLocalDistrictId] = useState(reduxDistrictId);
    const [customDistrict, setLocalCustomDistrict] = useState(reduxCustomDistrict);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [showGenderModal, setShowGenderModal] = useState(false);
    const [showDistrictModal, setShowDistrictModal] = useState(false);
    const [districts, setDistricts] = useState([]);
    const [districtsLoading, setDistrictsLoading] = useState(false);
    const [isOtherDistrict, setIsOtherDistrict] = useState(!!reduxCustomDistrict);

    // Состояния для ошибок
    const [nameError, setNameError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [addressError, setAddressError] = useState('');
    const [genderError, setGenderError] = useState('');
    const [districtError, setDistrictError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    const genderOptions = [
        { value: 'MALE', label: 'Мужской' },
        { value: 'FEMALE', label: 'Женский' },
        { value: 'PREFER_NOT_TO_SAY', label: 'Предпочитаю не указывать' }
    ];

    // Загрузка районов с сервера
    const loadDistricts = useCallback(async () => {
        setDistrictsLoading(true);
        try {
            const response = await api.get('/api/districts');
            if (response.data?.status === 'success' && Array.isArray(response.data.data)) {
                setDistricts(response.data.data);
            }
        } catch (error) {
            console.error('Ошибка загрузки районов:', error);
        } finally {
            setDistrictsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDistricts();
    }, [loadDistricts]);

    useEffect(() => {
        setLocalName(reduxName);
    }, [reduxName]);

    useEffect(() => {
        setLocalPhone(reduxPhone);
    }, [reduxPhone]);

    useEffect(() => {
        setLocalAddress(reduxAddress);
    }, [reduxAddress]);

    useEffect(() => {
        setLocalGender(reduxGender);
    }, [reduxGender]);

    useEffect(() => {
        setLocalDistrictId(reduxDistrictId);
    }, [reduxDistrictId]);

    useEffect(() => {
        setLocalCustomDistrict(reduxCustomDistrict ? OTHER_DISTRICT_NAME : '');
        if (reduxCustomDistrict) {
            setIsOtherDistrict(true);
        }
    }, [reduxCustomDistrict]);

    const getGenderLabel = () => {
        const selectedGender = genderOptions.find(option => option.value === gender);
        return selectedGender ? selectedGender.label : '';
    };

    const getDistrictLabel = () => {
        if (isOtherDistrict) {
            return OTHER_DISTRICT_NAME;
        }
        const selectedDistrict = districts.find(d => d.id === districtId);
        return selectedDistrict ? selectedDistrict.name : '';
    };

    const handleGenderSelect = (value) => {
        setLocalGender(value);
        dispatch(setGender(value));
        setGenderError('');
        setShowGenderModal(false);
    };

    const handleDistrictSelect = (district) => {
        if (district === 'other') {
            setIsOtherDistrict(true);
            setLocalDistrictId(null);
            setLocalCustomDistrict(OTHER_DISTRICT_NAME);
            dispatch(setDistrictId(null));
            dispatch(setCustomDistrict(OTHER_DISTRICT_NAME));
            setDistrictError('');
            setShowDistrictModal(false);
        } else {
            setIsOtherDistrict(false);
            setLocalDistrictId(district.id);
            setLocalCustomDistrict('');
            dispatch(setDistrictId(district.id));
            dispatch(setCustomDistrict(''));
            setDistrictError('');
            setShowDistrictModal(false);
        }
    };

    const handleNameChange = (text) => {
        setLocalName(text);
        setNameError('');
    };

    // Форматирование телефона: +7 (XXX) XXX-XX-XX
    const formatPhoneNumber = (text) => {
        let digits = text.replace(/\D/g, '');
        
        if (digits.startsWith('8')) {
            digits = '7' + digits.slice(1);
        }
        
        if (digits.length > 0 && !digits.startsWith('7')) {
            digits = '7' + digits;
        }
        
        digits = digits.slice(0, 11);
        
        let formatted = '';
        if (digits.length > 0) {
            formatted = '+7';
        }
        if (digits.length > 1) {
            formatted += ' (' + digits.slice(1, 4);
        }
        if (digits.length >= 4) {
            formatted += ')';
        }
        if (digits.length > 4) {
            formatted += ' ' + digits.slice(4, 7);
        }
        if (digits.length > 7) {
            formatted += '-' + digits.slice(7, 9);
        }
        if (digits.length > 9) {
            formatted += '-' + digits.slice(9, 11);
        }
        
        return formatted;
    };

    const handlePhoneChange = (text) => {
        const formatted = formatPhoneNumber(text);
        setLocalPhone(formatted);
        setPhoneError('');
    };

    const handlePhoneFocus = () => {
        if (!phone || phone.trim() === '') {
            setLocalPhone('+7 (');
        }
    };

    const handleAddressChange = (text) => {
        setLocalAddress(text);
        setAddressError('');
    };

    const handleNameBlur = () => {
        dispatch(setName(name));
    };

    const handlePhoneBlur = () => {
        dispatch(setPhone(phone));
    };

    const handleAddressBlur = () => {
        dispatch(setAddress(address));
    };

    const validateForm = () => {
        let isValid = true;

        if (!name) {
            setNameError('Пожалуйста, введите ФИО');
            isValid = false;
        } else if (name.trim().length < 2) {
            setNameError('Имя должно содержать минимум 2 символа');
            isValid = false;
        }

        if (!phone) {
            setPhoneError('Пожалуйста, введите номер телефона');
            isValid = false;
        } else {
            const digits = phone.replace(/\D/g, '');
            if (digits.length < 11) {
                setPhoneError('Введите полный номер телефона');
                isValid = false;
            }
        }

        if (address && address.trim().length > 0 && address.trim().length < 5) {
            setAddressError('Адрес должен содержать минимум 5 символов');
            isValid = false;
        }

        if (!districtId && !isOtherDistrict) {
            setDistrictError('Пожалуйста, выберите район');
            isValid = false;
        }

        // Валидация пароля
        if (!password) {
            setPasswordError('Пожалуйста, введите пароль');
            isValid = false;
        } else if (password.length < 6) {
            setPasswordError('Пароль должен содержать минимум 6 символов');
            isValid = false;
        }

        if (!confirmPassword) {
            setConfirmPasswordError('Пожалуйста, подтвердите пароль');
            isValid = false;
        } else if (password !== confirmPassword) {
            setConfirmPasswordError('Пароли не совпадают');
            isValid = false;
        }

        return isValid;
    };

    const handleServerErrors = (error) => {
        setNameError('');
        setPhoneError('');
        setAddressError('');
        setGenderError('');
        setDistrictError('');
        setPasswordError('');
        setConfirmPasswordError('');

        const errors = error?.errors || error?.details || [];
        
        if (Array.isArray(errors) && errors.length > 0) {
            let hasFieldError = false;
            
            errors.forEach((err) => {
                const field = err.field || err.param || '';
                const message = err.message || err.msg || '';
                
                switch (field.toLowerCase()) {
                    case 'name':
                        setNameError(message);
                        hasFieldError = true;
                        break;
                    case 'phone':
                        setPhoneError(message);
                        hasFieldError = true;
                        break;
                    case 'address':
                        setAddressError(message);
                        hasFieldError = true;
                        break;
                    case 'gender':
                        setGenderError(message);
                        hasFieldError = true;
                        break;
                    case 'districtid':
                    case 'customdistrict':
                    case 'district':
                        setDistrictError(message);
                        hasFieldError = true;
                        break;
                    default:
                        const lowerMessage = message.toLowerCase();
                        if (lowerMessage.includes('имя') || lowerMessage.includes('фио') || lowerMessage.includes('name')) {
                            setNameError(message);
                            hasFieldError = true;
                        } else if (lowerMessage.includes('телефон') || lowerMessage.includes('phone')) {
                            setPhoneError(message);
                            hasFieldError = true;
                        } else if (lowerMessage.includes('адрес') || lowerMessage.includes('address')) {
                            setAddressError(message);
                            hasFieldError = true;
                        } else if (lowerMessage.includes('пол') || lowerMessage.includes('gender')) {
                            setGenderError(message);
                            hasFieldError = true;
                        } else if (lowerMessage.includes('район') || lowerMessage.includes('district')) {
                            setDistrictError(message);
                            hasFieldError = true;
                        }
                        break;
                }
            });
            
            if (hasFieldError) {
                return true;
            }
        }
        
        const errorMessage = error?.message || '';
        const lowerMessage = errorMessage.toLowerCase();
        
        if (lowerMessage.includes('телефон') || lowerMessage.includes('phone')) {
            setPhoneError(errorMessage);
            return true;
        } else if (lowerMessage.includes('адрес') || lowerMessage.includes('address')) {
            setAddressError(errorMessage);
            return true;
        } else if (lowerMessage.includes('район') || lowerMessage.includes('district')) {
            setDistrictError(errorMessage);
            return true;
        }
        
        return false;
    };

    const handleRegister = async () => {
        console.log('Данные формы (телефон) перед отправкой:', { name, phone, address, gender, districtId, customDistrict });
        dispatch(setName(name));
        dispatch(setPhone(phone));
        dispatch(setAddress(address));
        dispatch(setGender(gender));

        if (!validateForm()) {
            return;
        }

        if (!privacyAgreed) {
            GlobalAlert.show({
                type: 'warning',
                title: 'Согласие на обработку персональных данных',
                message: 'Для продолжения регистрации необходимо дать согласие на обработку персональных данных. Пожалуйста, ознакомьтесь с соглашением и отметьте соответствующий чекбокс.',
            });
            return;
        }

        const payload = {
            phone,
            name,
            address,
            gender,
            districtId: isOtherDistrict ? null : districtId,
            customDistrict: isOtherDistrict ? OTHER_DISTRICT_NAME : null,
            password,
        };

        try {
            const result = await retryRequest(
                () => dispatch(initiatePhoneRegister(payload)).unwrap(),
                {
                    maxRetries: 4, // 5 попыток суммарно
                    baseDelayMs: 2000,
                    maxDelayMs: 8000,
                    waitForConnection: true, // ждём восстановления интернета перед каждой попыткой
                    connectionTimeoutMs: 30000,
                    onRetry: (attempt) => {
                        console.log(`🔄 Повторная попытка регистрации по телефону ${attempt + 1}/5...`);
                    },
                }
            );

            console.log('Результат initiatePhoneRegister:', result);
            const tempToken = result?.registrationToken || null;
            if (tempToken) {
                onVerification(tempToken);
            }
        } catch (error) {
            console.error('Ошибка регистрации по телефону:', error);

            const handledAsFieldError = handleServerErrors(error);

            if (!handledAsFieldError) {
                const errorMessage = error?.message || '';
                const lowerMessage = errorMessage.toLowerCase();

                const isNetworkError =
                    error?.code === 'ERR_NETWORK' ||
                    error?.originalError?.code === 'ERR_NETWORK' ||
                    lowerMessage === 'network error' ||
                    lowerMessage.includes('network') ||
                    lowerMessage.includes('интернет') ||
                    lowerMessage.includes('соедин') ||
                    lowerMessage.includes('timeout') ||
                    lowerMessage.includes('timed out');

                const userMessage = isNetworkError
                    ? 'Не удалось подключиться к серверу после 5 попыток. Проверьте подключение к интернету и попробуйте снова.'
                    : (errorMessage || 'Произошла ошибка при регистрации. Проверьте введённые данные и попробуйте снова.');

                GlobalAlert.show({
                    type: 'error',
                    title: 'Ошибка регистрации',
                    message: userMessage,
                    buttons: [
                        {
                            text: 'Отмена',
                            style: 'cancel',
                        },
                        {
                            text: 'Повторить',
                            style: 'primary',
                            icon: 'refresh',
                            onPress: () => {
                                handleRegister();
                            },
                        },
                    ],
                });
            }
        }
    };

    const RequiredLabel = ({ text, required = true }) => (
        <Text style={styles.inputLabel}>
            {text}
            {required && <Text style={styles.requiredStar}> *</Text>}
        </Text>
    );

    return (
        <View style={styles.formContainer}>
            <Text style={styles.infoText}>
                📱 Мы отправим SMS с кодом подтверждения
            </Text>

            <View style={styles.inputsContainer}>
                <View style={styles.inputContainer}>
                    <RequiredLabel text="Ваш телефон" />
                    <CustomTextInput
                        style={[
                            styles.input,
                            phoneError ? styles.inputError : null
                        ]}
                        value={phone}
                        onChangeText={handlePhoneChange}
                        onBlur={handlePhoneBlur}
                        onFocus={handlePhoneFocus}
                        keyboardType="phone-pad"
                        placeholder="+7 (___) ___-__-__"
                        placeholderTextColor={placeholderColor}
                        maxLength={18}
                    />
                    {phoneError ? (
                        <Text style={styles.errorText}>{phoneError}</Text>
                    ) : null}
                    <View style={styles.inputUnderline} />
                </View>

                <View style={styles.inputContainer}>
                    <RequiredLabel text="Ваши ФИО" />
                    <CustomTextInput
                        style={[
                            styles.input,
                            nameError ? styles.inputError : null
                        ]}
                        value={name}
                        onChangeText={handleNameChange}
                        onBlur={handleNameBlur}
                        placeholder="Фамилия Имя Отчество"
                        placeholderTextColor={placeholderColor}
                    />
                    {nameError ? (
                        <Text style={styles.errorText}>{nameError}</Text>
                    ) : null}
                    <View style={styles.inputUnderline} />
                </View>

                <View style={styles.inputContainer}>
                    <RequiredLabel text="Ваш адрес" required={false} />
                    <CustomTextInput
                        style={[
                            styles.input,
                            addressError ? styles.inputError : null
                        ]}
                        value={address}
                        onChangeText={handleAddressChange}
                        onBlur={handleAddressBlur}
                        placeholder="г. Магас, ул. Примерная, д. 1"
                        placeholderTextColor={placeholderColor}
                    />
                    {addressError ? (
                        <Text style={styles.errorText}>{addressError}</Text>
                    ) : null}
                    <View style={styles.inputUnderline} />
                </View>

                <View style={styles.inputContainer}>
                    <RequiredLabel text="Ваш район" />
                    <TouchableOpacity
                        style={[styles.input, styles.genderSelector]}
                        onPress={() => setShowDistrictModal(true)}
                    >
                        <Text style={(districtId || customDistrict) ? styles.inputText : styles.placeholderText}>
                            {(districtId || customDistrict) ? getDistrictLabel() : 'Выберите район'}
                        </Text>
                    </TouchableOpacity>
                    {districtError ? (
                        <Text style={styles.errorText}>{districtError}</Text>
                    ) : null}
                    <View style={styles.inputUnderline} />
                </View>

                <View style={styles.inputContainer}>
                    <RequiredLabel text="Ваш пол" required={false} />
                    <TouchableOpacity
                        style={[styles.input, styles.genderSelector]}
                        onPress={() => setShowGenderModal(true)}
                    >
                        <Text style={gender ? styles.inputText : styles.placeholderText}>
                            {gender ? getGenderLabel() : 'Выберите пол'}
                        </Text>
                    </TouchableOpacity>
                    {genderError ? (
                        <Text style={styles.errorText}>{genderError}</Text>
                    ) : null}
                    <View style={styles.inputUnderline} />
                </View>

                <View style={styles.inputContainer}>
                    <RequiredLabel text="Пароль" />
                    <View style={styles.passwordFieldContainer}>
                        <CustomTextInput
                            style={[
                                styles.input,
                                styles.passwordInput,
                                passwordError ? styles.inputError : null
                            ]}
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                if (passwordError) setPasswordError('');
                            }}
                            placeholder="Минимум 6 символов"
                            placeholderTextColor={placeholderColor}
                            secureTextEntry={!isPasswordVisible}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={styles.passwordVisibilityButton}
                            onPress={() => setIsPasswordVisible((prev) => !prev)}
                            disabled={isLoading}
                            accessibilityRole="button"
                            accessibilityLabel={isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                        >
                            <Ionicons
                                name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                                size={normalize(24)}
                                color={passwordIconColor}
                            />
                        </TouchableOpacity>
                    </View>
                    {passwordError ? (
                        <Text style={styles.errorText}>{passwordError}</Text>
                    ) : null}
                    <View style={styles.inputUnderline} />
                </View>

                <View style={styles.inputContainer}>
                    <RequiredLabel text="Подтверждение пароля" />
                    <View style={styles.passwordFieldContainer}>
                        <CustomTextInput
                            style={[
                                styles.input,
                                styles.passwordInput,
                                confirmPasswordError ? styles.inputError : null
                            ]}
                            value={confirmPassword}
                            onChangeText={(text) => {
                                setConfirmPassword(text);
                                if (confirmPasswordError) setConfirmPasswordError('');
                            }}
                            placeholder="Повторите пароль"
                            placeholderTextColor={placeholderColor}
                            secureTextEntry={!isConfirmPasswordVisible}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={styles.passwordVisibilityButton}
                            onPress={() => setIsConfirmPasswordVisible((prev) => !prev)}
                            disabled={isLoading}
                            accessibilityRole="button"
                            accessibilityLabel={isConfirmPasswordVisible ? 'Скрыть подтверждение пароля' : 'Показать подтверждение пароля'}
                        >
                            <Ionicons
                                name={isConfirmPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                                size={normalize(24)}
                                color={passwordIconColor}
                            />
                        </TouchableOpacity>
                    </View>
                    {confirmPasswordError ? (
                        <Text style={styles.errorText}>{confirmPasswordError}</Text>
                    ) : null}
                    <View style={styles.inputUnderline} />
                </View>
            </View>

            <View style={styles.privacyContainer}>
                <View style={styles.checkboxContainer}>
                    <TouchableOpacity
                        style={styles.checkboxWrapper}
                        onPress={() => setPrivacyAgreed(!privacyAgreed)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.checkbox, privacyAgreed && styles.checkboxChecked]}>
                            {privacyAgreed && (
                                <Text style={styles.checkmark}>✓</Text>
                            )}
                        </View>
                    </TouchableOpacity>
                    <View style={styles.privacyTextContainer}>
                        <Text style={styles.privacyText}>
                            Я согласен(а) на{' '}
                            <Text
                                style={styles.privacyLink}
                                onPress={() => navigation.navigate('PrivacyPolicy')}
                            >
                                обработку персональных данных
                            </Text>
                        </Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity
                style={[
                    styles.button,
                    (isLoading || !privacyAgreed) && styles.buttonDisabled
                ]}
                onPress={handleRegister}
                disabled={isLoading || !privacyAgreed}
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Продолжить</Text>
                )}
            </TouchableOpacity>

            {/* Модальное окно выбора пола */}
            <Modal
                visible={showGenderModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowGenderModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Выберите пол</Text>
                        <FlatList
                            data={genderOptions}
                            keyExtractor={(item) => item.value}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.optionItem,
                                        gender === item.value && styles.selectedOptionItem
                                    ]}
                                    onPress={() => handleGenderSelect(item.value)}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        gender === item.value && styles.selectedOptionText
                                    ]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowGenderModal(false)}
                        >
                            <Text style={styles.closeButtonText}>Закрыть</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Модальное окно выбора района */}
            <Modal
                visible={showDistrictModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDistrictModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Выберите район</Text>
                        {districtsLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={isDark ? colors.primary : '#000cff'} />
                                <Text style={styles.loadingText}>Загрузка районов...</Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.districtsList}>
                                {districts.map((district) => (
                                    <TouchableOpacity
                                        key={district.id}
                                        style={[
                                            styles.optionItem,
                                            districtId === district.id && !isOtherDistrict && styles.selectedOptionItem
                                        ]}
                                        onPress={() => handleDistrictSelect(district)}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            districtId === district.id && !isOtherDistrict && styles.selectedOptionText
                                        ]}>
                                            {district.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                    style={[
                                        styles.optionItem,
                                        styles.otherDistrictOption,
                                        isOtherDistrict && styles.selectedOptionItem
                                    ]}
                                    onPress={() => handleDistrictSelect('other')}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        styles.otherDistrictText,
                                        isOtherDistrict && styles.selectedOptionText
                                    ]}>
                                        Другой
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowDistrictModal(false)}
                        >
                            <Text style={styles.closeButtonText}>Закрыть</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const { width, height } = Dimensions.get('window');
const scale = width / 430;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const normalizeFont = (size) => {
    const isSmallDevice = height < 700;
    const isLargeDevice = height > 800;

    let newSize = size * scale;
    if (isSmallDevice) {
        newSize = newSize * 0.9;
    } else if (isLargeDevice) {
        newSize = newSize * 1.1;
    }
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const createStyles = (colors, isDark) => StyleSheet.create({
    formContainer: {
        flex: 1,
        paddingHorizontal: normalize(20),
        backgroundColor: 'transparent',
        borderRadius: 0,
        paddingVertical: normalize(20),
        paddingBottom: normalize(60),
        width: '100%',
        marginTop: 0,
        marginBottom: normalize(80),
    },
    infoText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(14),
        color: isDark ? colors.primary : '#000cff',
        textAlign: 'center',
        marginBottom: normalize(20),
        paddingHorizontal: normalize(10),
        paddingVertical: normalize(10),
        backgroundColor: isDark ? 'rgba(124, 127, 232, 0.15)' : 'rgba(0, 12, 255, 0.05)',
        borderRadius: 8,
    },
    inputsContainer: {
        marginBottom: normalize(20),
    },
    inputContainer: {
        marginBottom: normalize(20),
        position: 'relative',
    },
    inputLabel: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(15),
        fontWeight: '600',
        color: isDark ? colors.textSecondary : '#000',
        opacity: isDark ? 1 : 0.4,
        marginBottom: normalize(5),
        lineHeight: normalize(21),
    },
    requiredStar: {
        color: isDark ? colors.error : '#FF0000',
        fontWeight: '700',
        opacity: 1,
    },
    input: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(17),
        fontWeight: '600',
        color: isDark ? colors.textPrimary : '#000',
        paddingBottom: normalize(5),
        height: normalize(40),
        paddingHorizontal: 0,
        borderBottomWidth: 0,
    },
    passwordFieldContainer: {
        position: 'relative',
        justifyContent: 'center',
    },
    passwordInput: {
        paddingRight: normalize(44),
    },
    passwordVisibilityButton: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        width: normalize(44),
        paddingLeft: normalize(12),
    },
    inputText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(17),
        fontWeight: '600',
        color: isDark ? colors.textPrimary : '#000',
    },
    placeholderText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(17),
        fontWeight: '600',
        color: isDark ? colors.textTertiary : '#888',
    },
    genderSelector: {
        justifyContent: 'center',
        height: normalize(40),
    },
    inputUnderline: {
        height: 1,
        backgroundColor: isDark ? colors.border : '#000',
        width: '100%',
        position: 'absolute',
        bottom: 0,
    },
    inputError: {
        color: isDark ? colors.error : '#FF0000',
    },
    errorText: {
        color: isDark ? colors.error : '#FF0000',
        fontSize: normalizeFont(12),
        marginTop: normalize(5),
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    button: {
        backgroundColor: isDark ? colors.primary : '#000cff',
        borderRadius: 30,
        width: Math.min(width * 0.8, normalize(320)),
        height: normalize(70),
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginTop: normalize(10),
        paddingVertical: normalize(5),
        paddingHorizontal: normalize(20),
    },
    buttonDisabled: {
        backgroundColor: isDark ? colors.border : '#d3d3d3',
    },
    buttonText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(17),
        fontWeight: '500',
        textTransform: 'uppercase',
        color: '#fff',
        lineHeight: normalize(30),
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: isDark ? colors.surface : '#fff',
        borderRadius: 20,
        padding: normalize(20),
        width: width * 0.9,
        maxHeight: height * 0.7,
    },
    modalTitle: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(18),
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: normalize(20),
        color: isDark ? colors.textPrimary : '#000',
    },
    optionItem: {
        padding: normalize(15),
        borderBottomWidth: 1,
        borderBottomColor: isDark ? colors.border : '#eee',
    },
    selectedOptionItem: {
        backgroundColor: isDark ? 'rgba(124, 127, 232, 0.18)' : 'rgba(0, 12, 255, 0.1)',
    },
    optionText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(16),
        color: isDark ? colors.textPrimary : '#000',
    },
    selectedOptionText: {
        color: isDark ? colors.primary : '#000cff',
        fontWeight: '600',
    },
    closeButton: {
        marginTop: normalize(20),
        padding: normalize(15),
        backgroundColor: isDark ? colors.primary : '#000cff',
        borderRadius: 10,
        alignItems: 'center',
    },
    closeButtonText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: '#fff',
    },
    districtsList: {
        maxHeight: height * 0.4,
    },
    loadingContainer: {
        padding: normalize(30),
        alignItems: 'center',
    },
    loadingText: {
        marginTop: normalize(10),
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(14),
        color: isDark ? colors.textSecondary : '#666',
    },
    otherDistrictOption: {
        borderTopWidth: 2,
        borderTopColor: isDark ? colors.border : '#ddd',
        marginTop: normalize(10),
    },
    otherDistrictText: {
        fontStyle: 'italic',
    },
    privacyContainer: {
        marginTop: normalize(10),
        marginBottom: normalize(15),
        paddingHorizontal: normalize(5),
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkboxWrapper: {
        marginRight: normalize(10),
    },
    checkbox: {
        width: normalize(24),
        height: normalize(24),
        borderWidth: 2,
        borderColor: isDark ? colors.border : '#000',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
    },
    checkboxChecked: {
        backgroundColor: isDark ? colors.primary : '#000cff',
        borderColor: isDark ? colors.primary : '#000cff',
    },
    checkmark: {
        color: '#FFFFFF',
        fontSize: normalizeFont(16),
        fontWeight: '700',
    },
    privacyTextContainer: {
        flex: 1,
        paddingTop: normalize(2),
    },
    privacyText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(13),
        fontWeight: '400',
        color: isDark ? colors.textSecondary : '#333333',
        lineHeight: normalize(18),
    },
    privacyLink: {
        color: isDark ? colors.primary : '#000cff',
        textDecorationLine: 'underline',
        fontWeight: '500',
    },
});

