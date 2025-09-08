import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase удален - используем только Expo Notifications

class PushNotificationService {
    constructor() {
        this.projectId = Constants.expoConfig?.extra?.eas?.projectId || '934456aa-74ef-4c35-844b-aa0c0c2899f3';

        this.isInitialized = false;
        this.currentToken = null;
        this._deviceId = Device.osBuildId || Device.osInternalBuildId || 'unknown';
        this.navigationReady = false;
        this.pendingNavigations = [];
    }

    getBuildType() {
        console.log('🔍 Build type detection:', {
            __DEV__,
            appOwnership: Constants.appOwnership,
            channel: Constants.expoConfig?.updates?.channel,
            EXPO_PUBLIC_BUILD_TYPE: process.env.EXPO_PUBLIC_BUILD_TYPE,
            executionEnvironment: Constants.executionEnvironment,
            isDetached: Constants.isDetached
        });

        // Сначала проверяем переменную окружения
        if (process.env.EXPO_PUBLIC_BUILD_TYPE) {
            console.log('📝 Using EXPO_PUBLIC_BUILD_TYPE:', process.env.EXPO_PUBLIC_BUILD_TYPE);
            return process.env.EXPO_PUBLIC_BUILD_TYPE;
        }

        if (__DEV__) {
            return 'development';
        }

        // Проверяем канал обновлений
        if (Constants.expoConfig?.updates?.channel) {
            const channel = Constants.expoConfig.updates.channel;
            console.log('📺 Using update channel:', channel);
            if (channel === 'preview' || channel === 'preview-debug') {
                return 'preview';
            } else if (channel === 'production') {
                return 'production';
            }
        }

        if (Constants.appOwnership === 'expo') {
            return 'expo-go';
        }

        if (Constants.appOwnership === 'standalone') {
            return 'production';
        }

        // Fallback для standalone/bare builds
        if (Constants.executionEnvironment === 'bare' || Constants.isDetached) {
            return 'preview';
        }

        return 'development';
    }

    // Firebase удален - всегда используем Expo Notifications
    shouldUseFCM() {
        return false;
    }

    async initialize() {
        // ИСПРАВЛЕНО: Позволяем повторную инициализацию для обновления токенов
        if (this.isInitialized) {
            if (!this.currentToken) {
                this.isInitialized = false;
            } else {
                try {
                    const freshToken = await this.registerForPushNotifications();
                    if (freshToken && freshToken !== this.currentToken) {
                        this.currentToken = freshToken;
                    }
                } catch (error) {
                    // Could not refresh token
                }
                return true;
            }
        }
        
        try {
            if (!Device.isDevice) {
                return false;
            }

            const buildType = this.getBuildType();


            // Настраиваем обработчик уведомлений
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: false,
                }),
            });

            // Firebase удален - используем только Expo Notifications

            // Настраиваем каналы уведомлений для Android
            if (Platform.OS === 'android') {
                await this.setupNotificationChannels();
            }



            const token = await this.registerForPushNotifications();

            this.setupNotificationListeners();

            this.isInitialized = true;
            return true;

        } catch (error) {
            console.error('Failed to initialize PushNotificationService:', error.message);
            return false;
        }
    }

    // Firebase методы удалены - используем только Expo Notifications

    async requestPermissions() {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();

            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                return { granted: false, status: finalStatus };
            }

            return { granted: true, status: finalStatus };
            
        } catch (error) {
            return { granted: false, error: error.message };
        }
    }

    async initializeForUser(user) {
        try {
            const baseInitResult = await this.initialize();
            if (!baseInitResult) {
                return false;
            }

            this.currentUser = user;

            if (this.currentToken) {
                const buildType = this.getBuildType();
                const tokenType = this.getTokenType(this.currentToken);

                console.log('💾 Saving token to server from initializeForUser:', {
                    buildType,
                    tokenType,
                    hasToken: !!this.currentToken
                });

                // Сохраняем только Expo токены
                if (tokenType === 'expo') {
                    const saveResult = await this.saveTokenToServerSafe(this.currentToken, this._deviceId, Platform.OS);
                    console.log('💾 Save result from initializeForUser:', saveResult);
                } else {
                    console.log('⚠️ Unknown token type, not saving to server:', tokenType);
                }
            } else {
                console.log('⚠️ No token available to save from initializeForUser');
            }

            return true;
        } catch (error) {
            console.error('Failed to initialize push notifications for user:', error.message);
            return false;
        }
    }

    clearUserContext() {
        this.currentUser = null;
    }



    async setupNotificationChannels() {
        try {
            const channels = [
                {
                    id: 'iceberg_default',
                    name: 'Iceberg Default',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                },
                {
                    id: 'default',
                    name: 'Default',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                },
                {
                    id: 'stops-channel',
                    name: 'Остановки',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                },
                {
                    id: 'orders-channel',
                    name: 'Заказы',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                },
                {
                    id: 'promotions-channel',
                    name: 'Акции',
                    importance: Notifications.AndroidImportance.DEFAULT,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                },
                {
                    id: 'chat-channel',
                    name: 'Сообщения',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                }
            ];

            for (const channel of channels) {
                await Notifications.setNotificationChannelAsync(channel.id, channel);
            }
        } catch (error) {
            console.error('Error creating notification channels:', error.message);
        }
    }

    async registerForPushNotifications() {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                return null;
            }

            let token;
            const buildType = this.getBuildType();

            // Всегда используем Expo токен (Firebase удален)
            console.log('📱 Fetching Expo token...');
            token = await this.getExpoPushToken();

            if (token) {
                console.log('✅ Token received:', `${token.substring(0, 20)}...`, 'Type:', this.getTokenType(token));
                this.currentToken = token;
                await this.saveDeviceTokenLocally(token);

                // Сохраняем токен на сервере для всех типов сборок (включая Expo Go для тестирования)
                const saved = await this.saveTokenToServerSafe(token, this._deviceId, Platform.OS);
                console.log('💾 Token save to server result:', saved);

                return token;
            } else {
                console.log('❌ No token received');
            }

            return null;

        } catch (error) {
            console.error('Error registering for push notifications:', error.message);
            return null;
        }
    }



    async getExpoPushToken() {
        try {
            if (!this.projectId) {
                throw new Error('Project ID is missing');
            }

            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: this.projectId,
            });

            if (!tokenData || !tokenData.data) {
                throw new Error('Invalid token response from Expo');
            }

            const token = tokenData.data;
            return token;

        } catch (error) {
            throw error;
        }
    }

    // Метод getFCMToken удален - используем только Expo токены

    async saveDeviceTokenLocally(token) {
        try {
            await AsyncStorage.setItem('expoPushToken', token);
            await AsyncStorage.setItem('pushTokenTimestamp', Date.now().toString());
        } catch (error) {
            console.error('Error saving token locally:', error.message);
        }
    }

    getTokenType(token) {
        if (!token) return 'unknown';

        // Expo токены начинаются с ExponentPushToken[
        if (token.startsWith('ExponentPushToken[')) {
            return 'expo';
        }

        return 'unknown';
    }

    async saveTokenToServerSafe(token, deviceId, platform) {
        try {
            if (!token) {
                return false;
            }

            const tokenType = this.getTokenType(token);
            console.log('🎫 Token type detected:', tokenType);

            // Принимаем только Expo токены
            if (tokenType !== 'expo') {
                console.log('❌ Unknown token type, skipping save');
                return false;
            }

            const { createProtectedRequest } = require('@shared/api/api');

            const tokenData = {
                token,
                deviceId,
                platform
            };

            console.log('📤 Saving Expo token to server:', {
                tokenPreview: `${token.substring(0, 20)}...`,
                deviceId,
                platform
            });

            const response = await createProtectedRequest('post', '/api/push-tokens', tokenData);

            console.log('📥 Server response for Expo token:', {
                success: !!response,
                data: response
            });

            const result = {
                status: response?.status === 200 ? 'success' : 'error',
                data: response,
                message: response?.message || 'Token processed'
            };

            if (result.status === 'success') {
                console.log('✅ Expo token successfully saved to server');
                return true;
            } else {
                console.log('❌ Failed to save Expo token to server:', result);
                return false;
            }

        } catch (error) {
            console.error('Error saving token to server:', error.message);
            
            // Если ошибка связана с дублированием токена (P2002), это не критично
            // Токен уже существует на сервере, что означает что он сохранен
            if (error?.response?.data?.code === 'P2002' ||
                error?.message?.includes('Unique constraint failed on the fields: (`token`)') ||
                error?.response?.status === 409) {
                console.log('ℹ️ Expo token already exists on server - this is OK');
                return true;
            }
            
            return false;
        }
    }

    setupNotificationListeners() {
        try {

            // Обработка уведомлений в foreground
            this.notificationListener = Notifications.addNotificationReceivedListener(
                this.handleNotificationReceived.bind(this)
            );

            // Обработка нажатий на уведомления
            this.responseListener = Notifications.addNotificationResponseReceivedListener(
                this.handleNotificationResponse.bind(this)
            );




            // Firebase удален - не нужно слушать FCM токены

        } catch (error) {
            console.error('❌ Error setting up listeners:', error);
        }
    }



    handleNotificationReceived(notification) {
        // Дополнительная логика обработки
    }

    handleNotificationResponse(response) {

        const data = response.notification.request.content.data;
        if (data) {
            this.handleNotificationNavigation(data);
        }
    }

    handleNotificationNavigation(data) {

        if (!this.navigationReady) {
            this.pendingNavigations.push(data);
            return;
        }

        // Обработка навигации
        if (data.stopId || data.type === 'STOP_NOTIFICATION') {
            this.navigateToStop(data);
        } else if (data.orderId || data.type === 'ORDER_STATUS') {
            this.navigateToOrder(data);
        } else if (data.productId || data.type === 'PRODUCT_NOTIFICATION') {
            this.navigateToProduct(data);
        } else if (data.type === 'CHAT_MESSAGE' && data.roomId) {
            this.navigateToChat(data);
        } else if (data.url) {
            this.navigateToUrl(data.url);
        }
    }

    async showLocalNotification({ title, body, data = {}, channelId = 'default' }) {
        try {
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data,
                    sound: true,
                },
                trigger: null,
            });

            return notificationId;

        } catch (error) {
            return null;
        }
    }

    navigateToStop(data) {
        if (this.navigateToStopsFunc && typeof this.navigateToStopsFunc === 'function') {
            this.navigateToStopsFunc(data);
        }
    }

    navigateToOrder(data) {
        if (this.navigateToOrderFunc && typeof this.navigateToOrderFunc === 'function') {
            this.navigateToOrderFunc(data);
        }
    }

    navigateToProduct(data) {
        // Реализация навигации к продукту
    }

    navigateToChat(data) {
        if (this.navigateToChatFunc && typeof this.navigateToChatFunc === 'function') {
            this.navigateToChatFunc(data);
        } else {
            if (data.url) {
                this.navigateToUrl(data.url);
            }
        }
    }

    navigateToUrl(url) {
        if (this.navigateToUrlFunc && typeof this.navigateToUrlFunc === 'function') {
            this.navigateToUrlFunc(url);
        }
    }

    setNavigationReady() {
        this.navigationReady = true;

        if (this.pendingNavigations.length > 0) {
            this.pendingNavigations.forEach(data => {
                this.handleNotificationNavigation(data);
            });
            this.pendingNavigations = [];
        }
    }

    setNavigationFunctions(navigateToStops, navigateToOrder, navigateToChat, navigateToUrl) {
        this.navigateToStopsFunc = navigateToStops;
        this.navigateToOrderFunc = navigateToOrder;
        this.navigateToChatFunc = navigateToChat;
        this.navigateToUrlFunc = navigateToUrl;

        this.setNavigationReady();
    }

    getCurrentToken() {
        return this.currentToken;
    }

    getProjectId() {
        return this.projectId;
    }

    get deviceId() {
        return this._deviceId;
    }

    getServiceStatus() {
        return {
            isInitialized: this.isInitialized,
            hasToken: !!this.currentToken,
            navigationReady: this.navigationReady,
            pendingNavigationsCount: this.pendingNavigations.length,
            buildType: this.getBuildType(),
            shouldUseFCM: this.shouldUseFCM(),
            firebaseAvailable: false, // Firebase удален
            projectIds: {
                expo: this.projectId
            }
        };
    }

    async clearAllNotifications() {
        try {
            await Notifications.dismissAllNotificationsAsync();
        } catch (error) {
            // Error clearing notifications
        }
    }

    setBadgeCount(count) {
        try {
            if (Platform.OS === 'ios') {
                Notifications.setBadgeCountAsync(count);
            }
        } catch (error) {
            // Error setting badge count
        }
    }

    clearNotificationListeners() {
        try {
            if (this.notificationListener) {
                this.notificationListener.remove();
                this.notificationListener = null;
            }

            if (this.responseListener) {
                this.responseListener.remove();
                this.responseListener = null;
            }

            if (this.tokenRefreshListener) {
                this.tokenRefreshListener();
                this.tokenRefreshListener = null;
            }
        } catch (error) {
            // Error clearing listeners
        }
    }

    async forceInitialize() {
        this.isInitialized = false;
        this.currentToken = null;
        this.clearNotificationListeners();
        return await this.initialize();
    }

    async refreshTokenOnServer() {
        try {
            if (!this.currentToken) {
                return false;
            }
            
            const result = await this.saveTokenToServerSafe(this.currentToken, this._deviceId, Platform.OS);

            return result;
        } catch (error) {
            return false;
        }
    }

    async getDeviceToken() {
        return this.currentToken;
    }

    getStatus() {
        return this.getServiceStatus();
    }

    isStandaloneBuild() {
        return Constants.appOwnership === 'standalone';
    }

    async registerForPushNotificationsAsync() {
        return await this.registerForPushNotifications();
    }

    async showChatMessageNotification(messageData) {
        try {
            const channelId = 'chat-channel';
            const title = `💬 Новое сообщение`;
            const body = messageData.content || 'У вас новое сообщение в чате';

            await this.showNotification({
                title,
                body,
                data: {
                    type: 'CHAT_MESSAGE',
                    messageId: messageData.id,
                    roomId: messageData.roomId,
                    senderId: messageData.senderId,
                    senderName: messageData.senderName,
                    url: `iceberg://chat/${messageData.roomId}`
                },
                channelId
            });
        } catch (error) {
            // Error sending chat message notification
        }
    }
}

const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
export { pushNotificationService as PushNotificationService };