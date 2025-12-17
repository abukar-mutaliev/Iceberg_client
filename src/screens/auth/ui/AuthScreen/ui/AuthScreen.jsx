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
    ScrollView
} from 'react-native';
import { CommonActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { LoginForm } from '@features/auth/ui/LoginForm';
import { RegisterForm } from '@features/auth/ui/RegisterForm';
import { PhoneRegisterForm } from '@features/auth/ui/PhoneRegisterForm';
import { VerificationForm } from '@features/auth/ui/VerificationForm';
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
        newSize = newSize * 1.1;
    }
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const statusBarHeight = StatusBar.currentHeight || 0;
const safeTopMargin = Platform.OS === 'android' ? statusBarHeight + normalize(10) : normalize(50);

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

    const headerPosition = useRef(new Animated.Value(0)).current;
    const headerHeight = useRef(new Animated.Value(normalize(240))).current;
    const tabsPosition = useRef(new Animated.Value(normalize(62))).current;
    const logoPosition = useRef(new Animated.Value(safeTopMargin + normalize(15))).current;
    const [extraScrollHeight, setExtraScrollHeight] = useState(0);

    const tabBarPosition = useRef(new Animated.Value(0)).current;

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
                setExtraScrollHeight(keyboardHeight + normalize(100));

                Animated.parallel([
                    Animated.timing(headerPosition, {
                        toValue: -normalize(120),
                        duration: Platform.OS === 'ios' ? event.duration : 300,
                        useNativeDriver: false
                    }),
                    Animated.timing(headerHeight, {
                        toValue: normalize(160),
                        duration: Platform.OS === 'ios' ? event.duration : 300,
                        useNativeDriver: false
                    }),
                    Animated.timing(tabsPosition, {
                        toValue: normalize(23),
                        duration: Platform.OS === 'ios' ? event.duration : 300,
                        useNativeDriver: false
                    }),
                    Animated.timing(logoPosition, {
                        toValue: safeTopMargin - normalize(20),
                        duration: Platform.OS === 'ios' ? event.duration : 300,
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
                    Animated.timing(headerPosition, {
                        toValue: 0,
                        duration: Platform.OS === 'ios' ? event.duration : 300,
                        useNativeDriver: false
                    }),
                    Animated.timing(headerHeight, {
                        toValue: normalize(240),
                        duration: Platform.OS === 'ios' ? event.duration : 300,
                        useNativeDriver: false
                    }),
                    Animated.timing(tabsPosition, {
                        toValue: normalize(62),
                        duration: Platform.OS === 'ios' ? event.duration : 300,
                        useNativeDriver: false
                    }),
                    Animated.timing(logoPosition, {
                        toValue: safeTopMargin + normalize(15),
                        duration: Platform.OS === 'ios' ? event.duration : 300,
                        useNativeDriver: false
                    }),
                ]).start();
            }
        );

        return () => {
            keyboardWillShowListener.remove();
            keyboardWillHideListener.remove();
        };
    }, [headerPosition, headerHeight, tabsPosition, logoPosition, tabBarPosition]);

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
    };

    const handleRegisterTab = () => {
        setActiveTab('register');
        setFormState('register');
    };

    const dismissKeyboard = () => {
        Keyboard.dismiss();
    };

    const handleBackPress = () => {
        if (formState === 'verification') {
            handleBackToRegister();
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
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            enabled={Platform.OS === 'ios'}
        >
            <View style={styles.innerContainer}>
                <Animated.View
                    style={[
                        styles.containerView,
                        {
                            transform: [{ translateY: headerPosition }],
                            height: headerHeight,
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            zIndex: 10,
                        }
                    ]}
                >
                    <View style={styles.header}>
                        <BackButton
                            onPress={handleBackPress}
                            style={styles.backButton}
                        />
                    </View>

                    <Animated.View
                        style={[
                            styles.logoContainer,
                            { marginTop: logoPosition }
                        ]}
                    >
                        <Image
                            source={require('@assets/logo/logo-image.jpg')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </Animated.View>

                    <Animated.View
                        style={[
                            styles.tabContainer,
                            { marginTop: tabsPosition }
                        ]}
                    >
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
                    </Animated.View>

                    {/* Переключатель типа регистрации */}
                    {activeTab === 'register' && formState === 'register' && (
                        <Animated.View style={[styles.registrationTypeContainer, { marginTop: normalize(10) }]}>
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
                        </Animated.View>
                    )}
                </Animated.View>

                <ScrollView
                    ref={scrollViewRef}
                    style={[
                        styles.scrollView,
                        { marginTop: keyboardVisible ? normalize(60) : normalize(240) }
                    ]}
                    contentContainerStyle={[
                        styles.scrollViewContent,
                        { 
                            paddingBottom: extraScrollHeight + 100,
                            paddingTop: (activeTab === 'register' && formState === 'register') ? normalize(50) : 0
                        }
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                    scrollEnabled={true}
                >
                    <TouchableWithoutFeedback onPress={dismissKeyboard}>
                        <View>
                            {activeTab === 'login' ? (
                                <LoginForm navigation={navigation} />
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
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    innerContainer: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        flexGrow: 1,
    },
    bottomPadding: {
        height: normalize(200),
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
        borderBottomRightRadius: 30,
        borderBottomLeftRadius: 30,
        backgroundColor: '#FFFFFF',
        width: '100%',
    },
    header: {
        position: 'absolute',
        top: safeTopMargin,
        left: normalize(20),
        right: normalize(20),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        zIndex: 1,
    },
    backButton: {
        backgroundColor: 'transparent',
        padding: 0,
    },

    logoContainer: {
        alignItems: 'center',
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
        paddingBottom: normalize(5),
        width: '100%',
    },
    tab: {
        marginHorizontal: normalize(10),
        alignItems: 'center',
        width: normalize(170),
    },
    tabText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(17),
        fontWeight: '700',
        color: Color.dark,
        textAlign: 'center',
        lineHeight: normalize(22),
    },
    activeTabText: {
        color: Color.dark,
    },
    activeTabIndicator: {
        height: 2,
        backgroundColor: '#000cff',
        width: '80%',
        marginTop: normalize(5),
    },
    loadingText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(16),
        textAlign: 'center',
        marginTop: normalize(20),
    },
    customTabBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    registrationTypeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: normalize(20),
        paddingBottom: normalize(10),
        gap: normalize(10),
    },
    registrationTypeButton: {
        flex: 1,
        paddingVertical: normalize(10),
        paddingHorizontal: normalize(15),
        borderRadius: normalize(8),
        borderWidth: 1,
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
    },
});