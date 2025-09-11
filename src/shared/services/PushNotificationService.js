import OneSignalService from './OneSignalService';

class PushNotificationService {
    constructor() {
        this.oneSignalAppId = 'a1bde379-4211-4fb9-89e2-3e94530a7041';
        
        this.isInitialized = false;
        this.navigationReady = false;
        this.pendingNavigations = [];
        
        // Функции навигации
        this.navigateToStopsFunc = null;
        this.navigateToOrderFunc = null;
        this.navigateToChatFunc = null;
        this.navigateToUrlFunc = null;
    }

    // Инициализация сервиса
    async initialize() {
        try {
            if (this.isInitialized) {
                console.log('🔔 PushNotificationService уже инициализирован');
                return true;
            }

            console.log('🚀 Инициализация PushNotificationService с OneSignal');

            // Инициализируем OneSignal
            const success = await OneSignalService.initialize(this.oneSignalAppId);
            
            if (!success) {
                console.error('❌ OneSignal инициализация не удалась');
                return false;
            }

            this.isInitialized = true;
            console.log('✅ PushNotificationService инициализирован с OneSignal');
            
            return true;

        } catch (error) {
            console.error('❌ Ошибка инициализации PushNotificationService:', error);
            return false;
        }
    }

    // Инициализация для пользователя
    async initializeForUser(user) {
        try {
            console.log('👤 Инициализация PushNotificationService для пользователя:', user.id);

            // Инициализируем базовый сервис
            const baseInitResult = await this.initialize();
            if (!baseInitResult) {
                return false;
            }

            // Настраиваем OneSignal для пользователя
            const userInitResult = await OneSignalService.initializeForUser(user);
            if (!userInitResult) {
                console.error('❌ OneSignal инициализация для пользователя не удалась');
                return false;
            }

            console.log('✅ PushNotificationService настроен для пользователя:', user.id);
            return true;

        } catch (error) {
            console.error('❌ Ошибка initializeForUser:', error);
            return false;
        }
    }

    // Очистка контекста пользователя
    async clearUserContext() {
        try {
            console.log('🧹 Очистка контекста пользователя');
            await OneSignalService.clearUserContext();
            console.log('✅ Контекст пользователя очищен');
        } catch (error) {
            console.error('❌ Ошибка очистки контекста:', error);
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
    setNavigationFunctions(navigateToStops, navigateToOrder, navigateToChat, navigateToUrl) {
        this.navigateToStopsFunc = navigateToStops;
        this.navigateToOrderFunc = navigateToOrder;
        this.navigateToChatFunc = navigateToChat;
        this.navigateToUrlFunc = navigateToUrl;

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
        console.log('📦 Навигация к заказу вызвана:', data);
        if (this.navigateToOrderFunc && typeof this.navigateToOrderFunc === 'function') {
            console.log('📦 Выполняется навигация к заказу:', data.orderId);
            this.navigateToOrderFunc(data);
        } else {
            console.warn('⚠️ navigateToOrderFunc не установлена');
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
}

const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
export { pushNotificationService as PushNotificationService };