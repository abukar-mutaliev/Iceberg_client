import { Linking, Platform } from 'react-native';
import VersionCheck from 'react-native-version-check';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { GlobalAlert } from '@shared/ui/CustomAlert';

const UPDATE_CHECK_DELAY_MS = 2000;
const APP_STORE_ID = '6757783124';
const PACKAGE_NAME = 'com.abuingush.iceberg';

const FALLBACK_STORE_URL = Platform.select({
  ios: `https://apps.apple.com/ru/app/iceberg-ingushetia/id${APP_STORE_ID}`,
  android: `https://play.google.com/store/apps/details?id=${PACKAGE_NAME}`,
  default: `https://play.google.com/store/apps/details?id=${PACKAGE_NAME}`,
});

const STORE_CHECK_OPTIONS = {
  appID: APP_STORE_ID,
  packageName: PACKAGE_NAME,
  country: 'ru',
  forceUpdate: true,
};

export const UPDATE_KIND = {
  STORE: 'store',
  OTA: 'ota',
  LATEST: 'latest',
  ERROR: 'error',
};

function getConfigVersion() {
  const config = Constants.expoConfig ?? {};
  return Platform.OS === 'android'
    ? (config.android?.versionName || config.version)
    : (config.ios?.version || config.version);
}

function getCurrentAppVersion() {
  const fromConfig = getConfigVersion();

  try {
    const fromNative = VersionCheck.getCurrentVersion();
    // В Expo Go native-версия — это версия Expo Go, а не приложения.
    if (Constants.appOwnership === 'expo') {
      return fromConfig || fromNative;
    }
    return fromNative || fromConfig;
  } catch {
    return fromConfig;
  }
}

function showAlert(config) {
  GlobalAlert.show({
    showCloseButton: true,
    ...config,
  });
}

async function getStoreUrlSafe(preferredUrl) {
  if (preferredUrl) {
    return preferredUrl;
  }

  try {
    const url = await VersionCheck.getStoreUrl({
      ...STORE_CHECK_OPTIONS,
      ignoreErrors: true,
    });
    return url || FALLBACK_STORE_URL;
  } catch {
    return FALLBACK_STORE_URL;
  }
}

async function checkStoreUpdate({ ignoreErrors = true } = {}) {
  const currentVersion = getCurrentAppVersion();

  try {
    const result = await VersionCheck.needUpdate({
      ...STORE_CHECK_OPTIONS,
      currentVersion,
      ignoreErrors,
    });

    if (!result?.latestVersion) {
      return { available: false, currentVersion, failed: true };
    }

    return {
      available: Boolean(result.isNeeded),
      currentVersion: result.currentVersion || currentVersion,
      latestVersion: result.latestVersion,
      storeUrl: await getStoreUrlSafe(result.storeUrl),
      failed: false,
    };
  } catch (error) {
    if (!ignoreErrors) {
      throw error;
    }
    return { available: false, currentVersion, failed: true, error };
  }
}

async function checkOtaUpdate() {
  try {
    if (!Updates.isEnabled) {
      return { available: false, enabled: false };
    }

    const result = await Updates.checkForUpdateAsync();
    return {
      available: Boolean(result.isAvailable),
      enabled: true,
      manifest: result.manifest,
    };
  } catch (error) {
    return { available: false, enabled: false, error };
  }
}

export async function openStoreForUpdate(storeUrl) {
  const url = storeUrl || (await getStoreUrlSafe());
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.warn('[checkUpdate] Failed to open store:', error);
    throw error;
  }
}

export async function applyOtaUpdate() {
  const result = await Updates.fetchUpdateAsync();
  if (!result.isNew) {
    throw new Error('OTA_NOT_NEW');
  }
  await Updates.reloadAsync();
}

export async function applyAppUpdate(update) {
  if (!update) {
    return;
  }

  if (update.kind === UPDATE_KIND.STORE) {
    await openStoreForUpdate(update.storeUrl);
    return;
  }

  if (update.kind === UPDATE_KIND.OTA) {
    await applyOtaUpdate();
  }
}

function promptStoreUpdate(update, { onUpdate } = {}) {
  const versionHint = update.latestVersion
    ? `Доступна версия ${update.latestVersion}. `
    : '';

  showAlert({
    type: 'info',
    title: 'Доступно обновление',
    message: `${versionHint}В новой версии улучшена производительность и исправлены ошибки. Рекомендуем обновиться.`,
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
          if (onUpdate) {
            onUpdate();
            return;
          }
          openStoreForUpdate(update.storeUrl).catch(() => {
            showAlert({
              type: 'error',
              title: 'Не удалось открыть магазин',
              message: 'Откройте магазин приложений и обновите Iceberg вручную.',
            });
          });
        },
      },
    ],
  });
}

function promptOtaUpdate({ onUpdate } = {}) {
  showAlert({
    type: 'info',
    title: 'Доступно обновление',
    message: 'Новая версия уже готова. Приложение перезапустится после установки.',
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
          if (onUpdate) {
            onUpdate();
          }
        },
      },
    ],
  });
}

export function promptLatestVersion() {
  showAlert({
    type: 'success',
    title: 'Обновлений нет',
    message: 'Установлена актуальная версия приложения.',
    autoClose: true,
    autoCloseDuration: 2500,
  });
}

export function promptUpdateError({ onOpenStore } = {}) {
  showAlert({
    type: 'error',
    title: 'Не удалось проверить обновления',
    message: 'Проверьте подключение к интернету и попробуйте ещё раз.',
    buttons: [
      {
        text: 'Закрыть',
        style: 'cancel',
      },
      {
        text: 'Открыть магазин',
        style: 'primary',
        onPress: () => {
          if (onOpenStore) {
            onOpenStore();
            return;
          }
          openStoreForUpdate().catch(() => {});
        },
      },
    ],
  });
}

export function promptApplyUpdateError() {
  showAlert({
    type: 'error',
    title: 'Не удалось обновить приложение',
    message: 'Попробуйте ещё раз или откройте магазин приложений.',
  });
}

/**
 * Ручная проверка: магазин + OTA. Не показывает диалоги — ими управляет экран.
 */
export async function checkAppUpdates() {
  const currentVersion = getCurrentAppVersion();

  const [store, ota] = await Promise.all([
    checkStoreUpdate({ ignoreErrors: true }),
    checkOtaUpdate(),
  ]);

  if (store.available) {
    return {
      kind: UPDATE_KIND.STORE,
      currentVersion: store.currentVersion || currentVersion,
      latestVersion: store.latestVersion,
      storeUrl: store.storeUrl,
    };
  }

  if (ota.available) {
    return {
      kind: UPDATE_KIND.OTA,
      currentVersion,
    };
  }

  if (!store.failed || ota.enabled) {
    return {
      kind: UPDATE_KIND.LATEST,
      currentVersion: store.currentVersion || currentVersion,
      latestVersion: store.latestVersion,
    };
  }

  return {
    kind: UPDATE_KIND.ERROR,
    currentVersion,
  };
}

export function promptAvailableUpdate(update, handlers) {
  if (update?.kind === UPDATE_KIND.STORE) {
    promptStoreUpdate(update, handlers);
    return;
  }
  if (update?.kind === UPDATE_KIND.OTA) {
    promptOtaUpdate(handlers);
  }
}

/**
 * Проверяет наличие новой версии в магазине и показывает диалог.
 * Используется при старте приложения.
 */
export async function checkForUpdate() {
  try {
    const store = await checkStoreUpdate({ ignoreErrors: true });
    if (!store.available) {
      return;
    }
    promptStoreUpdate(store);
  } catch (error) {
    if (__DEV__) {
      console.log('[checkUpdate] Ошибка проверки обновления:', error?.message || error);
    }
  }
}

/**
 * Запускает проверку обновления с задержкой (чтобы не мешать старту приложения).
 *
 * @param {number} [delayMs=UPDATE_CHECK_DELAY_MS]
 */
export function scheduleUpdateCheck(delayMs = UPDATE_CHECK_DELAY_MS) {
  const timer = setTimeout(() => {
    checkForUpdate();
  }, delayMs);
  return () => clearTimeout(timer);
}
