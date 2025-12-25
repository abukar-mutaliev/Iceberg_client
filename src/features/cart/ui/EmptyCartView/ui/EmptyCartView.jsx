import React from "react";
import {
    Text,
    TouchableOpacity,
    View,
    StyleSheet,
    Animated,
    Dimensions
} from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
    Color,
    FontFamily,
    FontSize,
    Shadow,
    Border,
    Padding
} from '@app/styles/GlobalStyles';

const { width } = Dimensions.get('window');

export const EmptyCartView = ({ navigation }) => {
    // Проверяем авторизацию пользователя
    const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
    const userRole = useSelector(state => state.auth?.user?.role);
    
    // Кнопка "Мои заказы" доступна только для клиентов
    const canViewOrders = isAuthenticated && userRole === 'CLIENT';

    const cartBounce = React.useRef(new Animated.Value(0)).current;
    const cartScale = React.useRef(new Animated.Value(1)).current;
    const textOpacity = React.useRef(new Animated.Value(0)).current;

    useFocusEffect(
        React.useCallback(() => {
            Animated.sequence([
                Animated.timing(cartBounce, {
                    toValue: -30,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(cartBounce, {
                    toValue: 0,
                    friction: 4,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();

            Animated.loop(
                Animated.sequence([
                    Animated.timing(cartScale, {
                        toValue: 1.05,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(cartScale, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            Animated.timing(textOpacity, {
                toValue: 1,
                duration: 800,
                delay: 500,
                useNativeDriver: true,
            }).start();

            return () => {
                cartBounce.setValue(0);
                textOpacity.setValue(0);
                cartScale.stopAnimation();
            };
        }, [cartBounce, textOpacity, cartScale])
    );

    return (
        <View style={emptyStyles.container}>
            <View style={emptyStyles.content}>
                {/* Анимированная корзина */}
                <Animated.View
                    style={[
                        emptyStyles.iconContainer,
                        {
                            transform: [
                                { translateY: cartBounce },
                                { scale: cartScale }
                            ],
                        },
                    ]}
                >
                    <View style={emptyStyles.cartIcon}>
                        <View style={emptyStyles.cartBase}>
                            <View style={emptyStyles.cartBaseFront} />
                        </View>
                        <View style={emptyStyles.cartHandle} />
                        <View style={emptyStyles.cartWheel1} />
                        <View style={emptyStyles.cartWheel2} />
                    </View>
                </Animated.View>

                {/* Заголовок */}
                <Animated.Text style={[emptyStyles.heading, { opacity: textOpacity }]}>
                    Ваша корзина пуста
                </Animated.Text>

                {/* Описание */}
                <Animated.Text style={[emptyStyles.description, { opacity: textOpacity }]}>
                    Добавьте товары в корзину, чтобы оформить заказ.
                    Выберите товары из каталога и нажмите на "+".
                </Animated.Text>

                {/* Кнопки */}
                <Animated.View style={[emptyStyles.buttonsContainer, { opacity: textOpacity }]}>
                    {/* Основная кнопка */}
                    <TouchableOpacity
                        style={emptyStyles.button}
                        onPress={() => navigation.navigate('MainTab')}
                        activeOpacity={0.8}
                    >
                        <Text style={emptyStyles.buttonText}>
                            Перейти к товарам
                        </Text>
                    </TouchableOpacity>

                    {/* Кнопка "Мои заказы" для авторизованных клиентов */}
                    {canViewOrders && (
                        <TouchableOpacity
                            style={emptyStyles.ordersButton}
                            onPress={() => {
                                // Навигируем к MyOrders в том же стеке
                                navigation.navigate('MyOrders', { 
                                    fromScreen: 'EmptyCart' 
                                });
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={emptyStyles.ordersButtonText}>
                                Мои заказы
                            </Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </View>

            {/* Декоративный фон */}
            <View style={emptyStyles.backgroundDecoration}>
                <View style={emptyStyles.circle1} />
                <View style={emptyStyles.circle2} />
                <View style={emptyStyles.circle3} />
            </View>
        </View>
    );
};

const emptyStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Padding.large * 2,
        zIndex: 2,
    },
    iconContainer: {
        marginBottom: Padding.large * 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heading: {
        fontSize: FontSize.xxxlarge + 4,
        fontWeight: '700',
        fontFamily: FontFamily.sFProDisplay,
        color: Color.textPrimary,
        marginBottom: Padding.medium,
        textAlign: 'center',
    },
    description: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        textAlign: 'center',
        marginBottom: Padding.large * 2,
        lineHeight: 24,
        maxWidth: width * 0.8,
    },
    button: {
        backgroundColor: Color.purpleSoft,
        paddingVertical: Padding.medium + 2,
        paddingHorizontal: Padding.large * 2,
        borderRadius: Border.br_xl,
        ...Shadow.button,
        minWidth: width * 0.6,
        alignItems: 'center',
    },
    buttonText: {
        color: Color.background,
        fontSize: FontSize.size_md,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
    },

    cartIcon: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartBase: {
        width: 90,
        height: 50,
        borderRadius: Border.br_3xs,
        backgroundColor: Color.purpleSoft,
        position: 'absolute',
        bottom: 20,
    },
    cartBaseFront: {
        width: 90,
        height: 20,
        borderTopLeftRadius: Border.br_3xs,
        borderTopRightRadius: Border.br_3xs,
        backgroundColor: Color.primary,
        position: 'absolute',
        top: 0,
    },
    cartHandle: {
        width: 40,
        height: 40,
        borderWidth: 8,
        borderColor: Color.purpleSoft,
        borderRadius: 20,
        position: 'absolute',
        top: 15,
        backgroundColor: 'transparent',
    },
    cartWheel1: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: Color.primary,
        position: 'absolute',
        bottom: 10,
        left: 25,
    },
    cartWheel2: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: Color.primary,
        position: 'absolute',
        bottom: 10,
        right: 25,
    },

    backgroundDecoration: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
    circle1: {
        position: 'absolute',
        top: -width * 0.3,
        right: -width * 0.3,
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: width * 0.4,
        backgroundColor: Color.purpleLight,
        opacity: 0.3,
    },
    circle2: {
        position: 'absolute',
        bottom: -width * 0.4,
        left: -width * 0.2,
        width: width * 0.6,
        height: width * 0.6,
        borderRadius: width * 0.3,
        backgroundColor: Color.colorLavender,
        opacity: 0.4,
    },
    circle3: {
        position: 'absolute',
        top: 420, // Исправлено с '60%' на числовое значение
        right: -width * 0.1,
        width: width * 0.3,
        height: width * 0.3,
        borderRadius: width * 0.15,
        backgroundColor: Color.purpleLight,
        opacity: 0.2,
    },

    buttonsContainer: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        gap: Padding.medium,
    },
    ordersButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: Color.purpleSoft,
        paddingVertical: Padding.medium,
        paddingHorizontal: Padding.large * 1.5,
        borderRadius: Border.br_xl,
        minWidth: width * 0.6,
        alignItems: 'center',
    },
    ordersButtonText: {
        color: Color.purpleSoft,
        fontSize: FontSize.size_md,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
    },
});
