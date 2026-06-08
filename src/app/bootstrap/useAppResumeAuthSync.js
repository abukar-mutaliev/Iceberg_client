import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { authService } from '@shared/api/api';
import InAppLogger from '@shared/services/InAppLogger';

export const useAppResumeAuthSync = (dispatch) => {
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                (async () => {
                    try {
                        const tokens = await authService.getStoredTokens();
                        if (!tokens?.refreshToken) {
                            return;
                        }

                        const isRefreshValid = authService.isTokenValid(tokens.refreshToken);
                        if (!isRefreshValid) {
                            dispatch({ type: 'auth/resetState' });
                            await authService.clearTokens();
                            return;
                        }

                        const isAccessValid = tokens.accessToken && authService.isTokenValid(tokens.accessToken);
                        if (isAccessValid) {
                            dispatch({
                                type: 'auth/setTokens',
                                payload: {
                                    accessToken: tokens.accessToken,
                                    refreshToken: tokens.refreshToken
                                }
                            });
                        } else {
                            const refreshed = await authService.refreshAccessToken();
                            if (refreshed?.accessToken) {
                                dispatch({
                                    type: 'auth/setTokens',
                                    payload: {
                                        accessToken: refreshed.accessToken,
                                        refreshToken: refreshed.refreshToken
                                    }
                                });
                            }
                            // If refresh returned null (network/server issue) — keep current auth state;
                            // the next request will retry through the interceptor.
                        }
                    } catch (e) {
                        if (__DEV__) {
                            console.warn('App resume auth sync failed:', e?.message);
                        }
                    }
                })();
            }
            appState.current = nextAppState;
        });

        let memorySubscription;
        if (Platform.OS === 'ios') {
            memorySubscription = AppState.addEventListener('memoryWarning', () => {
                try {
                    if (InAppLogger?.clearLogs) {
                        InAppLogger.clearLogs();
                    }
                } catch (e) {
                    // Avoid crashing from a memory warning handler.
                }
            });
        }

        return () => {
            subscription?.remove();
            memorySubscription?.remove();
        };
    }, [dispatch]);
};
