import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { fetchProfile } from '@entities/profile';
import { logout } from '@entities/auth';
import {
    IconPersona,
    IconSettings,
    IconHelp, IconCoupon,
} from '@shared/ui/Icon/Profile';
import IconAdmin from "@shared/ui/Icon/IconAdmin";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { FavouritesIcon } from '@shared/ui/Icon/TabBarIcons';
import { getPermissionsByRole, hasPermission } from '@shared/config/permissions';

export const useProfileInfo = (isAuthenticated, tokens, currentUser, navigation) => {
    const dispatch = useDispatch();
    const [retryCount, setRetryCount] = useState(0);
    const [activeItemId, setActiveItemId] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isProfileLoaded, setIsProfileLoaded] = useState(false);

    // Проверка на администраторские права
    const userPermissions = currentUser?.role ? getPermissionsByRole(currentUser.role) : [];
    const isAdmin = currentUser?.role === 'ADMIN';
    const isEmployee = currentUser?.role === 'EMPLOYEE';
    const hasAdminAccess = hasPermission(userPermissions, 'access:admin');

    useEffect(() => {
        setIsProfileLoaded(!!currentUser);
    }, [currentUser]);

    const baseMenuItems = [
        {
            id: 'profile',
            title: 'Мой профиль',
            icon: <IconPersona />,
            onPress: () => navigation.navigate('ProfileEdit'),
        },
        {
            id: 'favourites',
            title: 'Избранное',
            icon: <FavouritesIcon color="#666666" />,
            onPress: () => navigation.navigate('Favourites', {
                params: { fromScreen: 'Profile' }
            }),
        },
        {
            id: 'settings',
            title: 'Настройки',
            icon: <IconSettings />,
            onPress: () => {
                navigation.navigate('Settings');
            },
        },
        {
            id: 'help',
            title: 'Центр помощи',
            icon: <IconHelp />,
            onPress: () => navigation.navigate('HelpCenter'),
        },
        // ТЕСТОВАЯ КНОПКА для push-уведомлений (только в development)
        ...(__DEV__ ? [{
            id: 'push-test',
            title: 'Тест Push-уведомлений',
            icon: <Icon name="notifications" size={24} color="#666666" />,
            onPress: () => navigation.navigate('PushNotificationTest'),
        }] : []),
    ];

    const canAccessAdminPanel = isAdmin || isEmployee || hasAdminAccess;
    const canViewOrders = isAdmin || isEmployee || currentUser?.role === 'DRIVER';

    // Формируем пункты меню в зависимости от роли
    let menuItems = [...baseMenuItems];

    // Добавляем пункт "Заказы" для админов, сотрудников и водителей
    if (canViewOrders) {
        menuItems.push({
            id: 'orders',
            title: 'Заказы',
            icon: <Icon name="receipt-long" size={24} color="#666666" />,
            onPress: () => {
                // Для админов и сотрудников переходим к StaffOrders через AdminStack
                if (isAdmin || isEmployee) {
                    navigation.navigate('Admin', {
                        screen: 'StaffOrders',
                        params: { fromScreen: 'Profile' }
                    });
                } else {
                    // Для водителей пока тоже StaffOrders (можно изменить позже)
                    navigation.navigate('Admin', {
                        screen: 'StaffOrders',
                        params: { fromScreen: 'Profile' }
                    });
                }
            },
        });
    }

    // Добавляем пункт "Вознаграждения" для сотрудников
    if (isEmployee) {
        menuItems.push({
            id: 'rewards',
            title: 'Вознаграждения',
            icon: <Icon name="card-giftcard" size={24} color="#666666" />,
            onPress: () => {
                navigation.navigate('Admin', {
                    screen: 'EmployeeRewards',
                    params: { 
                        fromScreen: 'Profile',
                        viewMode: 'employee'
                        // Не передаем employeeId для сотрудников - они получат свои данные автоматически
                    }
                });
            },
        });
    }

    // Добавляем панель администратора если есть доступ
    if (canAccessAdminPanel) {
        menuItems.push({
            id: 'admin',
            title: 'Панель Администратора',
            icon: <IconAdmin />,
            onPress: () => navigation.navigate('Admin'),
        });
    }

    const handleGoBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handleLogout = useCallback(async () => {
        try {
            await dispatch(logout()).unwrap();
            navigation.navigate('Auth');
        } catch (error) {
            Alert.alert('Ошибка', `Logout error: ${error?.message || 'Произошла неизвестная ошибка'}`);
        }
    }, [dispatch, navigation]);

    const navigateToLogin = useCallback(() => {
        navigation.navigate('Auth', { activeTab: 'login' });
    }, [navigation]);

    const handleMenuItemPress = useCallback((itemId, callback) => {
        setActiveItemId(itemId);
        setTimeout(() => {
            setActiveItemId(null);
            callback();
        }, 150);
    }, []);

    const isPrivilegedUser = currentUser?.role && (
        currentUser.role === 'ADMIN' ||
        currentUser.role === 'SUPPLIER' ||
        currentUser.role === 'EMPLOYEE'
    );

    const handleAddProduct = useCallback(() => {
        navigation.navigate('AddProduct');
    }, [navigation]);

    const handleManageProducts = useCallback(() => {
        // Используем глобальную навигацию к MainStack
        navigation.navigate('MainTab', {
            screen: 'ProductManagement',
            params: { fromScreen: 'Profile' }
        });
    }, [navigation]);

    return {
        retryCount,
        setRetryCount,
        activeItemId,
        setActiveItemId,
        isUploading,
        setIsUploading,
        menuItems,
        isPrivilegedUser,
        isAdmin,
        isEmployee,
        hasAdminAccess,
        canAccessAdminPanel,
        isProfileLoaded,
        handleGoBack,
        handleLogout,
        navigateToLogin,
        handleMenuItemPress,
        handleAddProduct,
        handleManageProducts
    };
};