import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    HomeIcon,
    SearchIcon,
    FavouritesIcon,
    CartIcon,
    ProfileIcon
} from '@/shared/ui/Icon/TabBarIcons';


const { width } = Dimensions.get('window');

export const CustomTabBar = ({ state, descriptors, navigation }) => {
    const insets = useSafeAreaInsets();

    const tabWidth = width / 5;

    const indicatorPosition = useRef(new Animated.Value(state.index * tabWidth)).current;

    const tabAnimations = [0, 1, 2, 3, 4].map(() => ({
        opacity: useRef(new Animated.Value(0.7)).current,
        scale: useRef(new Animated.Value(1)).current,
    }));

    useEffect(() => {
        Animated.spring(indicatorPosition, {
            toValue: state.index * tabWidth,
            tension: 300,
            friction: 35,
            useNativeDriver: true,
        }).start();

        tabAnimations.forEach((tab, index) => {
            Animated.parallel([
                Animated.timing(tab.opacity, {
                    toValue: index === state.index ? 1 : 0.7,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(tab.scale, {
                    toValue: index === state.index ? 1.1 : 1,
                    tension: 300,
                    friction: 20,
                    useNativeDriver: true,
                }),
            ]).start();
        });
    }, [state.index]);

    const handleTabPress = (route, index) => {
        const isFocused = state.index === index;

        const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
            Animated.sequence([
                Animated.timing(tabAnimations[index].scale, {
                    toValue: 0.9,
                    duration: 50,
                    useNativeDriver: true,
                }),
                Animated.spring(tabAnimations[index].scale, {
                    toValue: 1.1,
                    tension: 300,
                    friction: 10,
                    useNativeDriver: true,
                }),
            ]).start();

            navigation.navigate(route.name);
        }
    };

    const activeColor = "#3339b0";
    const inactiveColor = "#BEBEBE";

    return (
        <View style={[styles.menuDoneWithBack ]}>

            <View style={styles.iconMenuHomeParent}>
                {/* Главная */}
                <TabItem
                    icon={<HomeIcon color={state.index === 0 ? activeColor : inactiveColor} />}
                    label="Главная"
                    isActive={state.index === 0}
                    onPress={() => handleTabPress(state.routes[0], 0)}
                    animation={tabAnimations[0]}
                />

                {/* Поиск */}
                <TabItem
                    icon={<SearchIcon color={state.index === 1 ? activeColor : inactiveColor} />}
                    label="Поиск"
                    isActive={state.index === 1}
                    onPress={() => handleTabPress(state.routes[1], 1)}
                    animation={tabAnimations[1]}
                />

                {/* Избранное */}
                <TabItem
                    icon={<FavouritesIcon color={state.index === 2 ? activeColor : inactiveColor} />}
                    label="Избранное"
                    isActive={state.index === 2}
                    onPress={() => handleTabPress(state.routes[2], 2)}
                    animation={tabAnimations[2]}
                />

                {/* Корзина */}
                <TabItem
                    icon={<CartIcon color={state.index === 3 ? activeColor : inactiveColor} />}
                    label="Корзина"
                    isActive={state.index === 3}
                    onPress={() => handleTabPress(state.routes[3], 3)}
                    animation={tabAnimations[3]}
                />

                {/* Кабинет */}
                <TabItem
                    icon={<ProfileIcon color={state.index === 4 ? activeColor : inactiveColor} />}
                    label="Кабинет"
                    isActive={state.index === 4}
                    onPress={() => handleTabPress(state.routes[4], 4)}
                    animation={tabAnimations[4]}
                />
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