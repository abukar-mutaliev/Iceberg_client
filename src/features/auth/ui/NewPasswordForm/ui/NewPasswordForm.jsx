import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    StyleSheet,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { completePasswordReset, clearError } from '@entities/auth';
import { CustomTextInput } from '@shared/ui/CustomTextInput/CustomTextInput';
import { normalize, normalizeFont } from "@shared/lib/normalize";
import { useGlobalAlert } from '@shared/ui/CustomAlert';

export const NewPasswordForm = ({ confirmResetToken, onSuccess, onBack }) => {
    const dispatch = useDispatch();
    const { showSuccess } = useGlobalAlert();
    const isLoading = useSelector((state) => state.auth?.isLoading ?? false);
    const error = useSelector((state) => state.auth?.error);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (error && !isLoading) {
            handleErrorDisplay(error);
        } else {
            setPasswordError('');
            setConfirmPasswordError('');
            setFormError('');
        }
    }, [error, isLoading]);

    const handleErrorDisplay = (errorMessage) => {
        if (!errorMessage) return;

        const lowerCaseError = typeof errorMessage === 'string'
            ? errorMessage.toLowerCase()
            : '';

        if (lowerCaseError.includes('пароль') || lowerCaseError.includes('password')) {
            setPasswordError('Ошибка при установке пароля');
            setFormError('');
        } else {
            setFormError(errorMessage);
            setPasswordError('');
        }
    };

    const validateForm = () => {
        let isValid = true;

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

    const handleSubmit = async () => {
        if (isLoading) {
            return;
        }

        setPasswordError('');
        setConfirmPasswordError('');
        setFormError('');
        dispatch(clearError());

        if (!validateForm()) {
            return;
        }

        try {
            await dispatch(completePasswordReset({
                confirmResetToken,
                password
            })).unwrap();
            
            // Показываем уведомление об успехе
            showSuccess(
                'Успешно!',
                'Пароль успешно изменен. Теперь вы можете войти с новым паролем.',
                [
                    {
                        text: 'OK',
                        style: 'primary',
                        icon: 'check',
                        onPress: onSuccess
                    }
                ]
            );
        } catch (err) {
            // Ошибки обрабатываются через Redux state
            if (typeof err === 'string') {
                if (err.toLowerCase().includes('пароль') || err.toLowerCase().includes('password')) {
                    setPasswordError(err);
                } else {
                    setFormError(err);
                }
            }
        }
    };

    const handlePasswordChange = (text) => {
        setPassword(text);
        setPasswordError('');
        setFormError('');
    };

    const handleConfirmPasswordChange = (text) => {
        setConfirmPassword(text);
        setConfirmPasswordError('');
        setFormError('');
    };

    return (
        <View style={styles.formContainer}>
            <Text style={styles.title}>Установите новый пароль</Text>
            <Text style={styles.description}>
                Придумайте надежный пароль, который вы не используете на других сайтах.
            </Text>

            <View style={styles.inputsContainer}>
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Новый пароль</Text>
                    <CustomTextInput
                        style={styles.input}
                        value={password}
                        onChangeText={handlePasswordChange}
                        secureTextEntry
                        placeholder="Минимум 6 символов"
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

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Подтвердите пароль</Text>
                    <CustomTextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={handleConfirmPasswordChange}
                        secureTextEntry
                        placeholder="Повторите пароль"
                        editable={!isLoading}
                    />
                    <View style={[
                        styles.inputUnderline,
                        confirmPasswordError ? styles.errorUnderline : null
                    ]}/>
                    {confirmPasswordError ? (
                        <Text style={styles.errorText}>{confirmPasswordError}</Text>
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
                onPress={handleSubmit}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff"/>
                ) : (
                    <Text style={styles.buttonText}>Сохранить пароль</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
                disabled={isLoading}
            >
                <Text style={styles.backButtonText}>Назад</Text>
            </TouchableOpacity>
        </View>
    );
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
    title: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(24),
        fontWeight: '700',
        color: '#000',
        marginBottom: normalize(10),
        textAlign: 'center',
    },
    description: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(15),
        fontWeight: '400',
        color: '#666',
        marginBottom: normalize(30),
        textAlign: 'center',
        lineHeight: normalizeFont(21),
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
    button: {
        backgroundColor: '#000cff',
        borderRadius: 30,
        width: '100%',
        maxWidth: normalize(320),
        height: normalize(70),
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        paddingVertical: normalize(5),
        paddingHorizontal: normalize(20),
        paddingBottom: normalize(10),
        marginTop: normalize(10),
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
    backButton: {
        marginTop: normalize(20),
        alignItems: 'center',
    },
    backButtonText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(15),
        fontWeight: '600',
        color: '#3339b0',
    },
});
