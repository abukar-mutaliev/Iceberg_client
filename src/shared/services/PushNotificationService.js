import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Условный импорт Firebase для production сборок
let messaging = null;
let firebase = null;

try {
    if (Constants.appOwnership === 'standalone' || Constants.executionEnvironment === 'bare') {
        firebase = require('@react-native-firebase/app').default;
        messaging = require('@react-native-firebase/messaging').default;
        console.log('Firebase modules loaded successfully');
    }
} catch (error) {
            console.log('Firebase modules not available:', error.message);
}

class PushNotificationService {
    constructor() {
        this.projectId = Constants.expoConfig?.extra?.eas?.projectId || '934456aa-74ef-4c35-844b-aa0c0c2899f3';
        this.firebaseProjectId = Constants.expoConfig?.extra?.firebaseProjectId || 'iceberg-323db';

        this.isInitialized = false;
        this.currentToken = null;
        this._deviceId = Device.osBuildId || Device.osInternalBuildId || 'unknown';
        this.navigationReady = false;
        this.pendingNavigations = [];

        console.log('PushNotificationService constructor:', {
            expoProjectId: this.projectId,
            firebaseProjectId: this.firebaseProjectId,
            buildType: this.getBuildType()
        });
    }

    // Определяем тип сборки
    getBuildType() {
        if (__DEV__) {
            return 'development';
        }

        // Проверяем, запущено ли в Expo Go
        if (Constants.appOwnership === 'expo') {
            return 'expo-go';
        }

        // Проверяем standalone сборки
        if (Constants.appOwnership === 'standalone') {
            // Проверяем EAS Build каналы
            if (Constants.expoConfig?.updates?.channel) {
                const channel = Constants.expoConfig.updates.channel;
                if (channel === 'production') {
                    return 'production';
                } else if (channel === 'preview') {
                    return 'preview';
                }
            }
            return 'production'; // По умолчанию для standalone
        }

        // Проверяем переменную окружения
        if (process.env.EXPO_PUBLIC_BUILD_TYPE) {
            return process.env.EXPO_PUBLIC_BUILD_TYPE;
        }

        // Fallback
        return 'development';
    }

    // Проверяем, нужно ли использовать Firebase
    shouldUseFCM() {
        const buildType = this.getBuildType();
        const useFirebase = buildType === 'production' || buildType === 'preview';
        console.log('Should use FCM:', useFirebase, 'for build type:', buildType);
        return useFirebase;
    }

    async initialize() {
        // ИСПРАВЛЕНО: Позволяем повторную инициализацию для обновления токенов
        if (this.isInitialized) {
            console.log('PushNotificationService already initialized, checking token...');
            
            if (!this.currentToken) {
                console.log('No token found, re-initializing...');
                this.isInitialized = false;
            } else {
                console.log('Token exists, but checking if it needs refresh...');
                try {
                    const freshToken = await this.registerForPushNotifications();
                    if (freshToken && freshToken !== this.currentToken) {
                        console.log('Fresh token obtained, updating...');
                        this.currentToken = freshToken;
                    }
                } catch (error) {
                    console.log('Could not refresh token:', error.message);
                }
                return true;
            }
        }
        
        try {
            console.log('Initializing PushNotificationService...');
            console.log('Device info:', {
                isDevice: Device.isDevice,
                osName: Device.osName,
                osVersion: Device.osVersion
            });

            if (!Device.isDevice) {
                console.log('Push notifications only work on physical devices');
                return false;
            }

            const buildType = this.getBuildType();
            console.log('Build type:', buildType);
            console.log('Should use FCM:', this.shouldUseFCM());
            console.log('Firebase available:', !!(firebase && messaging));

            // Настраиваем обработчик уведомлений
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: false,
                }),
            });

            // Настраиваем каналы уведомлений для Android
            if (Platform.OS === 'android') {
                await this.setupNotificationChannels();
            }

            if (this.shouldUseFCM() && messaging) {
                const firebaseInit = await this.initializeFirebase();
                console.log('Firebase initialization result:', firebaseInit);
            }

            const token = await this.registerForPushNotifications();
            console.log('Token registration result:', !!token);

            this.setupNotificationListeners();

            this.isInitialized = true;
            console.log('PushNotificationService initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize PushNotificationService:', error);
            return false;
        }
    }

    // НОВЫЙ МЕТОД: Запрос разрешений на уведомления
    async requestPermissions() {
        try {
            console.log('Requesting notification permissions...');

            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            console.log('Current permission status:', existingStatus);

            let finalStatus = existingStatus;
            
            if (existingStatus !== 'granted') {
                console.log('Requesting new permissions...');
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
                console.log('New permission status:', finalStatus);
            }
            
            if (finalStatus !== 'granted') {
                console.log('Notification permissions not granted:', finalStatus);
                return { granted: false, status: finalStatus };
            }
            
            console.log('Notification permissions granted');
            return { granted: true, status: finalStatus };
            
        } catch (error) {
            console.error('Error requesting permissions:', error);
            return { granted: false, error: error.message };
        }
    }

    // НОВЫЙ МЕТОД: Инициализация для конкретного пользователя
    async initializeForUser(user) {
        try {
            console.log('Initializing push notifications for user:', user.id, 'role:', user.role);

            const baseInitResult = await this.initialize();
            if (!baseInitResult) {
                console.log('Base initialization failed');
                return false;
            }

            this.currentUser = user;
            console.log('User context saved for push notifications');

            if (this.currentToken) {
                console.log('Registering token on server for user:', user.id);

                const buildType = this.getBuildType();
                console.log('Build type for token registration:', buildType);

                if (buildType !== 'expo-go') {
                    console.log('Saving token to server for authenticated user...');
                    const saved = await this.saveTokenToServerSafe(this.currentToken, this._deviceId, Platform.OS);
                    console.log('Token registration result:', saved);

                    if (saved) {
                        console.log('Token successfully registered on server for user:', user.id);
                    } else {
                        console.log('Failed to register token on server for user:', user.id);
                    }
                } else {
                    console.log('Skipping server registration for Expo Go build');
                }
            } else {
                console.log('No token available for server registration');
            }

            return true;
        } catch (error) {
            console.error('Failed to initialize push notifications for user:', error);
            return false;
        }
    }

    // НОВЫЙ МЕТОД: Очистка при выходе пользователя
    clearUserContext() {
        console.log('Clearing user context for push notifications');
        this.currentUser = null;
    }

    async initializeFirebase() {
        try {
            if (!firebase || !messaging) {
                console.log('Firebase not available');
            return false;
        }

            console.log('Initializing Firebase...');

            if (!firebase.apps.length) {
                console.log('Firebase app not initialized automatically');
                return false;
            }

            const app = firebase.app();
            console.log('Firebase app found:', app.name);
            console.log('Firebase project:', app.options.projectId);

            if (Platform.OS === 'ios') {
                const authStatus = await messaging().requestPermission();
                const enabled =
                    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

                if (!enabled) {
                    console.log('Firebase messaging permission denied');
                    return false;
                }
                console.log('iOS Firebase messaging permission granted');
            }

            console.log('Firebase initialized successfully');
                    return true;

        } catch (error) {
            console.error('Firebase initialization error:', error);
            return false;
        }
    }

    async setupNotificationChannels() {
        try {
            console.log('Setting up notification channels for Android...');

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
                console.log(`Channel created: ${channel.id}`);
            }

            console.log('All notification channels created');
        } catch (error) {
            console.error('Error creating notification channels:', error);
        }
    }

    async registerForPushNotifications() {
        try {
            console.log('Registering for push notifications...');

            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            console.log('Existing permission status:', existingStatus);

            if (existingStatus !== 'granted') {
                console.log('Requesting permissions...');
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
                console.log('New permission status:', status);
            }

            if (finalStatus !== 'granted') {
                console.log('Permission for push notifications denied');
                return null;
            }

            console.log('Push notification permissions granted');

            let token;
            const buildType = this.getBuildType();

            if (this.shouldUseFCM() && messaging) {
                console.log('Getting FCM token...');
                token = await this.getFCMToken();
                console.log('FCM token result:', !!token);
            } else {
                console.log('Getting Expo push token...');
                token = await this.getExpoPushToken();
                console.log('Expo token result:', !!token);
            }

            if (token) {
                this.currentToken = token;
                await this.saveDeviceTokenLocally(token);

                console.log('Token saved locally');

                if (buildType !== 'expo-go') {
                    console.log('Saving token to server...');
                    const saved = await this.saveTokenToServerSafe(token, this._deviceId, Platform.OS);
                    console.log('Server save result:', saved);
                } else {
                    console.log('Skipping server save for Expo Go');
                }

                console.log('Push token registered:', token.substring(0, 30) + '...');
        return token;
    }

            console.log('No token received');
            return null;

        } catch (error) {
            console.error('Error registering for push notifications:', error);
            return null;
        }
    }

    async getFCMToken() {
        try {
            if (!messaging) {
                throw new Error('Firebase messaging not available');
            }


            // Для Android дополнительно запрашиваем разрешения
            if (Platform.OS === 'android') {
                await messaging().requestPermission();
            }

            const fcmToken = await messaging().getToken();

            if (!fcmToken) {
                throw new Error('FCM token is empty');
            }

            return fcmToken;

        } catch (error) {
            console.error('❌ Error getting FCM token:', error);
            // Fallback to Expo token
            return await this.getExpoPushToken();
        }
    }

    async getExpoPushToken() {
        try {
      
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: this.projectId,
            });

            const token = tokenData.data;
            return token;

        } catch (error) {
            console.error('❌ Error getting Expo push token:', error);
            throw error;
        }
    }

    async saveDeviceTokenLocally(token) {
        try {
            await AsyncStorage.setItem('expoPushToken', token);
            await AsyncStorage.setItem('pushTokenTimestamp', Date.now().toString());
        } catch (error) {
            console.error('❌ Error saving token locally:', error);
        }
    }

    async saveTokenToServerSafe(token, deviceId, platform) {
        try {
   
            // Динамический импорт API
            const { pushTokenApi } = await import('@entities/notification/api/pushTokenApi');

            const result = await pushTokenApi.savePushToken({
                token,
                deviceId,
                platform
            });


            if (result.status === 'success') {
                return true;
            } else {
                console.log('⚠️ Server returned non-success status:', result.message);
                return false;
            }

        } catch (error) {
            console.error('❌ Error saving token to server:', error);
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

            // Firebase listeners для production
            if (this.shouldUseFCM() && messaging) {
                this.setupFirebaseListeners();
            }


        } catch (error) {
            console.error('❌ Error setting up listeners:', error);
        }
    }

    setupFirebaseListeners() {
        try {

            // Обработка уведомлений в foreground
            this.firebaseUnsubscribe = messaging().onMessage(async remoteMessage => {

                // Показываем локальное уведомление
                await this.showLocalNotification({
                    title: remoteMessage.notification?.title || 'Уведомление',
                    body: remoteMessage.notification?.body || '',
                    data: remoteMessage.data || {}
                });
            });

            // Обработка уведомлений в background
            messaging().setBackgroundMessageHandler(async remoteMessage => {
                return Promise.resolve();
            });


        } catch (error) {
            console.error('❌ Error setting up Firebase listeners:', error);
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
            console.error('❌ Error showing local notification:', error);
            return null;
        }
    }

    // Методы навигации (будут определены извне)
    navigateToStop(data) {
        
        if (this.navigateToStopsFunc && typeof this.navigateToStopsFunc === 'function') {
            this.navigateToStopsFunc(data);
        } else {
            console.warn('⚠️ navigateToStops function not available');
        }
    }

    navigateToOrder(data) {
        
        if (this.navigateToOrderFunc && typeof this.navigateToOrderFunc === 'function') {
            this.navigateToOrderFunc(data);
        } else {
            console.warn('⚠️ navigateToOrder function not available');
        }
    }

    navigateToProduct(data) {
        console.log('🛍️ Navigate to product:', data);
        // Реализация навигации к продукту
    }

    navigateToUrl(url) {
        console.log('🔗 Navigate to URL:', url);
        // Реализация навигации по URL
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

    setNavigationFunctions(navigateToStops, navigateToOrder) {

        this.navigateToStopsFunc = navigateToStops;
        this.navigateToOrderFunc = navigateToOrder;
        
        this.setNavigationReady();
        
        console.log('✅ Navigation functions set successfully');
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
            firebaseAvailable: !!(firebase && messaging),
            projectIds: {
                expo: this.projectId,
                firebase: this.firebaseProjectId
            }
        };
    }

    async clearAllNotifications() {
        try {
            await Notifications.dismissAllNotificationsAsync();
            } catch (error) {
            console.error('❌ Error clearing notifications:', error);
        }
    }

    setBadgeCount(count) {
        try {
            if (Platform.OS === 'ios') {
                Notifications.setBadgeCountAsync(count);
            }
        } catch (error) {
            console.error('❌ Error setting badge count:', error);
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

            if (this.firebaseUnsubscribe) {
                this.firebaseUnsubscribe();
                this.firebaseUnsubscribe = null;
            }

        } catch (error) {
            console.error('❌ Error clearing listeners:', error);
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

            if (result) {
                console.log('✅ Token refreshed on server successfully');
            } else {
                console.log('❌ Failed to refresh token on server');
            }

            return result;
        } catch (error) {
            console.error('❌ Error refreshing token on server:', error);
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

            console.log('Chat message notification sent successfully');
        } catch (error) {
            console.error('Error sending chat message notification:', error);
        }
    }
}

const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
export { pushNotificationService as PushNotificationService };