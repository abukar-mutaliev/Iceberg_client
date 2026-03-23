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
    StatusBar,
    Clipboard,
    ScrollView,
    Animated
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { completeRegister, completePhoneRegister, clearError } from '@entities/auth';

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

// Функция для расчета ширины поля ввода кода
const getCodeInputWidth = (codeLength) => {
    const containerPadding = 24 * 2; // paddingHorizontal контейнера
    const codeContainerPadding = adaptiveSize(4) * 2; // paddingHorizontal codeContainer
    const gap = adaptiveSize(8) * (codeLength - 1); // промежутки между полями
    const safetyMargin = 4; // небольшой запас для безопасности
    const availableWidth = width - containerPadding - codeContainerPadding - gap - safetyMargin;
    const inputWidth = availableWidth / codeLength;
    // Ограничиваем минимальную и максимальную ширину
    return Math.max(adaptiveSize(40), Math.min(adaptiveSize(60), inputWidth));
};

export const VerificationForm = ({ 
    tempToken, 
    registrationType = 'email', 
    onBack 
}) => {
    const codeLength = 6;
    const resendCooldownSeconds = registrationType === 'phone' ? 120 : 60;
    const initialCode = new Array(codeLength).fill('');
    
    const [code, setCode] = useState(initialCode);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [shakeAnimation] = useState(new Animated.Value(0));
    const [resendTimer, setResendTimer] = useState(resendCooldownSeconds);
    
    const dispatch = useDispatch();
    const isLoading = useSelector((state) => state.auth?.isLoading ?? false);
    const error = useSelector((state) => state.auth?.error);

    const inputRefs = useRef([]);
    inputRefs.current = code.map((_, index) => inputRefs.current[index] ?? React.createRef());

    const isCodeComplete = code.every(digit => digit !== '');
    const filledCount = code.filter(digit => digit !== '').length;

    useEffect(() => {
        dispatch(clearError());
        return () => dispatch(clearError());
    }, [dispatch]);

    useEffect(() => {
        setResendTimer(resendCooldownSeconds);
    }, [resendCooldownSeconds]);

    useEffect(() => {
        if (resendTimer <= 0) return;

        const intervalId = setInterval(() => {
            setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(intervalId);
    }, [resendTimer]);

    useEffect(() => {
        if (error) {
            // Анимация тряски при ошибке
            Animated.sequence([
                Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true })
            ]).start();
        }
    }, [error]);

    const handleCodePaste = (pastedText, currentIndex) => {
        const cleanedText = pastedText.replace(/\D/g, '');
        const validText = cleanedText.slice(0, codeLength);

        if (validText.length === 0) return;

        const newCode = [...code];

        if (validText.length === codeLength) {
            for (let i = 0; i < codeLength; i++) {
                newCode[i] = validText[i];
            }
            setCode(newCode);
            setTimeout(() => {
                inputRefs.current[codeLength - 1]?.current?.focus();
            }, 10);
        } else {
            let remainingFields = codeLength - currentIndex;
            let charsToFill = Math.min(validText.length, remainingFields);

            for (let i = 0; i < charsToFill; i++) {
                newCode[currentIndex + i] = validText[i];
            }
            setCode(newCode);

            const nextIndex = Math.min(currentIndex + charsToFill, codeLength - 1);
            setTimeout(() => {
                inputRefs.current[nextIndex]?.current?.focus();
            }, 10);
        }
    };

    const handleCodeChange = (text, index) => {
        if (error) dispatch(clearError());

        if (text.length > 1) {
            handleCodePaste(text, index);
            return;
        }

        if (text && !/^\d*$/.test(text)) {
            return;
        }

        const newCode = [...code];
        newCode[index] = text;
        setCode(newCode);

        if (text && index < codeLength - 1) {
            setTimeout(() => {
                inputRefs.current[index + 1]?.current?.focus();
            }, 10);
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace') {
            if (code[index] === '' && index > 0) {
                const newCode = [...code];
                newCode[index - 1] = '';
                setCode(newCode);

                setTimeout(() => {
                    inputRefs.current[index - 1]?.current?.focus();
                }, 10);
            }
        }
    };

    const handlePaste = async (index) => {
        try {
            const clipboardContent = await Clipboard.getString();
            if (clipboardContent && clipboardContent.length > 0) {
                handleCodePaste(clipboardContent, index);
            }
        } catch (err) {
            console.error('Error pasting from clipboard', err);
        }
    };

    const handlePasteFullCode = async () => {
        try {
            const clipboardContent = await Clipboard.getString();
            if (!clipboardContent || clipboardContent.length === 0) {
                Alert.alert('Вставка кода', 'Буфер обмена пуст');
                return;
            }

            handleCodePaste(clipboardContent, 0);
        } catch (err) {
            console.error('Error pasting full code from clipboard', err);
            Alert.alert('Ошибка', 'Не удалось вставить код из буфера обмена');
        }
    };

    const handleSubmit = async () => {
        const verificationCode = code.join('');
        if (verificationCode.length !== codeLength || !/^\d+$/.test(verificationCode)) {
            Alert.alert('Ошибка', `Пожалуйста, введите ${codeLength}-значный код`);
            return;
        }

        try {
            const action = registrationType === 'phone' ? completePhoneRegister : completeRegister;
            
            await dispatch(action({
                registrationToken: tempToken,
                verificationCode
            })).unwrap();
        } catch (err) {
            console.log('Registration error caught:', err);
        }
    };

    const resetCode = () => {
        setCode(new Array(codeLength).fill(''));
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

    // Определяем текст в зависимости от контекста
    const getTitle = () => 'Код подтверждения';

    const getSubtitle = () => {
        if (registrationType === 'phone') {
            return 'Мы отправили SMS с кодом на ваш номер';
        }
        return 'Мы отправили код на вашу почту';
    };

    const getHintText = () => {
        if (registrationType === 'email') {
            return '💡 Проверьте папку "Спам", если код не пришёл';
        }
        return '💡 SMS придёт в течение 1-2 минут';
    };

    const formatTimer = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = String(seconds % 60).padStart(2, '0');
        return `${minutes}:${secs}`;
    };

    return (
        <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.container} onLayout={handleLayout}>
                {/* Шаг прогресса */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '66%' }]} />
                    </View>
                    <Text style={styles.progressText}>Шаг 2 из 3</Text>
                </View>

                {/* Заголовок и описание */}
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>{getTitle()}</Text>
                    {getSubtitle() && <Text style={styles.subtitle}>{getSubtitle()}</Text>}
                    {getHintText() && (
                        <View style={styles.hintContainer}>
                            <Text style={styles.hintText}>{getHintText()}</Text>
                        </View>
                    )}
                </View>

                {/* Индикатор прогресса ввода */}
                <View style={styles.inputProgressContainer}>
                    <Text style={styles.inputProgressText}>
                        {filledCount} из {codeLength}
                    </Text>
                </View>

                {/* Поля ввода кода */}
                <Animated.View 
                    style={[
                        styles.codeContainer,
                        { transform: [{ translateX: shakeAnimation }] }
                    ]}
                >
                    {code.map((digit, index) => {
                        const inputWidth = getCodeInputWidth(codeLength);
                        return (
                            <View key={index} style={styles.inputWrapper}>
                                <TextInput
                                    ref={inputRefs.current[index]}
                                    style={[
                                        styles.codeInput,
                                        { width: inputWidth },
                                        digit !== '' && styles.codeInputFilled,
                                        focusedIndex === index && styles.codeInputFocused,
                                        error && styles.codeInputError
                                    ]}
                                    value={digit}
                                    onChangeText={(text) => handleCodeChange(text, index)}
                                    onKeyPress={(e) => handleKeyPress(e, index)}
                                    onPaste={() => handlePaste(index)}
                                    onFocus={() => setFocusedIndex(index)}
                                    onBlur={() => setFocusedIndex(-1)}
                                    keyboardType="numeric"
                                    maxLength={codeLength}
                                    autoFocus={index === 0}
                                    textAlign="center"
                                    blurOnSubmit={false}
                                    autoCorrect={false}
                                    underlineColorAndroid="transparent"
                                    caretHidden={Platform.OS === 'android'}
                                    contextMenuHidden={false}
                                />
                                {digit !== '' && (
                                    <View style={styles.checkmarkBadge}>
                                        <Text style={styles.checkmark}>✓</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </Animated.View>

                {/* Сообщение об ошибке */}
                {error && (
                    <View style={styles.errorContainer}>
                        <View style={styles.errorBadge}>
                            <Text style={styles.errorIcon}>⚠️</Text>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                        <TouchableOpacity onPress={resetCode} style={styles.resetButton}>
                            <Text style={styles.resetButtonText}>🔄 Очистить и попробовать снова</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Кнопка подтверждения */}
                <TouchableOpacity
                    style={[
                        styles.button,
                        (isLoading || !isCodeComplete) && styles.buttonDisabled,
                        isCodeComplete && !isLoading && styles.buttonReady
                    ]}
                    onPress={handleSubmit}
                    disabled={isLoading || !isCodeComplete}
                    activeOpacity={0.8}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <View style={styles.buttonContent}>
                            <Text style={styles.buttonText}>
                                Подтвердить
                            </Text>
                            {isCodeComplete && <Text style={styles.buttonIcon}>→</Text>}
                        </View>
                    )}
                </TouchableOpacity>

                {/* Дополнительные действия */}
                <View style={styles.actionsCard}>
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={styles.actionPill}
                            onPress={onBack}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.actionPillIcon}>←</Text>
                            <Text style={styles.actionPillLabel} numberOfLines={1}>
                                Назад
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionPill}
                            onPress={handlePasteFullCode}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.actionPillLabel} numberOfLines={1}>
                                Вставить код
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={[
                            styles.resendButton,
                            resendTimer > 0 && styles.resendButtonDisabled,
                        ]}
                        onPress={() => {
                            if (resendTimer > 0) return;
                            Alert.alert('Повторная отправка', 'Код будет отправлен повторно');
                            setResendTimer(resendCooldownSeconds);
                        }}
                        disabled={resendTimer > 0}
                        activeOpacity={0.75}
                    >
                        <Text
                            style={[
                                styles.resendButtonTitle,
                                resendTimer > 0 && styles.resendButtonTitleMuted,
                            ]}
                        >
                            {resendTimer > 0 ? 'Повторная отправка' : 'Отправить код снова'}
                        </Text>
                        {resendTimer > 0 && (
                            <Text style={styles.resendButtonSubtitle}>
                                Доступно через {formatTimer(resendTimer)}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    scrollContent: {
        flexGrow: 1,
    },
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: safeTopPadding + 10,
        paddingBottom: adaptiveSize(48),
        backgroundColor: '#F8F9FA',
    },
    progressContainer: {
        marginBottom: adaptiveSize(34),
        alignItems: 'center',
    },
    progressBar: {
        width: '100%',
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#000CFF',
        borderRadius: 2,
    },
    progressText: {
        fontSize: adaptiveSize(12),
        color: '#666',
        fontWeight: '500',
    },
    headerContainer: {
        marginBottom: adaptiveSize(24),
        alignItems: 'center',
    },
    title: {
        fontSize: adaptiveSize(24),
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: adaptiveSize(12),
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    subtitle: {
        fontSize: adaptiveSize(16),
        color: '#666',
        lineHeight: adaptiveSize(24),
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    hintContainer: {
        marginTop: adaptiveSize(16),
        backgroundColor: '#FFF9E6',
        paddingVertical: adaptiveSize(12),
        paddingHorizontal: adaptiveSize(16),
        borderRadius: adaptiveSize(12),
        borderWidth: 1,
        borderColor: '#FFE082',
    },
    hintText: {
        fontSize: adaptiveSize(13),
        color: '#856404',
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    inputProgressContainer: {
        alignItems: 'center',
        marginBottom: adaptiveSize(16),
    },
    inputProgressText: {
        fontSize: adaptiveSize(14),
        color: '#000CFF',
        fontWeight: '600',
    },
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: adaptiveSize(8),
        marginBottom: adaptiveSize(24),
        paddingHorizontal: adaptiveSize(4),
    },
    inputWrapper: {
        position: 'relative',
    },
    codeInput: {
        height: adaptiveSize(64),
        borderRadius: adaptiveSize(12),
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E0E0E0',
        textAlign: 'center',
        fontSize: adaptiveSize(28),
        fontWeight: '700',
        color: '#1A1A1A',
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    codeInputFilled: {
        borderColor: '#000CFF',
        backgroundColor: '#F0F4FF',
    },
    codeInputFocused: {
        borderColor: '#000CFF',
        borderWidth: 2.5,
        backgroundColor: '#FFFFFF',
    },
    codeInputError: {
        borderColor: '#F44336',
        backgroundColor: '#FFEBEE',
    },
    checkmarkBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#4CAF50',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmark: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    errorContainer: {
        marginBottom: adaptiveSize(24),
        alignItems: 'center',
        width: '100%',
    },
    errorBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        paddingVertical: adaptiveSize(12),
        paddingHorizontal: adaptiveSize(16),
        borderRadius: adaptiveSize(12),
        borderWidth: 1,
        borderColor: '#F44336',
        marginBottom: adaptiveSize(12),
        maxWidth: '100%',
    },
    errorIcon: {
        fontSize: adaptiveSize(18),
        marginRight: adaptiveSize(8),
    },
    errorText: {
        color: '#C62828',
        fontSize: adaptiveSize(14),
        fontWeight: '500',
        flex: 1,
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    resetButton: {
        paddingVertical: adaptiveSize(10),
        paddingHorizontal: adaptiveSize(16),
    },
    resetButtonText: {
        color: '#000CFF',
        fontSize: adaptiveSize(14),
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    button: {
        backgroundColor: '#E0E0E0',
        paddingVertical: adaptiveSize(18),
        paddingHorizontal: adaptiveSize(24),
        borderRadius: adaptiveSize(16),
        width: '100%',
        alignItems: 'center',
        marginBottom: adaptiveSize(20),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        backgroundColor: '#E0E0E0',
        shadowOpacity: 0,
        elevation: 0,
    },
    buttonReady: {
        backgroundColor: '#000CFF',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: adaptiveSize(17),
        fontWeight: '700',
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    buttonIcon: {
        color: '#FFFFFF',
        fontSize: adaptiveSize(20),
        fontWeight: 'bold',
    },
    actionsCard: {
        width: '100%',
        marginBottom: adaptiveSize(24),
        padding: adaptiveSize(14),
        backgroundColor: '#FFFFFF',
        borderRadius: adaptiveSize(16),
        borderWidth: 1,
        borderColor: '#E8EAEF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: adaptiveSize(10),
        marginBottom: adaptiveSize(12),
    },
    actionPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: adaptiveSize(6),
        paddingVertical: adaptiveSize(12),
        paddingHorizontal: adaptiveSize(10),
        backgroundColor: '#F0F4FF',
        borderRadius: adaptiveSize(12),
        borderWidth: 1,
        borderColor: '#D6E0FF',
    },
    actionPillIcon: {
        fontSize: adaptiveSize(16),
        color: '#000CFF',
    },
    actionPillLabel: {
        color: '#000CFF',
        fontSize: adaptiveSize(14),
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    resendButton: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: adaptiveSize(14),
        paddingHorizontal: adaptiveSize(12),
        backgroundColor: '#FFFFFF',
        borderRadius: adaptiveSize(12),
        borderWidth: 1.5,
        borderColor: '#000CFF',
    },
    resendButtonDisabled: {
        backgroundColor: '#F5F6F8',
        borderColor: '#C5CAD3',
    },
    resendButtonTitle: {
        color: '#000CFF',
        fontSize: adaptiveSize(15),
        fontWeight: '700',
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    resendButtonTitleMuted: {
        color: '#4B5563',
    },
    resendButtonSubtitle: {
        marginTop: adaptiveSize(4),
        color: '#6B7280',
        fontSize: adaptiveSize(13),
        fontWeight: '500',
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
});