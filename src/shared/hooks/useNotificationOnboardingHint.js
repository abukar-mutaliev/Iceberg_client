import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OneSignalService from '@shared/services/OneSignalService';

import { GlobalAlert } from '@shared/ui/CustomAlert';

const STORAGE_KEY = 'notification_permission_prompt_v2_shown';

/**
 * Базовый запрос разрешения на уведомления после авторизации.
 * 
 * ✅ Показывается ОДИН раз
 * ✅ Простой и понятный
 * ✅ Без давления
 * 
 * Примечание: Подсказка про всплывающие уведомления (heads-up) показывается
 * отдельно через useHeadsUpNotificationPrompt при первом получении push.
 */
export function useNotificationOnboardingHint({ isAuthenticated, userId }) {
  const ranRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    if (ranRef.current) return;
    ranRef.current = true;

    const run = async () => {
      try {
        const alreadyShown = await AsyncStorage.getItem(STORAGE_KEY);
        if (alreadyShown === '1') return;

        // Проверяем разрешения через OneSignal
        const oneSignal = OneSignalService.getOneSignal();
        if (!oneSignal) {
          // OneSignal недоступен (например, в Expo Go) - пропускаем
          return;
        }

        const hasPermission = await oneSignal.Notifications.hasPermission();

        if (!hasPermission) {
          GlobalAlert.show({
            type: 'info',
            title: '🔔 Разрешите уведомления',
            message:
              'Чтобы получать сообщения в чате и уведомления о заказах, разрешите уведомления.',
            buttons: [
              {
                text: 'Позже',
                style: 'cancel',
              },
              {
                text: 'Разрешить',
                style: 'primary',
                onPress: async () => {
                  try {
                    await oneSignal.Notifications.requestPermission(true);
                  } catch (error) {
                    console.error('[NotificationOnboarding] Failed to request permissions:', error);
                  }
                },
              },
            ],
          });
        }

        await AsyncStorage.setItem(STORAGE_KEY, '1');
      } catch (error) {
        console.error('[NotificationOnboarding] Error:', error);
        // never block app
      }
    };

    run();
  }, [isAuthenticated, userId]);
}


