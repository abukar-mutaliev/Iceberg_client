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
    const [isConnected, setIsConnected] = useState(false);

    const connect = useCallback(async () => {
        if (!currentUser?.id) {
            console.log('🔌 Orders WebSocket: No currentUser, skipping connection');
            return;
        }

        try {
            const baseUrl = getBaseUrl();
            const socketUrl = baseUrl; // Подключаемся к корневому namespace
            
            console.log('🔌 Attempting to connect to Orders WebSocket:', {
                baseUrl,
                hasToken: !!currentUser?.token,
                tokenLength: currentUser?.token?.length || 0,
                tokenPrefix: currentUser?.token ? `${currentUser.token.substring(0, 20)}...` : 'no token',
                userId: currentUser.id
            });
            
            // ВСЕГДА получаем свежий токен из AsyncStorage для надежности
            let token = null;
            try {
                // Сначала пробуем получить из tokens объекта
                const tokensStr = await AsyncStorage.getItem('tokens');
                if (tokensStr) {
                    const tokens = JSON.parse(tokensStr);
                    token = tokens.accessToken;
                }
                
                // Если не нашли в tokens, пробуем прямой ключ
                if (!token) {
                    token = await AsyncStorage.getItem('token');
                }
                
                // В крайнем случае используем токен из currentUser
                if (!token && currentUser?.token) {
                    token = currentUser.token;
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

            socketRef.current.on('connect', () => {
                console.log('🔌 Orders WebSocket connected successfully');
                reconnectAttempts.current = 0;
                setIsConnected(true);
            });

            socketRef.current.on('disconnect', (reason) => {
                console.log('🔌 Orders WebSocket disconnected:', reason);
                setIsConnected(false);
                
                // Переподключение только для определенных причин
                const shouldReconnect = reason === 'io server disconnect' || 
                                      reason === 'io client disconnect' || 
                                      reason === 'ping timeout' || 
                                      reason === 'transport close' ||
                                      reason === 'transport error';
                
                if (shouldReconnect && reconnectAttempts.current < maxReconnectAttempts) {
                    const baseDelay = 1000;
                    const maxDelay = 10000;
                    const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts.current), maxDelay);
                    
                    console.log(`🔄 Scheduling reconnection in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttempts.current++;
                        connect();
                    }, delay);
                } else if (reconnectAttempts.current >= maxReconnectAttempts) {
                    console.log('❌ Max reconnection attempts reached, giving up');
                }
            });

            socketRef.current.on('connect_error', async (error) => {
                console.log('❌ Orders WebSocket connection error:', error);
                setIsConnected(false);
                
                // Если ошибка связана с JWT, пытаемся обновить токен и переподключиться
                if (error.message?.includes('jwt expired') || 
                    error.message?.includes('Token expired') || 
                    error.message?.includes('unauthorized')) {
                    
                    // ВАЖНО: Отключаем автоматическое переподключение для обновления токена
                    if (socketRef.current) {
                        socketRef.current.io.opts.reconnection = false;
                        socketRef.current.disconnect();
                    }
                    
                    try {
                        console.log('🔄 JWT expired, refreshing token...');
                        const { setAuthorizationHeader } = require('@shared/api/api');
                        const refreshResult = await setAuthorizationHeader(true); // force refresh
                        
                        if (refreshResult) {
                            console.log('✅ Token refreshed successfully');
                            // Получаем новый токен
                            const newTokensStr = await AsyncStorage.getItem('tokens');
                            const newTokens = newTokensStr ? JSON.parse(newTokensStr) : null;
                            if (newTokens?.accessToken) {
                                console.log('🔌 Creating new connection with fresh token...');
                                // Полностью очищаем старое соединение
                                if (socketRef.current) {
                                    socketRef.current.removeAllListeners();
                                    socketRef.current = null;
                                }
                                // Переподключаемся с новым токеном через короткую задержку
                                setTimeout(() => {
                                    connect().catch(err => {
                                        console.error('❌ Ошибка переподключения после обновления токена:', err);
                                    });
                                }, 500);
                            }
                        } else {
                            console.warn('⚠️ Could not refresh token for Orders WebSocket');
                        }
                    } catch (refreshError) {
                        console.error('❌ Error refreshing token for Orders WebSocket:', refreshError);
                    }
                }
                
                onError?.(error);
            });

            socketRef.current.on('order_update', (data) => {
                console.log('📨 Received order_update:', data);
                onMessage?.(data);
            });

            socketRef.current.on('orders_list_update', (data) => {
                console.log('📨 Received orders_list_update:', data);
                onMessage?.(data);
            });

        } catch (error) {
            onError?.(error);
        }
    }, [currentUser?.id, onMessage, onError]);

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
        disconnect();
        reconnectAttempts.current = 0;
        setTimeout(() => {
            connect().catch(error => {
                console.error('❌ Ошибка принудительного переподключения:', error);
            });
        }, 1000);
    }, [connect, disconnect]);

    // Обработка состояний приложения для стабильности соединения
    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
            console.log('📱 App state changed:', nextAppState, 'WebSocket connected:', isConnected);
            
            if (nextAppState === 'active') {
                // Проверяем, нужно ли переподключиться
                const needsReconnect = !socketRef.current || 
                                     !socketRef.current.connected || 
                                     !isConnected;
                
                if (needsReconnect) {
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
    }, [connect, isConnected]);

    useEffect(() => {
        if (currentUser?.id) {
            connect().catch(error => {
                console.error('❌ Ошибка подключения к WebSocket:', error);
                onError?.(error);
            });
        }

        return () => {
            disconnect();
        };
    }, [currentUser?.id, connect, disconnect, onError]);

    return {
        isConnected,
        sendMessage,
        disconnect,
        connect,
        forceReconnect
    };
};
