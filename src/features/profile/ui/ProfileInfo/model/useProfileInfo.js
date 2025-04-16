import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { fetchProfile } from '@/entities/profile';
import { logout } from '@/entities/auth';
import {
    IconPersona,
    IconLocation,
    IconCard,
    IconCoupon,
    IconSettings,
    IconHelp,
    IconOrders,
} from '@shared/ui/Icon/Profile';

export const useProfileInfo = (isAuthenticated, tokens, user, navigation) => {
    const dispatch = useDispatch();
    const [retryCount, setRetryCount] = useState(0);
    const [activeItemId, setActiveItemId] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            if (isAuthenticated && tokens?.accessToken && user) {
                try {
                    await dispatch(fetchProfile()).unwrap();
                } catch (err) {
                    console.error('Error loading profile:', err);
                    if (retryCount < 2) {
                        setTimeout(() => {
                            setRetryCount((prev) => prev + 1);
                        }, 1000);
                    }
                }
            }
        };

        loadProfile();
    }, [dispatch, isAuthenticated, tokens, user, retryCount]);

    const menuItems = [
        {
            id: 'profile',
            title: 'Мой профиль',
            icon: <IconPersona />,
            onPress: () => navigation.navigate('ProfileEdit'),
        },
        {
            id: 'address',
            title: 'Мой адрес',
            icon: <IconLocation />,
            onPress: () => navigation.navigate('UserAddress'),
        },
        {
            id: 'payment',
            title: 'Способы оплаты',
            icon: <IconCard />,
            onPress: () => navigation.navigate('PaymentMethods'),
        },
        {
            id: 'coupons',
            title: 'Мои купоны',
            icon: <IconCoupon />,
            onPress: () => navigation.navigate('Coupons'),
        },
        {
            id: 'settings',
            title: 'Настройки',
            icon: <IconSettings />,
            onPress: () => navigation.navigate('Settings'),
        },
        {
            id: 'help',
            title: 'Центр помощи',
            icon: <IconHelp />,
            onPress: () => navigation.navigate('HelpCenter'),
        },
        {
            id: 'orders',
            title: 'Мои заказы',
            icon: <IconOrders />,
            onPress: () => navigation.navigate('Orders'),
        },
    ];

    const handleGoBack = () => {
        navigation.goBack();
    };

    const handleLogout = async () => {
        try {
            await dispatch(logout()).unwrap();
            navigation.navigate('Auth');
        } catch (error) {
            Alert.alert('Ошибка', `Logout error: ${error?.message || 'Произошла неизвестная ошибка'}`);
        }
    };

    const navigateToLogin = () => {
        navigation.navigate('Auth', { activeTab: 'login' });
    };

    const handleMenuItemPress = (itemId, callback) => {
        setActiveItemId(itemId);
        setTimeout(() => {
            setActiveItemId(null);
            callback();
        }, 150);
    };

    const isPrivilegedUser = user?.role && (
        user.role === 'ADMIN' ||
        user.role === 'SUPPLIER' ||
        user.role === 'EMPLOYEE'
    );

    const handleAddProduct = () => {
        navigation.navigate('AddProduct');
    };

    const handleManageProducts = () => {
        navigation.navigate('ProductList');
    };

    return {
        retryCount,
        setRetryCount,
        activeItemId,
        setActiveItemId,
        isUploading,
        setIsUploading,
        menuItems,
        isPrivilegedUser,
        handleGoBack,
        handleLogout,
        navigateToLogin,
        handleMenuItemPress,
        handleAddProduct,
        handleManageProducts
    };
};