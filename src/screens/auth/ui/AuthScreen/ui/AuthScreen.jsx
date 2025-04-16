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
    Animated, TouchableWithoutFeedback, ScrollView
} from 'react-native';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { LoginForm } from '@features/auth/ui/LoginForm';
import { RegisterForm } from '@features/auth/ui/RegisterForm';
import { VerificationForm } from '@features/auth/ui/VerificationForm';
import BackIcon from '@shared/ui/Icon/BackArrowIcon/BackArrowIcon';
import {Color} from "@app/styles/GlobalStyles";

export const AuthScreen = ({ navigation, route }) => {
    const { isAuthenticated, requiresTwoFactor, tempToken } = useSelector((state) => state.auth);
    const [activeTab, setActiveTab] = useState('login');
    const [formState, setFormState] = useState('register');
    const [currentTempToken, setCurrentTempToken] = useState(null);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    const headerPosition = useRef(new Animated.Value(0)).current;
    const headerHeight = useRef(new Animated.Value(normalize(240))).current;
    const tabsPosition = useRef(new Animated.Value(normalize(62))).current;
    const logoPosition = useRef(new Animated.Value(safeTopMargin + normalize(15))).current;

    // Обработка событий клавиатуры
    useEffect(() => {
        const keyboardWillShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (event) => {
                setKeyboardVisible(true);
                // Анимируем перемещение хедера вверх и уменьшение его высоты
                Animated.parallel([
                    Animated.timing(headerPosition, {
                        toValue: -normalize(100),
                        duration: Platform.OS === 'ios' ? event.duration : 300,
                        useNativeDriver: false
                    }),
                    Animated.timing(headerHeight, {
                        toValue: normalize(160), // Уменьшенная высота хедера
                        duration: Platform.OS === 'ios' ? event.duration : 300,
                        useNativeDriver: false
                    }),
                    Animated.timing(tabsPosition, {
                        toValue: normalize(20), // Новая позиция табов в сжатом состоянии
                        duration: Platform.OS === 'ios' ? event.duration : 300,
                        useNativeDriver: false
                    }),
                    Animated.timing(logoPosition, {
                        toValue: safeTopMargin - normalize(20), // Поднимаем логотип выше
                        duration: Platform.OS === 'ios' ? event.duration : 300,
                        useNativeDriver: false
                    })
                ]).start();
            }
        );

        const keyboardWillHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (event) => {
                setKeyboardVisible(false);
                // Анимируем возвращение хедера на место и восстановление его высоты
                Animated.parallel([
                    Animated.timing(headerPosition, {
                        toValue: 0,
                        duration: Platform.OS === 'ios' ? event.duration : 300,
                        useNativeDriver: false
                    }),
                    Animated.timing(headerHeight, {
                        toValue: normalize(240), // Исходная высота хедера
                        duration: Platform.OS === 'ios' ? event.duration : 300,
                        useNativeDriver: false
                    }),
                    Animated.timing(tabsPosition, {
                        toValue: normalize(62), // Исходная позиция табов
                        duration: Platform.OS === 'ios' ? event.duration : 300,
                        useNativeDriver: false
                    }),
                    Animated.timing(logoPosition, {
                        toValue: safeTopMargin + normalize(15), // Исходная позиция логотипа
                        duration: Platform.OS === 'ios' ? event.duration : 300,
                        useNativeDriver: false
                    })
                ]).start();
            }
        );

        return () => {
            keyboardWillShowListener.remove();
            keyboardWillHideListener.remove();
        };
    }, []);

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
        }, [formState])
    );

    const handleVerification = (tempToken) => {
        setCurrentTempToken(tempToken);
        setFormState('verification');
    };

    const handleBackToRegister = () => {
        setFormState('register');
        setCurrentTempToken(null);
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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardShouldPersistTaps="never"
            enableOnAndroid={true}
        >
            <TouchableWithoutFeedback onPress={dismissKeyboard}>
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
                            <TouchableOpacity
                                onPress={() => navigation.goBack()}
                                hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
                            >
                                <View style={styles.backIcon}>
                                    <BackIcon />
                                </View>
                            </TouchableOpacity>
                        </View>

                        <Animated.View
                            style={[
                                styles.logoContainer,
                                { marginTop: logoPosition }
                            ]}
                        >
                            <Image
                                source={require('@/assets/logo/logo.png')}
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
                    </Animated.View>

                    <ScrollView
                        style={[
                            styles.scrollView,
                            // Динамически изменяем отступ scrollView в зависимости от видимости клавиатуры
                            keyboardVisible
                                ? { paddingTop: normalize(60) }
                                : { paddingTop: normalize(240) }
                        ]}
                        contentContainerStyle={styles.scrollViewContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={true} // Явно включаем скролл
                    >
                        {activeTab === 'login' ? (
                            <LoginForm navigation={navigation} />
                        ) : formState === 'verification' ? (
                            <VerificationForm
                                tempToken={currentTempToken}
                                onBack={handleBackToRegister}
                            />
                        ) : (
                            <RegisterForm
                                navigation={navigation}
                                onVerification={handleVerification}
                            />
                        )}

                        {/* Добавляем дополнительное пространство снизу для обеспечения скролла */}
                        <View style={{ height: normalize(100) }} />
                    </ScrollView>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};


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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    innerContainer: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
        paddingBottom: normalize(60),
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        flexGrow: 1,
        paddingBottom: normalize(80),
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
        // высота теперь управляется через анимацию
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
    backIcon: {
        width: normalize(34),
        height: normalize(34),
        paddingVertical: normalize(20)
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: normalize(15),
        // marginTop теперь управляется через анимацию
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
        // marginTop теперь управляется через анимацию
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
});