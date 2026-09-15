import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '@entities/auth/model/selectors';
import { navigationRef } from '@shared/utils/NavigationRef';
import {
    hasRegistrationPromptBeenShown,
    markRegistrationPromptShown,
} from '../model/registrationPromptStorage';

const MAIN_ROUTE_NAME = 'Main';

/** Даём главному экрану отрисоваться, чтобы окно не перекрывало загрузку контента. */
const SHOW_DELAY_MS = 1200;

/**
 * Окно уместно только поверх основного приложения — не поверх Splash, Welcome
 * или экранов авторизации, поэтому смотрим активный маршрут корневого стека.
 */
const isMainRouteActive = () => {
    try {
        if (!navigationRef.isReady?.()) return false;

        const rootState = navigationRef.getRootState?.();
        const routes = rootState?.routes;
        if (!routes?.length) return false;

        const activeIndex = rootState.index ?? routes.length - 1;
        return routes[activeIndex]?.name === MAIN_ROUTE_NAME;
    } catch (error) {
        console.warn('RegistrationPrompt: не удалось определить текущий экран:', error?.message);
        return false;
    }
};

/**
 * Решает, когда показать рекомендацию зарегистрироваться: один раз после первой
 * установки, неавторизованному пользователю, уже попавшему в основное приложение.
 */
export const useRegistrationPromptTrigger = () => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const [isPending, setIsPending] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        let isCancelled = false;

        hasRegistrationPromptBeenShown().then((wasShown) => {
            if (!isCancelled) setIsPending(!wasShown);
        });

        return () => { isCancelled = true; };
    }, []);

    useEffect(() => {
        if (!isPending || isAuthenticated) return undefined;

        let timer = null;

        const cancelTimer = () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        };

        const syncWithNavigation = () => {
            if (!isMainRouteActive()) {
                cancelTimer();
                return;
            }
            if (timer) return;

            timer = setTimeout(() => {
                timer = null;
                setIsVisible(true);
                setIsPending(false);
                markRegistrationPromptShown();
            }, SHOW_DELAY_MS);
        };

        syncWithNavigation();
        const unsubscribe = navigationRef.addListener?.('state', syncWithNavigation);

        return () => {
            cancelTimer();
            unsubscribe?.();
        };
    }, [isPending, isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) setIsVisible(false);
    }, [isAuthenticated]);

    const hide = useCallback(() => setIsVisible(false), []);

    return { isVisible, hide };
};
