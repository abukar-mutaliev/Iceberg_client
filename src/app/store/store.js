import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@entities/auth';
import { productsReducer } from '@/entities/product';
import { profileReducer } from "@entities/profile";
import { categoryReducer } from '@entities/category';
import { bannerReducer } from '@/entities/banner';
import { feedbackReducer } from '@/entities/feedback';
import { userReducer } from "@entities/user";
import { suppliersReducer } from "@entities/supplier";
import { searchHistoryReducer } from "@entities/search";
import { filterReducer } from "@entities/filter";

const localStorageMiddleware = store => next => action => {
    const result = next(action);
    if (action.type.startsWith('auth/')) {
    }
    return result;
};

export const store = configureStore({
    reducer: {
        auth: authReducer,
        products: productsReducer,
        profile: profileReducer,
        category: categoryReducer,
        banner: bannerReducer,
        feedback: feedbackReducer,
        clients: userReducer,
        suppliers: suppliersReducer,
        searchHistory: searchHistoryReducer,
        filter: filterReducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            .concat(localStorageMiddleware)
});