import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    StyleSheet,
    ActivityIndicator,
    Dimensions,
    Platform,
    StatusBar
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { completeRegister, clearError } from '@entities/auth';

const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;
const isLargeDevice = height > 800;
const statusBarHeight = StatusBar.currentHeight || 0;
const safeTopPadding = Platform.OS === 'android' ? statusBarHeight + 10 : 50;

const adaptiveSize = (baseSize) => {
    if (isSmallDevice) return baseSize * 0.85;
    if (isLargeDevice) return baseSize * 1.1;
    return baseSize;
};

export const VerificationForm = ({ tempToken, onBack }) => {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const dispatch = useDispatch();
    const isLoading = useSelector((state) => state.auth?.isLoading ?? false);
    const error = useSelector((state) => state.auth?.error);

    const inputRefs = useRef([]);
    inputRefs.current = code.map((_, index) => inputRefs.current[index] ?? React.createRef());

    const isCodeComplete = code.every(digit => digit !== '');

    useEffect(() => {
        dispatch(clearError());
        return () => dispatch(clearError());
    }, [dispatch]);

    useEffect(() => {
        if (error) {
            console.log('Current error state:', error);
        }
    }, [error]);

    const handleCodeChange = (text, index) => {
        if (error) dispatch(clearError());

        if (text && !/^\d*$/.test(text)) {
            return;
        }

        const newCode = [...code];
        newCode[index] = text;
        setCode(newCode);

        if (text && index < 5) {
            setTimeout(() => {
                inputRefs.current[index + 1]?.current?.focus();
            }, 10);
        }
    };

    const handleSubmit = async () => {
        const verificationCode = code.join('');
        if (verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
            Alert.alert('Ошибка', 'Пожалуйста, введите 6-значный код');
            return;
        }

        try {
            await dispatch(completeRegister({
                registrationToken: tempToken,
                verificationCode
            })).unwrap();
        } catch (err) {
            console.log('Registration error caught:', err);
        }
    };

    const resetCode = () => {
        setCode(['', '', '', '', '', '']);
        dispatch(clearError());
        setTimeout(() => {
            inputRefs.current[0]?.current?.focus();
        }, 50);
    };

    const handleLayout = () => {
        const firstEmptyIndex = code.findIndex(digit => digit === '');
        if (firstEmptyIndex !== -1) {
            setTimeout(() => {
                inputRefs.current[firstEmptyIndex]?.current?.focus();
            }, 50);
        }
    };

    return (
        <View
            style={styles.container}
            onLayout={handleLayout}
        >
            <Text style={styles.title}>Введите код подтверждения</Text>
            <Text style={styles.subtitle}>Мы отправили код на вашу почту</Text>

            <View style={styles.codeContainer}>
                {code.map((digit, index) => (
                    <TextInput
                        key={index}
                        ref={inputRefs.current[index]}
                        style={[
                            styles.codeInput,
                            error && styles.codeInputError
                        ]}
                        value={digit}
                        onChangeText={(text) => handleCodeChange(text, index)}
                        keyboardType="numeric"
                        maxLength={1}
                        autoFocus={index === 0}
                        textAlign="center"
                        blurOnSubmit={false}
                        autoCorrect={false}
                        underlineColorAndroid="transparent"
                        caretHidden={Platform.OS === 'android'}
                    />
                ))}
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={resetCode} style={styles.resetButton}>
                        <Text style={styles.resetButtonText}>Сбросить код</Text>
                    </TouchableOpacity>
                </View>
            )}

            <TouchableOpacity
                style={[styles.button, (isLoading || !isCodeComplete) && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading || !isCodeComplete}
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={[styles.buttonText, (isLoading || !isCodeComplete) && styles.buttonTextDisabled]}>
                        Подтвердить
                    </Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <Text style={styles.backButtonText}>Назад</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: '#F3F3F3',
        paddingTop: safeTopPadding,
    },
    title: {
        fontSize: adaptiveSize(18),
        fontWeight: 'bold',
        color: '#333',
        marginBottom: adaptiveSize(8),
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    subtitle: {
        fontSize: adaptiveSize(14),
        color: '#666',
        marginBottom: adaptiveSize(24),
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: Math.min(width - 40, 360),
        marginBottom: adaptiveSize(20),
    },
    codeInput: {
        width: adaptiveSize(48),
        height: adaptiveSize(56),
        borderRadius: adaptiveSize(10),
        backgroundColor: '#d9d9d9',
        textAlign: 'center',
        fontSize: adaptiveSize(24),
        color: '#000',
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    codeInputError: {
        borderWidth: 1,
        borderColor: 'red',
        backgroundColor: '#ffeeee',
    },
    errorContainer: {
        marginVertical: adaptiveSize(16),
        alignItems: 'center',
        paddingHorizontal: 20,
        width: '100%',
    },
    errorText: {
        color: 'red',
        fontSize: adaptiveSize(14),
        textAlign: 'center',
        marginBottom: adaptiveSize(8),
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    resetButton: {
        paddingVertical: adaptiveSize(8),
    },
    resetButtonText: {
        color: '#3949ab',
        fontSize: adaptiveSize(14),
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    button: {
        backgroundColor: '#000CFF',
        paddingVertical: adaptiveSize(20),
        paddingHorizontal: adaptiveSize(20),
        borderRadius: adaptiveSize(20),
        width: '90%',
        alignItems: 'center',
        marginBottom: adaptiveSize(20),
    },
    buttonDisabled: {
        backgroundColor: '#ddd',
    },
    buttonText: {
        color: '#fff',
        fontSize: adaptiveSize(16),
        textTransform: 'uppercase',
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    buttonTextDisabled: {
        color: '#A0A0A0',
    },
    backButton: {
        paddingVertical: adaptiveSize(10),
    },
    backButtonText: {
        color: '#3949ab',
        fontSize: adaptiveSize(14),
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
});