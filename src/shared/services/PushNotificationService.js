import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let firebase = null;
let messaging = null;

class PushNotificationService {
    constructor() {
        this.projectId = Constants.expoConfig?.extra?.eas?.projectId || '934456aa-74ef-4c35-844b-aa0c0c2899f3';

        this.isInitialized = false;
        this.currentToken = null;
        this._deviceId = Device.osBuildId || Device.osInternalBuildId || Platform.OS + '-' + Date.now();
        this.navigationReady = false;
        this.pendingNavigations = [];
    }



    async initialize() {
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

            // Настраиваем обработчик уведомлений
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: false,
                }),
            });

            // Инициализируем Firebase
            try {
                await this.initializeFirebase();
            } catch (firebaseError) {
                console.error('Firebase initialization failed:', firebaseError.message);
            }

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

    async loadFirebaseModules() {
        try {
            if (firebase && messaging) {
                return true;
            }

            const firebaseApp = await import('@react-native-firebase/app');
            const firebaseMessaging = await import('@react-native-firebase/messaging');

            firebase = firebaseApp.default;
            messaging = firebaseMessaging.default;

            return true;
        } catch (error) {
            return false;
        }
    }

    async initializeFirebase() {
        try {
            const modulesLoaded = await this.loadFirebaseModules();
            if (!modulesLoaded) {
                throw new Error('Firebase modules could not be loaded');
            }

            if (!firebase.apps.length) {
                await firebase.initializeApp();
            }

            const authStatus = await messaging().requestPermission();
            const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                           authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (enabled) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            throw error;
        }
    }

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
            console.log('Initializing push notifications for user:', user.id);
            const baseInitResult = await this.initialize();
            if (!baseInitResult) {
                console.log('Base initialization failed');
                return false;
            }

            this.currentUser = user;
            console.log('User context saved');

            if (this.currentToken) {
                console.log('Saving FCM token for user:', user.id);
                await this.saveTokenToServerSafe(this.currentToken, this._deviceId, Platform.OS);
            } else {
                console.log('No current token available');
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

            // Получаем FCM токен
            token = await this.getFCMToken();

            if (token) {
                this.currentToken = token;
                await this.saveDeviceTokenLocally(token);

                const saved = await this.saveTokenToServerSafe(token, this._deviceId, Platform.OS);
                return token;
            }

            return null;

        } catch (error) {
            console.error('Error registering for push notifications:', error.message);
            return null;
        }
    }




    async getFCMToken() {
        try {
            if (!messaging) {
                const modulesLoaded = await this.loadFirebaseModules();
                if (!modulesLoaded) {
                    throw new Error('Firebase modules could not be loaded');
                }
            }

            const token = await messaging().getToken();

            if (token) {
                return token;
            } else {
                throw new Error('No FCM token received');
            }
        } catch (error) {
            console.error('Error getting FCM token:', error.message);
            throw error;
        }
    }

    async saveDeviceTokenLocally(token) {
        try {
            await AsyncStorage.setItem('expoPushToken', token);
            await AsyncStorage.setItem('pushTokenTimestamp', Date.now().toString());
        } catch (error) {
            console.error('Error saving token locally:', error.message);
        }
    }

    async saveTokenToServerSafe(token, deviceId, platform) {
        try {
            if (!token) {
                return false;
            }

            const { createProtectedRequest } = require('@shared/api/api');

            const tokenData = {
                token,
                deviceId,
                platform
            };

            const response = await createProtectedRequest('post', '/api/push-tokens', tokenData);
            console.log('Server response status:', response?.status);

            const result = {
                status: response?.status === 200 ? 'success' : 'error',
                data: response?.data,
                message: response?.data?.message || 'Token processed'
            };

            console.log('Token save result:', result.status);

            if (result.status === 'success') {
                return true;
            } else {
                return false;
            }

        } catch (error) {
            console.error('Error saving token to server:', error.message);
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
            firebaseAvailable: !!(firebase && messaging),
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

    getCurrentToken() {
        return this.currentToken;
    }

    getStatus() {
        return this.getServiceStatus();
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