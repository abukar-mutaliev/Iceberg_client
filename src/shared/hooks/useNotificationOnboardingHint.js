import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import OneSignalService from '@shared/services/OneSignalService';
import PushNotificationService from '@shared/services/PushNotificationService';

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
  const user = useSelector((s) => s.auth?.user);

  useEffect(() => {
    if (!isAuthenticated || !userId || !user) return;
    if (ranRef.current) return;
    ranRef.current = true;

    const run = async () => {
      try {
        // Небольшая задержка, чтобы кастомный алерт показывался до любых системных запросов
        await new Promise(resolve => setTimeout(resolve, 500));

        const alreadyShown = await AsyncStorage.getItem(STORAGE_KEY);
        if (alreadyShown === '1') return;

        // Проверяем разрешения через expo-notifications ДО инициализации OneSignal
        // чтобы избежать автоматического запроса разрешений при инициализации
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        const hasPermission = existingStatus === 'granted';

        if (!hasPermission) {
          // Показываем кастомный алерт только если разрешения нет
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
                    // Запрашиваем разрешения через expo-notifications
                    const { status } = await Notifications.requestPermissionsAsync();
                    
                    if (status === 'granted') {
                      // Только после получения разрешения инициализируем OneSignal
                      try {
                        // Инициализируем PushNotificationService, который инициализирует OneSignal
                        await PushNotificationService.initializeForUser(user);
                        
                        // Запрашиваем разрешения через OneSignal
                        const oneSignal = OneSignalService.getOneSignal();
                        if (oneSignal) {
                          try {
                            await oneSignal.Notifications.requestPermission(true);
                            
                            // ВАЖНО: Принудительно подписываем после получения разрешения
                            // На Android requestPermission() может вернуть false,
                            // но подписка всё равно должна быть включена для получения пушей
                            if (oneSignal.User?.pushSubscription?.optIn) {
                              try {
                                await oneSignal.User.pushSubscription.optIn();
                                console.log('[NotificationOnboarding] ✅ optIn выполнен после получения разрешения');
                              } catch (e) {
                                console.warn('[NotificationOnboarding] ⚠️ optIn ошибка:', e?.message);
                              }
                            }
                          } catch (error) {
                            console.error('[NotificationOnboarding] Failed to request OneSignal permissions:', error);
                          }
                        }
                      } catch (error) {
                        console.error('[NotificationOnboarding] Failed to initialize PushNotificationService:', error);
                      }
                    }
                  } catch (error) {
                    console.error('[NotificationOnboarding] Failed to request permissions:', error);
                  }
                },
              },
            ],
          });
        } else {
          // Если разрешение уже есть, инициализируем OneSignal и вызываем optIn
          const oneSignal = OneSignalService.getOneSignal();
          if (oneSignal && oneSignal.User?.pushSubscription?.optIn) {
            try {
              await oneSignal.User.pushSubscription.optIn();
              console.log('[NotificationOnboarding] ✅ optIn выполнен (разрешение уже было)');
            } catch (e) {
              console.warn('[NotificationOnboarding] ⚠️ optIn ошибка:', e?.message);
            }
          }
        }

        await AsyncStorage.setItem(STORAGE_KEY, '1');
      } catch (error) {
        console.error('[NotificationOnboarding] Error:', error);
        // never block app
      }
    };

    run();
  }, [isAuthenticated, userId, user]);
}


