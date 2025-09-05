/**
 * FCM Token Service для Expo проекта
 * Использует Device Push Token из expo-notifications для получения FCM токенов в APK сборках
 * Не требует React Native Firebase библиотек - работает через нативный Firebase
 */

import { Platform } from 'react-native';
import * as Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

class FCMTokenService {
    constructor() {
        this.currentToken = null;
        this.isInitialized = false;
        this.messaging = null;
        console.log('🔥 FCMTokenService constructor');
    }

    // Определение типа сборки
    getBuildType() {
        console.log('🔍 FCM getBuildType:', {
            __DEV__,
            appOwnership: Constants.appOwnership,
            executionEnvironment: Constants.executionEnvironment,
            buildTypeEnv: process.env.EXPO_PUBLIC_BUILD_TYPE
        });

        // Проверяем переменную окружения
        if (process.env.EXPO_PUBLIC_BUILD_TYPE) {
            return process.env.EXPO_PUBLIC_BUILD_TYPE;
        }

        // Expo Go
        if (Constants.appOwnership === 'expo') {
            return 'expo-go';
        }

        // Standalone APK
        if (Constants.appOwnership === 'standalone' || Constants.executionEnvironment === 'standalone') {
            return 'production';
        }

        // Development
        if (__DEV__) {
            return 'development';
        }

        return 'preview';
    }

    // Проверка поддержки FCM
    shouldUseFCM() {
        const buildType = this.getBuildType();
        const supportsFCM = ['preview', 'production', 'standalone'].includes(buildType);
        
        console.log('🔍 FCM support check:', {
            buildType,
            supportsFCM
        });
        
        return supportsFCM;
    }

    // Инициализация уведомлений через Expo (без Firebase библиотек)
    async initializeNotifications() {
        try {
            if (!this.shouldUseFCM()) {
                console.log('🚫 FCM не поддерживается в текущей сборке');
                return false;
            }

            const buildType = this.getBuildType();
            console.log('🔔 Инициализация уведомлений для типа сборки:', buildType);
            
            if (buildType === 'development' || buildType === 'expo-go') {
                console.log('🚫 FCM недоступен в Expo Go');
                return false;
            }

            console.log('📱 Инициализация Expo Notifications...');

            // Проверяем разрешения
            const { status } = await Notifications.getPermissionsAsync();
            console.log('🔐 Текущий статус разрешений:', status);
            
            if (status !== 'granted') {
                console.log('🔐 Запрашиваем разрешения...');
                const { status: newStatus } = await Notifications.requestPermissionsAsync();
                console.log('🔐 Новый статус разрешений:', newStatus);
                
                if (newStatus !== 'granted') {
                    console.warn('⚠️ Permissions не предоставлены');
                    return false;
                }
            }

            console.log('✅ Expo Notifications инициализирован');
            this.isInitialized = true;
            return true;

        } catch (error) {
            console.error('❌ Ошибка инициализации уведомлений:', error);
            return false;
        }
    }

    // Получение FCM токена через Device Push Token (нативный Firebase в APK)
    async getFCMToken() {
        try {
            if (!this.shouldUseFCM()) {
                console.log('🚫 FCM не поддерживается');
                return null;
            }

            console.log('🎫 Получаем Device Push Token (это FCM токен в APK сборках)...');
            
            // В APK сборках Device Push Token возвращает FCM токен
            const deviceToken = await Notifications.getDevicePushTokenAsync();
            
            if (deviceToken?.data) {
                const token = deviceToken.data;
                console.log('✅ Device Push Token получен:', {
                    length: token.length,
                    prefix: token.substring(0, 30) + '...',
                    type: deviceToken.type
                });
                
                // Проверяем что это FCM токен
                const tokenType = this.getTokenType(token);
                console.log('🔍 Тип полученного токена:', tokenType);
                
                if (tokenType === 'fcm') {
                    console.log('✅ Получен валидный FCM токен');
                    this.currentToken = token;
                    return token;
                } else {
                    console.warn('⚠️ Device token не является FCM токеном:', tokenType);
                    console.log('ℹ️ Возможно нужна APK сборка для получения FCM токена');
                    return null;
                }
            } else {
                console.warn('⚠️ Device Push Token пустой');
                return null;
            }

        } catch (error) {
            console.error('❌ Ошибка получения FCM токена:', error);
            return null;
        }
    }

    // Проверка типа токена
    getTokenType(token) {
        if (!token || typeof token !== 'string') {
            return 'unknown';
        }

        if (token.startsWith('ExponentPushToken[')) {
            return 'unsupported';
        }

        if (token.length > 140 && token.includes(':')) {
            return 'fcm';
        }

        if (token.length > 100) {
            return 'fcm';
        }

        return 'unknown';
    }

    // Сохранение токена на сервер
    async saveTokenToServer(token, deviceId, platform) {
        try {
            console.log('💾 FCM saveTokenToServer:', {
                tokenPrefix: token ? token.substring(0, 30) + '...' : 'no token',
                deviceId,
                platform,
                tokenLength: token?.length || 0
            });

            if (!token) {
                console.error('❌ Token отсутствует');
                return false;
            }

            // Проверяем тип токена
            const tokenType = this.getTokenType(token);
            if (tokenType !== 'fcm') {
                console.log('🚫 Не FCM токен:', tokenType);
                return false;
            }

            // Импортируем API
            const { createProtectedRequest } = require('@shared/api/api');
            
            const tokenData = {
                token,
                deviceId: deviceId || Platform.OS + '_device',
                platform: platform || Platform.OS
            };

            console.log('📡 Отправляем FCM токен на сервер...');
            const response = await createProtectedRequest('post', '/api/push-tokens', tokenData);
            
            console.log('📡 Ответ сервера:', {
                status: response?.status,
                data: response?.data
            });

            if (response?.status === 200) {
                console.log('✅ FCM токен сохранен на сервере');
                return true;
            } else {
                console.error('❌ Ошибка сохранения FCM токена:', response?.data);
                return false;
            }

        } catch (error) {
            console.error('❌ Ошибка saveTokenToServer:', error);
            return false;
        }
    }

    // Основная функция инициализации (упрощенная без Firebase плагинов)
    async initialize() {
        try {
            console.log('🚀 FCMTokenService initialize (Expo Notifications)');

            const buildType = this.getBuildType();
            console.log('📱 Build type:', buildType);

            if (!this.shouldUseFCM()) {
                console.log('🚫 FCM не поддерживается в:', buildType);
                return false;
            }

            // Инициализируем уведомления
            const notificationsOk = await this.initializeNotifications();
            if (!notificationsOk) {
                console.error('❌ Уведомления инициализация не удалась');
                return false;
            }

            // Получаем FCM токен через Device Push Token
            const token = await this.getFCMToken();
            if (!token) {
                console.error('❌ FCM токен не получен');
                return false;
            }

            console.log('🎉 FCMTokenService инициализирован успешно (Device Push Token)');
            return true;

        } catch (error) {
            console.error('❌ FCMTokenService initialization error:', error);
            return false;
        }
    }

    // Получение текущего токена
    getCurrentToken() {
        return this.currentToken;
    }

    // Деактивация токена при выходе из системы
    async deactivateTokenOnLogout() {
        try {
            if (!this.currentToken) {
                console.log('🚫 Нет токена для деактивации');
                return true;
            }

            console.log('🔄 Деактивируем FCM токен при выходе:', this.currentToken.substring(0, 30) + '...');

            // Импортируем API
            const { createProtectedRequest } = require('@shared/api/api');
            
            const response = await createProtectedRequest('put', '/api/push-tokens/deactivate', {
                token: this.currentToken,
                deviceId: Platform.OS + '_device',
                platform: Platform.OS
            });

            console.log('📡 Ответ сервера на деактивацию:', {
                status: response?.status,
                data: response?.data
            });

            if (response?.status === 200) {
                console.log('✅ FCM токен деактивирован на сервере');
                
                // Очищаем локальный токен
                this.currentToken = null;
                this.isInitialized = false;
                
                // Очищаем обработчики
                this.clearNotificationHandlers();
                
                return true;
            } else {
                console.warn('⚠️ Не удалось деактивировать FCM токен на сервере');
                return false;
            }

        } catch (error) {
            console.error('❌ Ошибка деактивации FCM токена:', error);
            return false;
        }
    }

    // Очистка обработчиков уведомлений
    clearNotificationHandlers() {
        try {
            if (this.responseListener) {
                this.responseListener.remove();
                this.responseListener = null;
            }
            
            if (this.notificationListener) {
                this.notificationListener.remove();
                this.notificationListener = null;
            }
            
            console.log('🧹 FCM обработчики уведомлений очищены');
        } catch (error) {
            console.error('❌ Ошибка очистки обработчиков FCM:', error);
        }
    }

    // Инициализация для пользователя
    async initializeForUser(user) {
        try {
            console.log('👤 FCM инициализация для пользователя:', user.id);

            const initialized = await this.initialize();
            if (!initialized) {
                console.log('❌ FCM инициализация не удалась');
                return false;
            }

            // Настраиваем обработчики уведомлений
            this.setupNotificationHandlers();

            // Сохраняем токен на сервер
            if (this.currentToken) {
                console.log('💾 Сохраняем FCM токен на сервер...');
                const saved = await this.saveTokenToServer(
                    this.currentToken,
                    Platform.OS + '_' + Date.now(),
                    Platform.OS
                );

                if (saved) {
                    console.log('🎉 FCM токен сохранен для пользователя:', user.id);
                } else {
                    console.error('❌ Не удалось сохранить FCM токен');
                }
            }

            return true;

        } catch (error) {
            console.error('❌ FCM initializeForUser error:', error);
            return false;
        }
    }

    // Настройка обработчиков уведомлений
    setupNotificationHandlers() {
        try {
            console.log('🔔 Настройка обработчиков FCM уведомлений...');

            // Обработчик нажатий на уведомления
            this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
                console.log('📱 FCM Notification response received:', response);
                
                const data = response.notification.request.content.data;
                if (data) {
                    console.log('💬 FCM Notification data:', data);
                    this.handleNotificationNavigation(data);
                }
            });

            // Обработчик получения уведомлений в foreground
            this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
                console.log('📨 FCM Notification received in foreground:', notification);
            });

            console.log('✅ FCM обработчики уведомлений настроены');

        } catch (error) {
            console.error('❌ Ошибка настройки обработчиков FCM:', error);
        }
    }

    // Обработка навигации из уведомлений
    handleNotificationNavigation(data) {
        console.log('🧭 FCM handleNotificationNavigation:', data);

        if (data.type === 'CHAT_MESSAGE' && data.roomId) {
            console.log('💬 Навигация к чату:', data.roomId);
            // Здесь будет вызвана навигация к чату через AppNavigator
        } else if (data.url && data.url.includes('chat')) {
            console.log('🔗 Навигация к чату через URL:', data.url);
            // Парсим URL для получения roomId
            const match = data.url.match(/chat\/(\d+)/);
            if (match) {
                const roomId = match[1];
                console.log('💬 Извлечен roomId из URL:', roomId);
            }
        }
    }
}

// Экспортируем синглтон
const fcmTokenService = new FCMTokenService();
export default fcmTokenService;
