import PushNotificationService from './PushNotificationService';

/**
 * Совместимость после отказа от OneSignal: пуши идут через
 * PushNotificationService (FCM / RuStore). Старые вызовы clearUserContext
 * и диагностические методы не должны ронять приложение.
 */
const OneSignalService = {
    currentUserId: null,

    getOneSignal() {
        return null;
    },

    getStatus() {
        const status = PushNotificationService.getServiceStatus?.() || {};
        return {
            isInitialized: !!status.isInitialized,
            hasSubscription: !!PushNotificationService.getCurrentToken?.(),
            currentUserId: this.currentUserId,
        };
    },

    async getPendingSubscriptionStatus() {
        return { pending: false };
    },

    async initialize() {
        return PushNotificationService.initialize();
    },

    async initializeForUser(user) {
        this.currentUserId = user?.id ?? null;
        return PushNotificationService.initializeForUser(user);
    },

    getCurrentSubscriptionId() {
        return PushNotificationService.getCurrentToken?.() || null;
    },

    async getSubscriptionId() {
        return PushNotificationService.getCurrentToken?.() || null;
    },

    async setUserTags() {
        return { success: true };
    },

    async saveSubscriptionToServer() {
        return { success: false };
    },

    flushPendingSubscription() {},

    async forceRecreateAllChannels() {
        return false;
    },

    async clearUserContext() {
        this.currentUserId = null;
        return PushNotificationService.clearUserContext();
    },
};

export default OneSignalService;
