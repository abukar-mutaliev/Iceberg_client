import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@entities/auth/hooks/useAuth';
import PushNotificationService from '@shared/services/PushNotificationService';
import { GlobalAlert } from '@shared/ui/CustomAlert';

export const useLogout = () => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const { logout } = useAuth();

    const proceedWithLogout = useCallback(() => {
        setTimeout(() => {
            dispatch({ type: 'RESET_APP_STATE' });

            logout().then(() => {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Auth' }],
                });
            }).catch(() => {
                GlobalAlert.showError('Ошибка', 'Не удалось выйти из системы. Попробуйте еще раз.');
            });
        }, 300);
    }, [dispatch, logout, navigation]);

    const handleLogout = useCallback(async () => {
        try {
            const deactivationResult = await PushNotificationService.clearUserContext();

            if (deactivationResult?.success) {
                proceedWithLogout();
                return;
            }

            GlobalAlert.show(
                'Предупреждение',
                'Не удалось полностью отключить push-уведомления. Вы можете продолжить выход, но уведомления могут приходить до следующего входа.',
                [
                    { text: 'Отмена', style: 'cancel' },
                    { text: 'Выйти всё равно', onPress: proceedWithLogout },
                ]
            );
        } catch {
            GlobalAlert.showError('Ошибка', 'Произошла неизвестная ошибка при выходе из системы.');
        }
    }, [proceedWithLogout]);

    return { handleLogout };
};
