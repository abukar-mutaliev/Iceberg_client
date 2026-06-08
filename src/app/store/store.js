import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, createTransform } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authReducer } from '@entities/auth';
import { productsReducer } from '@entities/product';
import { profileReducer } from "@entities/profile";
import { categoryReducer } from '@entities/category';
import { bannerReducer } from '@entities/banner';
import { feedbackReducer } from '@entities/feedback';
import { appFeedbackSliceReducer } from '@entities/appFeedback';
import { supportTicketSliceReducer } from '@entities/supportTicket';
import { userReducer } from "@entities/user";
import { suppliersReducer } from "@entities/supplier";
import { searchHistoryReducer } from "@entities/search";
import { filterReducer } from "@entities/filter";
import { setDispatch, setGetState } from '@shared/api/api';
import { driverReducer } from "@entities/driver";
import { stopReducer } from "@entities/stop";
import { districtReducer } from "@entities/district";
import { adminReducer, processingRolesReducer } from '@entities/admin';
import { favoritesReducer } from '@entities/favorites';
import { notificationReducer, notificationSettingsSlice, fetchNotificationSettings } from '@entities/notification';
import { cartReducer } from '@entities/cart';
import { cartReloadMiddleware } from '@entities/cart/model/middleware';
import { deliveryReducer } from '@entities/delivery';
import { warehouseReducer } from '@entities/warehouse';
import { orderReducer } from '@entities/order';
import { rewardReducer } from '@entities/reward';
import { chatReducer } from '@entities/chat';
import { productReturnReducer } from '@entities/product-return';
import { stockAlertReducer } from '@entities/stockAlert';

// Не сохраняем товары по категориям — большой объект ломает rehydrate и serializableCheck
const stripCategoryProductsState = (state) => {
    if (!state) {
        return state;
    }
    return {
        ...state,
        productsByCategory: {},
        productsPaginationByCategory: {},
        productsLoadingByCategory: {},
        productsLoadingMoreByCategory: {},
        productsErrorByCategory: {},
    };
};

const categoryPersistTransform = createTransform(
    stripCategoryProductsState,
    stripCategoryProductsState,
    { whitelist: ['category'] }
);

// Конфигурация для redux-persist
// Расширенный whitelist: при возврате из фона или cold start закэшированные данные
// отображаются мгновенно, а свежие подгружаются в фоне (stale-while-revalidate)
const persistConfig = {
    key: 'root',
    storage: AsyncStorage,
    whitelist: ['auth', 'favorites', 'profile', 'category', 'banner'],
    version: 4,
    transforms: [categoryPersistTransform],
};


// Сначала создаем комбинированный редьюсер
const appReducer = combineReducers({
    auth: authReducer,
    products: productsReducer,
    profile: profileReducer,
    category: categoryReducer,
    banner: bannerReducer,
    feedback: feedbackReducer,
    appFeedback: appFeedbackSliceReducer,
    supportTicket: supportTicketSliceReducer,
    user: userReducer,
    suppliers: suppliersReducer,
    searchHistory: searchHistoryReducer,
    filter: filterReducer,
    driver: driverReducer,
    stop: stopReducer,
    district: districtReducer,
    admin: adminReducer,
    processingRoles: processingRolesReducer,
    favorites: favoritesReducer,
    notification: notificationReducer,
    notificationSettings: notificationSettingsSlice.reducer,
    cart: cartReducer,
    delivery: deliveryReducer,
    warehouse: warehouseReducer,
    order: orderReducer,
    rewards: rewardReducer,
    chat: chatReducer,
    productReturn: productReturnReducer,
    stockAlert: stockAlertReducer,
});

const rootReducer = (state, action) => {
    if (action.type === 'RESET_APP_STATE') {
        console.log('Сброс полного состояния приложения');
        state = undefined;
    }
    return appReducer(state, action);
};

// Оборачиваем rootReducer в persistReducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

const localStorageMiddleware = store => next => action => {
    const result = next(action);
    if (action.type.startsWith('auth/')) {
        // Ваш код, если нужен
    }
    return result;
};

// Middleware для автоматической загрузки настроек уведомлений при входе
const notificationSettingsMiddleware = store => next => action => {
    const result = next(action);

    // При успешном входе загружаем настройки уведомлений
    if (action.type === 'auth/login/fulfilled' && !action.payload?.requiresTwoFactor) {
        console.log('🔔 Notification middleware: Login successful, loading notification settings');
        setTimeout(() => {
            if (fetchNotificationSettings) {
                store.dispatch(fetchNotificationSettings());
            } else {
                console.warn('⚠️ fetchNotificationSettings not available in middleware');
            }
        }, 100); // Небольшая задержка для обеспечения корректной инициализации
    }

    // При сбросе состояния приложения очищаем настройки уведомлений
    if (action.type === 'RESET_APP_STATE') {
        console.log('🔔 Notification middleware: App state reset, clearing notification settings');
    }

    return result;
};

// Добавляем middleware для проверки профиля
const profileCheckMiddleware = store => next => action => {
    const result = next(action);

    // После обновления профиля проверяем соответствие ID
    if (action.type === 'profile/fetchProfile/fulfilled') {
        const state = store.getState();
        const profile = state.profile.data;
        const user = state.auth.user;

        if (profile && user && profile.id !== user.id) {
            console.warn(`Middleware: Несоответствие ID профиля (${profile.id}) и пользователя (${user.id})`);
            store.dispatch({ type: 'profile/clearProfile' });
            store.dispatch({ type: 'profile/fetchProfile' });
        }
    }

    return result;
};

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [
                    'persist/PERSIST',
                    'persist/REHYDRATE',
                    'category/fetchProductsByCategory/pending',
                    'category/fetchProductsByCategory/fulfilled',
                    'category/fetchProductsByCategory/rejected',
                    'category/setCategoryProductsResult',
                ],
                ignoredPaths: [
                    'category.productsByCategory',
                    'category.productsPaginationByCategory',
                    'category.productsLoadingByCategory',
                    'category.productsLoadingMoreByCategory',
                    'category.productsErrorByCategory',
                ],
                warnAfter: 128,
            },
            immutableCheck: { warnAfter: 128 },
        })
            .concat(localStorageMiddleware)
            .concat(notificationSettingsMiddleware)
            .concat(profileCheckMiddleware)
            .concat(cartReloadMiddleware)
});

// Создаем персистор для сохранения состояния
export const persistor = persistStore(store);

setDispatch(store.dispatch);
setGetState(() => store.getState);