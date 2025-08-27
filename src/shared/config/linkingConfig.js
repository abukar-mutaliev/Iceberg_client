import { getBaseUrl } from '@shared/api/api';
import { Platform } from 'react-native';

// Функция для получения префиксов на основе API настроек
const getLinkingPrefixes = () => {
    const baseUrl = getBaseUrl();

    const prefixes = [
        // Основная схема приложения (работает всегда)
        'iceberg://',
    ];

    // Добавляем префиксы в зависимости от среды
    if (__DEV__) {
        // Development prefixes
        prefixes.push(
            'exp://192.168.1.226:8081/--/',
            'exp://192.168.1.102:8081/--/',
            'exp://localhost:8081/--/',     // Localhost для iOS Simulator
        );

        if (baseUrl) {
            prefixes.push(`${baseUrl}/--/`);
        }
    } else {
        prefixes.push(
            'iceberg://',

            'http://212.67.11.134:5000/--/', // Ваш production API сервер

            'https://iceberg.app'

        );
    }

    return prefixes;
};

export const linkingConfig = {
    prefixes: getLinkingPrefixes(),
    config: {
        screens: {
            // Экраны авторизации
            Splash: 'splash',
            Welcome: 'welcome',
            Auth: 'auth',

            // Основная навигация
            Main: {
                screens: {
                    // Главная вкладка
                    MainTab: {
                        screens: {
                            Main: 'home',
                            NotificationsScreen: 'notifications',
                            StopDetails: 'stop/:stopId',
                            StopsListScreen: 'stops',
                            AddStop: 'stops/add',
                            EditStop: 'stops/:stopId/edit',
                            ProductDetail: 'product/:productId',
                            SupplierScreen: 'supplier/:supplierId',
                            Categories: 'categories',
                            ProductsByCategory: 'category/:categoryId/products',
                        },
                    },

                    // Вкладка поиска
                    Search: {
                        screens: {
                            SearchMain: 'search',
                            SearchResults: 'search/results',
                            FilterScreen: 'search/filter',
                            CategorySelectScreen: 'search/category',
                            ProductDetail: 'search/product/:productId',
                            SupplierScreen: 'search/supplier/:supplierId',
                            Categories: 'search/categories',
                            ProductsByCategory: 'search/category/:categoryId/products',
                        },
                    },

                    // Вкладка избранного
                    Favourites: {
                        screens: {
                            FavouritesMain: 'favourites',
                            ProductDetail: 'favourites/product/:productId',
                            SupplierScreen: 'favourites/supplier/:supplierId',
                            Categories: 'favourites/categories',
                            ProductsByCategory: 'favourites/category/:categoryId/products',
                        },
                    },

                    // Вкладка корзины
                    Cart: {
                        screens: {
                            CartMain: 'cart',
                            ProductDetail: 'cart/product/:productId',
                            SupplierScreen: 'cart/supplier/:supplierId',
                            Categories: 'cart/categories',
                            ProductsByCategory: 'cart/category/:categoryId/products',
                        },
                    },

                    // Вкладка профиля
                    ProfileTab: {
                        screens: {
                            ProfileMain: 'profile',
                            ProfileEdit: 'profile/edit',
                            ChangePassword: 'profile/password',
                            Settings: 'profile/settings',
                            ProductList: 'profile/products',
                            SupplierScreen: 'profile/supplier',
                            ProductManagement: 'profile/products/manage',
                            Categories: 'profile/categories',
                            CategoriesManagement: 'profile/categories/manage',
                            ProductsByCategory: 'profile/category/:categoryId/products',
                            StopsListScreen: 'profile/stops',
                            AddStop: 'profile/stops/add',
                            EditStop: 'profile/stops/:stopId/edit',
                            StopDetails: 'profile/stop/:stopId',
                            ProductDetail: 'profile/product/:productId',
                        },
                    },
                },
            },

            // ДОБАВЛЕНО: Прямые маршруты для push уведомлений
            StopDetails: 'stop/:stopId',
            StopsListScreen: 'stops',

            // Отдельные экраны (вне основной навигации)
            MapScreen: 'map',
            NotificationsScreen: 'notifications',
            AddProduct: 'add-product',

            // Админ панель
            Admin: 'admin',
            UsersManagement: 'admin/users',
            UserAdd: 'admin/users/add',
            DistrictsManagement: 'admin/districts',
        },
    },
};

// Функции для создания deep links с учетом API настроек
export const createDeepLink = (path, params = {}) => {
    const scheme = 'iceberg://';

    // Заменяем параметры в пути
    let finalPath = path;
    Object.keys(params).forEach(key => {
        finalPath = finalPath.replace(`:${key}`, params[key]);
    });

    return `${scheme}${finalPath}`;
};

// Специфичные функции для создания deep links
export const createStopDeepLink = (stopId) => {
    return createDeepLink('stop/:stopId', { stopId });
};

export const createProductDeepLink = (productId, source = 'home') => {
    const paths = {
        home: 'product/:productId',
        search: 'search/product/:productId',
        favourites: 'favourites/product/:productId',
        cart: 'cart/product/:productId',
        profile: 'profile/product/:productId',
    };

    return createDeepLink(paths[source] || paths.home, { productId });
};

export const createSupplierDeepLink = (supplierId, source = 'home') => {
    const paths = {
        home: 'supplier/:supplierId',
        search: 'search/supplier/:supplierId',
        favourites: 'favourites/supplier/:supplierId',
        cart: 'cart/supplier/:supplierId',
        profile: 'profile/supplier/:supplierId',
    };

    return createDeepLink(paths[source] || paths.home, { supplierId });
};

export const createCategoryDeepLink = (categoryId, source = 'home') => {
    const paths = {
        home: 'category/:categoryId/products',
        search: 'search/category/:categoryId/products',
        favourites: 'favourites/category/:categoryId/products',
        cart: 'cart/category/:categoryId/products',
        profile: 'profile/category/:categoryId/products',
    };

    return createDeepLink(paths[source] || paths.home, { categoryId });
};

// Функция для парсинга параметров из URL
export const parseUrlParams = (url) => {
    const urlObj = new URL(url);
    const params = {};

    // Извлекаем параметры из pathname
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    // Простой парсер для получения ID из URL типа /stop/123
    pathParts.forEach((part, index) => {
        if (part === 'stop' && pathParts[index + 1]) {
            params.stopId = parseInt(pathParts[index + 1], 10);
        }
        if (part === 'product' && pathParts[index + 1]) {
            params.productId = parseInt(pathParts[index + 1], 10);
        }
        if (part === 'supplier' && pathParts[index + 1]) {
            params.supplierId = parseInt(pathParts[index + 1], 10);
        }
        if (part === 'category' && pathParts[index + 1]) {
            params.categoryId = parseInt(pathParts[index + 1], 10);
        }
    });

    return params;
};

// Функция для логирования deep links в development
export const logDeepLink = (url) => {
    if (__DEV__) {
        console.log('🔗 Deep link received:', url);
        const params = parseUrlParams(url);
        console.log('📋 Parsed parameters:', params);
    }
};

// Экспорт для использования в других файлах
export default linkingConfig;