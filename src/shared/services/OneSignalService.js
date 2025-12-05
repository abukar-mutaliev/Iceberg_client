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
        this.version = '2.0.0-fix-player-id'; // Версия с исправлениями
    }

    // Инициализация OneSignal
    async initialize(appId) {
        try {
            if (this.isInitialized) {
                console.log('[OneSignal] Уже инициализирован');
                return true;
            }

            const oneSignal = getOneSignal();
            if (!oneSignal) {
                console.warn('[OneSignal] SDK не доступен');
                return false;
            }

            if (!appId) {
                console.error('[OneSignal] App ID не предоставлен');
                return false;
            }

            console.log('[OneSignal] Начинаем инициализацию с App ID:', appId);

            // Инициализируем OneSignal
            oneSignal.initialize(appId);

            console.log('[OneSignal] SDK инициализирован, запрашиваем разрешения...');

            // Запрашиваем разрешения
            const hasPermission = await oneSignal.Notifications.requestPermission(true);

            console.log('[OneSignal] Разрешения получены:', hasPermission);

            if (!hasPermission) {
                console.warn('[OneSignal] Разрешения не предоставлены, но продолжаем');
            }

            // Настройка обработчиков
            this.setupNotificationHandlers(oneSignal);

            this.isInitialized = true;
            
            console.log('[OneSignal] Инициализация завершена успешно');
            return true;

        } catch (error) {
            console.error('[OneSignal] Ошибка инициализации:', error);
            return false;
        }
    }

    // Настройка обработчиков уведомлений
    setupNotificationHandlers(oneSignal) {
        try {
            if (!oneSignal) {
                console.warn('[OneSignal] SDK не доступен для настройки обработчиков');
                return;
            }

            console.log('[OneSignal] Настраиваем обработчики уведомлений...');

            // Обработчик нажатий на уведомления
            oneSignal.Notifications.addEventListener('click', (event) => {
                console.log('[OneSignal] Уведомление нажато:', event);
                const data = event.notification.additionalData;
                if (data) {
                    this.handleNotificationNavigation(data);
                }
            });

            // Обработчик получения уведомлений в foreground
            oneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
                console.log('[OneSignal] Уведомление получено в foreground:', event);
                // Уведомления в foreground обрабатываются автоматически
            });

            console.log('[OneSignal] ✅ Обработчики настроены');

        } catch (error) {
            console.error('[OneSignal] Ошибка настройки обработчиков:', error);
        }
    }

    // Обработка навигации из уведомлений
    handleNotificationNavigation(data) {
        try {
            // Используем PushNotificationService для обработки навигации
            const PushNotificationService = require('./PushNotificationService');
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
            console.log('[OneSignal] ===== Начинаем инициализацию для пользователя =====');
            console.log('[OneSignal] User ID:', user.id);

            // Всегда проверяем инициализацию заново для пользователя
            const appId =
                process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ||
                (Constants?.expoConfig?.extra?.oneSignalAppId ?? null);

            console.log('[OneSignal] Инициализация с App ID:', appId);
            
            const initResult = await this.initialize(appId);
            if (!initResult) {
                console.error('[OneSignal] ❌ Не удалось инициализировать SDK');
                return false;
            }

            console.log('[OneSignal] ✅ SDK инициализирован');

            // Устанавливаем внешний ID пользователя
            console.log('[OneSignal] Устанавливаем External User ID...');
            await this.setExternalUserId(user.id.toString());

            // Даем время OneSignal зарегистрировать устройство (важно!)
            console.log('[OneSignal] Ожидаем регистрацию устройства (3 секунды)...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Получаем subscription ID с повторными попытками
            console.log('[OneSignal] Получаем Subscription ID...');
            const subscriptionId = await this.getSubscriptionId();
            
            if (subscriptionId) {
                console.log('[OneSignal] ✅ Player ID получен:', subscriptionId.substring(0, 8) + '...');
                
                // Сохраняем на сервер
                console.log('[OneSignal] Сохраняем токен на сервер...');
                const saveResult = await this.saveSubscriptionToServer(subscriptionId, user.id);
                
                if (!saveResult) {
                    console.warn('[OneSignal] ⚠️ Не удалось сохранить токен на сервер');
                    return false;
                }
                
                console.log('[OneSignal] ✅ Токен сохранен на сервер');
            } else {
                console.error('[OneSignal] ❌ Player ID не получен после всех попыток');
                return false;
            }

            this.currentUserId = user.id;
            console.log('[OneSignal] ===== Инициализация завершена успешно =====');

            return true;

        } catch (error) {
            console.error('[OneSignal] ❌ Критическая ошибка initializeForUser:', error);
            return false;
        }
    }

    // Установка внешнего ID пользователя
    async setExternalUserId(userId) {
        try {
            const oneSignal = getOneSignal();
            if (!oneSignal) {
                console.warn('[OneSignal] SDK не доступен для установки User ID');
                return;
            }

            // Проверяем доступность метода login
            if (!oneSignal.login || typeof oneSignal.login !== 'function') {
                console.warn('[OneSignal] Метод login не доступен');
                return;
            }

            console.log('[OneSignal] Устанавливаем External User ID:', userId);
            await oneSignal.login(userId);
            console.log('[OneSignal] External User ID установлен успешно');
        } catch (error) {
            console.error('[OneSignal] Ошибка установки External User ID:', error);
        }
    }

    // Получение Subscription ID с повторными попытками
    async getSubscriptionId(retries = 5, delayMs = 2000) {
        try {
            const oneSignal = getOneSignal();
            if (!oneSignal) {
                console.warn('[OneSignal] SDK не доступен для получения Subscription ID');
                return null;
            }

            // Проверяем доступность методов
            if (!oneSignal.User?.pushSubscription?.getIdAsync) {
                console.warn('[OneSignal] pushSubscription.getIdAsync не доступен');
                return null;
            }

            console.log('[OneSignal] Получение Subscription ID, попыток осталось:', retries);

            // Пытаемся получить subscription ID
            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    console.log(`[OneSignal] Попытка ${attempt}/${retries} получить Player ID...`);
                    
                    const subscriptionId = await oneSignal.User.pushSubscription.getIdAsync();
                    
                    if (subscriptionId) {
                        console.log('[OneSignal] ✅ Player ID успешно получен:', subscriptionId.substring(0, 8) + '...');
                        this.subscriptionId = subscriptionId;
                        return subscriptionId;
                    }
                    
                    console.log(`[OneSignal] Player ID null на попытке ${attempt}/${retries}, ожидаем ${delayMs}ms...`);
                    
                    // Если это не последняя попытка, ждем перед следующей
                    if (attempt < retries) {
                        await new Promise(resolve => setTimeout(resolve, delayMs));
                    }
                } catch (attemptError) {
                    console.error(`[OneSignal] Ошибка на попытке ${attempt}/${retries}:`, attemptError.message);
                    
                    // Если это не последняя попытка, ждем перед следующей
                    if (attempt < retries) {
                        await new Promise(resolve => setTimeout(resolve, delayMs));
                    }
                }
            }
            
            console.error('[OneSignal] ❌ Не удалось получить Player ID после всех попыток');
            return null;
            
        } catch (error) {
            console.error('[OneSignal] Критическая ошибка получения Subscription ID:', error);
            return null;
        }
    }

    // Сохранение subscription на сервер
    async saveSubscriptionToServer(subscriptionId, userId) {
        try {
            if (!subscriptionId) {
                console.error('[OneSignal] subscriptionId пустой или undefined');
                return false;
            }

            console.log('[OneSignal] Сохраняем токен на сервер...', {
                subscriptionId: subscriptionId.substring(0, 8) + '...',
                userId
            });

            // Импортируем API только когда нужно (чтобы избежать циклических зависимостей)
            const { createProtectedRequest } = require('@shared/api/api');
            
            if (!createProtectedRequest) {
                console.error('[OneSignal] createProtectedRequest не найден');
                return false;
            }

            const tokenData = {
                token: subscriptionId,
                deviceId: subscriptionId, // OneSignal Player ID используем как deviceId
                platform: Platform.OS,
                tokenType: 'onesignal'
            };
            
            console.log('[OneSignal] Отправляем запрос на сервер:', {
                ...tokenData,
                token: tokenData.token.substring(0, 8) + '...'
            });
            
            const response = await createProtectedRequest('post', '/api/push-tokens', tokenData);

            if (response) {
                console.log('[OneSignal] ✅ Токен успешно сохранен на сервер');
                return true;
            } else {
                console.warn('[OneSignal] ⚠️ Пустой ответ от сервера');
                return false;
            }

        } catch (error) {
            console.error('[OneSignal] ❌ Ошибка сохранения subscription:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            return false;
        }
    }

    // Очистка при выходе пользователя с деактивацией токена на сервере
    async clearUserContext() {
        try {
            console.log('[OneSignal] Начинаем очистку контекста пользователя...');
            
            // Сначала получаем актуальный Player ID и деактивируем токен на сервере
            try {
                const currentPlayerId = this.subscriptionId || await this.getSubscriptionId(2, 1000);
                
                if (currentPlayerId) {
                    console.log('[OneSignal] Деактивируем токен на сервере:', currentPlayerId.substring(0, 8) + '...');
                    
                    // Импортируем API только когда нужно
                    const { createProtectedRequest } = require('@shared/api/api');
                    
                    await createProtectedRequest('put', '/api/push-tokens/deactivate', {
                        token: currentPlayerId
                    });
                    
                    console.log('[OneSignal] ✅ Токен деактивирован на сервере');
                } else {
                    console.log('[OneSignal] Player ID отсутствует, пропускаем деактивацию на сервере');
                }
            } catch (deactivateError) {
                console.error('[OneSignal] Ошибка деактивации токена на сервере:', deactivateError.message);
                // Продолжаем очистку даже если деактивация не удалась
            }

            // Сбрасываем локальное состояние
            this.currentUserId = null;
            this.subscriptionId = null;
            this.isInitialized = false;

            console.log('[OneSignal] ✅ Контекст очищен');

            // Во время выхода из системы не пытаемся использовать OneSignal модуль
            // чтобы избежать ошибок "Could not load RNOneSignal native module"

        } catch (error) {
            console.error('[OneSignal] Ошибка очистки контекста:', error);
            // Гарантируем очистку локального состояния даже при ошибке
            this.currentUserId = null;
            this.subscriptionId = null;
            this.isInitialized = false;
        }
    }

    // Получение статуса сервиса
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasSubscription: !!this.subscriptionId,
            currentUserId: this.currentUserId,
            service: 'OneSignal',
            version: this.version || '1.0.0-old' // Для совместимости
        };
    }

    // Получение версии сервиса
    getVersion() {
        return this.version || '1.0.0-old';
    }

    // Отправка тега пользователю
    async setUserTags(tags) {
        try {
            const oneSignal = getOneSignal();
            if (!oneSignal) {
                console.warn('[OneSignal] SDK не доступен для установки тегов');
                return;
            }

            // Проверяем доступность метода addTags
            if (!oneSignal.User?.addTags || typeof oneSignal.User.addTags !== 'function') {
                console.warn('[OneSignal] User.addTags не доступен');
                return;
            }

            console.log('[OneSignal] Устанавливаем теги:', tags);
            await oneSignal.User.addTags(tags);
            console.log('[OneSignal] ✅ Теги установлены успешно');
        } catch (error) {
            console.error('[OneSignal] Ошибка установки тегов:', error);
        }
    }

    // Получение текущего subscription ID
    getCurrentSubscriptionId() {
        return this.subscriptionId;
    }

    // Получение FCM Push Token (для диагностики)
    async getPushToken() {
        try {
            const oneSignal = getOneSignal();
            if (!oneSignal) {
                console.warn('[OneSignal] SDK не доступен для получения Push Token');
                return null;
            }

            // Проверяем доступность метода
            if (!oneSignal.User?.pushSubscription?.getTokenAsync) {
                console.warn('[OneSignal] pushSubscription.getTokenAsync не доступен');
                return null;
            }

            console.log('[OneSignal] Получаем FCM Push Token...');
            const pushToken = await oneSignal.User.pushSubscription.getTokenAsync();
            
            if (pushToken) {
                console.log('[OneSignal] ✅ FCM Token получен:', pushToken.substring(0, 20) + '...');
            } else {
                console.log('[OneSignal] FCM Token null');
            }
            
            return pushToken;
        } catch (error) {
            console.error('[OneSignal] Ошибка получения Push Token:', error);
            return null;
        }
    }

    // Проверка статуса подписки
    async getOptedIn() {
        try {
            const oneSignal = getOneSignal();
            if (!oneSignal) {
                return false;
            }

            if (!oneSignal.User?.pushSubscription?.getOptedIn) {
                return false;
            }

            const optedIn = await oneSignal.User.pushSubscription.getOptedIn();
            console.log('[OneSignal] Opted In статус:', optedIn);
            return optedIn;
        } catch (error) {
            console.error('[OneSignal] Ошибка получения Opted In статуса:', error);
            return false;
        }
    }
}

// Экспортируем синглтон
const oneSignalService = new OneSignalService();
export default oneSignalService;