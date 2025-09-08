import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateTokensStatus } from '@shared/api/api';

/**
 * Утилита для отладки проблем с токенами
 * Помогает диагностировать проблемы с аутентификацией в Socket.IO
 */
export class TokenDebugger {
    static async runFullDiagnostic() {
        console.log('🔍 === TOKEN DEBUGGER ===');
        console.log('🔍 Starting full token diagnostic...');

        try {
            // 1. Проверяем AsyncStorage
            console.log('\n1️⃣ Проверка AsyncStorage:');
            const rawTokens = await AsyncStorage.getItem('tokens');
            console.log('Raw tokens from AsyncStorage:', {
                exists: !!rawTokens,
                length: rawTokens?.length || 0,
                preview: rawTokens ? `${rawTokens.substring(0, 50)}...` : 'null'
            });

            // 2. Парсим токены
            console.log('\n2️⃣ Парсинг токенов:');
            let parsedTokens = null;
            if (rawTokens) {
                try {
                    parsedTokens = JSON.parse(rawTokens);
                    console.log('Parsed tokens:', {
                        hasTokens: !!parsedTokens,
                        hasAccessToken: !!parsedTokens.accessToken,
                        hasRefreshToken: !!parsedTokens.refreshToken,
                        accessTokenLength: parsedTokens.accessToken?.length || 0,
                        refreshTokenLength: parsedTokens.refreshToken?.length || 0
                    });
                } catch (parseError) {
                    console.error('❌ Ошибка парсинга токенов:', parseError.message);
                }
            }

            // 3. Валидация токенов
            console.log('\n3️⃣ Валидация токенов:');
            const validationResult = await validateTokensStatus();

            // 4. Декодирование токенов
            console.log('\n4️⃣ Декодирование токенов:');
            if (parsedTokens?.accessToken) {
                try {
                    const payload = JSON.parse(atob(parsedTokens.accessToken.split('.')[1]));
                    const currentTime = Math.floor(Date.now() / 1000);
                    const isValid = payload.exp > currentTime;

                    console.log('Access token details:', {
                        userId: payload.userId,
                        role: payload.role,
                        exp: payload.exp,
                        iat: payload.iat,
                        currentTime,
                        isValid,
                        timeToExpiry: payload.exp - currentTime,
                        expiryDate: new Date(payload.exp * 1000).toISOString()
                    });
                } catch (decodeError) {
                    console.error('❌ Ошибка декодирования access token:', decodeError.message);
                }
            }

            if (parsedTokens?.refreshToken) {
                try {
                    const payload = JSON.parse(atob(parsedTokens.refreshToken.split('.')[1]));
                    const currentTime = Math.floor(Date.now() / 1000);
                    const isValid = payload.exp > currentTime;

                    console.log('Refresh token details:', {
                        userId: payload.userId,
                        exp: payload.exp,
                        currentTime,
                        isValid,
                        timeToExpiry: payload.exp - currentTime,
                        expiryDate: new Date(payload.exp * 1000).toISOString()
                    });
                } catch (decodeError) {
                    console.error('❌ Ошибка декодирования refresh token:', decodeError.message);
                }
            }

            // 5. Проверка Socket.IO готовности
            console.log('\n5️⃣ Socket.IO готовность:');
            console.log('Token for Socket.IO:', {
                hasToken: !!parsedTokens?.accessToken,
                tokenLength: parsedTokens?.accessToken?.length || 0,
                tokenPrefix: parsedTokens?.accessToken ? `${parsedTokens.accessToken.substring(0, 20)}...` : 'no token'
            });

            // 6. Итоговый отчет
            console.log('\n📊 === ИТОГОВЫЙ ОТЧЕТ ===');
            const issues = [];

            if (!rawTokens) {
                issues.push('❌ Токены не найдены в AsyncStorage');
            } else if (!parsedTokens) {
                issues.push('❌ Ошибка парсинга токенов из AsyncStorage');
            } else if (!parsedTokens.accessToken) {
                issues.push('❌ Отсутствует access token');
            } else if (!parsedTokens.refreshToken) {
                issues.push('❌ Отсутствует refresh token');
            }

            if (validationResult.status === 'error') {
                issues.push('❌ Ошибка валидации токенов');
            } else if (!validationResult.accessTokenValid) {
                issues.push('❌ Access token истек или недействителен');
            }

            if (issues.length === 0) {
                console.log('✅ Все проверки пройдены успешно!');
                console.log('✅ Токены валидны и готовы для использования в Socket.IO');
            } else {
                console.log('❌ Найдены проблемы:');
                issues.forEach(issue => console.log('  ', issue));
            }

            return {
                success: issues.length === 0,
                issues,
                tokens: parsedTokens,
                validation: validationResult
            };

        } catch (error) {
            console.error('❌ Ошибка при выполнении диагностики:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async checkSocketAuth() {
        console.log('🔌 === SOCKET.IO AUTH CHECK ===');

        try {
            const tokens = await AsyncStorage.getItem('tokens');
            const parsedTokens = tokens ? JSON.parse(tokens) : null;

            const authData = {
                token: parsedTokens?.accessToken || null
            };

            console.log('Socket.IO auth data:', {
                hasToken: !!authData.token,
                tokenLength: authData.token?.length || 0,
                tokenPrefix: authData.token ? `${authData.token.substring(0, 20)}...` : 'no token'
            });

            return authData;
        } catch (error) {
            console.error('❌ Ошибка при проверке Socket.IO auth:', error);
            return null;
        }
    }
}

// Глобальная функция для быстрого доступа из консоли React Native Debugger
if (typeof global !== 'undefined') {
    global.debugTokens = () => TokenDebugger.runFullDiagnostic();
    global.checkSocketAuth = () => TokenDebugger.checkSocketAuth();
    console.log('🔧 TokenDebugger доступен глобально:');
    console.log('  - debugTokens() - полная диагностика токенов');
    console.log('  - checkSocketAuth() - проверка Socket.IO auth');
}

// Экспортируем для использования в приложении
export default TokenDebugger;
