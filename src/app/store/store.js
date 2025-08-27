import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authReducer } from '@entities/auth';
import { productsReducer } from '@entities/product';
import { profileReducer } from "@entities/profile";
import { categoryReducer } from '@entities/category';
import { bannerReducer } from '@entities/banner';
import { feedbackReducer } from '@entities/feedback';
import { userReducer } from "@entities/user";
import { suppliersReducer } from "@entities/supplier";
import { searchHistoryReducer } from "@entities/search";
import { filterReducer } from "@entities/filter";
import { setDispatch } from '@shared/api/api';
import { driverReducer } from "@entities/driver";
import { stopReducer } from "@entities/stop";
import { districtReducer } from "@entities/district";
import { adminReducer, processingRolesReducer } from '@entities/admin';
import { favoritesReducer } from '@entities/favorites';
import { notificationReducer } from '@entities/notification';
import { cartReducer } from '@entities/cart';
import { cartReloadMiddleware } from '@entities/cart/model/middleware';
import { warehouseReducer } from '@entities/warehouse';
import { orderReducer } from '@entities/order';
import { orderProcessingReducer} from '@entities/order';
import { rewardReducer } from '@entities/reward';
import { chatReducer } from '@entities/chat';

// Конфигурация для redux-persist
const persistConfig = {
    key: 'root',
    storage: AsyncStorage,
    whitelist: ['favorites'],
    version: 1, // Increment this to force state migration if needed
};


// Сначала создаем комбинированный редьюсер
const appReducer = combineReducers({
    auth: authReducer,
    products: productsReducer,
    profile: profileReducer,
    category: categoryReducer,
    banner: bannerReducer,
    feedback: feedbackReducer,
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
    cart: cartReducer,
    warehouse: warehouseReducer,
    order: orderReducer,
    rewards: rewardReducer,
    orderProcessing: orderProcessingReducer,
    chat: chatReducer,
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

// Добавим специальный middleware для избранного
const favoritesDebugMiddleware = store => next => action => {
    const result = next(action);
    return result;
};

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
            },
        })
            .concat(localStorageMiddleware)
            .concat(profileCheckMiddleware)
            .concat(favoritesDebugMiddleware)
            .concat(cartReloadMiddleware)
});

// Создаем персистор для сохранения состояния
export const persistor = persistStore(store);

setDispatch(store.dispatch);