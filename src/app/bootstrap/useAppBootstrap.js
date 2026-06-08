import { useEffect, useRef } from 'react';
import { authService, testNetworkConnection } from '@shared/api/api';
import { loadUserProfile } from '@entities/auth/model/slice';

export const useAppBootstrap = (dispatch, externalInitializedRef) => {
    const internalInitializedRef = useRef(false);
    const hasInitialized = externalInitializedRef || internalInitializedRef;

    useEffect(() => {
        if (hasInitialized.current) return;

        const initializeApp = async () => {
            hasInitialized.current = true;

            try {
                try {
                    await testNetworkConnection();
                } catch (networkError) {
                    if (__DEV__) {
                        console.warn('App: network check failed (non-critical):', networkError?.message);
                    }
                }

                try {
                    await authService.initializeAuth();
                } catch (authError) {
                    console.error('App: initializeAuth failed:', authError?.message);
                }

                const tokens = await authService.getStoredTokens();
                if (!tokens?.refreshToken) {
                    return;
                }

                const refreshTokenValid = authService.isTokenValid(tokens.refreshToken);
                if (!refreshTokenValid) {
                    dispatch({ type: 'auth/resetState' });
                    await authService.clearTokens();
                    return;
                }

                const accessTokenValid = tokens.accessToken && authService.isTokenValid(tokens.accessToken);

                const syncRedux = (t) => {
                    dispatch({
                        type: 'auth/setTokens',
                        payload: { accessToken: t.accessToken, refreshToken: t.refreshToken }
                    });
                    setTimeout(() => {
                        dispatch(loadUserProfile()).catch(err => {
                            if (__DEV__) {
                                console.warn('App: loadUserProfile failed:', err?.message);
                            }
                        });
                    }, 500);
                };

                if (accessTokenValid) {
                    syncRedux(tokens);
                } else {
                    const refreshed = await authService.refreshAccessToken();
                    if (refreshed?.accessToken) {
                        syncRedux(refreshed);
                    } else {
                        const latest = await authService.getStoredTokens();
                        if (latest?.accessToken && authService.isTokenValid(latest.accessToken)) {
                            syncRedux(latest);
                        } else if (latest?.refreshToken && authService.isTokenValid(latest.refreshToken)) {
                            dispatch({
                                type: 'auth/setTokens',
                                payload: { accessToken: latest.accessToken, refreshToken: latest.refreshToken }
                            });
                        }
                    }
                }

                try {
                    const pushService = await import('@shared/services/PushNotificationService');
                    if (pushService?.default?.initialize) {
                        await pushService.default.initialize();
                    }
                } catch (pushError) {
                    if (__DEV__) {
                        console.warn('App: Push init failed (non-critical):', pushError?.message);
                    }
                }
            } catch (err) {
                console.error('App: Initialization error:', err);
            }
        };

        initializeApp();
    }, [dispatch, hasInitialized]);
};
