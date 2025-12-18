import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
    HomeIcon,
    SearchIcon,
    FavouritesIcon,
    CartIcon,
    ProfileIcon,
    ChatIcon,
} from '@shared/ui/Icon/TabBarIcons';
import { useCartAvailability } from '@entities/cart';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { selectWaitingStockCountCombined, selectSupplierWaitingStockCount } from '@entities/order';
import { useTabBar } from '../../context';

const { width } = Dimensions.get('window');

export const CustomTabBar = ({ state, descriptors, navigation }) => {
    const insets = useSafeAreaInsets();
    const { isCartAvailable } = useCartAvailability();
    const { currentUser } = useAuth();
    const { hideTabBar, showTabBar, isTabBarVisible } = useTabBar();
    
    // Логируем изменения активного таба
    const prevIndexRef = useRef(state.index);
    useEffect(() => {
        if (prevIndexRef.current !== state.index) {
            const prevRoute = state.routes[prevIndexRef.current]?.name;
            const currentRoute = state.routes[state.index]?.name;
            console.log('🔀 Tab changed:', {
                from: prevRoute,
                to: currentRoute,
                timestamp: new Date().toISOString()
            });
            prevIndexRef.current = state.index;
        }
    }, [state.index, state.routes]);
    
    // Отслеживаем состояние клавиатуры
    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                // Проверяем, находимся ли мы в чате
                const currentRoute = state.routes[state.index];
                
                // Детальная отладка структуры маршрутов
                console.log('🔍 Route structure:', {
                    currentRouteName: currentRoute?.name,
                    hasState: !!currentRoute?.state,
                    stateRoutes: currentRoute?.state?.routes?.map(r => r.name),
                    nestedRoutes: currentRoute?.state?.routes?.map(r => ({
                        name: r.name,
                        hasState: !!r?.state,
                        nestedNames: r?.state?.routes?.map(nr => nr.name)
                    }))
                });
                
                // Проверяем различные варианты навигации к чату
                const isChatTab = currentRoute?.name === 'ChatList';
                const hasChatRoom = currentRoute?.state?.routes?.some(route => 
                    route.name === 'ChatRoom' || 
                    route.name === 'ChatMain'
                );
                
                // Дополнительная проверка для глубоко вложенных маршрутов
                const hasNestedChatRoom = currentRoute?.state?.routes?.some(route => 
                    route?.state?.routes?.some(nestedRoute => 
                        nestedRoute.name === 'ChatRoom'
                    )
                );
                
                // Проверяем, находимся ли мы в поиске
                const isSearchTab = currentRoute?.name === 'Search';
                const hasSearchMain = currentRoute?.state?.routes?.some(route => 
                    route.name === 'SearchMain'
                );
                
                // Проверяем, находимся ли мы в авторизации (ProfileTab без авторизации)
                const isProfileTab = currentRoute?.name === 'ProfileTab';
                // В ProfileTab может быть AuthScreen, если пользователь не авторизован
                
                const isChatScreen = isChatTab || hasChatRoom || hasNestedChatRoom;
                const isSearchScreen = isSearchTab || hasSearchMain;
                const isAuthScreen = isProfileTab; // TabBar скрывается в ProfileTab когда там AuthScreen
                
                console.log('⌨️ Keyboard shown:', {
                    currentTab: currentRoute?.name,
                    isChatTab,
                    hasChatRoom,
                    hasNestedChatRoom,
                    isChatScreen,
                    isSearchTab,
                    hasSearchMain,
                    isSearchScreen,
                    isProfileTab,
                    isAuthScreen,
                    keyboardHeight: e.endCoordinates.height
                });
                
                // Скрываем TabBar для чата, поиска или авторизации
                if (isChatScreen || isSearchScreen || isAuthScreen) {
                    const reason = isChatScreen ? 'chat' : isSearchScreen ? 'search' : 'auth';
                    console.log('🔴 Hiding TabBar for:', reason);
                    hideTabBar();
                } else {
                    console.log('🟢 Not hiding TabBar - not in special screen');
                }
            }
        );

        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                if (__DEV__) {
                    console.log('⌨️ Keyboard hidden');
                }
                showTabBar();
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, [hideTabBar, showTabBar, state.index, state.routes]);
    
    // Получаем ID поставщика, если пользователь является поставщиком
    const supplierId = currentUser?.supplier?.id;
    
    // Получаем количество заказов, ожидающих поступления товара (комбинированный селектор)
    const waitingStockCount = useSelector(selectWaitingStockCountCombined);
    
    // Получаем количество заказов, ожидающих товары от конкретного поставщика
    const supplierWaitingStockCount = useSelector(state => 
        selectSupplierWaitingStockCount(state, supplierId)
    );

    // Защита от множественных нажатий
    const isNavigating = useRef(false);
    const lastPressTime = useRef(0);

    // Проверяем доступность вкладки заказов
    const isOrdersAvailable = useMemo(() => {
        return currentUser?.role === 'CLIENT';
    }, [currentUser?.role]);
    
    // Вычисляем количество для отображения в бейдже и флаг показа
    const { shouldShowBadge, badgeCount } = useMemo(() => {
        const role = currentUser?.role;
        const processingRole = currentUser?.employee?.processingRole;
        
        // Для администраторов - показываем заказы WAITING_STOCK
        if (role === 'ADMIN' && waitingStockCount > 0) {
            return {
                shouldShowBadge: true,
                badgeCount: waitingStockCount
            };
        }
        
        // Для обычных сотрудников (SUPERVISOR и без processingRole)
        // НЕ показываем для PICKER и COURIER
        if (role === 'EMPLOYEE' && waitingStockCount > 0) {
            const restrictedRoles = ['PICKER', 'COURIER'];
            if (!restrictedRoles.includes(processingRole)) {
                return {
                    shouldShowBadge: true,
                    badgeCount: waitingStockCount
                };
            }
        }
        
        // Для поставщиков
        if (role === 'SUPPLIER' && supplierWaitingStockCount > 0) {
            return {
                shouldShowBadge: true,
                badgeCount: supplierWaitingStockCount
            };
        }
        
        return {
            shouldShowBadge: false,
            badgeCount: 0
        };
    }, [currentUser?.role, currentUser?.employee?.processingRole, waitingStockCount, supplierWaitingStockCount]);

    // Фильтруем скрытые вкладки
    const visibleRoutes = useMemo(() => {
        return state.routes.filter(route => {
            if (route.name === 'Catalog') return false;
            if (route.name === 'Favourites') return false; // Скрываем вкладку "Избранное"
            if (route.name === 'Cart' && !isCartAvailable) return false;
            if (route.name === 'Orders' && !isOrdersAvailable) return false;
            if (route.name === 'ChatList' && !currentUser) return false;
            return true;
        });
    }, [state.routes, isCartAvailable, isOrdersAvailable, currentUser]);

    const handleTabPress = (route, visibleIndex, actualIndex) => {
        const now = Date.now();
        const isFocused = state.index === actualIndex;

        // Защита от множественных нажатий
        if (isNavigating.current || (now - lastPressTime.current < 300)) {
            return;
        }

        const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
            isNavigating.current = true;
            lastPressTime.current = now;

            console.log('Tab pressed:', route.name);
            navigation.navigate(route.name);

            // Сбрасываем флаг через небольшую задержку
            setTimeout(() => {
                isNavigating.current = false;
            }, 300);
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
            case 'ChatList':
                return <ChatIcon color={color} />;
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
            case 'ChatList':
                return 'Чаты';
            default:
                return routeName;
        }
    };

    // Если TabBar должен быть скрыт, не рендерим ничего
    if (!isTabBarVisible) {
        console.log('🚫 TabBar hidden - returning null');
        return null;
    }

    return (
        <View style={styles.menuDoneWithBack}>
            <View style={styles.iconMenuHomeParent}>
                {visibleRoutes.map((route, visibleIndex) => {
                    const actualIndex = state.routes.findIndex(r => r.key === route.key);
                    const isActive = state.index === actualIndex;
                    
                    // Показываем бейдж только для вкладки ProfileTab
                    const showBadge = route.name === 'ProfileTab' && shouldShowBadge;
                    const displayBadgeCount = showBadge ? badgeCount : 0;

                    return (
                        <TabItem
                            key={route.key}
                            icon={getIconComponent(route.name, isActive)}
                            label={getTabLabel(route.name)}
                            isActive={isActive}
                            onPress={() => handleTabPress(route, visibleIndex, actualIndex)}
                            showBadge={showBadge}
                            badgeCount={displayBadgeCount}
                        />
                    );
                })}
            </View>
        </View>
    );
};

const TabItem = ({ icon, label, isActive, onPress, showBadge, badgeCount }) => {
    return (
        <Pressable
            onPress={onPress}
            style={styles.iconLayout}
            delayPressIn={0} // Убираем задержку нажатия
            delayPressOut={0} // Убираем задержку отпускания
        >
            <View style={styles.iconContainer}>
                <View style={styles.iconWrapper}>
                    {icon}
                    {showBadge && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {badgeCount > 99 ? '99+' : badgeCount}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={styles.textContainer}>
                    <Text style={[
                        styles.tabText,
                        isActive ? styles.activeText : styles.inactiveText
                    ]}>
                        {label}
                    </Text>
                </View>
            </View>
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
    iconWrapper: {
        position: 'relative',
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
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -10,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'center',
    }
});