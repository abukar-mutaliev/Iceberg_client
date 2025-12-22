import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    StyleSheet,
    Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { initiatePasswordReset, clearError, clearPasswordReset } from '@entities/auth';
import { CustomTextInput } from '@shared/ui/CustomTextInput/CustomTextInput';
import { normalize, normalizeFont } from "@shared/lib/normalize";

export const ForgotPasswordForm = ({ onCodeSent }) => {
    const dispatch = useDispatch();
    const isLoading = useSelector((state) => state.auth?.isLoading ?? false);
    const error = useSelector((state) => state.auth?.error);

    const [identifier, setIdentifier] = useState('');
    const [identifierError, setIdentifierError] = useState('');
    const [formError, setFormError] = useState('');

    useEffect(() => {
        // Очищаем состояние при монтировании
        dispatch(clearPasswordReset());
        dispatch(clearError());
    }, [dispatch]);

    useEffect(() => {
        if (error && !isLoading) {
            handleErrorDisplay(error);
        } else {
            setIdentifierError('');
            setFormError('');
        }
    }, [error, isLoading]);

    const handleErrorDisplay = (errorMessage) => {
        if (!errorMessage) return;

        const lowerCaseError = typeof errorMessage === 'string'
            ? errorMessage.toLowerCase()
            : '';

        if (lowerCaseError.includes('email') || 
            lowerCaseError.includes('почт') ||
            lowerCaseError.includes('не найден')) {
            setIdentifierError('Пользователь с таким email не найден');
            setFormError('');
        } else {
            setFormError(errorMessage);
            setIdentifierError('');
        }
    };

    const validateForm = () => {
        let isValid = true;

        if (!identifier) {
            setIdentifierError('Пожалуйста, введите email');
            isValid = false;
        } else {
            const isEmail = /\S+@\S+\.\S+/.test(identifier);
            if (!isEmail) {
                setIdentifierError('Пожалуйста, введите корректный email');
                isValid = false;
            }
        }

        return isValid;
    };

    const handleSubmit = async () => {
        if (isLoading) {
            return;
        }

        setIdentifierError('');
        setFormError('');
        dispatch(clearError());

        if (!validateForm()) {
            return;
        }

        try {
            const result = await dispatch(initiatePasswordReset(identifier.trim())).unwrap();
            
            if (result.resetToken) {
                // Переходим к форме ввода кода
                onCodeSent(result.resetToken, result.receiveCall || null);
            }
        } catch (err) {
            // Ошибки обрабатываются через Redux state
            if (typeof err === 'string') {
                if (err.toLowerCase().includes('email') || err.toLowerCase().includes('почта')) {
                    setIdentifierError(err);
                } else {
                    setFormError(err);
                }
            }
        }
    };

    const handleIdentifierChange = (text) => {
        setIdentifier(text);
        setIdentifierError('');
        setFormError('');
    };

    return (
        <View style={styles.formContainer}>
            <Text style={styles.title}>Восстановление пароля</Text>
            <Text style={styles.description}>
                Введите email, который вы использовали при регистрации. 
                Мы отправим вам код подтверждения для сброса пароля.
            </Text>

            <View style={styles.inputsContainer}>
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <CustomTextInput
                        style={styles.input}
                        value={identifier}
                        onChangeText={handleIdentifierChange}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholder="email@example.com"
                        editable={!isLoading}
                    />
                    <View style={[
                        styles.inputUnderline,
                        identifierError ? styles.errorUnderline : null
                    ]}/>
                    {identifierError ? (
                        <Text style={styles.errorText}>{identifierError}</Text>
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
                    <Text style={styles.buttonText}>Отправить код</Text>
                )}
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
});
