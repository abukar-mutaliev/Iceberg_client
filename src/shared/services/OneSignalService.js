/**
 * OneSignal Service - простое и надежное решение для push-уведомлений
 * Работает во всех типах сборок: development, preview, production
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ленивая загрузка OneSignal для избежания ошибок при выходе
let OneSignal = null;
let oneSignalLoadAttempted = false;

const getOneSignal = () => {
    if (OneSignal !== null) {
        return OneSignal;
    }

    if (oneSignalLoadAttempted) {
        return null; // Уже пытались загрузить и не смогли
    }

    // Проверяем, что мы не в Expo Go (где OneSignal недоступен)
    try {
        const isExpoGo = Constants?.executionEnvironment === 'storeClient' || 
                          Constants?.appOwnership === 'expo';
        
        if (isExpoGo) {
            oneSignalLoadAttempted = true;
            return null; // OneSignal не работает в Expo Go
        }
    } catch (e) {
        // Если не удалось проверить, продолжаем попытку загрузки
    }

    oneSignalLoadAttempted = true;

    try {
        const OneSignalModule = require('react-native-onesignal');
        OneSignal = OneSignalModule.default || OneSignalModule.OneSignal || OneSignalModule;
        return OneSignal;
    } catch (e) {
        // Временно отключены логи OneSignal
        // console.warn('OneSignal не доступен:', e.message);
        return null;
    }
};


class OneSignalService {
    constructor() {
        this.isInitialized = false;
        this.currentUserId = null;
        this.subscriptionId = null;
    }

    // Получить экземпляр OneSignal SDK
    getOneSignal() {
        return getOneSignal();
    }

    getConfiguredAndroidChannelUuid() {
        try {
            const uuid =
                process.env.EXPO_PUBLIC_ONESIGNAL_ANDROID_CHANNEL_UUID ||
                Constants?.expoConfig?.extra?.oneSignalAndroidChannelUuid ||
                null;

            const cleanUuid = typeof uuid === 'string' ? uuid.trim() : null;
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return cleanUuid && uuidRegex.test(cleanUuid) ? cleanUuid : null;
        } catch (_) {
            return null;
        }
    }

    getExpectedOneSignalAndroidChannelId() {
        const uuid = this.getConfiguredAndroidChannelUuid();
        return uuid ? `OS_${uuid}` : null;
    }

    // ⚠️ КРИТИЧЕСКИ ВАЖНО: Создание канала уведомлений для Android
    // Этот канал ОБЯЗАТЕЛЬНО нужен для heads-up уведомлений
    async ensureNotificationChannelExists() {
        // Пропускаем только если не Android
        if (Platform.OS !== 'android') {
            return true;
        }

        try {
            // КРИТИЧНО: Android НЕ ПОЗВОЛЯЕТ изменить importance уже существующего канала!
            // Поэтому проверяем существующие каналы и пересоздаем только если нужно.

            // Примечание: OneSignal автоматически управляет каналами уведомлений
            // Каналы создаются через OneSignal Dashboard или через нативный код
            // Не нужно создавать каналы вручную через expo-notifications
            
            // Если мы знаем UUID канала из OneSignal Dashboard, OneSignal SDK автоматически
            // создаст канал `OS_<uuid>` для heads-up уведомлений
            try {
                const cleanUuid = this.getConfiguredAndroidChannelUuid();
                if (cleanUuid) {
                    const osChannelId = `OS_${cleanUuid}`;
                    await ensureChannel(osChannelId, 'Iceberg (OneSignal)');
                }
            } catch (e) {
                // Ошибка создания OneSignal канала
            }

            return true;
            
        } catch (error) {
            return false;
        }
    }

    // Инициализация OneSignal
    async initialize(appId) {
        try {
            const configuredAppId =
                process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ||
                (Constants?.expoConfig?.extra?.oneSignalAppId ?? null);

            // Защита от случайной инициализации "не тем" App ID (особенно из диагностических экранов).
            // Если appId передан, но отличается от сконфигурированного — используем сконфигурированный.
            const effectiveAppId = configuredAppId || appId;

            if (this.isInitialized) {
                // Но все равно проверяем каналы - на случай если они были удалены пользователем
                await this.ensureNotificationChannelExists();
                return true;
            }
            
            // ⚠️ КРИТИЧЕСКИ ВАЖНО: Создаем каналы уведомлений ПЕРЕД инициализацией OneSignal
            // Это гарантирует что когда OneSignal создаст свой канал, он будет создан правильно
            await this.ensureNotificationChannelExists();

            const oneSignal = getOneSignal();
            if (!oneSignal) {
                return false;
            }

            if (!effectiveAppId) {
                return false;
            }

            // Инициализируем OneSignal
            oneSignal.initialize(effectiveAppId);

            // Запрашиваем разрешения
            await oneSignal.Notifications.requestPermission(true);

            // ВАЖНО: Принудительно подписываем. На Android requestPermission() может вернуть false,
            // но подписка всё равно должна быть включена для получения пушей.
            if (oneSignal.User?.pushSubscription?.optIn) {
                try {
                    await oneSignal.User.pushSubscription.optIn();
                } catch (_) {}
            }

            // Настройка обработчиков
            this.setupNotificationHandlers(oneSignal);

            this.isInitialized = true;
            
            return true;

        } catch (error) {
            return false;
        }
    }

    // Настройка обработчиков уведомлений
    setupNotificationHandlers(oneSignal) {
        try {
            if (!oneSignal) {
                // Временно отключены логи OneSignal
                // console.warn('OneSignal не доступен для настройки обработчиков');
                return;
            }

            // Обработчик нажатий на уведомления
            oneSignal.Notifications.addEventListener('click', (event) => {
                try {
                    const n = event?.notification || {};
                    const data =
                        n.additionalData ||
                        n.additional_data ||
                        n?.payload?.additionalData ||
                        n?.payload?.additional_data ||
                        null;

                    if (data) {
                        this.handleNotificationNavigation(data);
                    }
                } catch (_) {}
            });

            // Обработчик получения уведомлений в foreground
            oneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
                try {
                    // ВАЖНО:
                    // В некоторых версиях OneSignal RN SDK уведомления в foreground НЕ показываются,
                    // пока мы явно не вызовем display(). Для WhatsApp-поведения (heads-up даже в foreground)
                    // пытаемся безопасно показать системное уведомление.
                    const notification = event?.getNotification?.() || event?.notification;

                    // Если сейчас открыт этот же чат — не показываем уведомление в foreground
                    try {
                        const additionalData =
                            notification?.additionalData ||
                            notification?.additional_data ||
                            event?.notification?.additionalData ||
                            event?.notification?.additional_data ||
                            null;

                        const data = additionalData || {};
                        const PushNotificationService = require('@shared/services/PushNotificationService');
                        const pushNotificationService = PushNotificationService.default || PushNotificationService;

                        if (pushNotificationService?.shouldSuppressChatNotification?.(data)) {
                            if (event?.preventDefault && typeof event.preventDefault === 'function') {
                                event.preventDefault();
                            }
                            return; // ✅ suppress
                        }
                    } catch (_) {}

                    // Показываем уведомление через OneSignal SDK
                    // НЕ вызываем preventDefault - пусть OneSignal покажет уведомление стандартным способом
                    // Это должно гарантировать что уведомление появится
                    
                    if (notification?.display && typeof notification.display === 'function') {
                        notification.display();
                    }
                } catch (e) {
                    // Не ломаем приложение из-за ошибок в SDK/событиях
                }
            });

        } catch (error) {
            // Временно отключены логи OneSignal
            // console.error('Ошибка настройки OneSignal обработчиков:', error);
        }
    }

    // Обработка навигации из уведомлений
    handleNotificationNavigation(data) {
        try {
            // Используем PushNotificationService для обработки навигации
            const PushNotificationService = require('@shared/services/PushNotificationService');
            const pushNotificationService = PushNotificationService.default || PushNotificationService;
            
            if (pushNotificationService && pushNotificationService.handleNotificationNavigation) {
                pushNotificationService.handleNotificationNavigation(data);
            } else {
                // Fallback логика если PushNotificationService недоступен
                this.fallbackNavigation(data);
            }
        } catch (error) {
            // Временно отключены логи OneSignal
            // console.error('Ошибка при обработке навигации OneSignal:', error);
            this.fallbackNavigation(data);
        }
    }

    // Резервная навигация
    fallbackNavigation(data) {
        // Fallback навигация для случаев когда PushNotificationService недоступен
        // Логика навигации обрабатывается в PushNotificationService
    }

    // Инициализация для пользователя
    async initializeForUser(user) {
        try {
            console.log('[OneSignal] 🚀 initializeForUser начата для userId:', user.id);
            
            // ⚠️ КРИТИЧЕСКИ ВАЖНО: Убеждаемся что канал уведомлений существует
            await this.ensureNotificationChannelExists();
            
            if (!this.isInitialized) {
                // Пытаемся инициализировать OneSignal с App ID
                const appId =
                    process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ||
                    (Constants?.expoConfig?.extra?.oneSignalAppId ?? null);
                console.log('[OneSignal] 📱 App ID:', appId);
                
                const initResult = await this.initialize(appId);
                if (!initResult) {
                    console.log('[OneSignal] ❌ Инициализация не удалась');
                    return false;
                }
            }

            // Устанавливаем внешний ID пользователя
            console.log('[OneSignal] 👤 Устанавливаем External User ID:', user.id.toString());
            await this.setExternalUserId(user.id.toString());

            // ВАЖНО: Принудительно подписываем пользователя на уведомления
            const oneSignal = getOneSignal();
            if (oneSignal?.User?.pushSubscription?.optIn) {
                console.log('[OneSignal] ✅ Вызываем optIn() для подписки');
                await oneSignal.User.pushSubscription.optIn();
            }

            // Получаем subscription ID
            const subscriptionId = await this.getSubscriptionId();
            console.log('[OneSignal] 🎫 Subscription ID:', subscriptionId);
            
            if (subscriptionId) {
                // Сохраняем на сервер
                const saveResult = await this.saveSubscriptionToServer(subscriptionId, user.id);
                if (!saveResult) {
                    console.log('[OneSignal] ❌ Не удалось сохранить subscription на сервер');
                    return false;
                }
                console.log('[OneSignal] ✅ Subscription сохранен на сервер');
            } else {
                console.warn('[OneSignal] ⚠️ No subscription ID received');
                return false;
            }

            this.currentUserId = user.id;
            console.log('[OneSignal] ✅ initializeForUser завершена успешно');

            return true;

        } catch (error) {
            console.error('[OneSignal] ❌ Ошибка initializeForUser:', error);
            return false;
        }
    }

    // Установка внешнего ID пользователя
    async setExternalUserId(userId) {
        try {
            const oneSignal = getOneSignal();
            if (!oneSignal) {
                // Временно отключены логи OneSignal
                // console.warn('OneSignal не доступен для установки User ID');
                return;
            }

            // Проверяем доступность метода login
            if (!oneSignal.login || typeof oneSignal.login !== 'function') {
                // Временно отключены логи OneSignal
                // console.warn('OneSignal.login не доступен');
                return;
            }

            await oneSignal.login(userId);
        } catch (error) {
            // Временно отключены логи OneSignal
            // console.error('Ошибка установки External User ID:', error);
        }
    }

    // Получение Subscription ID
    async getSubscriptionId() {
        try {
            const oneSignal = getOneSignal();
            if (!oneSignal) {
                // Временно отключены логи OneSignal
                // console.warn('OneSignal не доступен для получения Subscription ID');
                return null;
            }

            // Проверяем доступность методов
            if (!oneSignal.User?.pushSubscription?.getIdAsync) {
                // Временно отключены логи OneSignal
                // console.warn('OneSignal.User.pushSubscription.getIdAsync не доступен');
                return null;
            }

            const deviceState = await oneSignal.User.pushSubscription.getIdAsync();
            this.subscriptionId = deviceState;
            return deviceState;
        } catch (error) {
            // Временно отключены логи OneSignal
            // console.error('Ошибка получения Subscription ID:', error);
            return null;
        }
    }

    // Сохранение subscription на сервер
    async saveSubscriptionToServer(subscriptionId, userId) {
        try {
            if (!subscriptionId) {
                // Временно отключены логи OneSignal
                // console.error('subscriptionId пустой или undefined');
                return false;
            }

            // Импортируем API только когда нужно (чтобы избежать циклических зависимостей)
            const { createProtectedRequest } = require('@shared/api/api');
            
            if (!createProtectedRequest) {
                // Временно отключены логи OneSignal
                // console.error('createProtectedRequest не найден');
                return false;
            }

            const tokenData = {
                token: subscriptionId,
                deviceId: subscriptionId, // OneSignal Player ID используем как deviceId
                platform: Platform.OS,
                tokenType: 'onesignal'
            };
            
            const response = await createProtectedRequest('post', '/api/push-tokens', tokenData);

            if (response) {
                return true;
            } else {
                // Временно отключены логи OneSignal
                // console.warn('Пустой ответ от сервера');
                return false;
            }

        } catch (error) {
            // Временно отключены логи OneSignal
            // console.error('Ошибка сохранения OneSignal subscription:', {
            //     message: error.message,
            //     response: error.response?.data,
            //     status: error.response?.status
            // });
            return false;
        }
    }

    // Очистка при выходе пользователя с деактивацией токена на сервере
    async clearUserContext() {
        let deactivationSuccess = false;
        let deactivationError = null;

        try {
            // Сначала получаем актуальный Player ID и деактивируем токен на сервере
            try {
                const currentPlayerId = this.subscriptionId || await this.getSubscriptionId();
                
                if (currentPlayerId) {
                    // Импортируем API только когда нужно
                    const { createProtectedRequest } = require('@shared/api/api');
                    
                    const response = await createProtectedRequest('put', '/api/push-tokens/deactivate', {
                        token: currentPlayerId
                    });
                    
                    if (response) {
                        deactivationSuccess = true;
                    } else {
                        deactivationError = new Error('Empty response from server');
                    }
                } else {
                    deactivationSuccess = true; // Нечего деактивировать - считаем успехом
                }
            } catch (deactivateError) {
                deactivationError = deactivateError;
                // Продолжаем очистку локального состояния даже если деактивация не удалась
            }

            // Сбрасываем локальное состояние
            this.currentUserId = null;
            this.subscriptionId = null;
            this.isInitialized = false;

            // Во время выхода из системы не пытаемся использовать OneSignal модуль
            // чтобы избежать ошибок "Could not load RNOneSignal native module"

            return {
                success: deactivationSuccess,
                error: deactivationError
            };

        } catch (error) {
            // Гарантируем очистку локального состояния даже при ошибке
            this.currentUserId = null;
            this.subscriptionId = null;
            this.isInitialized = false;
            
            return {
                success: false,
                error: error
            };
        }
    }

    // Получение статуса сервиса
    getStatus() {
        const configuredAndroidChannelUuid = this.getConfiguredAndroidChannelUuid();
        const expectedAndroidChannelId = this.getExpectedOneSignalAndroidChannelId();

        return {
            isInitialized: this.isInitialized,
            hasSubscription: !!this.subscriptionId,
            currentUserId: this.currentUserId,
            configuredAndroidChannelUuid,
            expectedAndroidChannelId,
            service: 'OneSignal'
        };
    }

    // Отправка тега пользователю
    async setUserTags(tags) {
        try {
            const oneSignal = getOneSignal();
            if (!oneSignal) {
                // Временно отключены логи OneSignal
                // console.warn('OneSignal не доступен для установки тегов');
                return;
            }

            // Проверяем доступность метода addTags
            if (!oneSignal.User?.addTags || typeof oneSignal.User.addTags !== 'function') {
                // Временно отключены логи OneSignal
                // console.warn('OneSignal.User.addTags не доступен');
                return;
            }

            await oneSignal.User.addTags(tags);
        } catch (error) {
            // Временно отключены логи OneSignal
            // console.error('Ошибка установки OneSignal тегов:', error);
        }
    }

    // Получение текущего subscription ID
    getCurrentSubscriptionId() {
        return this.subscriptionId;
    }

    // Принудительное пересоздание ВСЕХ каналов (для диагностики/исправления проблем)
    // Примечание: Каналы управляются через OneSignal Dashboard или нативный код
    async forceRecreateAllChannels() {
        // OneSignal автоматически управляет каналами
        // Для изменения каналов используйте OneSignal Dashboard
        return false;
    }
}

// Экспортируем синглтон
const oneSignalService = new OneSignalService();
export default oneSignalService;