/**
 * Отладочный скрипт для проверки работы с push токенами
 * Используется для диагностики проблем с сохранением FCM токенов
 */

import PushNotificationService from './shared/services/PushNotificationService';
import { Platform } from 'react-native';

export const debugPushTokens = async () => {
    console.log('🔍 === Push Token Debug ===');

    try {
        // Проверяем тип сборки
        const buildType = PushNotificationService.getBuildType();
        console.log('📱 Build type:', buildType);

        // Проверяем, инициализирован ли сервис
        const isInitialized = PushNotificationService.isInitialized;
        console.log('🔧 Service initialized:', isInitialized);

        // Проверяем текущий токен
        const currentToken = PushNotificationService.getCurrentToken();
        console.log('🎫 Current token:', currentToken ? currentToken.substring(0, 50) + '...' : 'null');

        // Проверяем device ID
        const deviceId = PushNotificationService._deviceId;
        console.log('📋 Device ID:', deviceId);

        // Проверяем платформу
        console.log('📱 Platform:', Platform.OS);

        if (buildType === 'preview' || buildType === 'production') {
            console.log('✅ Build type поддерживает FCM, пытаемся получить токен...');

            try {
                const token = await PushNotificationService.getFCMToken();
                if (token) {
                    console.log('🎫 FCM token получен:', token.substring(0, 50) + '...');

                    // Проверяем тип токена
                    const tokenType = PushNotificationService.getTokenType(token);
                    console.log('🔍 Token type:', tokenType);

                    if (tokenType === 'fcm') {
                        console.log('✅ Токен валиден, пытаемся сохранить...');

                        const saved = await PushNotificationService.saveTokenToServerSafe(
                            token,
                            deviceId,
                            Platform.OS
                        );

                        console.log('💾 Save result:', saved);
                    } else {
                        console.warn('⚠️ Токен не является FCM токеном');
                    }
                } else {
                    console.warn('⚠️ FCM токен не получен');
                }
            } catch (tokenError) {
                console.error('❌ Ошибка при получении FCM токена:', tokenError);
            }
        } else {
            console.log('ℹ️ Build type не поддерживает FCM:', buildType);
        }

    } catch (error) {
        console.error('❌ Ошибка при отладке push токенов:', error);
    }

    console.log('🔍 === End Push Token Debug ===');
};

// Экспортируем функцию для использования в приложении
export default debugPushTokens;
