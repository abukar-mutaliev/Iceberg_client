import OneSignalService from '@shared/services/OneSignalService';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { navigationRef } from '@shared/utils/NavigationRef';

class PushNotificationService {
    constructor() {
        this.oneSignalAppId =
            process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ||
            (Constants?.expoConfig?.extra?.oneSignalAppId ?? null);
        
        this.isInitialized = false;
        this.navigationReady = false;
        this.pendingNavigations = [];
        this.authResolved = false; // isAuthenticated !== undefined
        this.isAuthenticated = null;
        
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
    }

    getActiveChatRoomId() {
        return this.activeChatRoomId;
    }

    setActiveChatPeerUserId(userId) {
        this.activeChatPeerUserId = userId ? String(userId) : null;
    }

    getActiveChatPeerUserId() {
        return this.activeChatPeerUserId;
    }

    shouldSuppressChatNotification(data) {
        try {
            const type = data?.type || data?.notificationType;
            const roomId = data?.roomId;
            const senderId = data?.senderId;
            if (String(type || '').toUpperCase() !== 'CHAT_MESSAGE' || !roomId) return false;
            // 1) Если открыт именно этот roomId — всегда подавляем
            if (this.activeChatRoomId && String(this.activeChatRoomId) === String(roomId)) {
                return true;
            }
            // 2) Если открыт direct-чат с этим пользователем — подавляем пуши от него (даже если room другой)
            if (this.activeChatPeerUserId && senderId && String(this.activeChatPeerUserId) === String(senderId)) {
                return true;
            }
            return false;
        } catch (_) {
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
        // OneSignal не предоставляет API для удаления конкретных уведомлений
        // Это нормально - уведомления автоматически исчезают при открытии чата
    }

    async clearChatNotificationsForPeerUser(userId) {
        // OneSignal не предоставляет API для удаления конкретных уведомлений
        // Это нормально - уведомления автоматически исчезают при открытии чата
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

        if (this.pendingNavigations.length > 0) {
            this.flushPendingNavigations();
        }
    }

    setAuthState(isAuthenticated) {
        // isAuthenticated can be true/false/undefined
        this.authResolved = isAuthenticated !== undefined;
        this.isAuthenticated = isAuthenticated === undefined ? null : !!isAuthenticated;
        this.flushPendingNavigations();
    }

    flushPendingNavigations() {
        if (!this.navigationReady) return;
        if (!this.authResolved) return;
        if (this.pendingNavigations.length === 0) return;

        const queue = [...this.pendingNavigations];
        this.pendingNavigations = [];

        queue.forEach((data) => {
            try {
                this.handleNotificationNavigation(data);
            } catch (_) {}
        });
    }

    // Обработка навигации (упрощенная)
    handleNotificationNavigation(data) {
        // На cold start auth может ещё не быть восстановлен, и навигация "перетрётся" Welcome/Auth.
        // Поэтому ждём пока isAuthenticated станет true/false (authResolved).
        if (!this.navigationReady || !this.authResolved) {
            this.pendingNavigations.push(data);
            return;
        }

        // Обработка навигации
        if (data.stopId || data.type === 'STOP_NOTIFICATION' || data.type === 'STOP_UPDATE' || data.type === 'STOP_CANCEL') {
            this.navigateToStop(data);
        } else if (data.choiceId || data.type === 'ORDER_CHOICE') {
            this.navigateToOrderChoice(data);
        } else if (data.orderId || data.type === 'ORDER_STATUS') {
            this.navigateToOrder(data);
        } else if (data.productId || data.type === 'PRODUCT_NOTIFICATION' || data.type === 'PROMOTION') {
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
        }
    }

    // Навигация к заказам
    navigateToOrder(data) {
        if (this.navigateToOrderFunc && typeof this.navigateToOrderFunc === 'function') {
            this.navigateToOrderFunc(data);
        } else {
            console.warn('⚠️ navigateToOrderFunc не установлена');
        }
    }

    // Навигация к предложениям выбора
    navigateToOrderChoice(data) {
        if (this.navigateToOrderChoiceFunc && typeof this.navigateToOrderChoiceFunc === 'function') {
            this.navigateToOrderChoiceFunc(data);
        } else {
            if (data.orderId) {
                this.navigateToOrder({ orderId: data.orderId });
            }
        }
    }

    // Навигация к продуктам
    navigateToProduct(data) {
        // Реализация навигации к продукту
    }

    // Навигация к чату
    navigateToChat(data) {
        // Сначала пробуем установленную функцию навигации
        if (this.navigateToChatFunc && typeof this.navigateToChatFunc === 'function') {
            this.navigateToChatFunc(data);
            return;
        }

        // Fallback через глобальный navigationRef (работает из любого места, включая cold start)
        try {
            const roomId = data?.roomId ? parseInt(String(data.roomId), 10) : null;
            if (!roomId) return;

            // Если навигация ещё не готова — сохраняем и выйдем (flushPendingNavigations добьёт позже)
            if (!navigationRef.isReady()) {
                this.pendingNavigations.push(data);
                return;
            }

            // Если ChatRoom ещё не зарегистрирован (например, пока открыт только Splash) — подождём.
            if (!this.canNavigateToRoute('ChatRoom')) {
                this.pendingNavigations.push(data);
                // небольшой отложенный повтор (на случай, если setAuthState уже true, а роуты ещё не смонтированы)
                setTimeout(() => {
                    try { this.flushPendingNavigations(); } catch (_) {}
                }, 350);
                return;
            }

            // ✅ ChatRoom теперь в корневом Stack (AppStack), поэтому навигируем напрямую.
            navigationRef.navigate('ChatRoom', {
                roomId,
                fromNotification: true,
                messageId: data?.messageId || null,
            });
        } catch (_) {}
    }

    // Навигация по URL
    navigateToUrl(url) {
        if (this.navigateToUrlFunc && typeof this.navigateToUrlFunc === 'function') {
            this.navigateToUrlFunc(url);
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