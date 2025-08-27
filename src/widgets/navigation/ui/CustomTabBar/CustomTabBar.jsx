import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    HomeIcon,
    SearchIcon,
    FavouritesIcon,
    CartIcon,
    ProfileIcon
} from '@shared/ui/Icon/TabBarIcons';

const { width } = Dimensions.get('window');

export const CustomTabBar = ({ state, descriptors, navigation }) => {
    const insets = useSafeAreaInsets();

    // Фильтруем скрытые вкладки (например, Catalog)
    const visibleRoutes = state.routes.filter(route => route.name !== 'Catalog');

    // Вычисляем ширину вкладки исходя из количества видимых вкладок
    const tabWidth = width / visibleRoutes.length;

    // Создаем динамический массив для анимаций на основе фактического количества вкладок
    const visibleIndex = visibleRoutes.findIndex(route => route.key === state.routes[state.index].key);

    const indicatorPosition = useRef(new Animated.Value(visibleIndex * tabWidth)).current;

    // Инициализируем анимации только для видимых вкладок
    const tabAnimations = visibleRoutes.map(() => ({
        opacity: useRef(new Animated.Value(0.7)).current,
        scale: useRef(new Animated.Value(1)).current,
    }));

    useEffect(() => {
        // Находим индекс активной вкладки среди видимых вкладок
        const activeVisibleIndex = visibleRoutes.findIndex(route => route.key === state.routes[state.index].key);

        if (activeVisibleIndex >= 0) {
            Animated.spring(indicatorPosition, {
                toValue: activeVisibleIndex * tabWidth,
                tension: 300,
                friction: 35,
                useNativeDriver: true,
            }).start();

            tabAnimations.forEach((tab, index) => {
                Animated.parallel([
                    Animated.timing(tab.opacity, {
                        toValue: index === activeVisibleIndex ? 1 : 0.7,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                    Animated.spring(tab.scale, {
                        toValue: index === activeVisibleIndex ? 1.1 : 1,
                        tension: 300,
                        friction: 20,
                        useNativeDriver: true,
                    }),
                ]).start();
            });
        }
    }, [state.index, visibleRoutes]);

    const handleTabPress = (route, visibleIndex, actualIndex) => {
        const isFocused = state.index === actualIndex;

        const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
            console.log('Tab pressed:', route.name);

            // Анимация нажатия на вкладку
            if (visibleIndex >= 0 && visibleIndex < tabAnimations.length) {
                Animated.sequence([
                    Animated.timing(tabAnimations[visibleIndex].scale, {
                        toValue: 0.9,
                        duration: 50,
                        useNativeDriver: true,
                    }),
                    Animated.spring(tabAnimations[visibleIndex].scale, {
                        toValue: 1.1,
                        tension: 300,
                        friction: 10,
                        useNativeDriver: true,
                    }),
                ]).start();
            }

            navigation.navigate(route.name);
        }
    };

    const activeColor = "#3339b0";
    const inactiveColor = "#BEBEBE";

    // Определение типа иконки по имени маршрута
    const getIconComponent = (routeName, isActive) => {
        const color = isActive ? activeColor : inactiveColor;

        switch (routeName) {
            case 'MainTab':
                return <HomeIcon color={color} />;
            case 'Search':
                return <SearchIcon color={color} />;
            case 'Favourites':
                return <FavouritesIcon color={color} />;
            case 'Cart':
                return <CartIcon color={color} />;
            case 'ProfileTab':
                return <ProfileIcon color={color} />;
            default:
                return <HomeIcon color={color} />;
        }
    };

    // Получение названия вкладки
    const getTabLabel = (routeName) => {
        switch (routeName) {
            case 'MainTab':
                return 'Главная';
            case 'Search':
                return 'Поиск';
            case 'Favourites':
                return 'Избранное';
            case 'Cart':
                return 'Корзина';
            case 'ProfileTab':
                return 'Кабинет';
            default:
                return routeName;
        }
    };

    return (
        <View style={[styles.menuDoneWithBack]}>
            <View style={styles.iconMenuHomeParent}>
                {visibleRoutes.map((route, visibleIndex) => {
                    const actualIndex = state.routes.findIndex(r => r.key === route.key);
                    const isActive = state.index === actualIndex;

                    return (
                        <TabItem
                            key={route.key}
                            icon={getIconComponent(route.name, isActive)}
                            label={getTabLabel(route.name)}
                            isActive={isActive}
                            onPress={() => handleTabPress(route, visibleIndex, actualIndex)}
                            animation={tabAnimations[visibleIndex]}
                        />
                    );
                })}
            </View>
        </View>
    );
};

const TabItem = ({ icon, label, isActive, onPress, animation }) => {
    return (
        <Pressable onPress={onPress} style={styles.iconLayout}>
            <Animated.View
                style={[
                    styles.iconContainer,
                    {
                        opacity: animation.opacity,
                        transform: [{ scale: animation.scale }]
                    }
                ]}
            >
                {icon}
                <View style={styles.textContainer}>
                    <Text style={[
                        styles.tabText,
                        isActive ? styles.activeText : styles.inactiveText
                    ]}>
                        {label}
                    </Text>
                </View>
            </Animated.View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    menuDoneWithBack: {
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        backgroundColor: "#fff",
        minHeight: 80,
        width: "100%",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        elevation: 8,
        position: 'relative',
    },
    indicator: {
        position: 'absolute',
        top: 5,
        left: 10, // Отступ для центрирования
        height: 3,
        backgroundColor: "#3339b0",
        borderRadius: 10,
        zIndex: 1,
    },
    iconMenuHomeParent: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 15,
        width: "100%"
    },
    iconLayout: {
        alignItems: "center",
        width: 58,
        height: 55,
        justifyContent: 'center',
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        marginTop: 5,
        alignItems: "center"
    },
    tabText: {
        fontSize: 10,
        fontWeight: "500",
        textAlign: "center"
    },
    activeText: {
        color: "#3339b0"
    },
    inactiveText: {
        color: "#BEBEBE"
    }
});