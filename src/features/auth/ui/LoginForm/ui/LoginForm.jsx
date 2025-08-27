import React, {useState, useEffect, useRef} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    StyleSheet,
    Dimensions,
    PixelRatio,
    Keyboard,
    Animated,
    ScrollView,
    Alert
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {login, clearError, setTokens, setUser} from '@entities/auth';
import {selectEmail, selectPassword, setEmail, setPassword} from '@entities/auth';
import {CustomTextInput} from '@shared/ui/CustomTextInput/CustomTextInput';
import {clearProfile, fetchProfile} from '@entities/profile';
import {normalize, normalizeFont} from "@shared/lib/normalize";

export const LoginForm = () => {
    const dispatch = useDispatch();
    const email = useSelector(selectEmail) || '';
    const password = useSelector(selectPassword) || '';
    const isLoading = useSelector((state) => state.auth?.isLoading ?? false);
    const error = useSelector((state) => state.auth?.error);

    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [formError, setFormError] = useState('');
    const [localEmail, setLocalEmail] = useState(email);
    const [localPassword, setLocalPassword] = useState(password);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Анимированное значение для смещения формы
    const formMarginTop = useRef(new Animated.Value(0)).current;

    // Слушатели клавиатуры
    useEffect(() => {
        const keyboardWillShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (event) => {
                setKeyboardVisible(true);
                // Анимируем смещение формы вверх при появлении клавиатуры
                Animated.timing(formMarginTop, {
                    toValue: -normalize(60), // Смещаем форму вверх
                    duration: Platform.OS === 'ios' ? event.duration : 300,
                    useNativeDriver: false
                }).start();
            }
        );

        const keyboardWillHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (event) => {
                setKeyboardVisible(false);
                // Возвращаем форму в исходное положение при скрытии клавиатуры
                Animated.timing(formMarginTop, {
                    toValue: 0,
                    duration: Platform.OS === 'ios' ? event.duration : 300,
                    useNativeDriver: false
                }).start();
            }
        );

        return () => {
            keyboardWillShowListener.remove();
            keyboardWillHideListener.remove();
        };
    }, []);

    useEffect(() => {
        setLocalEmail(email);
    }, [email]);

    useEffect(() => {
        setLocalPassword(password);
    }, [password]);

    useEffect(() => {
        if (email) setEmailError('');
        if (password) setPasswordError('');
        if (email || password) setFormError('');
    }, [email, password]);

    useEffect(() => {
        if (error && !isLoading) {
            handleErrorDisplay(error);
        } else {
            setEmailError('');
            setPasswordError('');
            setFormError('');
        }
    }, [error, isLoading]);

    const handleErrorDisplay = (errorMessage) => {
        if (!errorMessage) return;

        console.log('Processing error:', errorMessage);

        const lowerCaseError = typeof errorMessage === 'string'
            ? errorMessage.toLowerCase()
            : '';

        if (lowerCaseError.includes('неверный email') ||
            lowerCaseError.includes('не найден')) {
            setEmailError('Пользователь с таким email не найден');
            setPasswordError('');
            setFormError('');
        } else if (lowerCaseError.includes('пароль') ||
            lowerCaseError.includes('password') ||
            lowerCaseError.includes('credentials')) {
            setPasswordError('Неверный пароль');
            setEmailError('');
            setFormError('');
        } else if (lowerCaseError.includes('401') ||
            lowerCaseError.includes('unauthorized') ||
            lowerCaseError.includes('неверн')) {
            setPasswordError('Неверный email или пароль');
            setEmailError('');
            setFormError('');
        } else {
            setFormError(errorMessage);
            setEmailError('');
            setPasswordError('');
        }
    };

    const validateForm = () => {
        let isValid = true;

        if (!localEmail) {
            setEmailError('Пожалуйста, введите email');
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(localEmail)) {
            setEmailError('Пожалуйста, введите корректный email');
            isValid = false;
        }

        if (!localPassword) {
            setPasswordError('Пожалуйста, введите пароль');
            isValid = false;
        }

        return isValid;
    };

    const handleLogin = () => {
        if (isLoading) {
            return;
        }

        setEmailError('');
        setPasswordError('');
        setFormError('');
        dispatch(clearError());

        dispatch(setEmail(localEmail));
        dispatch(setPassword(localPassword));

        if (!validateForm()) {
            return;
        }

        // Полный сброс состояния перед входом нового пользователя
        dispatch({ type: 'RESET_APP_STATE' });

        // Выполняем вход с обработкой результата
        dispatch(login({email: localEmail, password: localPassword}))
            .unwrap()
            .then(result => {
                if (result.requiresTwoFactor) {
                    return;
                }

                if (result.tokens && result.user) {
                    console.log('Вход выполнен успешно для пользователя ID:', result.user.id);

                    dispatch(setTokens(result.tokens));
                    dispatch(setUser(result.user));

                    // Сразу запрашиваем профиль для нового пользователя
                    dispatch(fetchProfile());
                }
            })
            .catch(err => {
                console.log('Login error caught:', err);

                // Обработка ошибок
                if (typeof err === 'string') {
                    if (err.toLowerCase().includes('пароль')) {
                        setPasswordError(err);
                    } else if (err.toLowerCase().includes('email') || err.toLowerCase().includes('почта')) {
                        setEmailError(err);
                    } else {
                        setFormError(err);
                    }
                } else {
                    setFormError('Произошла ошибка при входе');
                }
            });
    };


    const handleEmailChange = (text) => {
        setLocalEmail(text);
        setEmailError('');
        setFormError('');
    };

    const handlePasswordChange = (text) => {
        setLocalPassword(text);
        setPasswordError('');
        setFormError('');
    };

    const handleEmailBlur = () => {
        dispatch(setEmail(localEmail));
    };

    const handlePasswordBlur = () => {
        dispatch(setPassword(localPassword));
    };

    return (
        <Animated.View style={[
            styles.formContainer,
            {marginTop: formMarginTop}
        ]}>
            <View style={styles.inputsContainer}>
                <View style={styles.emailInputContainer}>
                    <Text style={styles.inputLabel}>Ваша почта/номер телефона</Text>
                    <CustomTextInput
                        style={styles.input}
                        value={localEmail}
                        onChangeText={handleEmailChange}
                        onBlur={handleEmailBlur}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholder="Icbrg@gmail.com"
                        editable={!isLoading}
                    />
                    <View style={[
                        styles.inputUnderline,
                        emailError ? styles.errorUnderline : null
                    ]}/>
                    {emailError ? (
                        <Text style={styles.errorText}>{emailError}</Text>
                    ) : null}
                </View>

                <View style={styles.passwordInputContainer}>
                    <Text style={styles.inputLabel}>Ваш пароль</Text>
                    <CustomTextInput
                        style={styles.input}
                        value={localPassword}
                        onChangeText={handlePasswordChange}
                        onBlur={handlePasswordBlur}
                        secureTextEntry
                        placeholder="********"
                        editable={!isLoading}
                    />
                    <View style={[
                        styles.inputUnderline,
                        passwordError ? styles.errorUnderline : null
                    ]}/>
                    {passwordError ? (
                        <Text style={styles.errorText}>{passwordError}</Text>
                    ) : null}
                </View>
            </View>

            {formError ? (
                <Text style={styles.globalErrorText}>{formError}</Text>
            ) : null}

            <TouchableOpacity
                style={[
                    styles.button,
                    isLoading && styles.buttonDisabled
                ]}
                onPress={handleLogin}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff"/>
                ) : (
                    <Text style={styles.buttonText}>Подтвердить</Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

const { width, height } = Dimensions.get('window');
const scale = width / 430;



const styles = StyleSheet.create({
    formContainer: {
        flex: 1,
        paddingHorizontal: normalize(20),
        backgroundColor: 'transparent',
        borderRadius: 0,
        paddingVertical: normalize(20),
        width: '100%',
        marginTop: 0,
    },
    inputsContainer: {
        marginBottom: normalize(20),
    },
    emailInputContainer: {
        marginBottom: normalize(20),
        position: 'relative',
    },
    passwordInputContainer: {
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
    inputUnderline: {
        height: 1,
        backgroundColor: '#000',
        width: '100%',
    },
    errorUnderline: {
        backgroundColor: '#FF0000',
        height: 1.5,
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
    forgotPasswordContainer: {
        alignItems: 'center',
        marginBottom: normalize(20),
    },
    forgotPasswordText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(17),
        fontWeight: '600',
        color: '#3339b0',
        lineHeight: normalize(22),
        paddingHorizontal: normalize(10),
    },
    button: {
        backgroundColor: '#000cff',
        borderRadius: 30,
        width: Math.min(width * 0.8, normalize(320)),
        height: normalize(70),
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        paddingVertical: normalize(5),
        paddingHorizontal: normalize(20),
        paddingBottom: normalize(10),
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
    textDisabled: {
        opacity: 0.5
    }
});

