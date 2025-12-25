import { useEffect, useRef } from 'react';
import { Platform, Linking, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OneSignalService from '@shared/services/OneSignalService';

import { GlobalAlert } from '@shared/ui/CustomAlert';

const STORAGE_KEY = 'heads_up_notification_prompt_shown_v1';
const NOTIFICATION_RECEIVED_KEY = 'has_received_notification_v1';

/**
 * Показывает подсказку о всплывающих уведомлениях при первом получении push-уведомления.
 * 
 * ✅ Показывается ОДИН раз
 * ✅ В правильный момент (когда пользователь получил первый важный push)
 * ✅ Короткий честный текст
 * ✅ Одна кнопка → сразу в настройки
 * ✅ Без давления
 */
export function useHeadsUpNotificationPrompt({ isAuthenticated }) {
  const ranRef = useRef(false);
  const notificationReceivedListenerRef = useRef(null);
  const notificationResponseListenerRef = useRef(null);
  const appStateListenerRef = useRef(null);
  const checkTimerRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (ranRef.current) return;
    if (Platform.OS !== 'android') return; // На iOS heads-up работают по-другому

    const run = async () => {
      try {
        console.log('[HeadsUpPrompt] 🚀 Initializing...');

        // Проверяем, показывали ли уже подсказку
        const alreadyShown = await AsyncStorage.getItem(STORAGE_KEY);
        console.log('[HeadsUpPrompt] Already shown?', alreadyShown);
        if (alreadyShown === '1') return;

        // Проверяем разрешения через OneSignal
        const oneSignal = OneSignalService.getOneSignal();
        if (!oneSignal) {
          // OneSignal недоступен (например, в Expo Go) - пропускаем
          console.log('[HeadsUpPrompt] ⏭️ OneSignal not available (Expo Go?), skipping');
          return;
        }

        const hasPermission = await oneSignal.Notifications.hasPermission();
        console.log('[HeadsUpPrompt] Permission status:', hasPermission);
        if (!hasPermission) {
          console.log('[HeadsUpPrompt] ❌ No notification permission, skipping');
          return;
        }

        // 1️⃣ Слушатель для уведомлений когда приложение на переднем плане
        notificationReceivedListenerRef.current = oneSignal.Notifications.addEventListener('foregroundWillDisplay', async (event) => {
          console.log('[HeadsUpPrompt] 📬 Notification received (foreground)!');
          console.log('[HeadsUpPrompt] 📬 ID:', event.notification.notificationId);
          console.log('[HeadsUpPrompt] 📬 Title:', event.notification.title);
          console.log('[HeadsUpPrompt] 📬 Body:', event.notification.body);
          console.log('[HeadsUpPrompt] 📬 Data:', event.notification.additionalData);
          await markNotificationReceived();
          checkAndShowPrompt();
        });

        // 2️⃣ Слушатель для нажатий на уведомления (когда приложение было в фоне)
        notificationResponseListenerRef.current = oneSignal.Notifications.addEventListener('click', async (event) => {
          console.log('[HeadsUpPrompt] 👆 Notification tapped:', event.notification.notificationId);
          await markNotificationReceived();
          checkAndShowPrompt();
        });

        // 3️⃣ Слушатель возвращения в приложение из фона
        appStateListenerRef.current = AppState.addEventListener('change', async (nextAppState) => {
          if (nextAppState === 'active') {
            console.log('[HeadsUpPrompt] 🔄 App became active');
            const hasReceived = await AsyncStorage.getItem(NOTIFICATION_RECEIVED_KEY);
            if (hasReceived === '1') {
              console.log('[HeadsUpPrompt] ✅ User has received notifications before');
              checkAndShowPrompt();
            }
          }
        });

        // 4️⃣ Периодическая проверка (на случай если уведомления приходят в фоне)
        checkTimerRef.current = setInterval(async () => {
          const hasReceived = await AsyncStorage.getItem(NOTIFICATION_RECEIVED_KEY);
          if (hasReceived === '1') {
            const alreadyShown = await AsyncStorage.getItem(STORAGE_KEY);
            if (alreadyShown !== '1') {
              console.log('[HeadsUpPrompt] ⏰ Periodic check: should show prompt');
              checkAndShowPrompt();
            }
          }
        }, 5000); // Проверяем каждые 5 секунд

        ranRef.current = true;
        console.log('[HeadsUpPrompt] ✅ Setup complete');
      } catch (error) {
        console.error('[HeadsUpPrompt] ❌ Setup error:', error);
      }
    };

    run();

    // Cleanup
    return () => {
      if (notificationReceivedListenerRef.current) {
        notificationReceivedListenerRef.current.remove();
        notificationReceivedListenerRef.current = null;
      }
      if (notificationResponseListenerRef.current) {
        notificationResponseListenerRef.current.remove();
        notificationResponseListenerRef.current = null;
      }
      if (appStateListenerRef.current) {
        appStateListenerRef.current.remove();
        appStateListenerRef.current = null;
      }
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
        checkTimerRef.current = null;
      }
    };
  }, [isAuthenticated]);
}

/**
 * Помечает что пользователь получил хотя бы одно уведомление
 */
async function markNotificationReceived() {
  try {
    await AsyncStorage.setItem(NOTIFICATION_RECEIVED_KEY, '1');
    console.log('[HeadsUpPrompt] ✅ Marked notification as received');
  } catch (error) {
    console.error('[HeadsUpPrompt] Failed to mark notification:', error);
  }
}

/**
 * Проверяет условия и показывает подсказку если нужно
 */
async function checkAndShowPrompt() {
  try {
    // Проверяем, показывали ли уже
    const alreadyShown = await AsyncStorage.getItem(STORAGE_KEY);
    if (alreadyShown === '1') {
      console.log('[HeadsUpPrompt] ⏭️ Already shown, skipping');
      return;
    }

    // Проверяем, получал ли пользователь уведомления
    const hasReceived = await AsyncStorage.getItem(NOTIFICATION_RECEIVED_KEY);
    if (hasReceived !== '1') {
      console.log('[HeadsUpPrompt] ⏭️ No notifications received yet, skipping');
      return;
    }

    // Небольшая задержка, чтобы пользователь увидел само уведомление
    console.log('[HeadsUpPrompt] ⏳ Waiting 2 seconds before showing prompt...');
    setTimeout(() => {
      showHeadsUpPrompt();
    }, 2000);
  } catch (error) {
    console.error('[HeadsUpPrompt] Error checking prompt conditions:', error);
  }
}

/**
 * Показывает простой и понятный алерт с предложением включить всплывающие уведомления
 */
async function showHeadsUpPrompt() {
  try {
    console.log('[HeadsUpPrompt] 🎯 Showing prompt to user!');
    
    // Сразу помечаем как показанное, чтобы не показать дважды
    await AsyncStorage.setItem(STORAGE_KEY, '1');
    console.log('[HeadsUpPrompt] ✅ Marked as shown in storage');

    GlobalAlert.show({
      type: 'info',
      title: '🔔 Срочные уведомления',
      message:
        'Чтобы вы не пропускали важные события, включите «Всплывающие уведомления».\n\n' +
        'Нажмите «Настройки» → найдите «Уведомления» → включите «Всплывающие уведомления».',
      buttons: [
        {
          text: 'Позже',
          style: 'cancel',
          onPress: () => {
            console.log('[HeadsUpPrompt] User clicked "Позже"');
          },
        },
        {
          text: 'Настройки',
          style: 'primary',
          onPress: async () => {
            try {
              console.log('[HeadsUpPrompt] User clicked "Настройки", opening settings...');
              await Linking.openSettings();
              console.log('[HeadsUpPrompt] ✅ Settings opened');
            } catch (error) {
              console.error('[HeadsUpPrompt] ❌ Failed to open settings:', error);
            }
          },
        },
      ],
    });
    
    console.log('[HeadsUpPrompt] ✅ Prompt displayed successfully');
  } catch (error) {
    console.error('[HeadsUpPrompt] ❌ Failed to show prompt:', error);
  }
}

/**
 * Утилита для сброса флага (для тестирования)
 * Использование: await resetHeadsUpPrompt()
 */
export async function resetHeadsUpPrompt() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(NOTIFICATION_RECEIVED_KEY);
    console.log('[HeadsUpPrompt] 🔄 Reset complete - prompt will show again on next notification');
    return true;
  } catch (error) {
    console.error('[HeadsUpPrompt] ❌ Reset failed:', error);
    return false;
  }
}

