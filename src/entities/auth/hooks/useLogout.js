import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { CommonActions } from '@react-navigation/native';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { useTabBar } from '@widgets/navigation/context';
import { stopRoomsPagination } from '@entities/chat/model/slice';
import PushNotificationService from '@shared/services/PushNotificationService';
import { GlobalAlert } from '@shared/ui/CustomAlert';
import { navigationRef } from '@shared/utils/NavigationRef';

const resetNavigationToAuth = () => {
    if (!navigationRef.isReady()) {
        return false;
    }

    navigationRef.dispatch(
        CommonActions.reset({
            index: 0,
            routes: [{ name: 'Auth' }],
        })
    );
    return true;
};

export const useLogout = () => {
    const dispatch = useDispatch();
    const { logout } = useAuth();
    const { resetTabBarLocks } = useTabBar();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const prepareLogoutCleanup = useCallback(() => {
        GlobalAlert.hide();
        resetTabBarLocks();
        dispatch(stopRoomsPagination());
    }, [dispatch, resetTabBarLocks]);

    const proceedWithLogout = useCallback(async () => {
        setIsLoggingOut(true);
        prepareLogoutCleanup();

        try {
            await logout();
        } catch (error) {
            console.warn('[useLogout] Logout failed:', error?.message || error);
        } finally {
            GlobalAlert.hide();
            resetTabBarLocks();
            if (!resetNavigationToAuth()) {
                console.warn('[useLogout] Navigation ref is not ready for Auth reset');
            }
            setIsLoggingOut(false);
        }
    }, [logout, prepareLogoutCleanup, resetTabBarLocks]);

    const handleLogout = useCallback(async () => {
        if (isLoggingOut) {
            return;
        }

        setIsLoggingOut(true);

        try {
            const deactivationResult = await PushNotificationService.clearUserContext();

            if (deactivationResult?.success) {
                await proceedWithLogout();
                return;
            }

            setIsLoggingOut(false);

            GlobalAlert.show(
                'Предупреждение',
                'Не удалось полностью отключить push-уведомления. Вы можете продолжить выход, но уведомления могут приходить до следующего входа.',
                [
                    { text: 'Отмена', style: 'cancel' },
                    { text: 'Выйти всё равно', onPress: proceedWithLogout },
                ]
            );
        } catch {
            setIsLoggingOut(false);
            GlobalAlert.showError('Ошибка', 'Произошла неизвестная ошибка при выходе из системы.');
        }
    }, [isLoggingOut, proceedWithLogout]);

    return { handleLogout, isLoggingOut };
};
