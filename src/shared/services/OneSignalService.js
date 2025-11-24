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
    }

    // Инициализация OneSignal
    async initialize(appId) {
        try {
            if (this.isInitialized) {
                return true;
            }

            const oneSignal = getOneSignal();
            if (!oneSignal) {
                // Временно отключены логи OneSignal
                // console.warn('OneSignal не доступен, пропускаем инициализацию');
                return false;
            }

            if (!appId) {
                // Временно отключены логи OneSignal
                // console.error('OneSignal App ID не предоставлен');
                return false;
            }

            // Инициализируем OneSignal
            oneSignal.initialize(appId);

            // Запрашиваем разрешения
            const hasPermission = await oneSignal.Notifications.requestPermission(true);

            if (!hasPermission) {
                // Временно отключены логи OneSignal
                // console.warn('OneSignal разрешения не предоставлены');
                // Продолжаем инициализацию даже без разрешений
            }

            // Настройка обработчиков
            this.setupNotificationHandlers(oneSignal);

            this.isInitialized = true;
            
            return true;

        } catch (error) {
            // Временно отключены логи OneSignal
            // console.error('Ошибка инициализации OneSignal:', error);
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
                const data = event.notification.additionalData;
                if (data) {
                    this.handleNotificationNavigation(data);
                }
            });

            // Обработчик получения уведомлений в foreground
            oneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
                // Уведомления в foreground обрабатываются автоматически
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
            if (!this.isInitialized) {
                // Пытаемся инициализировать OneSignal с App ID
                const appId =
                    process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ||
                    (Constants?.expoConfig?.extra?.oneSignalAppId ?? null);
                const initResult = await this.initialize(appId);
                if (!initResult) {
                    return false;
                }
            }

            // Устанавливаем внешний ID пользователя
            await this.setExternalUserId(user.id.toString());

            // Получаем subscription ID
            const subscriptionId = await this.getSubscriptionId();
            
            if (subscriptionId) {
                // Сохраняем на сервер
                const saveResult = await this.saveSubscriptionToServer(subscriptionId, user.id);
                if (!saveResult) {
                    return false;
                }
            } else {
                // Временно отключены логи OneSignal
                // console.warn('No subscription ID received');
                return false;
            }

            this.currentUserId = user.id;

            return true;

        } catch (error) {
            // Временно отключены логи OneSignal
            // console.error('Ошибка OneSignal initializeForUser:', error);
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
        try {
            // Сначала получаем актуальный Player ID и деактивируем токен на сервере
            try {
                const currentPlayerId = this.subscriptionId || await this.getSubscriptionId();
                
                if (currentPlayerId) {
                    // Импортируем API только когда нужно
                    const { createProtectedRequest } = require('@shared/api/api');
                    
                    await createProtectedRequest('put', '/api/push-tokens/deactivate', {
                        token: currentPlayerId
                    });
                }
            } catch (deactivateError) {
                // Временно отключены логи OneSignal
                // console.error('Ошибка деактивации OneSignal токена на сервере:', deactivateError.message);
                // Продолжаем очистку даже если деактивация не удалась
            }

            // Сбрасываем локальное состояние
            this.currentUserId = null;
            this.subscriptionId = null;
            this.isInitialized = false;

            // Во время выхода из системы не пытаемся использовать OneSignal модуль
            // чтобы избежать ошибок "Could not load RNOneSignal native module"

        } catch (error) {
            // Временно отключены логи OneSignal
            // console.error('Ошибка очистки OneSignal контекста:', error);
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
}

// Экспортируем синглтон
const oneSignalService = new OneSignalService();
export default oneSignalService;