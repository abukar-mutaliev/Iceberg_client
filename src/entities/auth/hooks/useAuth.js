import { getPermissionsByRole, hasAllPermissions, hasAnyPermission, hasPermission } from "@shared/config/permissions";
import {
    clearProfile,
    login,
    logout,
    refreshToken,
    selectAuthError,
    selectIsAuthenticated,
    selectIsLoading,
    selectTokens,
    loadUserProfile
} from "@entities/auth";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useMemo, useRef } from "react";
import { selectCurrentUserComplete } from "@entities/user/model/selectors";

export const useAuth = () => {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const currentUser = useSelector(selectCurrentUserComplete);
    const error = useSelector(selectAuthError);
    const isLoading = useSelector(selectIsLoading);
    const tokens = useSelector(selectTokens);

    // Используем useRef вместо useState для хранения ссылки на диалог
    const authDialogRef = useRef(null);

    const loginUser = useCallback(async (credentials) => {
        try {
            dispatch(clearProfile());
            const result = await dispatch(login(credentials));

            if (result.meta.requestStatus === 'fulfilled' && !result.payload.requiresTwoFactor) {
                console.log('🔄 Загружаем полный профиль после логина...');
                await dispatch(loadUserProfile());
                
                // Дополнительно проверяем, что токены установлены
                if (result.payload.tokens) {
                    console.log('✅ Токены получены, устанавливаем в API заголовки');
                    const { api } = await import('@shared/api/api');
                    if (api && api.defaults) {
                        api.defaults.headers.common['Authorization'] = `Bearer ${result.payload.tokens.accessToken}`;
                        console.log('🔐 Заголовок Authorization установлен');
                    }
                }
            }

            return result;
        } catch (error) {
            console.error('Ошибка при логине:', error);
            throw error;
        }
    }, [dispatch]);

    const logoutUser = useCallback(() => {
        dispatch(clearProfile());
        return dispatch(logout());
    }, [dispatch]);

    const refreshTokens = useCallback(async () => {
        // Сначала проверяем Redux store
        if (tokens?.refreshToken) {
            return dispatch(refreshToken());
        }
        
        // Если в Redux store нет токена, проверяем AsyncStorage напрямую
        // Это решает проблему несинхронизированности между AsyncStorage и Redux
        try {
            const { authService } = await import('@shared/api/api');
            const storedTokens = await authService.getStoredTokens();
            
            if (storedTokens?.refreshToken) {
                // Если токен есть в AsyncStorage, используем его для обновления
                return dispatch(refreshToken());
            } else {
                console.log('No refresh token available');
                return Promise.resolve(null);
            }
        } catch (error) {
            console.error('Error checking stored tokens:', error);
            return Promise.resolve(null);
        }
    }, [dispatch, tokens]);

    const userPermissions = useMemo(() =>
            currentUser?.role ? getPermissionsByRole(currentUser.role) : []
        , [currentUser]);

    const checkPermission = useCallback((permission) => {
        return hasPermission(userPermissions, permission);
    }, [userPermissions]);

    const checkAnyPermission = useCallback((permissions) => {
        return hasAnyPermission(userPermissions, permissions);
    }, [userPermissions]);

    const checkAllPermissions = useCallback((permissions) => {
        return hasAllPermissions(userPermissions, permissions);
    }, [userPermissions]);

    // Создаем функцию setAuthDialogRef, используя useCallback
    const setAuthDialogRef = useCallback((ref) => {
        authDialogRef.current = ref;
    }, []);

    // Функции управления диалогом
    const showAuthDialog = useCallback(() => {
        if (authDialogRef.current && authDialogRef.current.show) {
            authDialogRef.current.show();
            return true;
        }
        return false;
    }, []);

    const hideAuthDialog = useCallback(() => {
        if (authDialogRef.current && authDialogRef.current.hide) {
            authDialogRef.current.hide();
            return true;
        }
        return false;
    }, []);

    return {
        isAuthenticated,
        currentUser,
        error,
        isLoading,
        login: loginUser,
        logout: logoutUser,
        refreshToken: refreshTokens,
        hasPermission: checkPermission,
        hasAnyPermission: checkAnyPermission,
        hasAllPermissions: checkAllPermissions,
        userPermissions,
        authDialog: {
            show: showAuthDialog,
            hide: hideAuthDialog,
        },
        setAuthDialogRef,
    };
};