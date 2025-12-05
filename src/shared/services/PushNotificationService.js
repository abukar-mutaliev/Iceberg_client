import OneSignalService from './OneSignalService';
import Constants from 'expo-constants';

class PushNotificationService {
    constructor() {
        this.oneSignalAppId =
            process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ||
            (Constants?.expoConfig?.extra?.oneSignalAppId ?? null);
        
        this.isInitialized = false;
        this.navigationReady = false;
        this.pendingNavigations = [];
        
        // Функции навигации
        this.navigateToStopsFunc = null;
        this.navigateToOrderFunc = null;
        this.navigateToChatFunc = null;
        this.navigateToUrlFunc = null;
        this.navigateToOrderChoiceFunc = null;
    }

    // Инициализация сервиса
    async initialize() {
        try {
            console.log('[PushService] Начинаем инициализацию...');
            
            if (this.isInitialized) {
                console.log('[PushService] Уже инициализирован');
                return true;
            }
            
            console.log('[PushService] Инициализируем OneSignal с App ID:', this.oneSignalAppId);
            
            // Инициализируем OneSignal
            const success = await OneSignalService.initialize(this.oneSignalAppId);
            
            if (!success) {
                return false;
            }

            this.isInitialized = true;
            console.log('[PushService] ✅ Сервис инициализирован успешно');
            
            return true;

        } catch (error) {
            console.error('[PushService] Ошибка инициализации:', error);
            return false;
        }
    }

    // Инициализация для пользователя
    async initializeForUser(user) {
        try {
            console.log('[PushService] ===== Инициализация для пользователя =====');
            console.log('[PushService] User:', { id: user?.id, email: user?.email, role: user?.role });

            if (!user || !user.id) {
                return false;
            }

            // Инициализируем базовый сервис
            const baseInitResult = await this.initialize();
            if (!baseInitResult) {
                return false;
            }

            console.log('[PushService] ✅ Базовая инициализация выполнена');

            // Настраиваем OneSignal для пользователя
            console.log('[PushService] Настраиваем OneSignal для пользователя...');
            const userInitResult = await OneSignalService.initializeForUser(user);
            
            if (!userInitResult) {
                return false;
            }

            console.log('[PushService] ✅ OneSignal настроен для пользователя');
            console.log('[PushService] ===== Инициализация завершена успешно =====');

            return true;

        } catch (error) {
            return false;
        }
    }

    // Очистка контекста пользователя
    async clearUserContext() {
        try {
            console.log('[PushService] Очищаем контекст пользователя...');
            await OneSignalService.clearUserContext();
            console.log('[PushService] ✅ Контекст очищен');
        } catch (error) {
            console.error('[PushService] ❌ Ошибка очистки контекста:', error);
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
            this.pendingNavigations.forEach(data => {
                this.handleNotificationNavigation(data);
            });
            this.pendingNavigations = [];
        }
    }

    // Обработка навигации (упрощенная)
    handleNotificationNavigation(data) {
        if (!this.navigationReady) {
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
        if (this.navigateToChatFunc && typeof this.navigateToChatFunc === 'function') {
            this.navigateToChatFunc(data);
        } else {
            if (data.url) {
                this.navigateToUrl(data.url);
            }
        }
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