import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    PixelRatio,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { startPhoneAuth, verifyPhoneAuth, clearError } from '@entities/auth';
import { CustomTextInput } from '@shared/ui/CustomTextInput/CustomTextInput';
import { getUserFriendlyError } from '@shared/lib/errorMessages';

const DEFAULT_CODE_LENGTH = 6;

/**
 * Единый вход и регистрация по номеру телефона.
 *
 * Сервер намеренно не сообщает, зарегистрирован номер или нет: код уходит в
 * любом случае, а вход это или регистрация выясняется только после его
 * подтверждения. Поэтому у формы нет развилки «войти / зарегистрироваться» —
 * человек просто вводит номер.
 *
 * Имя и район здесь не спрашиваются: у нового аккаунта они заполняются после
 * входа, на экране онбординга.
 */
export const PhoneAuthForm = () => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const placeholderColor = isDark ? colors.textTertiary : '#888';

    const isLoading = useSelector((state) => state.auth?.isLoading ?? false);

    const [step, setStep] = useState('phone');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [challengeToken, setChallengeToken] = useState(null);
    // Длину кода задаёт сервер: если он её поменяет, приложение подстроится.
    const [codeLength, setCodeLength] = useState(DEFAULT_CODE_LENGTH);
    const [privacyAgreed, setPrivacyAgreed] = useState(false);
    const [error, setError] = useState('');
    const [resendIn, setResendIn] = useState(0);

    const timerRef = useRef(null);

    // Обратный отсчёт до повторной отправки. Сервер всё равно не пришлёт вторую
    // SMS раньше времени, но человек должен видеть, сколько осталось ждать.
    useEffect(() => {
        if (resendIn <= 0) {
            return undefined;
        }

        timerRef.current = setTimeout(() => setResendIn((value) => value - 1), 1000);

        return () => clearTimeout(timerRef.current);
    }, [resendIn]);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    const digitsOf = (value) => value.replace(/\D/g, '');

    /** Формат ввода +7 (XXX) XXX-XX-XX — как в остальных формах приложения. */
    const formatPhoneNumber = (text) => {
        let digits = digitsOf(text);

        if (digits.startsWith('8')) {
            digits = `7${digits.slice(1)}`;
        }

        if (digits.length > 0 && !digits.startsWith('7')) {
            digits = `7${digits}`;
        }

        digits = digits.slice(0, 11);

        let formatted = digits.length > 0 ? '+7' : '';
        if (digits.length > 1) {
            formatted += ` (${digits.slice(1, 4)}`;
        }
        if (digits.length >= 4) {
            formatted += ')';
        }
        if (digits.length > 4) {
            formatted += ` ${digits.slice(4, 7)}`;
        }
        if (digits.length > 7) {
            formatted += `-${digits.slice(7, 9)}`;
        }
        if (digits.length > 9) {
            formatted += `-${digits.slice(9, 11)}`;
        }

        return formatted;
    };

    const handlePhoneChange = (text) => {
        setPhone(formatPhoneNumber(text));
        setError('');
    };

    const handlePhoneFocus = () => {
        if (!phone.trim()) {
            setPhone('+7 (');
        }
    };

    const requestCode = useCallback(async () => {
        const digits = digitsOf(phone);

        if (digits.length !== 11) {
            setError('Введите номер полностью');
            return;
        }

        setError('');
        dispatch(clearError());

        const result = await dispatch(startPhoneAuth({
            phone: `+${digits}`,
            prefer: 'sms',
        }));

        if (result.meta.requestStatus !== 'fulfilled') {
            setError(getUserFriendlyError(result.payload) || 'Не удалось отправить код');
            return;
        }

        setChallengeToken(result.payload.challengeToken);
        setCodeLength(result.payload.codeLength || DEFAULT_CODE_LENGTH);
        setResendIn(result.payload.resendAfter ?? 60);
        setCode('');
        setStep('code');
    }, [dispatch, phone]);

    const submitCode = useCallback(async () => {
        if (digitsOf(code).length !== codeLength) {
            setError(`Код состоит из ${codeLength} цифр`);
            return;
        }

        setError('');

        const result = await dispatch(verifyPhoneAuth({
            challengeToken,
            verificationCode: digitsOf(code),
        }));

        if (result.meta.requestStatus !== 'fulfilled') {
            setError(getUserFriendlyError(result.payload) || 'Неверный код подтверждения');
            setCode('');
            return;
        }

        if (result.payload.requiresTwoFactor) {
            navigation.navigate('TwoFactorAuth', { tempToken: result.payload.tempToken });
        }

        // Дальше решает AuthScreen: он смотрит на needsProfile и отправляет
        // человека либо на онбординг, либо сразу в приложение.
    }, [challengeToken, code, codeLength, dispatch, navigation]);

    const backToPhone = () => {
        setStep('phone');
        setCode('');
        setError('');
        setChallengeToken(null);
    };

    if (step === 'code') {
        return (
            <View style={styles.formContainer}>
                <Text style={styles.infoText}>
                    Код отправлен на {phone}
                </Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Код из SMS</Text>
                    <CustomTextInput
                        style={[styles.input, styles.codeInput, error ? styles.inputError : null]}
                        value={code}
                        onChangeText={(text) => {
                            setCode(digitsOf(text).slice(0, codeLength));
                            setError('');
                        }}
                        keyboardType="number-pad"
                        placeholder={'_'.repeat(codeLength)}
                        placeholderTextColor={placeholderColor}
                        maxLength={codeLength}
                        autoFocus
                        textContentType="oneTimeCode"
                        autoComplete="sms-otp"
                    />
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    <View style={styles.inputUnderline} />
                </View>

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={submitCode}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Подтвердить</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.linkButton}
                    onPress={requestCode}
                    disabled={resendIn > 0 || isLoading}
                >
                    <Text style={[styles.linkText, resendIn > 0 && styles.linkTextDisabled]}>
                        {resendIn > 0
                            ? `Отправить код повторно через ${resendIn} сек.`
                            : 'Отправить код повторно'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.linkButton} onPress={backToPhone} disabled={isLoading}>
                    <Text style={styles.linkText}>Изменить номер</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.formContainer}>
            <Text style={styles.infoText}>
                Введите номер телефона — мы отправим код подтверждения
            </Text>

            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Номер телефона</Text>
                <CustomTextInput
                    style={[styles.input, error ? styles.inputError : null]}
                    value={phone}
                    onChangeText={handlePhoneChange}
                    onFocus={handlePhoneFocus}
                    keyboardType="phone-pad"
                    placeholder="+7 (___) ___-__-__"
                    placeholderTextColor={placeholderColor}
                    maxLength={18}
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <View style={styles.inputUnderline} />
            </View>

            <View style={styles.checkboxContainer}>
                <TouchableOpacity
                    style={styles.checkboxWrapper}
                    onPress={() => setPrivacyAgreed(!privacyAgreed)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.checkbox, privacyAgreed && styles.checkboxChecked]}>
                        {privacyAgreed ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                </TouchableOpacity>
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

            <TouchableOpacity
                style={[styles.button, (isLoading || !privacyAgreed) && styles.buttonDisabled]}
                onPress={requestCode}
                disabled={isLoading || !privacyAgreed}
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Продолжить</Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

const { width, height } = Dimensions.get('window');
const scale = width / 430;

const normalize = (size) => Math.round(PixelRatio.roundToNearestPixel(size * scale));

const normalizeFont = (size) => {
    const isSmallDevice = height < 700;
    const isLargeDevice = height > 800;

    let newSize = size * scale;
    if (isSmallDevice) {
        newSize *= 0.9;
    } else if (isLargeDevice) {
        newSize *= 1.1;
    }

    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const createStyles = (colors, isDark) => StyleSheet.create({
    formContainer: {
        flex: 1,
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(20),
        paddingBottom: normalize(60),
        width: '100%',
        marginBottom: normalize(80),
    },
    infoText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(14),
        color: isDark ? colors.primary : '#000cff',
        textAlign: 'center',
        marginBottom: normalize(25),
        paddingHorizontal: normalize(10),
        paddingVertical: normalize(10),
        backgroundColor: isDark ? 'rgba(124, 127, 232, 0.15)' : 'rgba(0, 12, 255, 0.05)',
        borderRadius: 8,
    },
    inputContainer: {
        marginBottom: normalize(25),
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
    codeInput: {
        fontSize: normalizeFont(24),
        letterSpacing: normalize(8),
        textAlign: 'center',
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
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(20),
    },
    checkboxWrapper: {
        marginRight: normalize(10),
    },
    checkbox: {
        width: normalize(22),
        height: normalize(22),
        borderRadius: normalize(4),
        borderWidth: 1.5,
        borderColor: isDark ? colors.border : '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: isDark ? colors.primary : '#000cff',
        borderColor: isDark ? colors.primary : '#000cff',
    },
    checkmark: {
        color: '#fff',
        fontSize: normalizeFont(14),
        fontWeight: '700',
    },
    privacyText: {
        flex: 1,
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(13),
        color: isDark ? colors.textSecondary : '#666',
    },
    privacyLink: {
        color: isDark ? colors.primary : '#000cff',
        textDecorationLine: 'underline',
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
    linkButton: {
        alignSelf: 'center',
        paddingVertical: normalize(12),
    },
    linkText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(15),
        fontWeight: '600',
        color: isDark ? colors.primary : '#000cff',
    },
    linkTextDisabled: {
        color: isDark ? colors.textTertiary : '#999',
    },
});
