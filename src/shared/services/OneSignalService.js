/**
 * OneSignal Service - простое и надежное решение для push-уведомлений
 * Работает во всех типах сборок: development, preview, production
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

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
        this.notificationChannelCreated = false;
    }

    // ⚠️ КРИТИЧЕСКИ ВАЖНО: Создание канала уведомлений для Android
    // Этот канал ОБЯЗАТЕЛЬНО нужен для heads-up уведомлений
    async ensureNotificationChannelExists() {
        // Пропускаем если не Android или уже создан
        if (Platform.OS !== 'android' || this.notificationChannelCreated) {
            return true;
        }

        try {
            console.log('[OneSignal] 📢 Создаем канал уведомлений fcm_fallback_notification_channel');
            
            await Notifications.setNotificationChannelAsync('fcm_fallback_notification_channel', {
                name: 'Сообщения',
                importance: Notifications.AndroidImportance.MAX, // MAX = heads-up уведомления
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#007AFF',
                sound: 'default',
                enableVibrate: true,
                enableLights: true,
                lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                bypassDnd: false,
            });

            this.notificationChannelCreated = true;
            console.log('[OneSignal] ✅ Канал уведомлений создан с MAX importance');
            return true;
            
        } catch (error) {
            console.error('[OneSignal] ❌ Ошибка создания канала уведомлений:', error);
            return false;
        }
    }

    // Инициализация OneSignal
    async initialize(appId) {
        try {
            console.log('[OneSignal] 🔧 initialize() вызван с appId:', appId?.substring(0, 10) + '...');
            
            if (this.isInitialized) {
                console.log('[OneSignal] ✅ Уже инициализирован');
                return true;
            }

            // ⚠️ КРИТИЧЕСКИ ВАЖНО: Создаем канал уведомлений ДО инициализации OneSignal
            // Это гарантирует что канал существует на устройстве перед получением уведомлений
            await this.ensureNotificationChannelExists();

            const oneSignal = getOneSignal();
            if (!oneSignal) {
                console.warn('[OneSignal] ⚠️ OneSignal SDK не доступен');
                return false;
            }

            if (!appId) {
                console.error('[OneSignal] ❌ OneSignal App ID не предоставлен');
                return false;
            }

            // Инициализируем OneSignal
            console.log('[OneSignal] 📱 Вызываем oneSignal.initialize()');
            oneSignal.initialize(appId);

            // Запрашиваем разрешения
            console.log('[OneSignal] 🔔 Запрашиваем разрешения');
            const hasPermission = await oneSignal.Notifications.requestPermission(true);
            console.log('[OneSignal] 🔔 Разрешения:', hasPermission ? 'GRANTED' : 'DENIED');

            if (!hasPermission) {
                console.warn('[OneSignal] ⚠️ Разрешения не предоставлены');
                // Продолжаем инициализацию даже без разрешений
            }

            // ВАЖНО: Принудительно подписываем после получения разрешений
            if (hasPermission && oneSignal.User?.pushSubscription?.optIn) {
                console.log('[OneSignal] ✅ Вызываем optIn() после получения разрешений');
                await oneSignal.User.pushSubscription.optIn();
            }

            // Настройка обработчиков
            this.setupNotificationHandlers(oneSignal);

            this.isInitialized = true;
            console.log('[OneSignal] ✅ Инициализация завершена успешно');
            
            return true;

        } catch (error) {
            console.error('[OneSignal] ❌ Ошибка инициализации:', error);
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
                console.log('[OneSignal] Уведомление в foreground:', event.notification);
                
                // НЕ блокируем системное уведомление - позволяем Android показывать heads-up
                // Это работает как в WhatsApp - системные уведомления показываются даже когда приложение активно
                // event.preventDefault(); // УБРАНО - теперь показываем системные уведомления
                
                console.log('[OneSignal] Показываем системное heads-up уведомление (как в WhatsApp)');
                // Системное уведомление будет показано автоматически, так как мы не вызываем preventDefault()
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