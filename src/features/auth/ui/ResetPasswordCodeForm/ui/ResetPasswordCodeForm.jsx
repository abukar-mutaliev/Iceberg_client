import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    StyleSheet,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { verifyResetCode, clearError } from '@entities/auth';
import { CustomTextInput } from '@shared/ui/CustomTextInput/CustomTextInput';
import { normalize, normalizeFont } from "@shared/lib/normalize";

export const ResetPasswordCodeForm = ({ resetToken, receiveCall, onCodeVerified, onBack }) => {
    const dispatch = useDispatch();
    const isLoading = useSelector((state) => state.auth?.isLoading ?? false);
    const error = useSelector((state) => state.auth?.error);

    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState('');
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (error && !isLoading) {
            handleErrorDisplay(error);
        } else {
            setCodeError('');
            setFormError('');
        }
    }, [error, isLoading]);

    const handleErrorDisplay = (errorMessage) => {
        if (!errorMessage) return;

        const lowerCaseError = typeof errorMessage === 'string'
            ? errorMessage.toLowerCase()
            : '';

        if (lowerCaseError.includes('код') || 
            lowerCaseError.includes('code') ||
            lowerCaseError.includes('неверн')) {
            setCodeError('Неверный код подтверждения');
            setFormError('');
        } else {
            setFormError(errorMessage);
            setCodeError('');
        }
    };

    const validateForm = () => {
        let isValid = true;

        if (!code) {
            setCodeError('Пожалуйста, введите код подтверждения');
            isValid = false;
        } else if (code.length !== 6) {
            setCodeError('Код должен содержать 6 цифр');
            isValid = false;
        }

        return isValid;
    };

    const handleSubmit = async () => {
        if (isLoading) {
            return;
        }

        setCodeError('');
        setFormError('');
        dispatch(clearError());

        if (!validateForm()) {
            return;
        }

        try {
            const result = await dispatch(verifyResetCode({
                resetToken,
                verificationCode: code
            })).unwrap();
            
            if (result.confirmResetToken) {
                // Переходим к форме установки нового пароля
                onCodeVerified(result.confirmResetToken);
            }
        } catch (err) {
            // Ошибки обрабатываются через Redux state
            if (typeof err === 'string') {
                if (err.toLowerCase().includes('код') || err.toLowerCase().includes('code')) {
                    setCodeError(err);
                } else {
                    setFormError(err);
                }
            }
        }
    };

    const handleCodeChange = (text) => {
        // Разрешаем только цифры и ограничиваем длину
        const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
        setCode(numericText);
        setCodeError('');
        setFormError('');
    };

    return (
        <View style={styles.formContainer}>
            <Text style={styles.title}>Введите код подтверждения</Text>
            <Text style={styles.description}>
                {receiveCall 
                    ? `Позвоните на номер ${receiveCall.phoneToCall}. Последние 4 цифры входящего номера - это ваш код подтверждения.`
                    : 'Мы отправили код подтверждения на вашу почту. Пожалуйста, введите его ниже.'
                }
            </Text>

            <View style={styles.inputsContainer}>
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Код подтверждения</Text>
                    <CustomTextInput
                        style={styles.input}
                        value={code}
                        onChangeText={handleCodeChange}
                        keyboardType="number-pad"
                        placeholder="000000"
                        maxLength={6}
                        editable={!isLoading}
                    />
                    <View style={[
                        styles.inputUnderline,
                        codeError ? styles.errorUnderline : null
                    ]}/>
                    {codeError ? (
                        <Text style={styles.errorText}>{codeError}</Text>
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
                    <Text style={styles.buttonText}>Подтвердить</Text>
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
        fontSize: normalizeFont(24),
        fontWeight: '700',
        color: '#000',
        paddingBottom: normalize(5),
        height: normalize(50),
        paddingHorizontal: 0,
        borderBottomWidth: 0,
        textAlign: 'center',
        letterSpacing: normalize(8),
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
        textAlign: 'center',
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
