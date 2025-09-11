/**
 * OneSignal Service - простое и надежное решение для push-уведомлений
 * Работает во всех типах сборок: development, preview, production
 */

import { Platform } from 'react-native';
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
        console.log('✅ OneSignal модуль загружен успешно');
        return OneSignal;
    } catch (e) {
        console.warn('⚠️ OneSignal не доступен:', e.message);
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
                console.log('🔔 OneSignal уже инициализирован');
                return true;
            }

            const oneSignal = getOneSignal();
            if (!oneSignal) {
                console.warn('⚠️ OneSignal не доступен, пропускаем инициализацию');
                return false;
            }

            if (!appId) {
                console.error('❌ OneSignal App ID не предоставлен');
                return false;
            }

            console.log('🚀 Инициализация OneSignal с App ID:', appId);

            // Инициализируем OneSignal
            oneSignal.initialize(appId);

            // Запрашиваем разрешения
            const hasPermission = await oneSignal.Notifications.requestPermission(true);
            console.log('🔐 OneSignal разрешения:', hasPermission);

            if (!hasPermission) {
                console.warn('⚠️ OneSignal разрешения не предоставлены');
                // Продолжаем инициализацию даже без разрешений
            }

            // Настройка обработчиков
            this.setupNotificationHandlers(oneSignal);

            this.isInitialized = true;
            console.log('✅ OneSignal инициализирован успешно');
            
            return true;

        } catch (error) {
            console.error('❌ Ошибка инициализации OneSignal:', error);
            return false;
        }
    }

    // Настройка обработчиков уведомлений
    setupNotificationHandlers(oneSignal) {
        try {
            if (!oneSignal) {
                console.warn('⚠️ OneSignal не доступен для настройки обработчиков');
                return;
            }

            // Обработчик нажатий на уведомления
            oneSignal.Notifications.addEventListener('click', (event) => {
                console.log('📱 OneSignal notification clicked:', event);

                const data = event.notification.additionalData;
                if (data) {
                    this.handleNotificationNavigation(data);
                }
            });

            // Обработчик получения уведомлений в foreground
            oneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
                console.log('📨 OneSignal notification received in foreground:', event);
            });

            console.log('✅ OneSignal обработчики настроены');

        } catch (error) {
            console.error('❌ Ошибка настройки OneSignal обработчиков:', error);
        }
    }

    // Обработка навигации из уведомлений
    handleNotificationNavigation(data) {
        console.log('🧭 OneSignal handleNotificationNavigation called with data:', {
            ...data,
            dataKeys: Object.keys(data || {}),
            hasOrderId: !!data?.orderId,
            hasType: !!data?.type,
            type: data?.type
        });

        try {
            // Используем PushNotificationService для обработки навигации
            const PushNotificationService = require('./PushNotificationService');
            const pushNotificationService = PushNotificationService.default || PushNotificationService;
            
            if (pushNotificationService && pushNotificationService.handleNotificationNavigation) {
                console.log('🔄 Передаем навигацию в PushNotificationService с данными:', data);
                pushNotificationService.handleNotificationNavigation(data);
            } else {
                // Fallback логика если PushNotificationService недоступен
                console.log('⚠️ PushNotificationService недоступен, используем fallback навигацию');
                this.fallbackNavigation(data);
            }
        } catch (error) {
            console.error('❌ Ошибка при обработке навигации OneSignal:', error);
            this.fallbackNavigation(data);
        }
    }

    // Резервная навигация
    fallbackNavigation(data) {
        if (data.type === 'CHAT_MESSAGE' && data.roomId) {
            console.log('💬 Fallback: Навигация к чату:', data.roomId);
        } else if (data.orderId || data.type === 'ORDER_STATUS') {
            console.log('📦 Fallback: Навигация к заказу:', data.orderId);
        } else if (data.stopId || data.type === 'STOP_NOTIFICATION' || data.type === 'STOP_UPDATE' || data.type === 'STOP_CANCEL') {
            console.log('🚛 Fallback: Навигация к остановке:', data.stopId || 'unknown', 'Тип:', data.type);
        } else if (data.productId || data.type === 'PRODUCT_NOTIFICATION' || data.type === 'PROMOTION') {
            console.log('🛍️ Fallback: Навигация к продукту:', data.productId);
        } else if (data.url) {
            console.log('🔗 Fallback: Навигация по URL:', data.url);
        } else {
            console.log('ℹ️ Fallback: Неизвестный тип уведомления:', data.type, 'Data:', data);
        }
    }

    // Инициализация для пользователя
    async initializeForUser(user) {
        try {
            console.log('🚀 [DEBUG] initializeForUser started for user:', user.id);
            console.log('🔍 [DEBUG] Current state:', {
                isInitialized: this.isInitialized,
                hasSubscription: !!this.subscriptionId,
                currentUserId: this.currentUserId
            });
            
            if (!this.isInitialized) {
                console.log('⚠️ OneSignal не инициализирован, пытаемся инициализировать...');
                // Пытаемся инициализировать OneSignal с App ID из PushNotificationService
                const appId = 'a1bde379-4211-4fb9-89e2-3e94530a7041'; // Обновите этот ID если OneSignal создаст новый
                const initResult = await this.initialize(appId);
                console.log('📱 [DEBUG] Late OneSignal initialization result:', initResult);
                if (!initResult) {
                    return false;
                }
            }

            console.log('👤 OneSignal инициализация для пользователя:', user.id);

            // Устанавливаем внешний ID пользователя
            console.log('🔄 [DEBUG] Setting external user ID...');
            await this.setExternalUserId(user.id.toString());

            // Получаем subscription ID
            console.log('🔄 [DEBUG] Getting subscription ID...');
            const subscriptionId = await this.getSubscriptionId();
            console.log('🎫 [DEBUG] Received subscription ID:', subscriptionId);
            
            if (subscriptionId) {
                console.log('🎫 OneSignal Subscription ID получен:', subscriptionId);

                // Сохраняем на сервер
                console.log('🔄 [DEBUG] Saving to server...');
                const saveResult = await this.saveSubscriptionToServer(subscriptionId, user.id);
                console.log('💾 [DEBUG] Save to server result:', saveResult);
            } else {
                console.warn('⚠️ [DEBUG] No subscription ID received!');
                return false;
            }

            this.currentUserId = user.id;
            console.log('✅ OneSignal настроен для пользователя');

            return true;

        } catch (error) {
            console.error('❌ Ошибка OneSignal initializeForUser:', error);
            console.error('❌ [DEBUG] Error stack:', error.stack);
            return false;
        }
    }

    // Установка внешнего ID пользователя
    async setExternalUserId(userId) {
        try {
            const oneSignal = getOneSignal();
            if (!oneSignal) {
                console.warn('⚠️ OneSignal не доступен для установки User ID');
                return;
            }

            // Проверяем доступность метода login
            if (!oneSignal.login || typeof oneSignal.login !== 'function') {
                console.warn('⚠️ OneSignal.login не доступен');
                return;
            }

            await oneSignal.login(userId);
            console.log('👤 OneSignal External User ID установлен:', userId);
        } catch (error) {
            console.error('❌ Ошибка установки External User ID:', error);
        }
    }

    // Получение Subscription ID
    async getSubscriptionId() {
        try {
            const oneSignal = getOneSignal();
            if (!oneSignal) {
                console.warn('⚠️ OneSignal не доступен для получения Subscription ID');
                return null;
            }

            // Проверяем доступность методов
            if (!oneSignal.User?.pushSubscription?.getIdAsync) {
                console.warn('⚠️ OneSignal.User.pushSubscription.getIdAsync не доступен');
                return null;
            }

            const deviceState = await oneSignal.User.pushSubscription.getIdAsync();
            console.log('🎫 OneSignal Subscription ID:', deviceState);
            this.subscriptionId = deviceState;
            return deviceState;
        } catch (error) {
            console.error('❌ Ошибка получения Subscription ID:', error);
            return null;
        }
    }

    // Сохранение subscription на сервер
    async saveSubscriptionToServer(subscriptionId, userId) {
        try {
            console.log('💾 [DEBUG] Начинаем сохранение OneSignal subscription на сервер:', {
                subscriptionId,
                userId,
                platform: Platform.OS,
                subscriptionIdType: typeof subscriptionId,
                subscriptionIdLength: subscriptionId?.length
            });

            if (!subscriptionId) {
                console.error('❌ [DEBUG] subscriptionId пустой или undefined');
                return false;
            }

            // Импортируем API только когда нужно (чтобы избежать циклических зависимостей)
            console.log('🔄 [DEBUG] Импортируем createProtectedRequest...');
            const { createProtectedRequest } = require('@shared/api/api');
            
            if (!createProtectedRequest) {
                console.error('❌ [DEBUG] createProtectedRequest не найден');
                return false;
            }

            console.log('📡 [DEBUG] Готовим данные для отправки...');
            const tokenData = {
                token: subscriptionId,
                deviceId: subscriptionId, // OneSignal Player ID используем как deviceId
                platform: Platform.OS,
                tokenType: 'onesignal'
            };
            
            console.log('📤 [DEBUG] Отправляем POST запрос на /api/push-tokens:', tokenData);
            
            const response = await createProtectedRequest('post', '/api/push-tokens', tokenData);

            console.log('📡 [DEBUG] Получили ответ от сервера:', {
                response,
                responseType: typeof response,
                responseKeys: response ? Object.keys(response) : 'no response'
            });

            if (response) {
                console.log('✅ [DEBUG] OneSignal токен сохранен на сервере успешно');
                return true;
            } else {
                console.warn('⚠️ [DEBUG] Пустой ответ от сервера');
                return false;
            }

        } catch (error) {
            console.error('❌ [DEBUG] Ошибка сохранения OneSignal subscription:', {
                message: error.message,
                stack: error.stack,
                response: error.response?.data,
                status: error.response?.status
            });
            return false;
        }
    }

    // Очистка при выходе пользователя с деактивацией токена на сервере
    async clearUserContext() {
        try {
            console.log('🧹 OneSignal очистка контекста пользователя');

            // Сначала получаем актуальный Player ID и деактивируем токен на сервере
            try {
                const currentPlayerId = this.subscriptionId || await this.getSubscriptionId();
                
                if (currentPlayerId) {
                    console.log('🔄 Деактивируем OneSignal токен на сервере:', currentPlayerId.substring(0, 20) + '...');
                    
                    // Импортируем API только когда нужно
                    const { createProtectedRequest } = require('@shared/api/api');
                    
                    await createProtectedRequest('put', '/api/push-tokens/deactivate', {
                        token: currentPlayerId
                    });
                    
                    console.log('✅ OneSignal токен деактивирован на сервере');
                } else {
                    console.log('⚠️ Не удалось получить OneSignal Player ID для деактивации');
                }
            } catch (deactivateError) {
                console.error('❌ Ошибка деактивации OneSignal токена на сервере:', deactivateError.message);
                // Продолжаем очистку даже если деактивация не удалась
            }

            // Сбрасываем локальное состояние
            this.currentUserId = null;
            this.subscriptionId = null;
            this.isInitialized = false;

            // Во время выхода из системы не пытаемся использовать OneSignal модуль
            // чтобы избежать ошибок "Could not load RNOneSignal native module"
            console.log('✅ OneSignal контекст очищен полностью');

        } catch (error) {
            console.error('❌ Ошибка очистки OneSignal контекста:', error);
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
                console.warn('⚠️ OneSignal не доступен для установки тегов');
                return;
            }

            // Проверяем доступность метода addTags
            if (!oneSignal.User?.addTags || typeof oneSignal.User.addTags !== 'function') {
                console.warn('⚠️ OneSignal.User.addTags не доступен');
                return;
            }

            await oneSignal.User.addTags(tags);
            console.log('🏷️ OneSignal теги установлены:', tags);
        } catch (error) {
            console.error('❌ Ошибка установки OneSignal тегов:', error);
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