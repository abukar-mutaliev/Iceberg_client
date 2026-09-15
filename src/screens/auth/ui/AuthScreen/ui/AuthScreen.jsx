import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Image,
    Text,
    Platform,
    BackHandler,
    KeyboardAvoidingView,
    StyleSheet,
    Dimensions,
    StatusBar,
    PixelRatio,
    Keyboard,
    Animated,
    TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { LoginForm } from '@features/auth/ui/LoginForm';
import { PhoneAuthForm } from '@features/auth/ui/PhoneAuthForm';
import { ForgotPasswordForm } from '@features/auth/ui/ForgotPasswordForm';
import { ResetPasswordCodeForm } from '@features/auth/ui/ResetPasswordCodeForm';
import { NewPasswordForm } from '@features/auth/ui/NewPasswordForm';
import { Color } from "@app/styles/GlobalStyles";
import { useAuth } from "@entities/auth/hooks/useAuth";
import { selectRequiresTwoFactor, selectTempToken, selectNeedsProfile } from "@entities/auth";
import { BackButton } from "@shared/ui/Button/BackButton";
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

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
        newSize = newSize * 1.05;
    }
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const statusBarHeight = StatusBar.currentHeight || 0;

export const AuthScreen = ({ navigation: routeNavigation, route }) => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const { isAuthenticated } = useAuth();
    const requiresTwoFactor = useSelector(selectRequiresTwoFactor);
    const tempToken = useSelector(selectTempToken);
    const needsProfile = useSelector(selectNeedsProfile);
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const [formState, setFormState] = useState('login');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const scrollViewRef = useRef(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // Восстановление пароля
    const [resetToken, setResetToken] = useState(null);
    const [confirmResetToken, setConfirmResetToken] = useState(null);

    const headerTranslateY = useRef(new Animated.Value(0)).current;
    const formMarginTop = useRef(new Animated.Value(0)).current;
    const [extraScrollHeight, setExtraScrollHeight] = useState(0);
    
    const getHeaderHeight = () => {
        const bodyHeight = normalize(204);
        return bodyHeight + (Platform.OS === 'android' ? statusBarHeight : 0);
    };

    useEffect(() => {
        dispatch({ type: 'profile/clearProfile' });

        const timer = setTimeout(() => {
            setIsCheckingAuth(false);
        }, 100);

        return () => clearTimeout(timer);
    }, [dispatch]);

    useEffect(() => {
        if (!isCheckingAuth && isAuthenticated) {
            const redirectTo = route?.params?.redirectTo;

            // Аккаунт из единого телефонного потока создаётся без имени и
            // района. Пускать его сразу в приложение нельзя: без района не
            // получится оформить доставку.
            if (needsProfile) {
                navigation.dispatch(
                    CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'Onboarding' }],
                    })
                );
                return;
            }

            if (redirectTo?.name) {
                // Если нас попросили вернуть пользователя на конкретный экран после авторизации
                navigation.dispatch(
                    CommonActions.reset({
                        index: 1,
                        routes: [
                            { name: 'Main' },
                            { name: redirectTo.name, params: redirectTo.params || {} },
                        ],
                    })
                );
            } else {
                navigation.dispatch(
                    CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'Main' }],
                    })
                );
            }
        }

        if (!isCheckingAuth && requiresTwoFactor) {
            navigation.navigate('TwoFactorAuth', { tempToken });
        }
    }, [
        isAuthenticated,
        requiresTwoFactor,
        tempToken,
        needsProfile,
        navigation,
        isCheckingAuth,
        route?.params?.redirectTo,
    ]);

    useEffect(() => {
        const keyboardWillShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (event) => {
                setKeyboardVisible(true);
                const keyboardHeight = event.endCoordinates.height;
                setExtraScrollHeight(keyboardHeight + normalize(150));

                const moveUp = normalize(170);
                
                Animated.parallel([
                    Animated.timing(headerTranslateY, {
                        toValue: -moveUp,
                        duration: Platform.OS === 'ios' ? event.duration : 250,
                        useNativeDriver: true
                    }),
                    Animated.timing(formMarginTop, {
                        toValue: -moveUp,
                        duration: Platform.OS === 'ios' ? event.duration : 250,
                        useNativeDriver: false
                    }),
                ]).start();
            }
        );

        const keyboardWillHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (event) => {
                setKeyboardVisible(false);
                setExtraScrollHeight(0);

                Animated.parallel([
                    Animated.timing(headerTranslateY, {
                        toValue: 0,
                        duration: Platform.OS === 'ios' ? event.duration : 250,
                        useNativeDriver: true
                    }),
                    Animated.timing(formMarginTop, {
                        toValue: 0,
                        duration: Platform.OS === 'ios' ? event.duration : 250,
                        useNativeDriver: false
                    }),
                ]).start();
            }
        );

        return () => {
            keyboardWillShowListener.remove();
            keyboardWillHideListener.remove();
        };
    }, [headerTranslateY, formMarginTop]);

    useEffect(() => {
        if (route?.params?.activeTab === 'login' || route?.params?.initialScreen === 'login') {
            setFormState('login');
        }
    }, [route?.params?.activeTab, route?.params?.initialScreen]);

    // Запасной путь: виджет MobileID не сработал — код в SMS от приложения.
    const phoneVerifyFallback = !!route?.params?.phoneVerifyFallback;

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (formState === 'forgotPassword' || formState === 'resetCode' || formState === 'newPassword') {
                    handleBackFromReset();
                    return true;
                }

                if (phoneVerifyFallback) {
                    navigation.setParams({ phoneVerifyFallback: undefined });
                    return true;
                }

                if (!isAuthenticated && navigation) {
                    navigation.navigate('Main');
                    return true;
                }

                return false;
            };

            let backHandler = null;
            if (Platform.OS === 'android') {
                backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            }

            return () => {
                if (backHandler && typeof backHandler.remove === 'function') {
                    backHandler.remove();
                }
            };
        }, [formState, isAuthenticated, navigation, phoneVerifyFallback])
    );

    const handleForgotPassword = () => {
        setFormState('forgotPassword');
    };

    // Когда код сброса пароля успешно отправлен
    const handleResetCodeSent = (token) => {
        setResetToken(token);
        setConfirmResetToken(null);
        setFormState('resetCode');
    };

    // Когда код подтверждения проверен
    const handleResetCodeVerified = (confirmToken) => {
        setConfirmResetToken(confirmToken);
        setFormState('newPassword');
    };

    // Когда пароль успешно изменен
    const handlePasswordResetSuccess = () => {
        setFormState('login');
        setResetToken(null);
        setConfirmResetToken(null);
    };

    const handleBackFromReset = () => {
        if (formState === 'resetCode') {
            setFormState('forgotPassword');
        } else if (formState === 'newPassword') {
            setFormState('resetCode');
        } else if (formState === 'forgotPassword') {
            setFormState('login');
        }
    };

    const dismissKeyboard = () => {
        Keyboard.dismiss();
    };

    const handleBackPress = () => {
        if (formState === 'resetCode' || formState === 'newPassword' || formState === 'forgotPassword') {
            handleBackFromReset();
        } else if (phoneVerifyFallback) {
            navigation.setParams({ phoneVerifyFallback: undefined });
        } else if (!isAuthenticated && navigation) {
            navigation.navigate('Main');
        } else if (navigation) {
            navigation.goBack();
        }
    };

    if (isAuthenticated === undefined) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Загрузка...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <View style={styles.innerContainer}>
                    <Animated.View
                        style={[
                            styles.headerWrapper,
                            {
                                transform: [{ translateY: headerTranslateY }],
                                height: getHeaderHeight()
                            }
                        ]}
                    >
                        <View style={styles.containerView}>
                            <View style={styles.header}>
                                <BackButton
                                    onPress={handleBackPress}
                                    style={styles.backButton}
                                />
                            </View>

                            <View style={styles.logoContainer}>
                                <Image
                                    source={require('@assets/logo/logo.png')}
                                    style={styles.logo}
                                    resizeMode="contain"
                                />
                            </View>

                            <View style={styles.titleContainer}>
                                <Text style={styles.screenTitle}>
                                    {phoneVerifyFallback ? 'Вход по SMS' : 'Вход'}
                                </Text>
                                <View style={styles.titleUnderline} />
                            </View>
                        </View>
                    </Animated.View>

                    <Animated.ScrollView
                        ref={scrollViewRef}
                        style={[
                            styles.scrollView,
                            {
                                marginTop: formMarginTop,
                                paddingTop: getHeaderHeight()
                            }
                        ]}
                        contentContainerStyle={[
                            styles.scrollViewContent,
                            { 
                                paddingBottom: extraScrollHeight + normalize(100),
                                paddingTop: keyboardVisible ? normalize(72) : normalize(2)
                            }
                        ]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={true}
                    >
                        <TouchableWithoutFeedback onPress={dismissKeyboard}>
                            <View>
                                {formState === 'forgotPassword' ? (
                                    <ForgotPasswordForm 
                                        onCodeSent={handleResetCodeSent}
                                        resetToken={resetToken}
                                        onUseExistingCode={() => setFormState('resetCode')}
                                    />
                                ) : formState === 'resetCode' ? (
                                    <ResetPasswordCodeForm 
                                        resetToken={resetToken}
                                        onCodeVerified={handleResetCodeVerified}
                                        onBack={handleBackFromReset}
                                    />
                                ) : formState === 'newPassword' ? (
                                    <NewPasswordForm 
                                        confirmResetToken={confirmResetToken}
                                        onSuccess={handlePasswordResetSuccess}
                                        onBack={handleBackFromReset}
                                    />
                                ) : phoneVerifyFallback ? (
                                    <PhoneAuthForm />
                                ) : (
                                    <LoginForm
                                        navigation={navigation}
                                        onForgotPassword={handleForgotPassword}
                                    />
                                )}
                            <View style={styles.bottomPadding} />
                        </View>
                    </TouchableWithoutFeedback>
                </Animated.ScrollView>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: isDark ? colors.background : '#FFFFFF',
    },
    container: {
        flex: 1,
        backgroundColor: isDark ? colors.background : '#F5F5F5',
    },
    innerContainer: {
        flex: 1,
    },
    headerWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 10,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        flexGrow: 1,
    },
    bottomPadding: {
        height: normalize(150),
    },
    containerView: {
        shadowColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.06)',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowRadius: 30,
        elevation: 5,
        shadowOpacity: 1,
        borderBottomRightRadius: normalize(30),
        borderBottomLeftRadius: normalize(30),
        backgroundColor: isDark ? colors.surface : '#FFFFFF',
        width: '100%',
        paddingTop: Platform.OS === 'android' ? statusBarHeight : normalize(10),
        paddingBottom: normalize(2),
        borderBottomWidth: isDark ? 1 : 0,
        borderBottomColor: isDark ? colors.border : 'transparent',
    },
    header: {
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(0),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    backButton: {
        backgroundColor: 'transparent',
        padding: 0,
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: normalize(4),
        marginBottom: normalize(12),
    },
    logo: {
        width: normalize(89),
        height: normalize(77),
        resizeMode: 'contain',
    },
    titleContainer: {
        alignItems: 'center',
        paddingTop: normalize(2),
        paddingBottom: normalize(1),
        paddingHorizontal: normalize(20),
    },
    screenTitle: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(17),
        fontWeight: '700',
        color: isDark ? colors.textPrimary : Color.dark,
        textAlign: 'center',
        lineHeight: normalizeFont(22),
    },
    titleUnderline: {
        height: normalize(2),
        backgroundColor: isDark ? colors.primary : '#000cff',
        width: normalize(72),
        marginTop: normalize(6),
        borderRadius: normalize(1),
    },
    loadingText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(16),
        textAlign: 'center',
        marginTop: normalize(20),
        color: isDark ? colors.textPrimary : '#000',
    },
});