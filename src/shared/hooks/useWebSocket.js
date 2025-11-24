import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { getBaseUrl } from '@shared/api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import io from 'socket.io-client';

export const useWebSocket = (onMessage, onError) => {
    const { currentUser } = useAuth();
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const isConnectingRef = useRef(false); // Флаг для предотвращения множественных подключений
    const [isConnected, setIsConnected] = useState(false);
    
    // Сохраняем callback'и в ref чтобы не пересоздавать connect
    const onMessageRef = useRef(onMessage);
    const onErrorRef = useRef(onError);
    
    useEffect(() => {
        onMessageRef.current = onMessage;
        onErrorRef.current = onError;
    }, [onMessage, onError]);

    const connect = useCallback(async () => {
        if (!currentUser?.id) {
            console.log('🔌 Orders WebSocket: No currentUser, skipping connection');
            return;
        }

        // Предотвращаем множественные одновременные попытки подключения
        if (isConnectingRef.current) {
            console.log('🔌 Orders WebSocket: Already connecting, skipping...');
            return;
        }

        // Если уже подключены, не переподключаемся
        if (socketRef.current?.connected) {
            console.log('🔌 Orders WebSocket: Already connected');
            return;
        }

        isConnectingRef.current = true;

        try {
            const baseUrl = getBaseUrl();
            // Socket.IO автоматически добавляет /socket.io/ к URL, поэтому используем HTTP URL
            const socketUrl = baseUrl;
            
            console.log('🔌 Attempting to connect to Orders WebSocket:', {
                baseUrl,
                hasToken: !!currentUser?.token,
                tokenLength: currentUser?.token?.length || 0,
                tokenPrefix: currentUser?.token ? `${currentUser.token.substring(0, 20)}...` : 'no token',
                userId: currentUser.id
            });
            
            // ВСЕГДА получаем свежий токен из AsyncStorage для надежности
            let token = null;
            let refreshToken = null;
            try {
                // Сначала пробуем получить из tokens объекта
                const tokensStr = await AsyncStorage.getItem('tokens');
                if (tokensStr) {
                    const tokens = JSON.parse(tokensStr);
                    token = tokens.accessToken;
                    refreshToken = tokens.refreshToken;
                }
                
                // Если не нашли в tokens, пробуем прямой ключ
                if (!token) {
                    token = await AsyncStorage.getItem('token');
                }
                
                // В крайнем случае используем токен из currentUser
                if (!token && currentUser?.token) {
                    token = currentUser.token;
                }
                
                // Проверяем валидность токена и обновляем если истек
                if (token && refreshToken) {
                    const { authService } = await import('@shared/api/api');
                    const isAccessTokenValid = authService.isTokenValid(token);
                    
                    if (!isAccessTokenValid) {
                        console.log('🔄 Orders WebSocket: Access token expired, refreshing...');
                        try {
                            const refreshed = await authService.refreshAccessToken();
                            if (refreshed?.accessToken) {
                                token = refreshed.accessToken;
                                console.log('✅ Orders WebSocket: Token refreshed successfully');
                            } else {
                                console.error('❌ Orders WebSocket: Failed to refresh token');
                                isConnectingRef.current = false;
                                return;
                            }
                        } catch (refreshError) {
                            console.error('❌ Orders WebSocket: Error refreshing token:', refreshError);
                            isConnectingRef.current = false;
                            return;
                        }
                    }
                }
                
                console.log('🔑 Orders WebSocket token retrieved:', {
                    hasToken: !!token,
                    tokenLength: token?.length || 0,
                    source: tokensStr ? 'AsyncStorage.tokens' : (token === currentUser?.token ? 'currentUser' : 'AsyncStorage.token')
                });
            } catch (error) {
                console.warn('⚠️ Не удалось получить токен из AsyncStorage:', error);
                // Fallback на currentUser токен
                token = currentUser?.token;
            }
            
            socketRef.current = io(socketUrl, {
                path: '/ws/orders', // Указываем правильный path
                auth: {
                    token: token
                },
                query: {
                    userId: currentUser.id
                },
                transports: ['websocket', 'polling'],
                timeout: 20000,
                forceNew: true,
                // Улучшенные настройки для стабильности
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                maxReconnectionAttempts: 10,
                randomizationFactor: 0.5,
                // Настройки для работы в фоне
                upgrade: true,
                rememberUpgrade: true,
                // Heartbeat для поддержания соединения
                pingTimeout: 60000,
                pingInterval: 25000
            });

            // Обработчик попытки переподключения - обновляем токен перед каждой попыткой
            socketRef.current.io.on('reconnect_attempt', async (attempt) => {
                console.log(`🔄 Orders WebSocket reconnection attempt #${attempt} - refreshing token...`);
                try {
                    const currentTokensStr = await AsyncStorage.getItem('tokens');
                    const currentTokens = currentTokensStr ? JSON.parse(currentTokensStr) : null;
                    
                    if (currentTokens?.accessToken && currentTokens?.refreshToken) {
                        const { authService } = await import('@shared/api/api');
                        const isAccessTokenValid = authService.isTokenValid(currentTokens.accessToken);
                        
                        if (!isAccessTokenValid) {
                            console.log('🔄 Orders WebSocket: Access token expired on reconnect, refreshing...');
                            const refreshed = await authService.refreshAccessToken();
                            if (refreshed?.accessToken && socketRef.current) {
                                socketRef.current.auth = { token: refreshed.accessToken };
                                console.log('✅ Orders WebSocket: Token refreshed for reconnection attempt');
                            }
                        }
                    }
                } catch (err) {
                    console.error('❌ Orders WebSocket: Error refreshing token on reconnect:', err.message);
                }
            });

            socketRef.current.on('connect', () => {
                console.log('🔌 Orders WebSocket connected successfully');
                reconnectAttempts.current = 0;
                isConnectingRef.current = false; // Сбрасываем флаг подключения
                setIsConnected(true);
            });

            socketRef.current.on('disconnect', (reason) => {
                console.log('🔌 Orders WebSocket disconnected:', reason);
                setIsConnected(false);
                isConnectingRef.current = false; // Сбрасываем флаг при отключении
                
                // Переподключение только для определенных причин
                const shouldReconnect = reason === 'io server disconnect' || 
                                      reason === 'ping timeout' || 
                                      reason === 'transport close';
                
                // НЕ переподключаемся при transport error - это обычно означает проблему с сервером
                const shouldNotReconnect = reason === 'transport error' || 
                                          reason === 'io client disconnect';
                
                if (shouldNotReconnect) {
                    console.log('⚠️ Not reconnecting due to:', reason);
                    return;
                }
                
                if (shouldReconnect && reconnectAttempts.current < maxReconnectAttempts) {
                    // Увеличиваем счетчик ДО переподключения
                    reconnectAttempts.current++;
                    
                    const baseDelay = 1000;
                    const maxDelay = 10000;
                    const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts.current - 1), maxDelay);
                    
                    console.log(`🔄 Scheduling reconnection in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, delay);
                } else if (reconnectAttempts.current >= maxReconnectAttempts) {
                    console.log('❌ Max reconnection attempts reached, giving up');
                }
            });

            socketRef.current.on('connect_error', async (error) => {
                console.log('❌ Orders WebSocket connection error:', error);
                setIsConnected(false);
                isConnectingRef.current = false; // Сбрасываем флаг при ошибке
                
                // Если ошибка связана с JWT, пытаемся обновить токен и переподключиться
                if (error.message?.includes('jwt expired') || 
                    error.message?.includes('Token expired') || 
                    error.message?.includes('jwt invalid') ||
                    error.message?.includes('unauthorized')) {
                    
                    // ВАЖНО: Отключаем автоматическое переподключение для обновления токена
                    if (socketRef.current) {
                        socketRef.current.io.opts.reconnection = false;
                        socketRef.current.disconnect();
                    }
                    
                    try {
                        console.log('🔄 Orders WebSocket: JWT error, refreshing token...');
                        
                        // Проверяем refresh token
                        const currentTokensStr = await AsyncStorage.getItem('tokens');
                        const currentTokens = currentTokensStr ? JSON.parse(currentTokensStr) : null;
                        
                        if (!currentTokens?.refreshToken) {
                            console.error('❌ Orders WebSocket: No refresh token available');
                            return;
                        }
                        
                        const { authService } = await import('@shared/api/api');
                        const isRefreshTokenValid = authService.isTokenValid(currentTokens.refreshToken);
                        
                        if (!isRefreshTokenValid) {
                            console.error('❌ Orders WebSocket: Refresh token expired');
                            return;
                        }
                        
                        const refreshed = await authService.refreshAccessToken();
                        
                        if (refreshed?.accessToken) {
                            console.log('✅ Orders WebSocket: Token refreshed successfully');
                            // Полностью очищаем старое соединение
                            if (socketRef.current) {
                                socketRef.current.removeAllListeners();
                                socketRef.current = null;
                            }
                            // Сбрасываем счетчик попыток
                            reconnectAttempts.current = 0;
                            // Переподключаемся с новым токеном через короткую задержку
                            console.log('🔌 Orders WebSocket: Creating new connection with fresh token...');
                            setTimeout(() => {
                                connect().catch(err => {
                                    console.error('❌ Orders WebSocket: Reconnection error:', err);
                                });
                            }, 1000);
                        } else {
                            console.warn('⚠️ Orders WebSocket: Could not refresh token');
                        }
                    } catch (refreshError) {
                        console.error('❌ Orders WebSocket: Error refreshing token:', refreshError);
                    }
                }
                
                onErrorRef.current?.(error);
            });

            socketRef.current.on('order_update', (data) => {
                console.log('📨 Received order_update:', data);
                onMessageRef.current?.(data);
            });

            socketRef.current.on('orders_list_update', (data) => {
                console.log('📨 Received orders_list_update:', data);
                onMessageRef.current?.(data);
            });

        } catch (error) {
            isConnectingRef.current = false; // Сбрасываем флаг при ошибке
            onErrorRef.current?.(error);
        }
    }, [currentUser?.id]); // Убираем onMessage и onError из зависимостей

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        
        reconnectAttempts.current = 0;
        isConnectingRef.current = false; // Сбрасываем флаг подключения
        setIsConnected(false);
    }, []);

    const sendMessage = useCallback((message) => {
        if (socketRef.current?.connected) {
            console.log('📤 Sending WebSocket message:', message);
            socketRef.current.emit('subscribe_orders', message);
            return true;
        }
        console.warn('⚠️ WebSocket not connected, cannot send message');
        return false;
    }, []);

    const forceReconnect = useCallback(() => {
        console.log('🔄 Force reconnecting WebSocket...');
        
        // Останавливаем текущие попытки переподключения
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        
        // Отключаем текущее соединение
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        
        // Сбрасываем состояние
        reconnectAttempts.current = 0;
        isConnectingRef.current = false;
        setIsConnected(false);
        
        // Переподключаемся через задержку
        setTimeout(() => {
            connect().catch(error => {
                console.error('❌ Ошибка принудительного переподключения:', error);
            });
        }, 1000);
    }, []); // Убираем зависимости

    // Обработка состояний приложения для стабильности соединения
    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
            console.log('📱 App state changed:', nextAppState, 'WebSocket connected:', socketRef.current?.connected);
            
            if (nextAppState === 'active') {
                // Проверяем, нужно ли переподключиться
                const needsReconnect = !socketRef.current || 
                                     !socketRef.current.connected;
                
                if (needsReconnect && currentUser?.id) {
                    console.log('🔄 App became active, reconnecting WebSocket...');
                    // Сбрасываем счетчик попыток переподключения
                    reconnectAttempts.current = 0;
                    connect().catch(error => {
                        console.error('❌ Ошибка переподключения к WebSocket:', error);
                    });
                } else {
                    console.log('✅ WebSocket already connected, no need to reconnect');
                }
            } else if (nextAppState === 'background') {
                console.log('📱 App went to background - WebSocket will try to stay alive');
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription?.remove();
        };
    }, [currentUser?.id]); // Убираем connect и isConnected из зависимостей

    useEffect(() => {
        if (currentUser?.id) {
            connect().catch(error => {
                console.error('❌ Ошибка подключения к WebSocket:', error);
                onErrorRef.current?.(error);
            });
        }

        return () => {
            disconnect();
        };
    }, [currentUser?.id]); // Убираем connect, disconnect и onError из зависимостей

    return {
        isConnected,
        sendMessage,
        disconnect,
        connect,
        forceReconnect
    };
};
