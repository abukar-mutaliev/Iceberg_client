import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState } from 'react-native';
import { navigationRef } from '@shared/utils/NavigationRef';
import { pushTokenApi } from '@entities/notification/api/pushTokenApi';
import { ensureChannels } from './NotificationChannels';
import notificationDedup from './NotificationDedup';
import rustorePushModule from './RustorePushModule';
import AsyncStorage from '@react-native-async-storage/async-storage';

let firebaseMessaging = null;
try {
    const fbMessaging = require('@react-native-firebase/messaging');
    firebaseMessaging = {
        getMessaging: fbMessaging.getMessaging,
        getToken: fbMessaging.getToken,
        onTokenRefresh: fbMessaging.onTokenRefresh,
    };
} catch (_) {
    // Expo Go — Firebase native modules недоступны
}

const DEVICE_ID_STORAGE_KEY = '@push:device_id';

class PushNotificationService {
    constructor() {
        this.isInitialized = false;
        this.navigationReady = false;
        this.pendingNavigations = [];
        this.authResolved = false;
        this.isAuthenticated = null;
        this.hasPendingNotificationNavigation = false;

        this.navigateToStopsFunc = null;
        this.navigateToOrderFunc = null;
        this.navigateToChatFunc = null;
        this.navigateToUrlFunc = null;
        this.navigateToOrderChoiceFunc = null;

        this.activeChatRoomId = null;
        this.activeChatPeerUserId = null;

        this.stopUpdateHandler = null;

        this.initializeForUserPromise = null;
        this.initializeForUserUserId = null;

        this.currentToken = null;
        this.rustoreToken = null;
        this.rustoreAvailable = false;
    }

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

    // =============================
    // Инициализация
    // =============================

    async initialize() {
        try {
            if (this.isInitialized) {
                return true;
            }

            await ensureChannels();

            Notifications.setNotificationHandler({
                handleNotification: async (notification) => {
                    const data = notification?.request?.content?.data || {};
                    const notificationId = data?.notificationId;

                    if (data?._locallyScheduled) {
                        if (this.shouldSuppressChatNotification(data)) {
                            return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
                        }
                        this.handleStopNotificationData(data, 'local');
                        return { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true };
                    }

                    if (notificationId && notificationDedup.hasSeen(notificationId)) {
                        return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
                    }
                    if (notificationId) {
                        notificationDedup.markSeen(notificationId);
                    }

                    if (this.shouldSuppressChatNotification(data)) {
                        return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
                    }
                    this.handleStopNotificationData(data, 'foreground');
                    return { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true };
                },
            });

            Notifications.addNotificationResponseReceivedListener((response) => {
                try {
                    const data = response?.notification?.request?.content?.data || {};
                    const normalizedData = this._normalizeNotificationData(data);

                    const actionId = response?.actionIdentifier;
                    if (actionId && actionId !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
                        this._handleNotificationAction(actionId, normalizedData);
                    } else {
                        this.handleNotificationNavigation(normalizedData);
                    }
                } catch (e) {
                    if (__DEV__) {
                        console.warn('[PushNotification] Error in response listener:', e?.message);
                    }
                }
            });

            Notifications.addNotificationReceivedListener((notification) => {
                try {
                    const data = notification?.request?.content?.data || {};
                    this.handleStopNotificationData(data, 'received');
                } catch (_) {}
            });

            // Notification categories для кнопок действий
            try {
                await Notifications.setNotificationCategoryAsync('chat_message', [
                    {
                        identifier: 'reply',
                        buttonTitle: 'Ответить',
                        options: { opensAppToForeground: true },
                    },
                ]);
            } catch (_) {}

            if (firebaseMessaging) {
                firebaseMessaging.onTokenRefresh(firebaseMessaging.getMessaging(), async (newToken) => {
                    if (__DEV__) {
                        console.log('[PushNotification] FCM token refreshed');
                    }
                    this.currentToken = newToken;
                    try {
                        const deviceId = await this._getOrCreateDeviceId();
                        await pushTokenApi.savePushToken({
                            token: newToken,
                            deviceId,
                            platform: Platform.OS,
                        });
                    } catch (_) {}
                });
            }

            if (Platform.OS === 'android') {
                this._initRuStorePush();
            }

            this.isInitialized = true;
            return true;
        } catch (error) {
            if (__DEV__) {
                console.error('[PushNotification] Initialize error:', error?.message);
            }
            return false;
        }
    }

    async initializeForUser(user) {
        try {
            if (!user?.id) {
                return false;
            }

            if (this.initializeForUserPromise && this.initializeForUserUserId === user.id) {
                return await this.initializeForUserPromise;
            }

            this.initializeForUserUserId = user.id;
            this.initializeForUserPromise = (async () => {
                const baseInitResult = await this.initialize();
                if (!baseInitResult) {
                    return false;
                }

                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;
                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }
                if (finalStatus !== 'granted') {
                    if (__DEV__) {
                        console.log('[PushNotification] Permission not granted:', finalStatus);
                    }
                    return false;
                }

                if (!Device.isDevice) {
                    if (__DEV__) {
                        console.log('[PushNotification] Not a physical device, skipping token registration');
                    }
                    return false;
                }

                let fcmToken;
                if (firebaseMessaging) {
                    // Dev-client: Firebase Messaging даёт FCM-токен на обеих платформах.
                    try {
                        fcmToken = await firebaseMessaging.getToken(firebaseMessaging.getMessaging());
                    } catch (fcmError) {
                        if (__DEV__) {
                            console.warn('[PushNotification] Firebase getToken() failed:', fcmError?.message);
                        }
                    }
                }
                // Fallback (Expo Go или ошибка Firebase): getDevicePushTokenAsync
                // На Android возвращает FCM-токен, на iOS — APNs device token
                if (!fcmToken) {
                    try {
                        const tokenResponse = await Notifications.getDevicePushTokenAsync();
                        fcmToken = tokenResponse?.data;
                    } catch (_) {}
                }

                if (!fcmToken) {
                    if (__DEV__) {
                        console.warn('[PushNotification] Failed to get FCM token');
                    }
                    return false;
                }

                this.currentToken = fcmToken;
                const platform = Platform.OS;
                const deviceId = await this._getOrCreateDeviceId();

                if (__DEV__) {
                    console.log('[PushNotification] FCM token obtained, saving to server', {
                        platform,
                        tokenPrefix: fcmToken.substring(0, 30) + '...',
                        deviceId,
                    });
                }

                try {
                    await pushTokenApi.savePushToken({
                        token: fcmToken,
                        deviceId,
                        platform,
                    });
                } catch (saveError) {
                    if (__DEV__) {
                        console.warn('[PushNotification] Failed to save token:', saveError?.message);
                    }
                }

                if (Platform.OS === 'android') {
                    this._registerRuStoreToken(deviceId);
                }

                return true;
            })();

            return await this.initializeForUserPromise;
        } catch (error) {
            if (__DEV__) {
                console.error('[PushNotification] initializeForUser error:', error?.message);
            }
            return false;
        } finally {
            if (this.initializeForUserUserId === user?.id) {
                this.initializeForUserPromise = null;
                this.initializeForUserUserId = null;
            }
        }
    }

    async clearUserContext() {
        try {
            if (this.currentToken) {
                try {
                    await pushTokenApi.deactivatePushToken({ token: this.currentToken });
                } catch (_) {}
            }
            this.currentToken = null;

            if (this.rustoreToken) {
                try {
                    await rustorePushModule.deleteToken();
                } catch (_) {}
                this.rustoreToken = null;
            }

            return { success: true };
        } catch (error) {
            if (__DEV__) {
                console.error('[PushNotification] clearUserContext error:', error?.message);
            }
            return { success: false, error };
        }
    }

    getCurrentToken() {
        return this.currentToken;
    }

    getServiceStatus() {
        return {
            isInitialized: this.isInitialized,
            navigationReady: this.navigationReady,
            pendingNavigationsCount: this.pendingNavigations.length,
            service: 'FCM + RuStore',
            hasToken: !!this.currentToken,
            hasRustoreToken: !!this.rustoreToken,
            rustoreAvailable: this.rustoreAvailable,
        };
    }

    getStatus() {
        return this.getServiceStatus();
    }

    // =============================
    // Helpers
    // =============================

    _normalizeNotificationData(data) {
        const source = data && typeof data === 'object' ? data : {};
        const roomId = source.roomId || source.room_id || source.chatRoomId || source.chat_room_id || null;
        const senderId = source.senderId || source.sender_id || null;
        const messageId = source.messageId || source.message_id || null;
        const rawType = source.type || source.notificationType || source.notification_type || null;
        const type = rawType ? String(rawType).toUpperCase() : null;

        return { ...source, roomId, senderId, messageId, type };
    }

    _handleNotificationAction(actionId, data) {
        if (actionId === 'reply' && data?.roomId) {
            this.handleNotificationNavigation({
                ...data,
                type: 'CHAT_MESSAGE',
                autoFocusInput: true,
            });
        }
    }

    async _initRuStorePush() {
        try {
            const available = await rustorePushModule.checkAvailability();
            this.rustoreAvailable = available;

            if (!available) {
                if (__DEV__) {
                    console.log('[PushNotification] RuStore Push not available on this device');
                }
                return;
            }

            rustorePushModule.setupListeners({
                onMessage: (message) => this._handleRuStoreMessage(message),
                onOpened: (message) => this._handleRuStoreOpened(message),
                onNewToken: async (newToken) => {
                    this.rustoreToken = newToken;
                    try {
                        const deviceId = await this._getOrCreateDeviceId();
                        await rustorePushModule.registerToken(deviceId);
                    } catch (_) {}
                },
                onError: (errors) => {
                    if (__DEV__) {
                        console.warn('[PushNotification] RuStore error:', errors);
                    }
                },
            });

            const initial = await rustorePushModule.getInitialNotification();
            if (initial?.data) {
                const data = this._extractRuStoreData(initial);
                if (data) {
                    const normalized = this._normalizeNotificationData(data);
                    this.handleNotificationNavigation(normalized);
                }
            }

            if (__DEV__) {
                console.log('[PushNotification] RuStore Push initialized');
            }
        } catch (err) {
            if (__DEV__) {
                console.warn('[PushNotification] RuStore init failed:', err?.message);
            }
        }
    }

    async _registerRuStoreToken(deviceId) {
        try {
            if (!this.rustoreAvailable) return;

            const token = await rustorePushModule.getToken();
            if (token) {
                this.rustoreToken = token;
                await rustorePushModule.registerToken(deviceId);
                if (__DEV__) {
                    console.log('[PushNotification] RuStore token registered', {
                        tokenPrefix: token.substring(0, 30) + '...',
                    });
                }
            }
        } catch (err) {
            if (__DEV__) {
                console.warn('[PushNotification] RuStore token registration failed:', err?.message);
            }
        }
    }

    async _showLocalNotificationIfNeeded({ title, body, data, channelId, notificationId, tag, source }) {
        if (notificationId && await notificationDedup.isDuplicate(notificationId)) {
            if (__DEV__) {
                console.log(`[PushNotification] ${source} message deduplicated:`, notificationId);
            }
            return;
        }
        if (notificationId) {
            notificationDedup.markSeen(notificationId);
        }

        if (this.shouldSuppressChatNotification(data)) {
            this.handleStopNotificationData(data, source);
            return;
        }
        this.handleStopNotificationData(data, source);

        if (title || body) {
            if (tag) {
                try { await Notifications.dismissNotificationAsync(tag); } catch (_) {}
            }
            await Notifications.scheduleNotificationAsync({
                ...(tag ? { identifier: tag } : {}),
                content: {
                    title,
                    body,
                    data: { ...data, _locallyScheduled: true },
                    sound: 'default',
                    ...(Platform.OS === 'android' ? { channelId: channelId || 'default' } : {}),
                },
                trigger: null,
            });
        }
    }

    async _handleRuStoreMessage(message) {
        try {
            const data = this._extractRuStoreData(message);
            if (!data) return;

            await this._showLocalNotificationIfNeeded({
                title: data._title || message?.notification?.title || '',
                body: data._body || message?.notification?.body || '',
                data,
                channelId: data._channelId || 'default',
                notificationId: data.notificationId,
                tag: data._tag || null,
                source: 'rustore',
            });
        } catch (err) {
            if (__DEV__) {
                console.warn('[PushNotification] RuStore message handling error:', err?.message);
            }
        }
    }

    _handleRuStoreOpened(message) {
        try {
            const data = this._extractRuStoreData(message);
            if (!data) return;
            const normalized = this._normalizeNotificationData(data);
            this.handleNotificationNavigation(normalized);
        } catch (_) {}
    }

    _extractRuStoreData(message) {
        if (!message) return null;
        const rawData = message?.data;
        if (rawData && typeof rawData === 'object') {
            return rawData;
        }
        return null;
    }

    setupWebSocketListener(socket) {
        if (!socket) return;
        socket.off('notification:push');
        socket.on('notification:push', async (payload, ack) => {
            try {
                const { title, body, data, notificationId, channelId, tag } = payload || {};
                if (typeof ack === 'function') ack();

                await this._showLocalNotificationIfNeeded({
                    title: title || '',
                    body: body || '',
                    data: data || {},
                    channelId: channelId || 'default',
                    notificationId,
                    tag: tag || null,
                    source: 'websocket',
                });
            } catch (err) {
                if (typeof ack === 'function') ack();
                if (__DEV__) {
                    console.warn('[PushNotification] WebSocket notification error:', err?.message);
                }
            }
        });
    }

    removeWebSocketListener(socket) {
        if (!socket) return;
        socket.off('notification:push');
    }

    async _getOrCreateDeviceId() {
        try {
            let deviceId = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
            if (!deviceId) {
                deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
                await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
            }
            return deviceId;
        } catch (_) {
            return `${Platform.OS}_${Date.now()}`;
        }
    }

    // =============================
    // Chat notification suppression
    // =============================
    setActiveChatRoomId(roomId) {
        this.activeChatRoomId = roomId ? String(roomId) : null;
        if (__DEV__) {
            console.log('[PushNotification] setActiveChatRoomId', { roomId: this.activeChatRoomId });
        }
    }

    getActiveChatRoomId() {
        return this.activeChatRoomId;
    }

    setActiveChatPeerUserId(userId) {
        this.activeChatPeerUserId = userId ? String(userId) : null;
        if (__DEV__) {
            console.log('[PushNotification] setActiveChatPeerUserId', { userId: this.activeChatPeerUserId });
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

            const normalizedType = String(type || '').toUpperCase();
            const hasChatIdentifiers = !!roomId || !!senderId;

            if (normalizedType && normalizedType !== 'CHAT_MESSAGE') {
                return false;
            }

            if (!hasChatIdentifiers) {
                return false;
            }

            const normalizedActiveRoomId = this.activeChatRoomId ? String(this.activeChatRoomId).trim() : null;
            const normalizedNotificationRoomId = roomId ? String(roomId).trim() : null;
            const normalizedActivePeerUserId = this.activeChatPeerUserId ? String(this.activeChatPeerUserId).trim() : null;
            const normalizedNotificationSenderId = senderId ? String(senderId).trim() : null;

            if (normalizedActiveRoomId && normalizedNotificationRoomId && normalizedActiveRoomId === normalizedNotificationRoomId) {
                return true;
            }

            if (normalizedActivePeerUserId && normalizedNotificationSenderId && normalizedActivePeerUserId === normalizedNotificationSenderId) {
                return true;
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    // =============================
    // OS notifications helpers
    // =============================

    async setBadgeCount(count) {
        try {
            await Notifications.setBadgeCountAsync(count || 0);
        } catch (_) {}
    }

    async clearAllNotifications() {
        try {
            await Notifications.dismissAllNotificationsAsync();
        } catch (_) {}
    }

    async clearChatNotifications(roomId) {
        try {
            if (!roomId) return;

            const notifications = await Notifications.getPresentedNotificationsAsync();
            if (!notifications || notifications.length === 0) return;

            const chatNotifications = notifications.filter(notification => {
                const data = notification.request.content.data || {};
                const notificationRoomId = data.roomId || data.room_id;
                return notificationRoomId && String(notificationRoomId) === String(roomId);
            });

            for (const notification of chatNotifications) {
                try {
                    await Notifications.dismissNotificationAsync(notification.request.identifier);
                } catch (_) {}
            }
        } catch (_) {}
    }

    async clearChatNotificationsForPeerUser(userId) {
        try {
            if (!userId) return;

            const notifications = await Notifications.getPresentedNotificationsAsync();
            if (!notifications || notifications.length === 0) return;

            const userNotifications = notifications.filter(notification => {
                const data = notification.request.content.data || {};
                const notificationSenderId = data.senderId || data.sender_id;
                return notificationSenderId && String(notificationSenderId) === String(userId);
            });

            for (const notification of userNotifications) {
                try {
                    await Notifications.dismissNotificationAsync(notification.request.identifier);
                } catch (_) {}
            }
        } catch (_) {}
    }

    // =============================
    // Navigation
    // =============================

    setNavigationFunctions(navigateToStops, navigateToOrder, navigateToChat, navigateToUrl, navigateToOrderChoice = null) {
        this.navigateToStopsFunc = navigateToStops;
        this.navigateToOrderFunc = navigateToOrder;
        this.navigateToChatFunc = navigateToChat;
        this.navigateToUrlFunc = navigateToUrl;
        this.navigateToOrderChoiceFunc = navigateToOrderChoice;

        this.setNavigationReady();
    }

    setStopUpdateHandler(handler) {
        this.stopUpdateHandler = typeof handler === 'function' ? handler : null;
    }

    isStopNotificationData(data) {
        if (!data) return false;
        if (data.stopId || data.stop_id) return true;
        const type = String(data.type || data.notificationType || '').toUpperCase();
        return type === 'STOP_NOTIFICATION' || type === 'STOP_UPDATE' || type === 'STOP_CANCEL';
    }

    handleStopNotificationData(data, source = 'unknown') {
        try {
            if (!this.stopUpdateHandler || !this.isStopNotificationData(data)) {
                return;
            }
            const normalizedData = {
                ...data,
                stopId: data.stopId || data.stop_id
            };
            this.stopUpdateHandler(normalizedData, source);
        } catch (_) {}
    }

    setNavigationReady() {
        this.navigationReady = true;

        if (__DEV__) {
            console.log('[PushNotification] Navigation ready', {
                authResolved: this.authResolved,
                pendingNavigationsCount: this.pendingNavigations.length
            });
        }

        setTimeout(() => {
            if (this.pendingNavigations.length > 0) {
                this.flushPendingNavigations();
            }
        }, 1500);
    }

    setAuthState(isAuthenticated) {
        const wasAuthResolved = this.authResolved;
        this.authResolved = isAuthenticated !== undefined;
        this.isAuthenticated = isAuthenticated === undefined ? null : !!isAuthenticated;

        if (!wasAuthResolved && this.authResolved && this.pendingNavigations.length > 0) {
            setTimeout(() => {
                this.flushPendingNavigations();
            }, 500);
        } else {
            this.flushPendingNavigations();
        }
    }

    flushPendingNavigations() {
        if (!this.navigationReady || !this.authResolved || this.pendingNavigations.length === 0) {
            return;
        }

        const queue = [...this.pendingNavigations];
        this.pendingNavigations = [];

        queue.forEach((data) => {
            try {
                if (data.type === 'CHAT_MESSAGE' && data.roomId) {
                    this.navigateToChat(data);
                } else {
                    this.handleNotificationNavigation(data);
                }
            } catch (_) {}
        });

        setTimeout(() => {
            this.hasPendingNotificationNavigation = false;
        }, 4000);
    }

    handleNotificationNavigation(data) {
        if (__DEV__) {
            console.log('[PushNotification] handleNotificationNavigation', {
                type: data?.type,
                roomId: data?.roomId || data?.room_id,
            });
        }

        this.hasPendingNotificationNavigation = true;

        if (!this.navigationReady || !this.authResolved) {
            const isDuplicate = this.pendingNavigations.some(pending =>
                pending.roomId === data.roomId &&
                pending.type === data.type &&
                pending.messageId === data.messageId
            );

            if (!isDuplicate) {
                this.pendingNavigations.push(data);
            }
            return;
        }

        if (data.stopId || data.type === 'STOP_NOTIFICATION' || data.type === 'STOP_UPDATE' || data.type === 'STOP_CANCEL') {
            this.navigateToStop(data);
        } else if (data.choiceId || data.type === 'ORDER_CHOICE') {
            this.navigateToOrderChoice(data);
        } else if (data.orderId || data.type === 'ORDER_STATUS') {
            this.navigateToOrder(data);
        } else if (data.productId || data.type === 'PRODUCT_NOTIFICATION' || data.type === 'PROMOTION' || data.type === 'STOCK_ALERT' || data.type === 'PRODUCT_MODERATION') {
            this.navigateToProduct(data);
        } else if (data.type === 'CHAT_MESSAGE' && data.roomId) {
            if (!this.isAuthenticated) {
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
        }
    }

    navigateToStop(data) {
        if (this.navigateToStopsFunc && typeof this.navigateToStopsFunc === 'function') {
            this.navigateToStopsFunc(data);
            setTimeout(() => { this.hasPendingNotificationNavigation = false; }, 4000);
        }
    }

    navigateToOrder(data) {
        if (this.navigateToOrderFunc && typeof this.navigateToOrderFunc === 'function') {
            this.navigateToOrderFunc(data);
            setTimeout(() => { this.hasPendingNotificationNavigation = false; }, 4000);
        }
    }

    navigateToOrderChoice(data) {
        if (this.navigateToOrderChoiceFunc && typeof this.navigateToOrderChoiceFunc === 'function') {
            this.navigateToOrderChoiceFunc(data);
            setTimeout(() => { this.hasPendingNotificationNavigation = false; }, 4000);
        } else {
            if (data.orderId) {
                this.navigateToOrder({ orderId: data.orderId });
            }
        }
    }

    navigateToProduct(data) {
        try {
            const productId = data?.productId || data?.product_id;
            const warehouseId = data?.warehouseId || data?.warehouse_id;

            if (!productId) return;

            if (!navigationRef.isReady()) {
                this.pendingNavigations.push(data);
                return;
            }

            const notificationType = data?.type || '';
            const isAdminProductView = notificationType === 'STOCK_ALERT' || notificationType === 'PRODUCT_MODERATION';

            if (isAdminProductView) {
                const params = {
                    productId: parseInt(String(productId), 10),
                    fromScreen: notificationType === 'PRODUCT_MODERATION' ? 'ModerationNotification' : 'StockAlerts'
                };

                if (warehouseId) {
                    params.warehouseId = parseInt(String(warehouseId), 10);
                }

                try {
                    if (this.canNavigateToRoute('Admin')) {
                        navigationRef.navigate('Admin', { screen: 'AdminProductDetail', params });
                    } else if (this.canNavigateToRoute('AdminProductDetail')) {
                        navigationRef.navigate('AdminProductDetail', params);
                    } else {
                        navigationRef.navigate('ProductDetail', {
                            productId: parseInt(String(productId), 10),
                            fromScreen: 'Notification'
                        });
                    }
                } catch (_) {
                    try {
                        navigationRef.navigate('ProductDetail', {
                            productId: parseInt(String(productId), 10),
                            fromScreen: 'Notification'
                        });
                    } catch (_) {}
                }
            } else {
                if (this.canNavigateToRoute('ProductDetail')) {
                    navigationRef.navigate('ProductDetail', {
                        productId: parseInt(String(productId), 10),
                        fromScreen: 'Notification'
                    });
                }
            }

            setTimeout(() => { this.hasPendingNotificationNavigation = false; }, 4000);
        } catch (_) {}
    }

    navigateToChat(data) {
        const roomId = data?.roomId ? parseInt(String(data.roomId), 10) : null;
        if (!roomId) return;

        this._performChatNavigationWithRetry(data);
    }

    _performChatNavigationWithRetry(data, attemptNumber = 1) {
        const maxAttempts = 15;
        const roomId = data?.roomId ? parseInt(String(data.roomId), 10) : null;

        const isReady = this.navigationReady &&
                       this.authResolved &&
                       navigationRef.isReady() &&
                       this.canNavigateToRoute('ChatRoom');

        if (isReady) {
            this._performChatNavigation(data);
            return;
        }

        if (this.authResolved && !this.isAuthenticated) {
            this.pendingNavigations.push(data);
            try {
                if (navigationRef.isReady()) {
                    navigationRef.navigate('Auth', { initialScreen: 'login', fromNotification: true });
                }
            } catch (_) {}
            return;
        }

        if (attemptNumber < maxAttempts) {
            const delay = attemptNumber <= 5 ? 300 : attemptNumber <= 10 ? 500 : 1000;
            setTimeout(() => {
                this._performChatNavigationWithRetry(data, attemptNumber + 1);
            }, delay);
        } else {
            this.pendingNavigations.push(data);
        }
    }

    _performChatNavigation(data) {
        try {
            const roomId = data?.roomId ? parseInt(String(data.roomId), 10) : null;
            if (!roomId) return;

            const { InteractionManager } = require('react-native');
            const { CommonActions } = require('@react-navigation/native');

            const executeNavigation = () => {
                try {
                    if (!navigationRef.isReady() || !this.canNavigateToRoute('ChatRoom')) {
                        return false;
                    }

                    const params = {
                        roomId,
                        fromNotification: true,
                        messageId: data?.messageId ? parseInt(String(data.messageId), 10) : null,
                        autoFocusInput: data?.autoFocusInput || false,
                    };

                    navigationRef.dispatch(
                        CommonActions.reset({
                            index: 1,
                            routes: [
                                { name: 'Main' },
                                { name: 'ChatRoom', params }
                            ]
                        })
                    );

                    setTimeout(() => { this.hasPendingNotificationNavigation = false; }, 4000);
                    return true;
                } catch (_) {
                    return false;
                }
            };

            InteractionManager.runAfterInteractions(() => {
                setTimeout(() => {
                    const success = executeNavigation();
                    if (!success) {
                        setTimeout(() => { executeNavigation(); }, 500);
                    }
                }, 100);
            });
        } catch (_) {}
    }

    navigateToUrl(url) {
        if (this.navigateToUrlFunc && typeof this.navigateToUrlFunc === 'function') {
            this.navigateToUrlFunc(url);
            setTimeout(() => { this.hasPendingNotificationNavigation = false; }, 4000);
        }
    }

    async forceInitialize() {
        this.isInitialized = false;
        return await this.initialize();
    }

    async getDeviceToken() {
        return this.currentToken;
    }

    async registerForPushNotificationsAsync() {
        return await this.initialize();
    }
}

const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
export { pushNotificationService as PushNotificationService };
