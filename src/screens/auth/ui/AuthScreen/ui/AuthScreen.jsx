import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Image,
    Text,
    TouchableOpacity,
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
    ScrollView,
    SafeAreaView
} from 'react-native';
import { CommonActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { LoginForm } from '@features/auth/ui/LoginForm';
import { RegisterForm } from '@features/auth/ui/RegisterForm';
import { PhoneRegisterForm } from '@features/auth/ui/PhoneRegisterForm';
import { VerificationForm } from '@features/auth/ui/VerificationForm';
import { ForgotPasswordForm } from '@features/auth/ui/ForgotPasswordForm';
import { ResetPasswordCodeForm } from '@features/auth/ui/ResetPasswordCodeForm';
import { NewPasswordForm } from '@features/auth/ui/NewPasswordForm';
import { Color } from "@app/styles/GlobalStyles";
import { useAuth } from "@entities/auth/hooks/useAuth";
import { selectRequiresTwoFactor, selectTempToken } from "@entities/auth";
import { BackButton } from "@shared/ui/Button/BackButton";
import { ProfileIcon } from '@shared/ui/Icon/TabBarIcons';

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

    const [activeTab, setActiveTab] = useState('login');
    const [formState, setFormState] = useState('register');
    const [registrationType, setRegistrationType] = useState('email'); // 'email' или 'phone'
    const [currentTempToken, setCurrentTempToken] = useState(null);
    const [receiveCallData, setReceiveCallData] = useState(null); // Данные для Receive Call
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const scrollViewRef = useRef(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // Восстановление пароля
    const [resetToken, setResetToken] = useState(null);
    const [confirmResetToken, setConfirmResetToken] = useState(null);
    const [resetReceiveCall, setResetReceiveCall] = useState(null);

    const headerTranslateY = useRef(new Animated.Value(0)).current;
    const formMarginTop = useRef(new Animated.Value(0)).current;
    const [extraScrollHeight, setExtraScrollHeight] = useState(0);
    
    // Динамически вычисляем высоту header
    const getHeaderHeight = () => {
        const baseHeight = normalize(250);
        const registrationTypeHeight = (activeTab === 'register' && formState === 'register') ? normalize(70) : 0;
        return baseHeight + registrationTypeHeight;
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
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Main' }],
                })
            );
        }

        if (!isCheckingAuth && requiresTwoFactor) {
            navigation.navigate('TwoFactorAuth', { tempToken });
        }
    }, [isAuthenticated, requiresTwoFactor, tempToken, navigation, isCheckingAuth]);

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
        if (route?.params?.activeTab) {
            setActiveTab(route.params.activeTab);

            if (route.params.activeTab === 'login') {
                setFormState('register');
            }
        }
    }, [route?.params?.activeTab]);

    useEffect(() => {
        if (isAuthenticated) {
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Main' }],
                })
            );
        }

        if (requiresTwoFactor) {
            navigation.navigate('TwoFactorAuth', { tempToken });
        }
    }, [isAuthenticated, requiresTwoFactor, tempToken, navigation]);

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (formState === 'verification') {
                    handleBackToRegister();
                    return true;
                }

                if (!isAuthenticated && navigation) {
                    navigation.navigate('Main');
                    return true;
                }

                return false;
            };

            if (Platform.OS === 'android') {
                BackHandler.addEventListener('hardwareBackPress', onBackPress);
            }

            return () => {
                if (Platform.OS === 'android') {
                    BackHandler.removeEventListener('hardwareBackPress', onBackPress);
                }
            };
        }, [formState, isAuthenticated, navigation])
    );

    const handleVerification = (tempToken, receiveCallOrRegType = null) => {
        setCurrentTempToken(tempToken);
        
        // Проверяем тип второго аргумента
        if (typeof receiveCallOrRegType === 'string') {
            // Старый вариант: второй аргумент - regType ('email' или 'phone')
            setRegistrationType(receiveCallOrRegType);
            setReceiveCallData(null);
        } else if (receiveCallOrRegType && receiveCallOrRegType.phoneToCall) {
            // Новый вариант: второй аргумент - данные receiveCall
            setRegistrationType('phone');
            setReceiveCallData(receiveCallOrRegType);
        } else {
            // По умолчанию - email
            setRegistrationType('email');
            setReceiveCallData(null);
        }
        
        setFormState('verification');
    };

    const handleBackToRegister = () => {
        setFormState('register');
        setCurrentTempToken(null);
        setReceiveCallData(null);
    };

    const handleLoginTab = () => {
        setActiveTab('login');
        setFormState('register');
        // Сброс состояния восстановления пароля
        setResetToken(null);
        setConfirmResetToken(null);
        setResetReceiveCall(null);
    };

    const handleRegisterTab = () => {
        setActiveTab('register');
        setFormState('register');
        // Сброс состояния восстановления пароля
        setResetToken(null);
        setConfirmResetToken(null);
        setResetReceiveCall(null);
    };

    // Обработка клика "Забыли пароль?"
    const handleForgotPassword = () => {
        setFormState('forgotPassword');
        setResetToken(null);
        setConfirmResetToken(null);
        setResetReceiveCall(null);
    };

    // Когда код сброса пароля успешно отправлен
    const handleResetCodeSent = (token, receiveCall) => {
        setResetToken(token);
        setResetReceiveCall(receiveCall);
        setFormState('resetCode');
    };

    // Когда код подтверждения проверен
    const handleResetCodeVerified = (confirmToken) => {
        setConfirmResetToken(confirmToken);
        setFormState('newPassword');
    };

    // Когда пароль успешно изменен
    const handlePasswordResetSuccess = () => {
        setFormState('register');
        setActiveTab('login');
        setResetToken(null);
        setConfirmResetToken(null);
        setResetReceiveCall(null);
    };

    // Возврат с формы восстановления
    const handleBackFromReset = () => {
        if (formState === 'resetCode') {
            setFormState('forgotPassword');
        } else if (formState === 'newPassword') {
            setFormState('resetCode');
        } else if (formState === 'forgotPassword') {
            setFormState('register');
            setResetToken(null);
            setConfirmResetToken(null);
            setResetReceiveCall(null);
        }
    };

    const dismissKeyboard = () => {
        Keyboard.dismiss();
    };

    const handleBackPress = () => {
        if (formState === 'verification') {
            handleBackToRegister();
        } else if (formState === 'resetCode' || formState === 'newPassword' || formState === 'forgotPassword') {
            handleBackFromReset();
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
        <SafeAreaView style={styles.safeArea}>
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
                                    source={require('@assets/logo/logo-image.jpg')}
                                    style={styles.logo}
                                    resizeMode="contain"
                                />
                            </View>

                            <View style={styles.tabContainer}>
                                <TouchableOpacity
                                    style={styles.tab}
                                    onPress={handleLoginTab}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={[
                                            styles.tabText,
                                            activeTab === 'login' && styles.activeTabText,
                                        ]}
                                    >
                                        Войти
                                    </Text>
                                    {activeTab === 'login' && <View style={styles.activeTabIndicator} />}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.tab}
                                    onPress={handleRegisterTab}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={[
                                            styles.tabText,
                                            activeTab === 'register' && styles.activeTabText,
                                        ]}
                                    >
                                        Регистрация
                                    </Text>
                                    {activeTab === 'register' && <View style={styles.activeTabIndicator} />}
                                </TouchableOpacity>
                            </View>

                            {/* Переключатель типа регистрации */}
                            {activeTab === 'register' && formState === 'register' && (
                                <View style={styles.registrationTypeContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.registrationTypeButton,
                                            registrationType === 'email' && styles.registrationTypeButtonActive
                                        ]}
                                        onPress={() => setRegistrationType('email')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.registrationTypeText,
                                            registrationType === 'email' && styles.registrationTypeTextActive
                                        ]}>
                                            📧 Email
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.registrationTypeButton,
                                            registrationType === 'phone' && styles.registrationTypeButtonActive
                                        ]}
                                        onPress={() => setRegistrationType('phone')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.registrationTypeText,
                                            registrationType === 'phone' && styles.registrationTypeTextActive
                                        ]}>
                                            📱 Телефон
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
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
                                paddingTop: keyboardVisible ? normalize(60) : normalize(20)
                            }
                        ]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={true}
                    >
                        <TouchableWithoutFeedback onPress={dismissKeyboard}>
                            <View>
                                {activeTab === 'login' && formState === 'register' ? (
                                    <LoginForm 
                                        navigation={navigation} 
                                        onForgotPassword={handleForgotPassword}
                                    />
                                ) : formState === 'forgotPassword' ? (
                                    <ForgotPasswordForm 
                                        onCodeSent={handleResetCodeSent}
                                    />
                                ) : formState === 'resetCode' ? (
                                    <ResetPasswordCodeForm 
                                        resetToken={resetToken}
                                        receiveCall={resetReceiveCall}
                                        onCodeVerified={handleResetCodeVerified}
                                        onBack={handleBackFromReset}
                                    />
                                ) : formState === 'newPassword' ? (
                                    <NewPasswordForm 
                                        confirmResetToken={confirmResetToken}
                                        onSuccess={handlePasswordResetSuccess}
                                        onBack={handleBackFromReset}
                                    />
                                ) : formState === 'verification' ? (
                                    <VerificationForm
                                        tempToken={currentTempToken}
                                        registrationType={registrationType}
                                        receiveCall={receiveCallData}
                                        onBack={handleBackToRegister}
                                    />
                                ) : registrationType === 'phone' ? (
                                    <PhoneRegisterForm
                                        navigation={navigation}
                                        onVerification={(token, receiveCallData) => handleVerification(token, receiveCallData || 'phone')}
                                    />
                                ) : (
                                    <RegisterForm
                                        navigation={navigation}
                                        onVerification={(token, receiveCallData) => handleVerification(token, receiveCallData || 'email')}
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

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
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
        shadowColor: 'rgba(0, 0, 0, 0.06)',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowRadius: 30,
        elevation: 5,
        shadowOpacity: 1,
        borderBottomRightRadius: normalize(30),
        borderBottomLeftRadius: normalize(30),
        backgroundColor: '#FFFFFF',
        width: '100%',
        paddingTop: Platform.OS === 'android' ? statusBarHeight : normalize(10),
        paddingBottom: 0,
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
        marginTop: normalize(10),
        marginBottom: normalize(15),
    },
    logo: {
        width: normalize(89),
        height: normalize(77),
        resizeMode: 'contain',
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: normalize(15),
        paddingBottom: 0,
        paddingHorizontal: normalize(20),
        width: '100%',
        gap: normalize(30),
    },
    tab: {
        alignItems: 'center',
        minWidth: normalize(170),
        paddingVertical: 0,
    },
    tabText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(17),
        fontWeight: '700',
        color: Color.dark,
        textAlign: 'center',
        lineHeight: normalizeFont(22),
    },
    activeTabText: {
        color: Color.dark,
    },
    activeTabIndicator: {
        height: normalize(2),
        backgroundColor: '#000cff',
        width: '100%',
        marginTop: normalize(4),
        marginBottom: 0,
        borderRadius: normalize(1),
    },
    loadingText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(16),
        textAlign: 'center',
        marginTop: normalize(20),
    },
    registrationTypeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: normalize(10),
        paddingTop: normalize(12),
        paddingBottom: normalize(5),
        gap: normalize(10),
    },
    registrationTypeButton: {
        flex: 1,
        paddingVertical: normalize(12),
        paddingHorizontal: normalize(15),
        borderRadius: normalize(12),
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
    },
    registrationTypeButtonActive: {
        borderColor: '#000cff',
        backgroundColor: 'rgba(0, 12, 255, 0.05)',
    },
    registrationTypeText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: '#666',
    },
    registrationTypeTextActive: {
        color: '#000cff',
        fontWeight: '700',
    },
});