import OneSignalService from '@shared/services/OneSignalService';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { navigationRef } from '@shared/utils/NavigationRef';
import * as Notifications from 'expo-notifications';

class PushNotificationService {
    constructor() {
        // Используем ту же логику что и в app.config.js с fallback значением
        this.oneSignalAppId =
            process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ||
            (Constants?.expoConfig?.extra?.oneSignalAppId ?? null) ||
            'a1bde379-4211-4fb9-89e2-3e94530a7041'; // Fallback из app.config.js
        
        this.isInitialized = false;
        this.navigationReady = false;
        this.pendingNavigations = [];
        this.authResolved = false; // isAuthenticated !== undefined
        this.isAuthenticated = null;
        this.hasPendingNotificationNavigation = false; // Флаг для предотвращения перезаписи навигации SplashScreen
        
        // Функции навигации
        this.navigateToStopsFunc = null;
        this.navigateToOrderFunc = null;
        this.navigateToChatFunc = null;
        this.navigateToUrlFunc = null;
        this.navigateToOrderChoiceFunc = null;

        // Текущий открытый чат (для подавления уведомлений в этом чате)
        this.activeChatRoomId = null;
        // Текущий собеседник в direct-чате (для подавления уведомлений "от этого пользователя")
        this.activeChatPeerUserId = null;
    }

    // Проверяем, что нужный роут реально зарегистрирован в текущем root navigator.
    // Это важно на cold start: пока показывается только Splash, ChatRoom ещё не в routeNames,
    // и попытка navigationRef.navigate('ChatRoom') будет "unhandled".
    canNavigateToRoute(routeName) {
        try {
            if (!navigationRef.isReady()) return false;
            const state = navigationRef.getRootState?.();
            const routeNames = state?.routeNames;
            if (!Array.isArray(routeNames)) return false;
            return routeNames.includes(routeName);
        } catch (_) {
            return false;
        }
    }

    // Инициализация сервиса
    async initialize() {
        try {
            if (this.isInitialized) {
                return true;
            }
            // Инициализируем OneSignal
            const success = await OneSignalService.initialize(this.oneSignalAppId);
            
            if (!success) {
                return false;
            }

            this.isInitialized = true;
            
            return true;

        } catch (error) {
            return false;
        }
    }

    // Инициализация для пользователя
    async initializeForUser(user) {
        try {

            // Инициализируем базовый сервис
            const baseInitResult = await this.initialize();
            if (!baseInitResult) {
                return false;
            }

            // Настраиваем OneSignal для пользователя
            const userInitResult = await OneSignalService.initializeForUser(user);
            if (!userInitResult) {
                return false;
            }

            return true;

        } catch (error) {
            return false;
        }
    }

    // Очистка контекста пользователя
    async clearUserContext() {
        try {
            const result = await OneSignalService.clearUserContext();
            return result;
        } catch (error) {
            console.error('❌ Ошибка очистки контекста:', error);
            return {
                success: false,
                error: error
            };
        }
    }

    // Получение текущего токена/subscription ID
    getCurrentToken() {
        return OneSignalService.getCurrentSubscriptionId();
    }

    // Получение статуса сервиса
    getServiceStatus() {
        const oneSignalStatus = OneSignalService.getStatus();
        
        return {
            isInitialized: this.isInitialized,
            navigationReady: this.navigationReady,
            pendingNavigationsCount: this.pendingNavigations.length,
            service: 'OneSignal',
            oneSignal: oneSignalStatus
        };
    }

    getStatus() {
        return this.getServiceStatus();
    }

    // =============================
    // Chat notification suppression
    // =============================
    setActiveChatRoomId(roomId) {
        this.activeChatRoomId = roomId ? String(roomId) : null;
        if (__DEV__) {
            console.log('[PushNotification] 🔄 setActiveChatRoomId вызван', {
                roomId,
                activeChatRoomId: this.activeChatRoomId
            });
        }
    }

    getActiveChatRoomId() {
        return this.activeChatRoomId;
    }

    setActiveChatPeerUserId(userId) {
        this.activeChatPeerUserId = userId ? String(userId) : null;
        if (__DEV__) {
            console.log('[PushNotification] 🔄 setActiveChatPeerUserId вызван', {
                userId,
                activeChatPeerUserId: this.activeChatPeerUserId
            });
        }
    }

    getActiveChatPeerUserId() {
        return this.activeChatPeerUserId;
    }

    shouldSuppressChatNotification(data) {
        try {
            const type = data?.type || data?.notificationType;
            const roomId = data?.roomId || data?.room_id;
            const senderId = data?.senderId || data?.sender_id;
            
            // Только для уведомлений типа CHAT_MESSAGE с roomId
            const normalizedType = String(type || '').toUpperCase();
            if (normalizedType !== 'CHAT_MESSAGE' || !roomId) {
                if (__DEV__) {
                    console.log('[PushNotification] ✅ Не подавляем: не CHAT_MESSAGE или нет roomId', {
                        type: normalizedType,
                        roomId
                    });
                }
                return false;
            }
            
            // Нормализуем значения для сравнения (убираем пробелы и приводим к строке)
            const normalizedActiveRoomId = this.activeChatRoomId ? String(this.activeChatRoomId).trim() : null;
            const normalizedNotificationRoomId = roomId ? String(roomId).trim() : null;
            const normalizedActivePeerUserId = this.activeChatPeerUserId ? String(this.activeChatPeerUserId).trim() : null;
            const normalizedNotificationSenderId = senderId ? String(senderId).trim() : null;
            
            // Логируем состояние для диагностики
            if (__DEV__) {
                console.log('[PushNotification] 🔍 Проверка подавления уведомления', {
                    activeRoomId: normalizedActiveRoomId,
                    notificationRoomId: normalizedNotificationRoomId,
                    activePeerUserId: normalizedActivePeerUserId,
                    notificationSenderId: normalizedNotificationSenderId,
                    roomIdMatch: normalizedActiveRoomId && normalizedActiveRoomId === normalizedNotificationRoomId,
                    userIdMatch: normalizedActivePeerUserId && normalizedNotificationSenderId && normalizedActivePeerUserId === normalizedNotificationSenderId
                });
            }
            
            // 1) Если открыт именно этот roomId — всегда подавляем
            if (normalizedActiveRoomId && normalizedNotificationRoomId && normalizedActiveRoomId === normalizedNotificationRoomId) {
                if (__DEV__) {
                    console.log('[PushNotification] 🔇 Подавление уведомления: чат уже открыт', {
                        activeRoomId: normalizedActiveRoomId,
                        notificationRoomId: normalizedNotificationRoomId,
                        senderId: normalizedNotificationSenderId
                    });
                }
                return true;
            }
            
            // 2) Если открыт direct-чат с этим пользователем — подавляем пуши от него (даже если room другой)
            if (normalizedActivePeerUserId && normalizedNotificationSenderId && normalizedActivePeerUserId === normalizedNotificationSenderId) {
                if (__DEV__) {
                    console.log('[PushNotification] 🔇 Подавление уведомления: чат с пользователем уже открыт', {
                        activePeerUserId: normalizedActivePeerUserId,
                        notificationSenderId: normalizedNotificationSenderId,
                        notificationRoomId: normalizedNotificationRoomId
                    });
                }
                return true;
            }
            
            if (__DEV__) {
                console.log('[PushNotification] ✅ Не подавляем уведомление', {
                    activeRoomId: normalizedActiveRoomId,
                    notificationRoomId: normalizedNotificationRoomId,
                    activePeerUserId: normalizedActivePeerUserId,
                    notificationSenderId: normalizedNotificationSenderId
                });
            }
            
            return false;
        } catch (error) {
            if (__DEV__) {
                console.warn('[PushNotification] Ошибка в shouldSuppressChatNotification:', error?.message);
            }
            return false;
        }
    }

    // =============================
    // OS notifications helpers
    // =============================
    // Примечание: Управление уведомлениями теперь через OneSignal
    // Эти методы оставлены для совместимости, но могут быть пустыми
    
    async setBadgeCount(count) {
        // OneSignal управляет badge автоматически
        // Можно добавить через OneSignal API если нужно
    }

    async clearAllNotifications() {
        // OneSignal не предоставляет API для удаления всех уведомлений
        // Это нормально - пользователь может сделать это вручную
    }

    async clearChatNotifications(roomId) {
        try {
            if (!roomId) return;

            if (__DEV__) {
                console.log('[PushNotification] 🗑️ Очистка уведомлений для чата', { roomId });
            }

            // Получаем все активные уведомления
            const notifications = await Notifications.getPresentedNotificationsAsync();
            
            if (!notifications || notifications.length === 0) {
                if (__DEV__) {
                    console.log('[PushNotification] ✅ Нет активных уведомлений для очистки');
                }
                return;
            }

            // Фильтруем уведомления для этого чата по roomId в data
            const chatNotifications = notifications.filter(notification => {
                const data = notification.request.content.data || {};
                const notificationRoomId = data.roomId || data.room_id;
                return notificationRoomId && String(notificationRoomId) === String(roomId);
            });

            if (chatNotifications.length === 0) {
                if (__DEV__) {
                    console.log('[PushNotification] ✅ Нет уведомлений для этого чата');
                }
                return;
            }

            // Удаляем каждое уведомление
            for (const notification of chatNotifications) {
                try {
                    await Notifications.dismissNotificationAsync(notification.request.identifier);
                    if (__DEV__) {
                        console.log('[PushNotification] ✅ Удалено уведомление', {
                            identifier: notification.request.identifier,
                            roomId
                        });
                    }
                } catch (error) {
                    if (__DEV__) {
                        console.warn('[PushNotification] ⚠️ Ошибка при удалении уведомления:', error?.message);
                    }
                }
            }

            if (__DEV__) {
                console.log('[PushNotification] ✅ Очищено уведомлений для чата', {
                    roomId,
                    count: chatNotifications.length
                });
            }
        } catch (error) {
            if (__DEV__) {
                console.warn('[PushNotification] ⚠️ Ошибка при очистке уведомлений:', error?.message);
            }
        }
    }

    async clearChatNotificationsForPeerUser(userId) {
        try {
            if (!userId) return;

            if (__DEV__) {
                console.log('[PushNotification] 🗑️ Очистка уведомлений для пользователя', { userId });
            }

            // Получаем все активные уведомления
            const notifications = await Notifications.getPresentedNotificationsAsync();
            
            if (!notifications || notifications.length === 0) {
                if (__DEV__) {
                    console.log('[PushNotification] ✅ Нет активных уведомлений для очистки');
                }
                return;
            }

            // Фильтруем уведомления от этого пользователя по senderId в data
            const userNotifications = notifications.filter(notification => {
                const data = notification.request.content.data || {};
                const notificationSenderId = data.senderId || data.sender_id;
                return notificationSenderId && String(notificationSenderId) === String(userId);
            });

            if (userNotifications.length === 0) {
                if (__DEV__) {
                    console.log('[PushNotification] ✅ Нет уведомлений от этого пользователя');
                }
                return;
            }

            // Удаляем каждое уведомление
            for (const notification of userNotifications) {
                try {
                    await Notifications.dismissNotificationAsync(notification.request.identifier);
                    if (__DEV__) {
                        console.log('[PushNotification] ✅ Удалено уведомление', {
                            identifier: notification.request.identifier,
                            senderId: userId
                        });
                    }
                } catch (error) {
                    if (__DEV__) {
                        console.warn('[PushNotification] ⚠️ Ошибка при удалении уведомления:', error?.message);
                    }
                }
            }

            if (__DEV__) {
                console.log('[PushNotification] ✅ Очищено уведомлений от пользователя', {
                    userId,
                    count: userNotifications.length
                });
            }
        } catch (error) {
            if (__DEV__) {
                console.warn('[PushNotification] ⚠️ Ошибка при очистке уведомлений:', error?.message);
            }
        }
    }

    // Установка функций навигации
    setNavigationFunctions(navigateToStops, navigateToOrder, navigateToChat, navigateToUrl, navigateToOrderChoice = null) {
        this.navigateToStopsFunc = navigateToStops;
        this.navigateToOrderFunc = navigateToOrder;
        this.navigateToChatFunc = navigateToChat;
        this.navigateToUrlFunc = navigateToUrl;
        this.navigateToOrderChoiceFunc = navigateToOrderChoice;

        this.setNavigationReady();
    }

    // Установка готовности навигации
    setNavigationReady() {
        this.navigationReady = true;

        if (__DEV__) {
            console.log('[PushNotification] ✅ Навигация готова', {
                authResolved: this.authResolved,
                isAuthenticated: this.isAuthenticated,
                pendingNavigationsCount: this.pendingNavigations.length
            });
        }

        // Небольшая задержка для гарантии, что WelcomeScreen завершил работу
        setTimeout(() => {
            if (__DEV__) {
                console.log('[PushNotification] 🔄 Проверка отложенных навигаций после готовности', {
                    count: this.pendingNavigations.length,
                    authResolved: this.authResolved
                });
            }
            
            if (this.pendingNavigations.length > 0) {
                if (__DEV__) {
                    console.log('[PushNotification] 🔄 Обработка отложенных навигаций');
                }
                this.flushPendingNavigations();
            }
        }, 1500); // Задержка 1.5 секунды для гарантии, что WelcomeScreen завершил работу
    }

    setAuthState(isAuthenticated) {
        // isAuthenticated can be true/false/undefined
        const wasAuthResolved = this.authResolved;
        this.authResolved = isAuthenticated !== undefined;
        this.isAuthenticated = isAuthenticated === undefined ? null : !!isAuthenticated;
        
        if (__DEV__) {
            console.log('[PushNotification] 🔐 setAuthState вызван', {
                isAuthenticated: this.isAuthenticated,
                authResolved: this.authResolved,
                wasAuthResolved,
                navigationReady: this.navigationReady,
                pendingNavigationsCount: this.pendingNavigations.length
            });
        }
        
        // Если auth только что разрешился и есть pending navigations, пытаемся обработать
        if (!wasAuthResolved && this.authResolved && this.pendingNavigations.length > 0) {
            if (__DEV__) {
                console.log('[PushNotification] 🔄 Auth разрешен, пытаемся обработать отложенные навигации');
            }
            
            // Даем небольшую задержку для стабилизации
            setTimeout(() => {
                this.flushPendingNavigations();
            }, 500);
        } else {
            this.flushPendingNavigations();
        }
    }

    flushPendingNavigations() {
        if (!this.navigationReady) {
            if (__DEV__) {
                console.log('[PushNotification] ⏳ flushPendingNavigations: навигация не готова', {
                    pendingCount: this.pendingNavigations.length
                });
            }
            return;
        }
        if (!this.authResolved) {
            if (__DEV__) {
                console.log('[PushNotification] ⏳ flushPendingNavigations: auth не разрешен', {
                    pendingCount: this.pendingNavigations.length
                });
            }
            return;
        }
        if (this.pendingNavigations.length === 0) {
            if (__DEV__) {
                console.log('[PushNotification] ✅ flushPendingNavigations: нет ожидающих навигаций');
            }
            return;
        }

        if (__DEV__) {
            console.log('[PushNotification] 🔄 Выполняем отложенные навигации', {
                count: this.pendingNavigations.length,
                navigations: this.pendingNavigations.map(n => ({
                    type: n.type,
                    roomId: n.roomId,
                    autoFocusInput: n.autoFocusInput
                }))
            });
        }

        const queue = [...this.pendingNavigations];
        this.pendingNavigations = [];

        queue.forEach((data, index) => {
            try {
                if (__DEV__) {
                    console.log(`[PushNotification] 🔄 Обрабатываем отложенную навигацию ${index + 1}/${queue.length}`, {
                        type: data.type,
                        roomId: data.roomId,
                        autoFocusInput: data.autoFocusInput
                    });
                }

                // Для CHAT_MESSAGE используем navigateToChat напрямую
                if (data.type === 'CHAT_MESSAGE' && data.roomId) {
                    this.navigateToChat(data);
                } else {
                    this.handleNotificationNavigation(data);
                }
            } catch (error) {
                if (__DEV__) {
                    console.warn('[PushNotification] ⚠️ Ошибка при выполнении отложенной навигации:', error?.message);
                }
            }
        });
        
        // Сбрасываем флаг с задержкой после выполнения всех навигаций
        setTimeout(() => {
            this.hasPendingNotificationNavigation = false;
            if (__DEV__) {
                console.log('[PushNotification] ✅ Все отложенные навигации выполнены, hasPendingNotificationNavigation сброшен (с задержкой)');
            }
        }, 4000);
    }

    // Обработка навигации (упрощенная)
    handleNotificationNavigation(data) {
        if (__DEV__) {
            console.log('[PushNotification] 📱 handleNotificationNavigation вызван', {
                type: data?.type,
                roomId: data?.roomId || data?.room_id,
                messageId: data?.messageId || data?.message_id,
                autoFocusInput: data?.autoFocusInput,
                productId: data?.productId || data?.product_id,
                orderId: data?.orderId,
                navigationReady: this.navigationReady,
                authResolved: this.authResolved,
                isAuthenticated: this.isAuthenticated,
                pendingCount: this.pendingNavigations.length
            });
        }

        // Устанавливаем флаг для предотвращения редиректа на Welcome из SplashScreen
        // Делаем это ВСЕГДА при навигации из уведомления, не только при добавлении в очередь
        this.hasPendingNotificationNavigation = true;
        if (__DEV__) {
            console.log('[PushNotification] 🚩 Установлен флаг hasPendingNotificationNavigation для блокировки Welcome');
        }

        // На cold start auth может ещё не быть восстановлен, и навигация "перетрётся" Welcome/Auth.
        // Поэтому ждём пока isAuthenticated станет true/false (authResolved).
        if (!this.navigationReady || !this.authResolved) {
            if (__DEV__) {
                console.log('[PushNotification] ⏳ Навигация/Auth не готовы, добавляем в очередь', {
                    navigationReady: this.navigationReady,
                    authResolved: this.authResolved,
                    type: data?.type,
                    roomId: data?.roomId
                });
            }
            
            // Проверяем, не дублируется ли уже это уведомление в очереди
            const isDuplicate = this.pendingNavigations.some(pending => 
                pending.roomId === data.roomId && 
                pending.type === data.type &&
                pending.messageId === data.messageId
            );
            
            if (!isDuplicate) {
                this.pendingNavigations.push(data);
                if (__DEV__) {
                    console.log('[PushNotification] ➕ Добавлено в очередь, всего:', this.pendingNavigations.length);
                }
            } else {
                if (__DEV__) {
                    console.log('[PushNotification] ⚠️ Дубликат уведомления, пропускаем');
                }
            }
            return;
        }

        // Логирование для отладки
        if (__DEV__) {
            console.log('[PushNotification] ✅ Навигация готова, обрабатываем уведомление', {
                type: data?.type,
                roomId: data?.roomId || data?.room_id,
                isAuthenticated: this.isAuthenticated
            });
        }

        // Обработка навигации
        if (data.stopId || data.type === 'STOP_NOTIFICATION' || data.type === 'STOP_UPDATE' || data.type === 'STOP_CANCEL') {
            this.navigateToStop(data);
        } else if (data.choiceId || data.type === 'ORDER_CHOICE') {
            this.navigateToOrderChoice(data);
        } else if (data.orderId || data.type === 'ORDER_STATUS') {
            this.navigateToOrder(data);
        } else if (data.productId || data.type === 'PRODUCT_NOTIFICATION' || data.type === 'PROMOTION' || data.type === 'STOCK_ALERT') {
            this.navigateToProduct(data);
        } else if (data.type === 'CHAT_MESSAGE' && data.roomId) {
            // Если пользователь не авторизован — сначала ведём на экран Auth, а навигацию в чат оставляем в очереди
            if (!this.isAuthenticated) {
                // сохраняем, чтобы после логина открыло чат
                this.pendingNavigations.push(data);
                try {
                    if (navigationRef.isReady()) {
                        navigationRef.navigate('Auth', { initialScreen: 'login', fromNotification: true });
                    }
                } catch (_) {}
                return;
            }
            this.navigateToChat(data);
        } else if (data.url) {
            this.navigateToUrl(data.url);
        } else {
            console.log('ℹ️ Неизвестный тип уведомления для навигации:', data.type);
        }
    }

    // Навигация к остановкам
    navigateToStop(data) {
        if (this.navigateToStopsFunc && typeof this.navigateToStopsFunc === 'function') {
            this.navigateToStopsFunc(data);
            // Сбрасываем флаг с задержкой
            setTimeout(() => {
                this.hasPendingNotificationNavigation = false;
                if (__DEV__) {
                    console.log('[PushNotification] 🏁 Сброшен флаг hasPendingNotificationNavigation после navigateToStop');
                }
            }, 4000);
        }
    }

    // Навигация к заказам
    navigateToOrder(data) {
        if (this.navigateToOrderFunc && typeof this.navigateToOrderFunc === 'function') {
            this.navigateToOrderFunc(data);
            // Сбрасываем флаг с задержкой
            setTimeout(() => {
                this.hasPendingNotificationNavigation = false;
                if (__DEV__) {
                    console.log('[PushNotification] 🏁 Сброшен флаг hasPendingNotificationNavigation после navigateToOrder');
                }
            }, 4000);
        } else {
            console.warn('⚠️ navigateToOrderFunc не установлена');
        }
    }

    // Навигация к предложениям выбора
    navigateToOrderChoice(data) {
        if (this.navigateToOrderChoiceFunc && typeof this.navigateToOrderChoiceFunc === 'function') {
            this.navigateToOrderChoiceFunc(data);
            // Сбрасываем флаг с задержкой
            setTimeout(() => {
                this.hasPendingNotificationNavigation = false;
                if (__DEV__) {
                    console.log('[PushNotification] 🏁 Сброшен флаг hasPendingNotificationNavigation после navigateToOrderChoice');
                }
            }, 4000);
        } else {
            if (data.orderId) {
                this.navigateToOrder({ orderId: data.orderId });
            }
        }
    }

    // Навигация к продуктам
    navigateToProduct(data) {
        try {
            // OneSignal конвертирует все значения в строки, поэтому извлекаем и парсим
            const productId = data?.productId || data?.product_id || data?.productId?.toString();
            const warehouseId = data?.warehouseId || data?.warehouse_id || data?.warehouseId?.toString();
            
            if (!productId) {
                console.warn('⚠️ navigateToProduct: отсутствует productId в данных уведомления', { data });
                return;
            }

            // Если навигация ещё не готова — сохраняем и выйдем (flushPendingNavigations добьёт позже)
            if (!navigationRef.isReady()) {
                this.pendingNavigations.push(data);
                return;
            }

            // Определяем, какой экран использовать
            // Для уведомлений об остатках (STOCK_ALERT) используем AdminProductDetail
            // Для обычных уведомлений о продуктах тоже используем AdminProductDetail для админов/сотрудников
            const notificationType = data?.type || '';
            const isStockAlert = notificationType === 'STOCK_ALERT';
            
            // Для STOCK_ALERT используем AdminProductDetail из AdminStack (как в StockAlertsScreen)
            if (isStockAlert) {
                const params = {
                    productId: parseInt(String(productId), 10),
                    fromScreen: 'StockAlerts'
                };
                
                // Добавляем warehouseId если он есть
                if (warehouseId) {
                    params.warehouseId = parseInt(String(warehouseId), 10);
                }
                
                console.log('📦 Навигация к AdminProductDetail (AdminStack) из уведомления об остатках:', params);
                
                try {
                    // Используем вложенную навигацию через AdminStack к AdminProductDetail
                    if (this.canNavigateToRoute('Admin')) {
                        navigationRef.navigate('Admin', {
                            screen: 'AdminProductDetail',
                            params: params
                        });
                    } else {
                        // Fallback: пробуем прямую навигацию к AdminProductDetail
                        console.log('⚠️ Admin не найден, пробуем прямую навигацию к AdminProductDetail');
                        if (this.canNavigateToRoute('AdminProductDetail')) {
                            navigationRef.navigate('AdminProductDetail', params);
                        } else {
                            // Последний fallback: ProductDetail
                            navigationRef.navigate('ProductDetail', {
                                productId: parseInt(String(productId), 10),
                                fromScreen: 'Notification'
                            });
                        }
                    }
                } catch (error) {
                    console.error('❌ Ошибка навигации к AdminProductDetail (AdminStack):', error);
                    // Fallback на обычный ProductDetail
                    try {
                        navigationRef.navigate('ProductDetail', {
                            productId: parseInt(String(productId), 10),
                            fromScreen: 'Notification'
                        });
                    } catch (fallbackError) {
                        console.error('❌ Ошибка fallback навигации:', fallbackError);
                    }
                }
            } else {
                // Для обычных уведомлений о продуктах используем ProductDetail
                console.log('📦 Навигация к ProductDetail из уведомления о продукте:', {
                    productId: parseInt(String(productId), 10)
                });
                
                if (this.canNavigateToRoute('ProductDetail')) {
                    navigationRef.navigate('ProductDetail', {
                        productId: parseInt(String(productId), 10),
                        fromScreen: 'Notification'
                    });
                } else {
                    console.warn('⚠️ ProductDetail не найден в навигации');
                }
            }
            
            // Сбрасываем флаг с задержкой
            setTimeout(() => {
                this.hasPendingNotificationNavigation = false;
                if (__DEV__) {
                    console.log('[PushNotification] 🏁 Сброшен флаг hasPendingNotificationNavigation после navigateToProduct');
                }
            }, 4000);
        } catch (error) {
            console.error('❌ Ошибка навигации к продукту:', error);
        }
    }

    // Навигация к чату
    navigateToChat(data) {
        if (__DEV__) {
            console.log('[PushNotification] 📞 navigateToChat вызван', {
                roomId: data?.roomId || data?.room_id,
                hasNavigateToChatFunc: !!this.navigateToChatFunc,
                type: typeof this.navigateToChatFunc,
                navigationReady: this.navigationReady,
                authResolved: this.authResolved,
                isNavigationRefReady: navigationRef.isReady()
            });
        }

        const roomId = data?.roomId ? parseInt(String(data.roomId), 10) : null;
        if (!roomId) {
            if (__DEV__) {
                console.warn('[PushNotification] ⚠️ roomId отсутствует в данных', data);
            }
            return;
        }

        // ВСЕГДА используем универсальный метод через navigationRef для надежности
        // Это работает как при холодном, так и при горячем старте
        this._performChatNavigationWithRetry(data);

    }

    // Новый метод с улучшенной логикой повторных попыток
    _performChatNavigationWithRetry(data, attemptNumber = 1) {
        const maxAttempts = 15; // Увеличено количество попыток
        const roomId = data?.roomId ? parseInt(String(data.roomId), 10) : null;

        if (__DEV__) {
            console.log(`[PushNotification] 🔄 Попытка навигации к чату #${attemptNumber}/${maxAttempts}`, {
                roomId,
                navigationReady: this.navigationReady,
                authResolved: this.authResolved,
                isNavigationRefReady: navigationRef.isReady(),
                canNavigateToRoute: this.canNavigateToRoute('ChatRoom')
            });
        }

        // Проверяем все условия готовности
        const isReady = this.navigationReady && 
                       this.authResolved && 
                       navigationRef.isReady() && 
                       this.canNavigateToRoute('ChatRoom');

        if (isReady) {
            // Все готово - выполняем навигацию
            if (__DEV__) {
                console.log('[PushNotification] ✅ Условия выполнены, выполняем навигацию');
            }
            this._performChatNavigation(data);
            return;
        }

        // Если пользователь не авторизован - отправляем на экран авторизации
        if (this.authResolved && !this.isAuthenticated) {
            if (__DEV__) {
                console.log('[PushNotification] 🔒 Пользователь не авторизован, перенаправляем на Auth');
            }
            this.pendingNavigations.push(data);
            try {
                if (navigationRef.isReady()) {
                    navigationRef.navigate('Auth', { initialScreen: 'login', fromNotification: true });
                }
            } catch (error) {
                if (__DEV__) {
                    console.warn('[PushNotification] ⚠️ Ошибка навигации к Auth:', error?.message);
                }
            }
            return;
        }

        // Не все готово - делаем повторную попытку
        if (attemptNumber < maxAttempts) {
            // Прогрессивная задержка: первые попытки быстрые, затем медленнее
            const delay = attemptNumber <= 5 ? 300 : attemptNumber <= 10 ? 500 : 1000;
            
            if (__DEV__) {
                console.log(`[PushNotification] ⏳ Ожидание ${delay}мс перед следующей попыткой`);
            }
            
            setTimeout(() => {
                this._performChatNavigationWithRetry(data, attemptNumber + 1);
            }, delay);
        } else {
            // Исчерпаны все попытки
            if (__DEV__) {
                console.warn('[PushNotification] ❌ Превышено максимальное количество попыток навигации', {
                    navigationReady: this.navigationReady,
                    authResolved: this.authResolved,
                    isNavigationRefReady: navigationRef.isReady(),
                    canNavigateToRoute: this.canNavigateToRoute('ChatRoom')
                });
            }
            
            // Сохраняем в очередь как последняя попытка
            this.pendingNavigations.push(data);
        }
    }

    // Вспомогательный метод для выполнения навигации к чату
    _performChatNavigation(data) {
        try {
            const roomId = data?.roomId ? parseInt(String(data.roomId), 10) : null;
            if (!roomId) {
                if (__DEV__) {
                    console.warn('[PushNotification] ⚠️ _performChatNavigation: roomId отсутствует', data);
                }
                return;
            }

            if (__DEV__) {
                console.log('[PushNotification] 🚀 _performChatNavigation: начинаем навигацию', {
                    roomId,
                    messageId: data?.messageId,
                    autoFocusInput: data?.autoFocusInput,
                    isNavigationRefReady: navigationRef.isReady(),
                    canNavigateToRoute: this.canNavigateToRoute('ChatRoom')
                });
            }

            const { InteractionManager } = require('react-native');
            const { CommonActions } = require('@react-navigation/native');
            
            // Используем двойную проверку готовности для максимальной надежности
            const executeNavigation = () => {
                try {
                    if (!navigationRef.isReady()) {
                        if (__DEV__) {
                            console.warn('[PushNotification] ⚠️ navigationRef не готов');
                        }
                        return false;
                    }

                    if (!this.canNavigateToRoute('ChatRoom')) {
                        if (__DEV__) {
                            console.warn('[PushNotification] ⚠️ ChatRoom не зарегистрирован');
                        }
                        return false;
                    }

                    const params = {
                        roomId,
                        fromNotification: true,
                        messageId: data?.messageId ? parseInt(String(data.messageId), 10) : null,
                        autoFocusInput: data?.autoFocusInput || false,
                    };

                    if (__DEV__) {
                        console.log('[PushNotification] 🎯 Выполняем navigationRef.dispatch (reset stack)', {
                            route: 'ChatRoom',
                            params,
                            stack: ['Main', 'ChatRoom']
                        });
                    }

                    // Используем reset для замены стека навигации
                    // Чтобы при нажатии "назад" из чата переход был на Main (список чатов), а не на SplashScreen
                    navigationRef.dispatch(
                        CommonActions.reset({
                            index: 1,
                            routes: [
                                { name: 'Main' }, // Список чатов в качестве базового экрана
                                { 
                                    name: 'ChatRoom',
                                    params
                                }
                            ]
                        })
                    );
                    
                    if (__DEV__) {
                        console.log('[PushNotification] ✅ Навигация к чату выполнена успешно (reset stack)', { roomId });
                    }
                    
                    // Сбрасываем флаг с задержкой, чтобы SplashScreen успел его проверить
                    setTimeout(() => {
                        this.hasPendingNotificationNavigation = false;
                        if (__DEV__) {
                            console.log('[PushNotification] 🏁 Сброшен флаг hasPendingNotificationNavigation после успешной навигации (с задержкой)');
                        }
                    }, 4000); // 4 секунды - достаточно для проверки SplashScreen (3 сек)
                    
                    return true;
                } catch (error) {
                    if (__DEV__) {
                        console.warn('[PushNotification] ⚠️ Ошибка при выполнении навигации:', error?.message);
                    }
                    return false;
                }
            };

            // Используем InteractionManager для выполнения после завершения анимаций
            InteractionManager.runAfterInteractions(() => {
                // Добавляем небольшую задержку для стабильности
                setTimeout(() => {
                    const success = executeNavigation();
                    
                    // Если не удалось - пробуем еще раз через короткую задержку
                    if (!success) {
                        if (__DEV__) {
                            console.log('[PushNotification] 🔄 Повторная попытка навигации через 500мс');
                        }
                        setTimeout(() => {
                            executeNavigation();
                        }, 500);
                    }
                }, 100);
            });
        } catch (error) {
            if (__DEV__) {
                console.warn('[PushNotification] ⚠️ Критическая ошибка в _performChatNavigation:', error?.message, error?.stack);
            }
        }
    }

    // Навигация по URL
    navigateToUrl(url) {
        if (this.navigateToUrlFunc && typeof this.navigateToUrlFunc === 'function') {
            this.navigateToUrlFunc(url);
            // Сбрасываем флаг с задержкой
            setTimeout(() => {
                this.hasPendingNotificationNavigation = false;
                if (__DEV__) {
                    console.log('[PushNotification] 🏁 Сброшен флаг hasPendingNotificationNavigation после navigateToUrl');
                }
            }, 4000);
        }
    }

    // Принудительная инициализация
    async forceInitialize() {
        this.isInitialized = false;
        return await this.initialize();
    }

    // Установка тегов пользователя
    async setUserTags(tags) {
        await OneSignalService.setUserTags(tags);
    }

    // Совместимость со старым API
    async getDeviceToken() {
        return this.getCurrentToken();
    }

    async registerForPushNotificationsAsync() {
        return await this.initialize();
    }

    // =============================
    // Diagnostics helpers
    // =============================
    getResolvedAppIdSources() {
        return {
            env: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || null,
            extra: Constants?.expoConfig?.extra?.oneSignalAppId || null,
            resolved: this.oneSignalAppId || null,
        };
    }

    getBuildRuntimeInfo() {
        return {
            buildType: process.env.EXPO_PUBLIC_BUILD_TYPE || null,
            nodeEnv: process.env.NODE_ENV || null,
            environmentExtra: Constants?.expoConfig?.extra?.environment || null,
            runtimeVersion: Constants?.expoConfig?.runtimeVersion || null,
            appName: Constants?.expoConfig?.name || null,
            appVersion: Constants?.expoConfig?.version || null,
        };
    }

    async getOneSignalRuntimeInfo() {
        try {
            // Ленивая загрузка SDK напрямую для низкоуровневых проверок
            const OneSignalModule = require('react-native-onesignal');
            const oneSignal = OneSignalModule.default || OneSignalModule.OneSignal || OneSignalModule;

            const info = {
                sdkLoaded: !!oneSignal,
                hasNotificationsAPI: !!oneSignal?.Notifications,
                hasUserAPI: !!oneSignal?.User,
                playerId: null,
                optedIn: null,
                hasPermission: null,
                // Расширенная диагностика
                subscriptionStatus: null,
                pushToken: null,
                deviceState: null,
                notificationPermission: null,
                fcmToken: null,
                // Проверка FCM
                fcmAvailable: false,
                fcmTokenRetrieved: false,
            };

            try {
                if (oneSignal?.User?.pushSubscription?.getIdAsync) {
                    info.playerId = await oneSignal.User.pushSubscription.getIdAsync();
                }
            } catch (_) {}

            try {
                // В разных версиях SDK может быть флаг или метод
                if (oneSignal?.User?.pushSubscription?.getOptedIn) {
                    info.optedIn = await oneSignal.User.pushSubscription.getOptedIn();
                } else if (typeof oneSignal?.User?.pushSubscription?.optedIn === 'boolean') {
                    info.optedIn = oneSignal.User.pushSubscription.optedIn;
                }
            } catch (_) {}

            try {
                if (oneSignal?.Notifications?.hasPermission) {
                    info.hasPermission = await oneSignal.Notifications.hasPermission();
                }
            } catch (_) {}

            // Расширенная диагностика подписки
            try {
                if (oneSignal?.User?.pushSubscription) {
                    const subscription = oneSignal.User.pushSubscription;

                    // Проверяем статус подписки
                    if (subscription.getOptedIn) {
                        info.subscriptionStatus = await subscription.getOptedIn();
                    }

                    // Проверяем push token (FCM)
                    if (subscription.getTokenAsync) {
                        info.pushToken = await subscription.getTokenAsync();
                        info.fcmToken = info.pushToken; // FCM токен
                        info.fcmTokenRetrieved = !!info.pushToken;
                    }

                    // Проверяем device state
                    if (subscription.getIdAsync) {
                        info.deviceState = await subscription.getIdAsync();
                    }
                }
            } catch (subError) {
                info.subscriptionError = subError?.message || String(subError);
            }

            // Проверяем разрешения уведомлений
            try {
                if (oneSignal?.Notifications?.permission) {
                    info.notificationPermission = oneSignal.Notifications.permission;
                }
            } catch (_) {}

            // Проверяем доступность FCM
            try {
                const { Platform } = require('react-native');
                if (Platform.OS === 'android') {
                    // FCM доступен через OneSignal, но проверяем токен
                    info.fcmAvailable = true; // OneSignal использует FCM под капотом
                }
            } catch (_) {}

            return info;
        } catch (e) {
            return {
                sdkLoaded: false,
                error: e?.message || String(e),
            };
        }
    }

    async diagnostics(user) {
        const appIdSources = this.getResolvedAppIdSources();
        const buildInfo = this.getBuildRuntimeInfo();
        const status = this.getServiceStatus();
        const oneSignalRuntime = await this.getOneSignalRuntimeInfo();

        try {
            console.log('[DIAG] OneSignal AppId (env):', appIdSources.env || 'null');
            console.log('[DIAG] OneSignal AppId (extra):', appIdSources.extra || 'null');
            console.log('[DIAG] OneSignal AppId (resolved):', appIdSources.resolved || 'null');

            console.log('[DIAG] Build/runtime:', JSON.stringify(buildInfo));
            console.log('[DIAG] Push service status:', JSON.stringify(status));
            console.log('[DIAG] OneSignal runtime:', JSON.stringify({
                sdkLoaded: oneSignalRuntime.sdkLoaded,
                hasNotificationsAPI: oneSignalRuntime.hasNotificationsAPI,
                hasUserAPI: oneSignalRuntime.hasUserAPI,
                playerId: oneSignalRuntime.playerId ? `${String(oneSignalRuntime.playerId).substring(0, 8)}...` : null,
                optedIn: oneSignalRuntime.optedIn,
                hasPermission: oneSignalRuntime.hasPermission,
                // FCM диагностика
                fcmAvailable: oneSignalRuntime.fcmAvailable,
                fcmTokenRetrieved: oneSignalRuntime.fcmTokenRetrieved,
                fcmToken: oneSignalRuntime.fcmToken ? `${String(oneSignalRuntime.fcmToken).substring(0, 20)}...` : null,
                subscriptionStatus: oneSignalRuntime.subscriptionStatus,
                pushToken: oneSignalRuntime.pushToken ? `${String(oneSignalRuntime.pushToken).substring(0, 20)}...` : null,
                deviceState: oneSignalRuntime.deviceState ? `${String(oneSignalRuntime.deviceState).substring(0, 8)}...` : null,
                notificationPermission: oneSignalRuntime.notificationPermission,
                error: oneSignalRuntime.error || null,
                subscriptionError: oneSignalRuntime.subscriptionError || null,
            }));

            if (user?.id) {
                console.log('[DIAG] User:', JSON.stringify({ id: user.id, role: user.role }));
            }
        } catch (_) {}

        return {
            appIdSources,
            buildInfo,
            status,
            oneSignalRuntime,
        };
    }
}

const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
export { pushNotificationService as PushNotificationService };