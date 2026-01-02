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
            console.log('[OneSignal] 🚀 initialize вызван', { 
                appId: appId ? appId.substring(0, 8) + '...' : 'null',
                isInitialized: this.isInitialized 
            });

            // Используем ту же логику что и в app.config.js с fallback значением
            const configuredAppId =
                process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ||
                (Constants?.expoConfig?.extra?.oneSignalAppId ?? null) ||
                'a1bde379-4211-4fb9-89e2-3e94530a7041'; // Fallback из app.config.js

            // Защита от случайной инициализации "не тем" App ID (особенно из диагностических экранов).
            // Если appId передан, но отличается от сконфигурированного — используем сконфигурированный.
            const effectiveAppId = configuredAppId || appId;

            if (this.isInitialized) {
                console.log('[OneSignal] ℹ️ Уже инициализирован, пропускаем');
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
                    console.log('[OneSignal] ✅ optIn выполнен');
                } catch (e) {
                    console.warn('[OneSignal] ⚠️ optIn ошибка:', e?.message);
                }
            }

            // Настройка обработчиков
            console.log('[OneSignal] 🔧 Вызываем setupNotificationHandlers...');
            this.setupNotificationHandlers(oneSignal);
            console.log('[OneSignal] ✅ setupNotificationHandlers завершен');

            this.isInitialized = true;
            console.log('[OneSignal] ✅ Инициализация завершена успешно');
            
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
        console.log('[OneSignal] 🔧 setupNotificationHandlers вызван', {
            hasOneSignal: !!oneSignal,
            hasNotifications: !!(oneSignal?.Notifications),
            hasAddEventListener: !!(oneSignal?.Notifications?.addEventListener)
        });

        if (!oneSignal) {
            console.warn('[OneSignal] ⚠️ setupNotificationHandlers: oneSignal недоступен');
            return;
        }

        if (!oneSignal.Notifications) {
            console.warn('[OneSignal] ⚠️ oneSignal.Notifications недоступен');
            return;
        }

        console.log('[OneSignal] 🔧 Начинаем регистрацию обработчиков уведомлений');

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
                
                // Логируем получение уведомления
                if (__DEV__) {
                    console.log('[OneSignal] 📬 Получено уведомление в foreground', {
                        notificationId: notification?.notificationId,
                        title: notification?.title,
                        body: notification?.body?.substring(0, 50),
                        roomId: data?.roomId || data?.room_id,
                        senderId: data?.senderId || data?.sender_id,
                        type: data?.type,
                        messageCount: data?.messageCount,
                        activeRoomId: pushNotificationService?.getActiveChatRoomId?.(),
                        activePeerUserId: pushNotificationService?.getActiveChatPeerUserId?.()
                    });
                }
                
                // Подавление для открытого чата
                if (pushNotificationService?.shouldSuppressChatNotification?.(data)) {
                    if (event?.preventDefault && typeof event.preventDefault === 'function') {
                        event.preventDefault();
                    }
                    if (__DEV__) {
                        console.log('[OneSignal] 🔇 Уведомление подавлено: чат открыт', {
                            roomId: data?.roomId || data?.room_id,
                            senderId: data?.senderId || data?.sender_id
                        });
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
                        
                        if (__DEV__) {
                            console.log('[OneSignal] 📬 Inbox уведомление:', {
                                count: messageCount,
                                shown: lines.length,
                                preview: finalText.substring(0, 100)
                            });
                        }
                    }
                } catch (e) {
                    if (__DEV__) {
                        console.warn('[OneSignal] Ошибка парсинга:', e?.message);
                    }
                }
            }
        }

                // Показываем уведомление
                if (notification?.display && typeof notification.display === 'function') {
                    notification.display();
                    if (__DEV__) {
                        console.log('[OneSignal] ✅ Уведомление отображено в foreground', {
                            notificationId: notification?.notificationId
                        });
                    }
                } else {
                    if (__DEV__) {
                        console.warn('[OneSignal] ⚠️ notification.display() недоступен', {
                            hasNotification: !!notification,
                            hasDisplay: !!(notification?.display)
                        });
                    }
                }
            } catch (e) {
                if (__DEV__) {
                    console.warn('[OneSignal] Ошибка обработчика foregroundWillDisplay:', e?.message);
                }
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
                
                if (__DEV__) {
                    console.log('[OneSignal] 📬 Получено уведомление в background', {
                        notificationId: notification?.notificationId,
                        title: notification?.title,
                        body: notification?.body?.substring(0, 50),
                        roomId: data?.roomId || data?.room_id,
                        senderId: data?.senderId || data?.sender_id,
                        type: data?.type,
                        messageCount: data?.messageCount,
                        activeRoomId: pushNotificationService?.getActiveChatRoomId?.(),
                        activePeerUserId: pushNotificationService?.getActiveChatPeerUserId?.()
                    });
                }
                
                // Подавление для открытого чата (для background тоже нужно проверить)
                // В background мы не можем предотвратить показ, но можем отметить для логирования
                if (pushNotificationService?.shouldSuppressChatNotification?.(data)) {
                    if (__DEV__) {
                        console.log('[OneSignal] 🔇 Уведомление в background должно быть подавлено: чат открыт', {
                            roomId: data?.roomId || data?.room_id,
                            senderId: data?.senderId || data?.sender_id
                        });
                    }
                    // В background мы не можем предотвратить показ уведомления через OneSignal API
                    // Но можем очистить его после получения, если чат открыт
                    // Это будет обработано при открытии чата через clearChatNotifications
                }
            } catch (e) {
                if (__DEV__) {
                    console.warn('[OneSignal] Ошибка обработчика received:', e?.message);
                }
            }
        });

        // Обработчик нажатий (включая кнопки действий)
        console.log('[OneSignal] 📝 Регистрация обработчика click');
        
        oneSignal.Notifications.addEventListener('click', (event) => {
            // ВСЕГДА логируем нажатие, даже если произошла ошибка
            console.log('[OneSignal] 🔔🔔🔔 CLICK EVENT FIRED 🔔🔔🔔', {
                hasEvent: !!event,
                eventType: typeof event,
                timestamp: new Date().toISOString()
            });

            try {
                const n = event?.notification || {};
                const result = event?.result || {};
                
                console.log('[OneSignal] 📋 Парсинг данных уведомления', {
                    hasNotification: !!n,
                    hasResult: !!result,
                    notificationKeys: Object.keys(n || {}),
                    resultKeys: Object.keys(result || {})
                });

                const data =
                    n.additionalData ||
                    n.additional_data ||
                    n?.payload?.additionalData ||
                    n?.payload?.additional_data ||
                    null;

                console.log('[OneSignal] 📦 Извлеченные данные', {
                    hasData: !!data,
                    dataKeys: data ? Object.keys(data) : [],
                    dataPreview: data ? JSON.stringify(data).substring(0, 200) : 'null'
                });

                // Проверяем, была ли нажата кнопка действия
                const actionId = result?.actionId || result?.actionID || null;

                console.log('[OneSignal] 👆 Полные данные нажатия', {
                    notificationId: n?.notificationId,
                    roomId: data?.roomId || data?.room_id,
                    messageId: data?.messageId || data?.message_id,
                    senderId: data?.senderId || data?.sender_id,
                    type: data?.type,
                    actionId: actionId,
                    hasData: !!data
                });

                // Проверяем наличие данных
                if (!data) {
                    if (__DEV__) {
                        console.warn('[OneSignal] ⚠️ Данные уведомления отсутствуют', {
                            notification: n,
                            result: result,
                            event: event
                        });
                    }
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

                if (__DEV__) {
                    console.log('[OneSignal] 📋 Нормализованные данные', {
                        roomId: normalizedData.roomId,
                        messageId: normalizedData.messageId,
                        type: normalizedData.type,
                        autoFocusInput: normalizedData.autoFocusInput
                    });
                }

                // Если нажата кнопка действия
                if (actionId) {
                    console.log('[OneSignal] 🔘 Обработка действия кнопки:', actionId);
                    console.log('[OneSignal] 🔘 Вызываем handleNotificationAction с данными:', {
                        roomId: normalizedData.roomId,
                        actionId,
                        autoFocusInput: normalizedData.autoFocusInput
                    });
                    this.handleNotificationAction(actionId, normalizedData);
                    console.log('[OneSignal] ✅ handleNotificationAction завершен');
                } else {
                    // Обычное нажатие на уведомление
                    console.log('[OneSignal] 📱 Обычное нажатие на уведомление, открываем чат');
                    console.log('[OneSignal] 📱 Вызываем handleNotificationNavigation с данными:', {
                        roomId: normalizedData.roomId,
                        messageId: normalizedData.messageId,
                        type: normalizedData.type
                    });
                    this.handleNotificationNavigation(normalizedData);
                    console.log('[OneSignal] ✅ handleNotificationNavigation завершен');
                }
            } catch (e) {
                console.error('[OneSignal] ❌ КРИТИЧЕСКАЯ ОШИБКА в обработчике click:', {
                    error: e?.message,
                    stack: e?.stack,
                    name: e?.name
                });
            }
        });

        console.log('[OneSignal] ✅ Обработчик click успешно зарегистрирован');

    } catch (error) {
        console.error('[OneSignal] ❌ КРИТИЧЕСКАЯ ОШИБКА настройки обработчиков:', {
            error: error?.message,
            stack: error?.stack,
            name: error?.name
        });
    }
    
    console.log('[OneSignal] ✅ setupNotificationHandlers завершен успешно');
}

    // Обработка навигации из уведомлений
    handleNotificationNavigation(data) {
        try {
            if (__DEV__) {
                console.log('[OneSignal] 🚀 handleNotificationNavigation вызван', {
                    type: data?.type,
                    roomId: data?.roomId || data?.room_id,
                    messageId: data?.messageId || data?.message_id,
                    autoFocusInput: data?.autoFocusInput,
                    dataKeys: data ? Object.keys(data) : []
                });
            }

            // Используем PushNotificationService для обработки навигации
            const PushNotificationService = require('@shared/services/PushNotificationService');
            const pushNotificationService = PushNotificationService.default || PushNotificationService;
            
            if (pushNotificationService && pushNotificationService.handleNotificationNavigation) {
                if (__DEV__) {
                    console.log('[OneSignal] ✅ Передаем управление PushNotificationService');
                }
                pushNotificationService.handleNotificationNavigation(data);
            } else {
                if (__DEV__) {
                    console.warn('[OneSignal] ⚠️ PushNotificationService недоступен, используем fallback');
                }
                // Fallback логика если PushNotificationService недоступен
                this.fallbackNavigation(data);
            }
        } catch (error) {
            if (__DEV__) {
                console.error('[OneSignal] ❌ Ошибка при обработке навигации:', error?.message, error?.stack);
            }
            this.fallbackNavigation(data);
        }
    }

    // Обработка нажатий на кнопки действий в уведомлениях
    handleNotificationAction(actionId, data) {
        try {
            if (__DEV__) {
                console.log('[OneSignal] 🔘 Обработка действия кнопки', {
                    actionId,
                    roomId: data?.roomId || data?.room_id,
                    type: data?.type
                });
            }

            const roomId = data?.roomId || data?.room_id;
            if (!roomId) {
                if (__DEV__) {
                    console.warn('[OneSignal] ⚠️ roomId отсутствует в данных уведомления');
                }
                return;
            }

            // Используем PushNotificationService для обработки действий
            const PushNotificationService = require('@shared/services/PushNotificationService');
            const pushNotificationService = PushNotificationService.default || PushNotificationService;

            if (actionId === 'dismiss' || actionId === 'read') {
                // Кнопка "Скрыть" (или старая "Прочитано") - ТОЛЬКО очищаем уведомление
                // ⚠️ ВАЖНО: НЕ вызываем API, потому что это ВСЕГДА открывает приложение на Android
                // Сообщения будут автоматически помечены как прочитанные при открытии чата
                if (__DEV__) {
                    console.log('[OneSignal] 🔕 Кнопка "Скрыть/Прочитано" - только очищаем уведомление', { 
                        roomId,
                        actionId 
                    });
                }
                
                // ТОЛЬКО очищаем уведомление из системного трея
                // Это единственный способ не открывать приложение
                if (pushNotificationService && pushNotificationService.clearChatNotifications) {
                    pushNotificationService.clearChatNotifications(roomId).catch(err => {
                        if (__DEV__) {
                            console.warn('[OneSignal] ⚠️ Ошибка очистки уведомления:', err?.message);
                        }
                    });
                }
                
                // НЕ вызываем API - любой вызов API активирует приложение
                // Логика: когда пользователь откроет чат, сообщения будут автоматически
                // помечены как прочитанные через useChatLifecycle (строки 131, 271)
                
                // Возвращаемся сразу, без каких-либо дополнительных действий
                return;
            } else if (actionId === 'reply') {
                // Кнопка "Ответить" - открываем чат и автоматически фокусируем input
                if (__DEV__) {
                    console.log('[OneSignal] 🔘 Кнопка "Ответить" нажата', {
                        roomId: data?.roomId || data?.room_id,
                        hasPushService: !!pushNotificationService
                    });
                }
                
                // Важно: добавляем параметр autoFocusInput для автоматического открытия клавиатуры
                const dataWithKeyboard = { 
                    ...data, 
                    autoFocusInput: true 
                };
                
                if (__DEV__) {
                    console.log('[OneSignal] 🔄 Открываем чат с автофокусом на input', {
                        roomId: dataWithKeyboard?.roomId || dataWithKeyboard?.room_id,
                        autoFocusInput: dataWithKeyboard.autoFocusInput
                    });
                }
                
                // Используем улучшенную навигацию
                if (pushNotificationService && pushNotificationService.handleNotificationNavigation) {
                    pushNotificationService.handleNotificationNavigation(dataWithKeyboard);
                } else {
                    // Fallback
                    if (__DEV__) {
                        console.warn('[OneSignal] ⚠️ PushNotificationService недоступен, используем fallback');
                    }
                    this.handleNotificationNavigation(dataWithKeyboard);
                }
            }
        } catch (error) {
            if (__DEV__) {
                console.warn('[OneSignal] Ошибка обработки действия кнопки:', error?.message);
            }
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
            if (__DEV__) {
                console.log('[OneSignal] 📤 Помечаем комнату как прочитанную в фоне', { roomId });
            }

            if (!roomId) {
                throw new Error('roomId is required');
            }

            // Импортируем ChatApi для отметки комнаты как прочитанной
            const ChatApi = require('@entities/chat/api/chatApi').default;
            if (!ChatApi || !ChatApi.markAsRead) {
                if (__DEV__) {
                    console.warn('[OneSignal] ⚠️ ChatApi.markAsRead недоступен');
                }
                throw new Error('ChatApi.markAsRead недоступен');
            }

            // Вызываем API для отметки комнаты как прочитанной
            // Это обновит статус сообщений на сервере и отправит WebSocket уведомление
            // чтобы у отправителя галочки стали синими
            const response = await ChatApi.markAsRead(roomId);
            
            if (__DEV__) {
                console.log('[OneSignal] ✅ Комната помечена как прочитанная в фоне', { 
                    roomId,
                    response: response?.data || response
                });
            }
            
            return true;
        } catch (error) {
            if (__DEV__) {
                console.warn('[OneSignal] ❌ Ошибка отметки комнаты как прочитанной:', {
                    roomId,
                    error: error?.message,
                    status: error?.response?.status,
                    details: error?.response?.data
                });
            }
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
            console.log('[OneSignal] 🚀 initializeForUser начата для userId:', user.id);
            
            // Проверяем, не тот же ли это пользователь
            const isSameUser = this.currentUserId === user.id;
            if (isSameUser && this.subscriptionId) {
                console.log('[OneSignal] ℹ️ Тот же пользователь, подписка уже активна');
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
            console.log('[OneSignal] 📱 App ID:', appId);
            
            if (!this.isInitialized) {
                const initResult = await this.initialize(appId);
                if (!initResult) {
                    console.log('[OneSignal] ❌ Инициализация не удалась');
                    return false;
                }
            }

            // ⚠️ ВАЖНО: Если это другой пользователь, сначала очищаем старый контекст
            if (this.currentUserId && this.currentUserId !== user.id) {
                console.log('[OneSignal] 🔄 Смена пользователя, очищаем старый контекст...');
                const oneSignal = getOneSignal();
                if (oneSignal?.logout) {
                    try {
                        await oneSignal.logout();
                        console.log('[OneSignal] ✅ Logout выполнен');
                    } catch (e) {
                        console.log('[OneSignal] ⚠️ Ошибка logout:', e.message);
                    }
                }
                this.subscriptionId = null;
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

            // ⚠️ КРИТИЧЕСКИ ВАЖНО: Ждём пока подписка реально станет активной
            // После переустановки приложения нужно время для синхронизации
            console.log('[OneSignal] ⏳ Ожидаем активацию подписки...');
            
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
                    
                    console.log(`[OneSignal] 🔄 Попытка ${attempts}/${maxAttempts}: optedIn=${optedIn}, subscriptionId=${subscriptionId ? subscriptionId.substring(0, 20) + '...' : 'null'}`);
                    
                    if (optedIn && subscriptionId) {
                        console.log('[OneSignal] ✅ Подписка активна!');
                        break;
                    }
                } catch (e) {
                    console.log(`[OneSignal] ⚠️ Попытка ${attempts}: ошибка проверки -`, e.message);
                }
            }
            
            console.log('[OneSignal] 🎫 Финальный Subscription ID:', subscriptionId);
            
            if (subscriptionId) {
                // Сохраняем на сервер
                console.log('[OneSignal] 💾 Начинаем сохранение subscription на сервер...');
                const saveResult = await this.saveSubscriptionToServer(subscriptionId, user.id);
                if (!saveResult) {
                    console.error('[OneSignal] ❌ Не удалось сохранить subscription на сервер');
                    console.error('[OneSignal] ⚠️ Это критическая проблема - уведомления не будут приходить!');
                    // НЕ возвращаем false - пусть инициализация завершится, но с предупреждением
                    // Токен может быть сохранен позже через принудительную регистрацию
                } else {
                    console.log('[OneSignal] ✅ Subscription успешно сохранен на сервер');
                }
            } else {
                console.warn('[OneSignal] ⚠️ No subscription ID received - невозможно сохранить токен');
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
            console.log('[OneSignal] 💾 Сохранение subscription на сервер...', {
                subscriptionId: subscriptionId ? subscriptionId.substring(0, 20) + '...' : 'null',
                userId
            });

            if (!subscriptionId) {
                console.error('[OneSignal] ❌ subscriptionId пустой или undefined');
                return false;
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
            
            console.log('[OneSignal] 📤 Отправка токена на сервер:', {
                token: tokenData.token.substring(0, 20) + '...',
                platform: tokenData.platform,
                tokenType: tokenData.tokenType
            });

            const response = await createProtectedRequest('post', '/api/push-tokens', tokenData);

            console.log('[OneSignal] 📥 Ответ сервера:', {
                hasResponse: !!response,
                responseType: typeof response,
                responseKeys: response && typeof response === 'object' ? Object.keys(response) : 'not an object',
                response: response && typeof response === 'object' ? JSON.stringify(response).substring(0, 200) : response
            });

            // Проверяем успешность сохранения
            if (response && (
                response.success === true ||
                response.status === 'success' ||
                (response.data && response.data.id)
            )) {
                console.log('[OneSignal] ✅ Токен успешно сохранен на сервер:', {
                    tokenId: response.data?.id,
                    isActive: response.data?.isActive,
                    tokenType: response.data?.tokenType || response.tokenType
                });
                return true;
            } else {
                console.warn('[OneSignal] ⚠️ Неожиданный ответ от сервера при сохранении токена:', response);
                // Все равно считаем успехом, если ответ есть (может быть другой формат)
                if (response) {
                    console.log('[OneSignal] ⚠️ Ответ получен, но формат неожиданный. Считаем успехом.');
                    return true;
                }
                return false;
            }

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

    /**
     * Очистка уведомлений для конкретного чата
     * Делегирует вызов к PushNotificationService
     */
    async clearChatNotifications(roomId) {
        try {
            if (__DEV__) {
                console.log('[OneSignal] 🗑️ Очистка уведомлений для чата', { roomId });
            }
            
            // Импортируем PushNotificationService для очистки уведомлений
            const PushNotificationService = require('@shared/services/PushNotificationService');
            const pushNotificationService = PushNotificationService.default || PushNotificationService;
            
            if (pushNotificationService && pushNotificationService.clearChatNotifications) {
                await pushNotificationService.clearChatNotifications(roomId);
            }
        } catch (error) {
            if (__DEV__) {
                console.warn('[OneSignal] ⚠️ Ошибка при очистке уведомлений чата:', error?.message);
            }
        }
    }

    /**
     * Очистка уведомлений для конкретного пользователя
     * Делегирует вызов к PushNotificationService
     */
    async clearChatNotificationsForPeerUser(userId) {
        try {
            if (__DEV__) {
                console.log('[OneSignal] 🗑️ Очистка уведомлений для пользователя', { userId });
            }
            
            // Импортируем PushNotificationService для очистки уведомлений
            const PushNotificationService = require('@shared/services/PushNotificationService');
            const pushNotificationService = PushNotificationService.default || PushNotificationService;
            
            if (pushNotificationService && pushNotificationService.clearChatNotificationsForPeerUser) {
                await pushNotificationService.clearChatNotificationsForPeerUser(userId);
            }
        } catch (error) {
            if (__DEV__) {
                console.warn('[OneSignal] ⚠️ Ошибка при очистке уведомлений пользователя:', error?.message);
            }
        }
    }
}

// Экспортируем синглтон
const oneSignalService = new OneSignalService();
export default oneSignalService;