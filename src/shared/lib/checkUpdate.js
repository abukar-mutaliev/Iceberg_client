import VersionCheck from 'react-native-version-check';
import { Linking } from 'react-native';
import { GlobalAlert } from '@shared/ui/CustomAlert';

const UPDATE_CHECK_DELAY_MS = 2000;
const MESSAGE =
  'В новой версии улучшена производительность и исправлены ошибки. Рекомендуем обновиться.';

/**
 * Проверяет наличие новой версии приложения в Google Play / App Store
 * и показывает CustomAlert с предложением обновиться.
 * Вызывать после монтирования CustomAlertProvider (например, из AppContent).
 */
export async function checkForUpdate() {
  try {
    const latestVersion = await VersionCheck.getLatestVersion();
    const currentVersion = VersionCheck.getCurrentVersion();

    if (!latestVersion || !currentVersion) {
      return;
    }

    const hasUpdate = latestVersion !== currentVersion;
    if (!hasUpdate) {
      return;
    }

    if (!GlobalAlert.showAlert) {
      console.warn('[checkUpdate] GlobalAlert not ready, skip showing update dialog');
      return;
    }

    GlobalAlert.showAlert({
      type: 'info',
      title: 'Доступно обновление',
      message: MESSAGE,
      showCloseButton: true,
      buttons: [
        {
          text: 'Позже',
          style: 'cancel',
        },
        {
          text: 'Обновить',
          style: 'primary',
          icon: 'system-update',
          onPress: () => {
            const storeUrl = VersionCheck.getStoreUrl();
            if (storeUrl) {
              Linking.openURL(storeUrl).catch((err) => {
                console.warn('[checkUpdate] Failed to open store:', err);
              });
            }
          },
        },
      ],
    });
  } catch (e) {
    if (__DEV__) {
      console.log('[checkUpdate] Ошибка проверки обновления:', e?.message || e);
    }
  }
}

/**
 * Запускает проверку обновления с задержкой (чтобы не мешать старту приложения).
 * Вызывать один раз при старте приложения из компонента внутри CustomAlertProvider.
 *
 * @param {number} [delayMs=UPDATE_CHECK_DELAY_MS]
 */
export function scheduleUpdateCheck(delayMs = UPDATE_CHECK_DELAY_MS) {
  const timer = setTimeout(() => {
    checkForUpdate();
  }, delayMs);
  return () => clearTimeout(timer);
}
