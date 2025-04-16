import React, { useState, useEffect, useRef } from 'react';
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
    ScrollView
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '@entities/auth';
import { selectEmail, selectPassword, setEmail, setPassword } from '@entities/auth';
import { CustomTextInput } from '@/shared/ui/CustomTextInput/CustomTextInput';

export const LoginForm = ({ navigation }) => {
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

    const formPosition = useRef(new Animated.Value(0)).current;


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
            if (error.includes('email') || error.includes('почта')) {
                setEmailError(error);
            } else if (error.includes('пароль') || error.includes('password') || error.includes('credentials')) {
                setPasswordError(error);
            } else {
                setFormError(error);
            }

            dispatch(clearError());
        }
    }, [error, isLoading, dispatch]);

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

    const handleLogin = async () => {
        setEmailError('');
        setPasswordError('');
        setFormError('');

        dispatch(setEmail(localEmail));
        dispatch(setPassword(localPassword));

        if (!validateForm()) {
            return;
        }

        try {
            await dispatch(login({ email: localEmail, password: localPassword })).unwrap();
        } catch (error) {
        }
    };

    const handleEmailChange = (text) => {
        setLocalEmail(text);
        setEmailError('');
    };

    const handlePasswordChange = (text) => {
        setLocalPassword(text);
        setPasswordError('');
    };

    const handleEmailBlur = () => {
        dispatch(setEmail(localEmail));
    };

    const handlePasswordBlur = () => {
        dispatch(setPassword(localPassword));
    };

    return (
        <View style={styles.formContainer}>
            <View style={styles.inputsContainer}>
                <View style={styles.emailInputContainer}>
                    <Text style={styles.inputLabel}>Ваша почта/номер телефона</Text>
                    <CustomTextInput
                        style={[
                            styles.input,
                            emailError ? styles.inputError : null
                        ]}
                        value={localEmail}
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

                <View style={styles.passwordInputContainer}>
                    <Text style={styles.inputLabel}>Ваш пароль</Text>
                    <CustomTextInput
                        style={[
                            styles.input,
                            passwordError ? styles.inputError : null
                        ]}
                        value={localPassword}
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
            </View>

            {formError ? (
                <Text style={styles.globalErrorText}>{formError}</Text>
            ) : null}

            <TouchableOpacity
                style={styles.forgotPasswordContainer}
                onPress={() => navigation.navigate('Main')}
            >
                <Text style={styles.forgotPasswordText}>Забыли пароль?</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Подтвердить</Text>
                )}
            </TouchableOpacity>
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
    }, buttonDisabled: {
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
});