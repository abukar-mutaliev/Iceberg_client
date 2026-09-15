import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { mobileIdVerify, setTokens, setUser, setTwoFactorRequired, loadUserProfile } from '@entities/auth';
import { fetchProfile } from '@entities/profile';
import { BackButton } from '@shared/ui/Button/BackButton';
import { GlobalAlert } from '@shared/ui/CustomAlert';
import { getUserFriendlyError, NETWORK_ERROR_MESSAGE } from '@shared/lib/errorMessages';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

// URL страницы с виджетом MobileID (размещена на публичном HTTPS-домене).
// Переопределяется через EXPO_PUBLIC_MOBILEID_WIDGET_URL.
const WIDGET_BASE_URL =
    process.env.EXPO_PUBLIC_MOBILEID_WIDGET_URL || 'https://api-iceberg.ru/mobileid.html';

const buildWidgetUrl = (phone) => {
    const separator = WIDGET_BASE_URL.includes('?') ? '&' : '?';
    // embed=1 — компактная вёрстка без дублирования заголовка приложения
    let url = `${WIDGET_BASE_URL}${separator}embed=1&v=${Date.now()}`;

    // Номер из формы регистрации подставляем и блокируем: подтвердить нужно
    // именно его, иначе аккаунт создастся на другой номер.
    if (phone) {
        url += `&phone=${encodeURIComponent(phone)}&lock=1`;
    }

    return url;
};

// Виджет присылает код сбоя — переводим его в текст, понятный пользователю.
// Сам виджет тоже отдаёт userMessage; карта нужна для старых версий страницы.
const WIDGET_ERROR_MESSAGES = {
    INIT_FAILED: 'Не удалось подключиться к сервису входа по номеру. Попробуйте ещё раз через минуту.',
    START_FAILED: 'Не удалось начать проверку номера. Проверьте номер и попробуйте снова.',
    START_EXCEPTION: 'Не удалось начать проверку номера. Проверьте номер и попробуйте снова.',
    OTP_FAILED: 'Не удалось отправить код. Проверьте связь и попробуйте снова.',
    INVALID_PHONE: 'Проверьте номер телефона: он должен начинаться с +7 и содержать 11 цифр.',
    SDK_LOAD_FAILED: 'Не удалось загрузить страницу входа по номеру. Проверьте интернет и попробуйте снова.',
    NETWORK: NETWORK_ERROR_MESSAGE,
};

// +79161234567 → +7 (916) 123-45-67
const formatPhone = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length !== 11) return phone || '';
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
};

// Страница виджета лежит на сервере и обновляется отдельно от приложения,
// поэтому компактный вид и подстановку номера задаём прямо из WebView,
// не полагаясь на поддержку ?embed=1 и ?phone= конкретной версией страницы.
const buildInjectedScript = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    const value = digits.length === 11 ? JSON.stringify(formatPhone(phone)) : '';

    return `(function () {
        var style = document.createElement('style');
        // У экрана есть свой заголовок — дублирующую шапку страницы прячем.
        style.textContent = 'h1, .page-title, .page-subtitle, .subtitle, .hint { display: none !important; }'
            + ' .wrap { justify-content: flex-start !important; padding-top: 12px !important; }';
        document.head.appendChild(style);

        var value = ${value || 'null'};
        if (!value) return;

        var applied = false;
        var attempts = 0;
        var timer = setInterval(function () {
            attempts += 1;
            var input = document.getElementById('phone');
            var button = document.getElementById('startBtn');

            if (input) {
                if (!applied) {
                    input.value = value;
                    // Событие нужно, чтобы страница отформатировала номер
                    // и разблокировала свою кнопку подтверждения.
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    applied = true;
                }
                input.readOnly = true;
                if (button) button.disabled = false;
            }

            if (applied || attempts > 25) clearInterval(timer);
        }, 200);
    })();
    true;`;
};

const widgetErrorText = (payload) =>
    payload?.userMessage ||
    WIDGET_ERROR_MESSAGES[payload?.code] ||
    getUserFriendlyError(
        payload?.message,
        'Не удалось подтвердить номер. Попробуйте ещё раз.'
    );

export const MobileIdAuthScreen = ({ route }) => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = createStyles(colors, isDark, insets.top);

    // 'register' — экран открыт из формы регистрации, чтобы подтвердить номер
    // тем же способом, что и при входе. По умолчанию это вход.
    const isRegisterMode = route?.params?.mode === 'register';
    const prefillPhone = route?.params?.phone || '';

    const [webLoading, setWebLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    // При регистрации сразу объясняем, зачем открылась знакомая по входу форма.
    const [widgetStatus, setWidgetStatus] = useState(() =>
        isRegisterMode && prefillPhone
            ? `Подтвердите номер ${formatPhone(prefillPhone)} — после этого регистрация завершится автоматически.`
            : ''
    );
    const handledRef = useRef(false);
    // Виджет повторяет pending_timeout каждые 5 секунд — предупреждаем только один раз.
    const timeoutNotifiedRef = useRef(false);
    const widgetUrl = useRef(buildWidgetUrl(prefillPhone)).current;
    const injectedScript = useRef(buildInjectedScript(prefillPhone)).current;

    const goToMain = useCallback(() => {
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Main' }],
            })
        );
    }, [navigation]);

    // Номер подтверждён, но имя и район ещё не названы — так бывает и у только
    // что созданного аккаунта, и у того, кто бросил онбординг на полпути.
    const goToOnboarding = useCallback(() => {
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Onboarding' }],
            })
        );
    }, [navigation]);

    const failureTitle = isRegisterMode ? 'Не удалось подтвердить номер' : 'Не удалось войти';

    // Если подтверждение через оператора не сработало, остаётся запасной путь —
    // код в SMS от самого приложения. Он нужен и при входе, и при регистрации:
    // это один и тот же поток, который сам разберётся, знаком ли номер.
    const goToSmsFallback = useCallback(() => {
        navigation.navigate('Auth', {
            phoneVerifyFallback: true,
        });
    }, [navigation]);

    const errorButtons = useMemo(
        () => [
            { text: 'Закрыть', style: 'cancel' },
            {
                text: 'Получить код в SMS',
                style: 'primary',
                onPress: goToSmsFallback,
            },
        ],
        [goToSmsFallback]
    );

    const handleVerified = useCallback(
        async ({ sessionId, verifyToken }) => {
            if (handledRef.current) return;
            handledRef.current = true;
            setVerifying(true);

            try {
                const result = await dispatch(
                    mobileIdVerify({ sessionId, verifyToken })
                ).unwrap();

                if (result.status === 'success') {
                    dispatch({ type: 'RESET_APP_STATE' });
                    dispatch(setTokens(result.tokens));
                    dispatch(setUser(result.user));

                    // Новому аккаунту нечего подгружать: профиль пустой до
                    // онбординга, а запросы к нему только создали бы гонку.
                    if (!result.needsProfile) {
                        dispatch(fetchProfile());
                        dispatch(loadUserProfile());
                    }

                    if (result.needsProfile) {
                        goToOnboarding();
                        return;
                    }

                    if (isRegisterMode) {
                        // Регистрация не нужна: аккаунт с этим номером уже есть,
                        // и подтверждение номера сразу выполнило вход.
                        GlobalAlert.showInfo(
                            'Аккаунт уже существует',
                            'Этот номер уже зарегистрирован — мы выполнили вход в существующий аккаунт.'
                        );
                    }

                    goToMain();
                    return;
                }

                if (result.status === 'pending') {
                    // Требуется второй фактор — передаём управление экрану 2FA через Auth
                    dispatch(setTwoFactorRequired(result.tempToken));
                    navigation.navigate('Auth');
                    return;
                }

                if (result.status === 'registration_required') {
                    handledRef.current = false;
                    setVerifying(false);
                    GlobalAlert.show({
                        type: 'info',
                        title: 'Номер подтверждён',
                        message: 'Не удалось создать аккаунт автоматически. Войдите по коду из SMS — аккаунт появится после подтверждения.',
                        showCloseButton: false,
                        buttons: [
                            { text: 'Отмена', style: 'cancel', onPress: () => navigation.goBack() },
                            { text: 'Получить код в SMS', style: 'primary', onPress: goToSmsFallback },
                        ],
                    });
                    return;
                }

                handledRef.current = false;
                setVerifying(false);
                GlobalAlert.showError(
                    failureTitle,
                    'Сервер вернул неожиданный ответ. Попробуйте подтвердить номер ещё раз.',
                    errorButtons
                );
            } catch (error) {
                handledRef.current = false;
                setVerifying(false);
                GlobalAlert.showError(
                    failureTitle,
                    getUserFriendlyError(
                        error,
                        'Не удалось подтвердить номер телефона. Попробуйте ещё раз.'
                    ),
                    errorButtons
                );
            }
        },
        [dispatch, goToMain, goToOnboarding, navigation, isRegisterMode, errorButtons, failureTitle, goToSmsFallback]
    );

    const handleWebViewFailure = useCallback(() => {
        setWebLoading(false);
        setWidgetStatus('');
        GlobalAlert.showError(
            'Страница подтверждения не загрузилась',
            isRegisterMode
                ? 'Не удалось открыть форму подтверждения номера. Проверьте подключение к интернету и попробуйте ещё раз или подтвердите номер кодом из SMS.'
                : 'Не удалось открыть форму входа по номеру. Проверьте подключение к интернету и попробуйте ещё раз или получите код в SMS.',
            errorButtons
        );
    }, [isRegisterMode, errorButtons]);

    const onMessage = useCallback(
        (event) => {
            let payload;
            try {
                payload = JSON.parse(event.nativeEvent.data);
            } catch (e) {
                return;
            }

            if (!payload || typeof payload !== 'object') return;

            switch (payload.type) {
                case 'verified':
                    if (payload.session_id && payload.verify_token) {
                        handleVerified({
                            sessionId: payload.session_id,
                            verifyToken: payload.verify_token,
                        });
                    } else {
                        setWidgetStatus('');
                        GlobalAlert.showError(
                            failureTitle,
                            'Номер подтверждён, но сервис не прислал данные для проверки. Попробуйте подтвердить номер ещё раз.',
                            errorButtons
                        );
                    }
                    break;
                case 'error':
                    setWidgetStatus('');
                    GlobalAlert.showError(
                        'Ошибка подтверждения номера',
                        widgetErrorText(payload),
                        errorButtons
                    );
                    break;
                case 'status':
                    if (payload.phase === 'otp_required' || payload.phase === 'ready') {
                        timeoutNotifiedRef.current = false;
                    }
                    if (payload.message) {
                        setWidgetStatus(payload.message);
                    }
                    break;
                case 'rejected':
                    setWidgetStatus('');
                    timeoutNotifiedRef.current = false;
                    GlobalAlert.showError(
                        'Подтверждение отклонено',
                        'Запрос на подтверждение номера был отклонён. Проверьте, что номер совпадает с SIM-картой в телефоне, и попробуйте снова.'
                    );
                    break;
                case 'expired':
                    setWidgetStatus('');
                    timeoutNotifiedRef.current = false;
                    GlobalAlert.showError(
                        'Время истекло',
                        'Срок подтверждения истёк. Введите номер и запросите код заново.'
                    );
                    break;
                case 'pending_timeout':
                    if (!timeoutNotifiedRef.current) {
                        timeoutNotifiedRef.current = true;
                        GlobalAlert.showError(
                            'Код не пришёл',
                            'Отключите Wi‑Fi и включите мобильный интернет (4G/5G) — подтверждение работает через сеть оператора. Убедитесь, что номер совпадает с SIM-картой в телефоне, и попробуйте снова.'
                        );
                    }
                    break;
                default:
                    break;
            }
        },
        [handleVerified, failureTitle, errorButtons]
    );

    return (
        <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
            <View style={styles.header}>
                <BackButton
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                />
                <Text style={styles.headerTitle}>
                    {isRegisterMode ? 'Подтверждение номера' : 'Вход по номеру'}
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            <View style={styles.webContainer}>
                {!!widgetStatus && !verifying && (
                    <View style={styles.statusBanner}>
                        <Text style={styles.statusBannerText}>{widgetStatus}</Text>
                    </View>
                )}
                <WebView
                    source={{ uri: widgetUrl }}
                    injectedJavaScript={injectedScript}
                    onMessage={onMessage}
                    onLoadEnd={() => setWebLoading(false)}
                    onError={handleWebViewFailure}
                    onHttpError={handleWebViewFailure}
                    javaScriptEnabled
                    domStorageEnabled
                    originWhitelist={['*']}
                    startInLoadingState
                    scrollEnabled={false}
                    bounces={false}
                    overScrollMode="never"
                    contentInsetAdjustmentBehavior="never"
                    automaticallyAdjustContentInsets={false}
                    style={styles.webview}
                />

                {(webLoading || verifying) && (
                    <View style={styles.overlay}>
                        <ActivityIndicator size="large" color={isDark ? colors.primary : '#000cff'} />
                        {verifying && (
                            <Text style={styles.overlayText}>Проверяем номер...</Text>
                        )}
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

const createStyles = (colors, isDark, topInset) =>
    StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: isDark ? colors.background : '#FFFFFF',
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: topInset,
            paddingBottom: 4,
            paddingHorizontal: 8,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? colors.border : '#EEEEEE',
        },
        backButton: {
            backgroundColor: 'transparent',
            padding: 8,
            width: 40,
            height: 40,
        },
        headerTitle: {
            fontSize: 17,
            fontWeight: '700',
            color: isDark ? colors.textPrimary : '#1a1a2e',
        },
        headerSpacer: {
            width: 40,
        },
        webContainer: {
            flex: 1,
            position: 'relative',
        },
        statusBanner: {
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: isDark ? 'rgba(0,12,255,0.12)' : '#eef0ff',
            borderBottomWidth: 1,
            borderBottomColor: isDark ? colors.border : '#dde1ff',
        },
        statusBannerText: {
            fontSize: 13,
            lineHeight: 18,
            color: isDark ? colors.textSecondary : '#3339b0',
        },
        webview: {
            flex: 1,
            backgroundColor: isDark ? colors.background : '#FFFFFF',
        },
        overlay: {
            ...StyleSheet.absoluteFillObject,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)',
        },
        overlayText: {
            marginTop: 12,
            fontSize: 15,
            fontWeight: '600',
            color: isDark ? colors.textPrimary : '#1a1a2e',
        },
    });
