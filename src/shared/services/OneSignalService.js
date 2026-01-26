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

const PENDING_SUBSCRIPTION_STORAGE_KEY = '@onesignal:pending_subscription';
const SAVE_RETRY_CONFIG = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 8000
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
        this.lastSavedSubscriptionKey = null;
        this.lastSavedSubscriptionAt = 0;
        this.lastAttemptedSubscriptionKey = null;
        this.lastAttemptedSubscriptionAt = 0;
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
            // 
            // ВАЖНО: Не пытаемся вручную создавать каналы - OneSignal сделает это сам
            // при инициализации, используя настройки из Dashboard

            return true;
            
        } catch (error) {
            return false;
        }
    }

    // Инициализация OneSignal
    async initialize(appId) {
        try {
            // Используем ту же логику что и в app.config.js с fallback значением
            const configuredAppId =
                process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ||
                (Constants?.expoConfig?.extra?.oneSignalAppId ?? null) ||
                'a1bde379-4211-4fb9-89e2-3e94530a7041'; // Fallback из app.config.js

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

            // НЕ запрашиваем разрешения здесь - они будут запрошены через кастомный алерт
            // в useNotificationOnboardingHint после того, как пользователь нажмет "Разрешить"
            // await oneSignal.Notifications.requestPermission(true);

            // ВАЖНО: optIn также будет вызван после получения разрешения через кастомный алерт
            // Не вызываем optIn здесь, так как разрешения еще не запрошены

            // Настройка обработчиков
            this.setupNotificationHandlers(oneSignal);

            this.isInitialized = true;
            
            return true;

        } catch (error) {
            console.error('[OneSignal] ❌ Ошибка инициализации:', {
                error: error?.message,
                stack: error?.stack
            });
            return false;
        }
    }

    // Настройка обработчиков уведомлений
    // В OneSignalService.js замените метод setupNotificationHandlers

setupNotificationHandlers(oneSignal) {
    try {
        if (!oneSignal) {
            return;
        }

        if (!oneSignal.Notifications) {
            return;
        }

        // Обработчик получения уведомлений в foreground
        oneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
            try {
                const notification = event?.getNotification?.() || event?.notification;
                
                // Извлекаем data из всех возможных мест
                const additionalData =
                    notification?.additionalData ||
                    notification?.additional_data ||
                    event?.notification?.additionalData ||
                    event?.notification?.additional_data ||
                    event?.additionalData ||
                    event?.additional_data ||
                    null;
                
                const data = additionalData || {};
                
                // Получаем PushNotificationService для проверки подавления
                const PushNotificationService = require('@shared/services/PushNotificationService');
                const pushNotificationService = PushNotificationService.default || PushNotificationService;
                
                // Подавление для открытого чата
                if (pushNotificationService?.shouldSuppressChatNotification?.(data)) {
                    if (event?.preventDefault && typeof event.preventDefault === 'function') {
                        event.preventDefault();
                    }
                    return;
                }

        // ===== INBOX-STYLE ДЛЯ МНОЖЕСТВЕННЫХ СООБЩЕНИЙ =====
        if (data.type === 'CHAT_MESSAGE' && data.messageCount) {
            const messageCount = parseInt(data.messageCount || '1');
            
            if (messageCount > 1 && data.messages) {
                try {
                    const messages = JSON.parse(data.messages);
                    
                    if (Array.isArray(messages) && messages.length > 1) {
                        // Берём последние 8 сообщений
                        const recentMessages = messages.slice(-8);
                        
                        // Формируем строки
                        const lines = recentMessages.map(msg => {
                            if (msg.type === 'TEXT' && msg.content) {
                                return msg.content.substring(0, 100);
                            }
                            const labels = {
                                IMAGE: '📷 Изображение',
                                PRODUCT: '🛍️ Товар',
                                VOICE: '🎤 Голосовое',
                                STOP: '🚚 Остановка'
                            };
                            return labels[msg.type] || 'Сообщение';
                        });
                        
                        // Формируем текст
                        let finalText = lines.join('\n');
                        if (messages.length > 8) {
                            finalText += `\n\n+${messages.length - 8} ещё`;
                        }
                        
                        // Обновляем тело уведомления
                        notification?.setBody?.(finalText);
                    }
                } catch (e) {
                }
            }
        }

                // Показываем уведомление
                if (notification?.display && typeof notification.display === 'function') {
                    notification.display();
                }
            } catch (e) {
            }
        });

        // Обработчик получения уведомлений в background
        oneSignal.Notifications.addEventListener('received', (event) => {
            try {
                const notification = event?.notification || {};
                const data = notification?.additionalData || notification?.additional_data || {};
                
                // Получаем PushNotificationService для проверки подавления
                const PushNotificationService = require('@shared/services/PushNotificationService');
                const pushNotificationService = PushNotificationService.default || PushNotificationService;
                
                // Подавление для открытого чата (для background тоже нужно проверить)
                // В background мы не можем предотвратить показ, но можем отметить для логирования
                if (pushNotificationService?.shouldSuppressChatNotification?.(data)) {
                    // В background мы не можем предотвратить показ уведомления через OneSignal API
                    // Но можем очистить его после получения, если чат открыт
                    // Это будет обработано при открытии чата через clearChatNotifications
                }
            } catch (e) {
            }
        });

        // Обработчик нажатий (включая кнопки действий)
        oneSignal.Notifications.addEventListener('click', (event) => {
            try {
                const n = event?.notification || {};
                const result = event?.result || {};

                const data =
                    n.additionalData ||
                    n.additional_data ||
                    n?.payload?.additionalData ||
                    n?.payload?.additional_data ||
                    null;

                // Проверяем, была ли нажата кнопка действия
                const actionId = result?.actionId || result?.actionID || null;

                // Проверяем наличие данных
                if (!data) {
                    return;
                }

                // Нормализуем данные (OneSignal может передавать snake_case)
                const normalizedData = {
                    ...data,
                    roomId: data.roomId || data.room_id,
                    messageId: data.messageId || data.message_id,
                    senderId: data.senderId || data.sender_id,
                    type: data.type || 'CHAT_MESSAGE'
                };

                // Если нажата кнопка действия
                if (actionId) {
                    this.handleNotificationAction(actionId, normalizedData);
                } else {
                    // Обычное нажатие на уведомление
                    this.handleNotificationNavigation(normalizedData);
                }
            } catch (e) {
                console.error('[OneSignal] ❌ КРИТИЧЕСКАЯ ОШИБКА в обработчике click:', {
                    error: e?.message,
                    stack: e?.stack,
                    name: e?.name
                });
            }
        });

    } catch (error) {
        console.error('[OneSignal] ❌ КРИТИЧЕСКАЯ ОШИБКА настройки обработчиков:', {
            error: error?.message,
            stack: error?.stack,
            name: error?.name
        });
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
            this.fallbackNavigation(data);
        }
    }

    // Обработка нажатий на кнопки действий в уведомлениях
    handleNotificationAction(actionId, data) {
        try {
            const roomId = data?.roomId || data?.room_id;
            if (!roomId) {
                return;
            }

            // Используем PushNotificationService для обработки действий
            const PushNotificationService = require('@shared/services/PushNotificationService');
            const pushNotificationService = PushNotificationService.default || PushNotificationService;

            if (actionId === 'dismiss' || actionId === 'read') {
                // Кнопка "Скрыть" (или старая "Прочитано") - ТОЛЬКО очищаем уведомление
                // ⚠️ ВАЖНО: НЕ вызываем API, потому что это ВСЕГДА открывает приложение на Android
                // Сообщения будут автоматически помечены как прочитанные при открытии чата

                // ТОЛЬКО очищаем уведомление из системного трея
                // Это единственный способ не открывать приложение
                if (pushNotificationService && pushNotificationService.clearChatNotifications) {
                    pushNotificationService.clearChatNotifications(roomId).catch(err => {
                    });
                }
                
                // НЕ вызываем API - любой вызов API активирует приложение
                // Логика: когда пользователь откроет чат, сообщения будут автоматически
                // помечены как прочитанные через useChatLifecycle (строки 131, 271)
                
                // Возвращаемся сразу, без каких-либо дополнительных действий
                return;
            } else if (actionId === 'reply') {
                // Кнопка "Ответить" - открываем чат и автоматически фокусируем input

                // Важно: добавляем параметр autoFocusInput для автоматического открытия клавиатуры
                const dataWithKeyboard = { 
                    ...data, 
                    autoFocusInput: true 
                };

                // Используем улучшенную навигацию
                if (pushNotificationService && pushNotificationService.handleNotificationNavigation) {
                    pushNotificationService.handleNotificationNavigation(dataWithKeyboard);
                } else {
                    // Fallback
                    this.handleNotificationNavigation(dataWithKeyboard);
                }
            }
        } catch (error) {
        }
    }

    // Отметка комнаты как прочитанной (устаревший метод)
    async markRoomAsRead(roomId) {
        return this.markRoomAsReadInBackground(roomId);
    }

    // Отметка комнаты как прочитанной в фоновом режиме
    // Этот метод вызывает API без открытия UI приложения
    async markRoomAsReadInBackground(roomId) {
        try {
            if (!roomId) {
                throw new Error('roomId is required');
            }

            // Импортируем ChatApi для отметки комнаты как прочитанной
            const ChatApi = require('@entities/chat/api/chatApi').default;
            if (!ChatApi || !ChatApi.markAsRead) {
                throw new Error('ChatApi.markAsRead недоступен');
            }

            // Вызываем API для отметки комнаты как прочитанной
            // Это обновит статус сообщений на сервере и отправит WebSocket уведомление
            // чтобы у отправителя галочки стали синими
            const response = await ChatApi.markAsRead(roomId);
            
            return true;
        } catch (error) {
            throw error;
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
            // Сначала пробуем досохранить отложенный токен для этого пользователя
            await this.flushPendingSubscription(user?.id);

            // Проверяем, не тот же ли это пользователь
            const isSameUser = this.currentUserId === user.id;
            if (isSameUser && this.subscriptionId) {
                return true;
            }
            
            // ⚠️ КРИТИЧЕСКИ ВАЖНО: Убеждаемся что канал уведомлений существует
            await this.ensureNotificationChannelExists();
            
            // Всегда пытаемся инициализировать OneSignal (важно после переустановки)
            // Используем ту же логику что и в app.config.js с fallback значением
            const appId =
                process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ||
                (Constants?.expoConfig?.extra?.oneSignalAppId ?? null) ||
                'a1bde379-4211-4fb9-89e2-3e94530a7041'; // Fallback из app.config.js
            
            if (!this.isInitialized) {
                const initResult = await this.initialize(appId);
                if (!initResult) {
                    return false;
                }
            }

            // ⚠️ ВАЖНО: Если это другой пользователь, сначала очищаем старый контекст
            if (this.currentUserId && this.currentUserId !== user.id) {
                const oneSignal = getOneSignal();
                if (oneSignal?.logout) {
                    try {
                        await oneSignal.logout();
                    } catch (e) {
                    }
                }
                this.subscriptionId = null;
            }

            // Устанавливаем внешний ID пользователя
            await this.setExternalUserId(user.id.toString());

            // ВАЖНО: Принудительно подписываем пользователя на уведомления
            const oneSignal = getOneSignal();
            if (oneSignal?.User?.pushSubscription?.optIn) {
                await oneSignal.User.pushSubscription.optIn();
            }

            // ⚠️ КРИТИЧЕСКИ ВАЖНО: Ждём пока подписка реально станет активной
            // После переустановки приложения нужно время для синхронизации
            let subscriptionId = null;
            let attempts = 0;
            const maxAttempts = 5;
            const delayMs = 2000;
            
            while (attempts < maxAttempts) {
                attempts++;
                await new Promise(resolve => setTimeout(resolve, delayMs));
                
                // Проверяем статус подписки
                try {
                    const optedIn = await oneSignal?.User?.pushSubscription?.getOptedInAsync?.();
                    subscriptionId = await this.getSubscriptionId();
                    if (optedIn && subscriptionId) {
                        break;
                    }
                } catch (e) {
                }
            }

            if (subscriptionId) {
                // Сохраняем на сервер
                const saveResult = await this.saveSubscriptionToServer(subscriptionId, user.id);
                if (!saveResult) {
                    console.error('[OneSignal] ❌ Не удалось сохранить subscription на сервер');
                    console.error('[OneSignal] ⚠️ Это критическая проблема - уведомления не будут приходить!');
                    // НЕ возвращаем false - пусть инициализация завершится, но с предупреждением
                    // Токен может быть сохранен позже через принудительную регистрацию
                }
            } else {
                return false;
            }

            this.currentUserId = user.id;

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

    async getPendingSubscription() {
        try {
            const raw = await AsyncStorage.getItem(PENDING_SUBSCRIPTION_STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    async setPendingSubscription(pending) {
        try {
            await AsyncStorage.setItem(
                PENDING_SUBSCRIPTION_STORAGE_KEY,
                JSON.stringify({
                    ...pending,
                    updatedAt: new Date().toISOString()
                })
            );
        } catch (_) {
            // Игнорируем ошибку, чтобы не блокировать основной поток
        }
    }

    async clearPendingSubscription() {
        try {
            await AsyncStorage.removeItem(PENDING_SUBSCRIPTION_STORAGE_KEY);
        } catch (_) {
            // Игнорируем
        }
    }

    async flushPendingSubscription(currentUserId) {
        const pending = await this.getPendingSubscription();
        if (!pending?.subscriptionId || !pending?.userId) {
            return false;
        }

        if (currentUserId && pending.userId !== currentUserId) {
            // Не сохраняем токен другого пользователя
            await this.clearPendingSubscription();
            return false;
        }

        return this.saveSubscriptionToServer(
            pending.subscriptionId,
            pending.userId,
            { force: true, fromPending: true, maxAttempts: 2 }
        );
    }

    // Сохранение subscription на сервер
    async saveSubscriptionToServer(subscriptionId, userId, options = {}) {
        try {
            if (!subscriptionId) {
                console.error('[OneSignal] ❌ subscriptionId пустой или undefined');
                return false;
            }

            const {
                force = false,
                fromPending = false,
                maxAttempts = SAVE_RETRY_CONFIG.maxAttempts
            } = options;

            const dedupeKey = `${userId}:${subscriptionId}`;
            const now = Date.now();
            if (!force && this.lastSavedSubscriptionKey === dedupeKey && now - this.lastSavedSubscriptionAt < 30000) {
                console.log('[OneSignal] 🔁 Пропуск дублирующего сохранения subscription', {
                    userId,
                    subscriptionId
                });
                return true;
            }

            // Импортируем API только когда нужно (чтобы избежать циклических зависимостей)
            const { createProtectedRequest } = require('@shared/api/api');
            
            if (!createProtectedRequest) {
                console.error('[OneSignal] ❌ createProtectedRequest не найден');
                return false;
            }

            const tokenData = {
                token: subscriptionId,
                deviceId: subscriptionId, // OneSignal Player ID используем как deviceId
                platform: Platform.OS,
                tokenType: 'onesignal'
            };

            let lastError = null;
            let attempt = 0;

            while (attempt < maxAttempts) {
                attempt += 1;
                this.lastAttemptedSubscriptionKey = dedupeKey;
                this.lastAttemptedSubscriptionAt = Date.now();

                try {
                    const response = await createProtectedRequest('post', '/api/push-tokens', tokenData);

                    const isSuccess = !!response && (
                        response.success === true ||
                        response.status === 'success' ||
                        (response.data && response.data.id)
                    );

                    if (isSuccess || response) {
                        this.lastSavedSubscriptionKey = dedupeKey;
                        this.lastSavedSubscriptionAt = Date.now();
                        await this.clearPendingSubscription();
                        return true;
                    }

                    lastError = new Error('Empty response from server');
                } catch (error) {
                    lastError = error;
                }

                if (attempt < maxAttempts) {
                    const baseDelay = Math.min(
                        SAVE_RETRY_CONFIG.baseDelayMs * (2 ** (attempt - 1)),
                        SAVE_RETRY_CONFIG.maxDelayMs
                    );
                    const jitter = Math.floor(Math.random() * 250);
                    await sleep(baseDelay + jitter);
                }
            }

            if (!fromPending) {
                await this.setPendingSubscription({
                    subscriptionId,
                    userId,
                    reason: lastError?.message || 'Unknown error'
                });
            }

            return false;

        } catch (error) {
            console.error('[OneSignal] ❌ Ошибка сохранения OneSignal subscription:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                stack: error.stack?.substring(0, 200)
            });
            return false;
        }
    }

    // Очистка при выходе пользователя с деактивацией токена на сервере
    async clearUserContext() {
        let deactivationSuccess = false;
        let deactivationError = null;
        let oneSignalError = null;

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

            // Сбрасываем контекст OneSignal (отвязка External User ID + optOut)
            // Делаем максимально безопасно, без падений если SDK недоступен
            try {
                const oneSignal = getOneSignal();
                if (oneSignal) {
                    if (oneSignal.User?.pushSubscription?.optOut) {
                        await oneSignal.User.pushSubscription.optOut();
                    }
                    if (oneSignal.logout && typeof oneSignal.logout === 'function') {
                        await oneSignal.logout();
                    }
                }
            } catch (sdkError) {
                oneSignalError = sdkError;
                // Ошибки SDK не блокируют локальный logout
            }

            // Сбрасываем локальное состояние
            this.currentUserId = null;
            this.subscriptionId = null;
            // Сбрасываем дедупликацию, чтобы после logout сразу переактивировать токен
            this.lastSavedSubscriptionKey = null;
            this.lastSavedSubscriptionAt = 0;
            this.lastAttemptedSubscriptionKey = null;
            this.lastAttemptedSubscriptionAt = 0;
            this.isInitialized = false;
            await this.clearPendingSubscription();

            // Во время выхода из системы не пытаемся использовать OneSignal модуль
            // чтобы избежать ошибок "Could not load RNOneSignal native module"

            return {
                success: deactivationSuccess,
                error: deactivationError || oneSignalError
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

    async getPendingSubscriptionStatus() {
        const pending = await this.getPendingSubscription();
        if (!pending?.subscriptionId || !pending?.userId) {
            return { hasPending: false };
        }

        return {
            hasPending: true,
            userId: pending.userId,
            subscriptionIdPreview: pending.subscriptionId?.substring(0, 20),
            updatedAt: pending.updatedAt,
            reason: pending.reason
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

    /**
     * Очистка уведомлений для конкретного чата
     * Делегирует вызов к PushNotificationService
     */
    async clearChatNotifications(roomId) {
        try {
            // Импортируем PushNotificationService для очистки уведомлений
            const PushNotificationService = require('@shared/services/PushNotificationService');
            const pushNotificationService = PushNotificationService.default || PushNotificationService;
            
            if (pushNotificationService && pushNotificationService.clearChatNotifications) {
                await pushNotificationService.clearChatNotifications(roomId);
            }
        } catch (error) {
        }
    }

    /**
     * Очистка уведомлений для конкретного пользователя
     * Делегирует вызов к PushNotificationService
     */
    async clearChatNotificationsForPeerUser(userId) {
        try {
            // Импортируем PushNotificationService для очистки уведомлений
            const PushNotificationService = require('@shared/services/PushNotificationService');
            const pushNotificationService = PushNotificationService.default || PushNotificationService;
            
            if (pushNotificationService && pushNotificationService.clearChatNotificationsForPeerUser) {
                await pushNotificationService.clearChatNotificationsForPeerUser(userId);
            }
        } catch (error) {
        }
    }
}

// Экспортируем синглтон
const oneSignalService = new OneSignalService();
export default oneSignalService;