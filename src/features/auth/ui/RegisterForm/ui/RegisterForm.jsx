import React, { useState, useEffect } from 'react';
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
    FlatList
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { selectEmail, selectPassword, setEmail, setPassword, selectName, setName, selectPhone, setPhone, selectAddress, setAddress, selectGender, setGender } from '@entities/auth';
import { initiateRegister } from '@entities/auth';
import { CustomTextInput } from '@/shared/ui/CustomTextInput/CustomTextInput';

export const RegisterForm = ({ onVerification }) => {
    const dispatch = useDispatch();

    const reduxEmail = useSelector(selectEmail) || '';
    const reduxPassword = useSelector(selectPassword) || '';
    const reduxName = useSelector(selectName) || '';
    const reduxPhone = useSelector(selectPhone) || '';
    const reduxAddress = useSelector(selectAddress) || '';
    const reduxGender = useSelector(selectGender) || '';
    const isLoading = useSelector((state) => state.auth?.isLoading ?? false);

    const [email, setLocalEmail] = useState(reduxEmail);
    const [password, setLocalPassword] = useState(reduxPassword);
    const [name, setLocalName] = useState(reduxName);
    const [phone, setLocalPhone] = useState(reduxPhone);
    const [address, setLocalAddress] = useState(reduxAddress);
    const [gender, setLocalGender] = useState(reduxGender);
    const [showGenderModal, setShowGenderModal] = useState(false);

    // Состояния для ошибок
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [nameError, setNameError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [addressError, setAddressError] = useState('');
    const [genderError, setGenderError] = useState('');

    const genderOptions = [
        { value: 'MALE', label: 'Мужской' },
        { value: 'FEMALE', label: 'Женский' },
        { value: 'OTHER', label: 'Другой' },
        { value: 'PREFER_NOT_TO_SAY', label: 'Предпочитаю не указывать' }
    ];

    useEffect(() => {
        setLocalEmail(reduxEmail);
    }, [reduxEmail]);

    useEffect(() => {
        setLocalPassword(reduxPassword);
    }, [reduxPassword]);

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

    const getGenderLabel = () => {
        const selectedGender = genderOptions.find(option => option.value === gender);
        return selectedGender ? selectedGender.label : '';
    };

    const handleGenderSelect = (value) => {
        setLocalGender(value);
        dispatch(setGender(value));
        setGenderError('');
        setShowGenderModal(false);
    };

    const handleEmailChange = (text) => {
        setLocalEmail(text);
        setEmailError('');
    };

    const handlePasswordChange = (text) => {
        setLocalPassword(text);
        setPasswordError('');
    };

    const handleNameChange = (text) => {
        setLocalName(text);
        setNameError('');
    };

    const handlePhoneChange = (text) => {
        setLocalPhone(text);
        setPhoneError('');
    };

    const handleAddressChange = (text) => {
        setLocalAddress(text);
        setAddressError('');
    };

    const handleEmailBlur = () => {
        dispatch(setEmail(email));
    };

    const handlePasswordBlur = () => {
        dispatch(setPassword(password));
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

        if (!email) {
            setEmailError('Пожалуйста, введите email');
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            setEmailError('Пожалуйста, введите корректный email');
            isValid = false;
        }

        if (!password) {
            setPasswordError('Пожалуйста, введите пароль');
            isValid = false;
        } else if (password.length < 6) {
            setPasswordError('Пароль должен содержать не менее 6 символов');
            isValid = false;
        }

        if (!name) {
            setNameError('Пожалуйста, введите ФИО');
            isValid = false;
        }

        if (!phone) {
            setPhoneError('Пожалуйста, введите номер телефона');
            isValid = false;
        }

        if (!address) {
            setAddressError('Пожалуйста, введите адрес');
            isValid = false;
        }

        if (!gender) {
            setGenderError('Пожалуйста, выберите пол');
            isValid = false;
        }

        return isValid;
    };

    const handleRegister = async () => {
        console.log('Данные формы перед отправкой:', { email, password, name, phone, address, gender });
        dispatch(setEmail(email));
        dispatch(setPassword(password));
        dispatch(setName(name));
        dispatch(setPhone(phone));
        dispatch(setAddress(address));
        dispatch(setGender(gender));

        if (!validateForm()) {
            return;
        }

        try {
            const result = await dispatch(initiateRegister({ email, password, name, phone, address, gender })).unwrap();
            console.log('Результат initiateRegister:', result);
            const tempToken = result?.registrationToken || null;
            if (tempToken) {
                onVerification(tempToken);
            }
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            Alert.alert('Ошибка', error?.message || 'Произошла ошибка при регистрации');
        }
    };

    return (
        <View style={styles.formContainer}>
            <View style={styles.inputsContainer}>
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Ваша почта</Text>
                    <CustomTextInput
                        style={[
                            styles.input,
                            emailError ? styles.inputError : null
                        ]}
                        value={email}
                        onChangeText={handleEmailChange}
                        onBlur={handleEmailBlur}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholder="Icbrg@gmail.com"
                    />
                    {emailError ? (
                        <Text style={styles.errorText}>{emailError}</Text>
                    ) : null}
                    <View style={styles.inputUnderline} />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Ваш пароль</Text>
                    <CustomTextInput
                        style={[
                            styles.input,
                            passwordError ? styles.inputError : null
                        ]}
                        value={password}
                        onChangeText={handlePasswordChange}
                        onBlur={handlePasswordBlur}
                        secureTextEntry
                        placeholder="********"
                    />
                    {passwordError ? (
                        <Text style={styles.errorText}>{passwordError}</Text>
                    ) : null}
                    <View style={styles.inputUnderline} />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Ваши ФИО</Text>
                    <CustomTextInput
                        style={[
                            styles.input,
                            nameError ? styles.inputError : null
                        ]}
                        value={name}
                        onChangeText={handleNameChange}
                        onBlur={handleNameBlur}
                        placeholder="Фамилия Имя Отчество"
                    />
                    {nameError ? (
                        <Text style={styles.errorText}>{nameError}</Text>
                    ) : null}
                    <View style={styles.inputUnderline} />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Ваш телефон</Text>
                    <CustomTextInput
                        style={[
                            styles.input,
                            phoneError ? styles.inputError : null
                        ]}
                        value={phone}
                        onChangeText={handlePhoneChange}
                        onBlur={handlePhoneBlur}
                        keyboardType="phone-pad"
                        placeholder="+7 (928) 123-45-67"
                    />
                    {phoneError ? (
                        <Text style={styles.errorText}>{phoneError}</Text>
                    ) : null}
                    <View style={styles.inputUnderline} />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Ваш адрес</Text>
                    <CustomTextInput
                        style={[
                            styles.input,
                            addressError ? styles.inputError : null
                        ]}
                        value={address}
                        onChangeText={handleAddressChange}
                        onBlur={handleAddressBlur}
                        placeholder="г. Магас, ул. Примерная, д. 1"
                    />
                    {addressError ? (
                        <Text style={styles.errorText}>{addressError}</Text>
                    ) : null}
                    <View style={styles.inputUnderline} />
                </View>

                {/* Новое поле выбора пола */}
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Ваш пол</Text>
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
            </View>

            <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Подтвердить</Text>
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

const styles = StyleSheet.create({
    formContainer: {
        flex: 1,
        paddingHorizontal: normalize(20),
        backgroundColor: 'transparent',
        borderRadius: 0,
        paddingVertical: normalize(20),
        width: '100%',
        marginTop: 0,
        marginBottom: 50,
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
        color: '#000',
        opacity: 0.4,
        marginBottom: normalize(5),
        lineHeight: normalize(21),
    },
    input: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(17),
        fontWeight: '600',
        color: '#000',
        paddingBottom: normalize(5),
        height: normalize(40),
        paddingHorizontal: 0,
        borderBottomWidth: 0,
    },
    inputText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(17),
        fontWeight: '600',
        color: '#000',
    },
    placeholderText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(17),
        fontWeight: '600',
        color: '#888',
    },
    genderSelector: {
        justifyContent: 'center',
        height: normalize(40),
    },
    inputUnderline: {
        height: 1,
        backgroundColor: '#000',
        width: '100%',
        position: 'absolute',
        bottom: 0,
    },
    inputError: {
        color: '#FF0000',
    },
    errorText: {
        color: '#FF0000',
        fontSize: normalizeFont(12),
        marginTop: normalize(5),
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    globalErrorText: {
        color: '#FF0000',
        fontSize: normalizeFont(14),
        textAlign: 'center',
        marginBottom: normalize(15),
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    button: {
        backgroundColor: '#000cff',
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
        backgroundColor: '#d3d3d3',
    },
    buttonText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(17),
        fontWeight: '500',
        textTransform: 'uppercase',
        color: '#fff',
        lineHeight: normalize(30),
    },
    // Стили для модального окна
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
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
        color: '#000',
    },
    optionItem: {
        padding: normalize(15),
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    selectedOptionItem: {
        backgroundColor: 'rgba(0, 12, 255, 0.1)',
    },
    optionText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(16),
        color: '#000',
    },
    selectedOptionText: {
        color: '#000cff',
        fontWeight: '600',
    },
    closeButton: {
        marginTop: normalize(20),
        padding: normalize(15),
        backgroundColor: '#000cff',
        borderRadius: 10,
        alignItems: 'center',
    },
    closeButtonText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: '#fff',
    },
});