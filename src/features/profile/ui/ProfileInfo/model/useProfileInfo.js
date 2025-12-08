import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
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
import { selectWaitingStockCountCombined, selectSupplierWaitingStockCount } from '@entities/order';
import { selectTotalAlertsCount, fetchStockStats } from '@entities/stockAlert';

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
    const isSupplier = currentUser?.role === 'SUPPLIER';
    const hasAdminAccess = hasPermission(userPermissions, 'access:admin');
    
    // Получаем ID поставщика и роль сотрудника
    const supplierId = currentUser?.supplier?.id;
    const processingRole = currentUser?.employee?.processingRole;

    // Проверка доступа к уведомлениям об остатках
    const restrictedRoles = ['PICKER', 'COURIER'];
    const canViewStockAlerts = isAdmin || (isEmployee && !restrictedRoles.includes(processingRole));

    // Получаем количество заказов WAITING_STOCK (комбинированный селектор)
    const waitingStockCount = useSelector(selectWaitingStockCountCombined);
    const supplierWaitingStockCount = useSelector(state =>
        selectSupplierWaitingStockCount(state, supplierId)
    );

    // Получаем количество уведомлений об остатках товаров
    const stockAlertsCount = useSelector(selectTotalAlertsCount);

    // Автоматическая загрузка статистики остатков при загрузке профиля
    useEffect(() => {
        if (isAuthenticated && currentUser && canViewStockAlerts) {
            console.log('📊 ProfileInfo: Loading stock alerts stats for user with access');
            dispatch(fetchStockStats())
                .catch(err => {
                    console.error('ProfileInfo: Ошибка при загрузке статистики остатков:', err?.message || err);
                });
        }
    }, [isAuthenticated, currentUser, canViewStockAlerts, dispatch]);
    
    // Вычисляем количество для бейджа на кнопке "Заказы"
    const ordersBadgeCount = useMemo(() => {
        // Для администраторов - показываем заказы WAITING_STOCK
        if (isAdmin && waitingStockCount > 0) {
            return waitingStockCount;
        }
        
        // Для обычных сотрудников (SUPERVISOR и без processingRole)
        // НЕ показываем для PICKER и COURIER
        if (isEmployee && waitingStockCount > 0) {
            const restrictedRoles = ['PICKER', 'COURIER'];
            if (!restrictedRoles.includes(processingRole)) {
                return waitingStockCount;
            }
        }
        
        // Для поставщиков
        if (isSupplier && supplierWaitingStockCount > 0) {
            return supplierWaitingStockCount;
        }
        
        return 0;
    }, [isAdmin, isEmployee, isSupplier, processingRole, waitingStockCount, supplierWaitingStockCount]);

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
    ];

    // Проверка доступа к панели администратора
    // Сборщики (PICKER) и курьеры (COURIER) не имеют доступа
    const canAccessAdminPanel = (isAdmin || hasAdminAccess) ||
                                (isEmployee && !restrictedRoles.includes(processingRole));

    const canViewOrders = isAdmin || isEmployee || currentUser?.role === 'DRIVER';

    // Формируем пункты меню в зависимости от роли
    let menuItems = [...baseMenuItems];

    // Добавляем пункт "Заказы" для админов, сотрудников и водителей
    if (canViewOrders) {
        menuItems.push({
            id: 'orders',
            title: 'Заказы',
            icon: <Icon name="receipt-long" size={24} color="#666666" />,
            badgeCount: ordersBadgeCount,
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

    // Добавляем пункт "Остатки товаров" для админов и сотрудников без роли
    if (canViewStockAlerts) {
        menuItems.push({
            id: 'stock-alerts',
            title: 'Остатки товаров',
            icon: <Icon name="inventory" size={24} color="#666666" />,
            badgeCount: stockAlertsCount,
            onPress: () => {
                navigation.navigate('Admin', {
                    screen: 'StockAlerts',
                    params: { fromScreen: 'Profile' }
                });
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