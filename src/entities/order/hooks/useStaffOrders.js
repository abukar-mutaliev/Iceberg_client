import { useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    fetchStaffOrders,
    clearAllLocalOrderActions
} from '@entities/order/model/slice';
import {
    selectStaffOrders,
    selectStaffOrdersLoading
} from '@entities/order/model/selectors';
import { loadUserProfile } from '@entities/auth/model/slice';
import { CONSTANTS } from '@entities/order/lib/constants';

// Cache utilities
const saveCacheData = async (data) => {
    try {
        const cacheData = {
            timestamp: Date.now(),
            data
        };
        await AsyncStorage.setItem(CONSTANTS.CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error saving orders cache:', error);
    }
};

const loadCacheData = async () => {
    try {
        const cacheStr = await AsyncStorage.getItem(CONSTANTS.CACHE_KEY);
        if (cacheStr) {
            const cache = JSON.parse(cacheStr);
            const now = Date.now();
            
            if (now - cache.timestamp < CONSTANTS.CACHE_EXPIRY) {
                return cache.data;
            } else {
                await AsyncStorage.removeItem(CONSTANTS.CACHE_KEY);
            }
        }
        return null;
    } catch (error) {
        console.error('Error loading orders cache:', error);
        return null;
    }
};

const clearCache = async () => {
    try {
        await AsyncStorage.removeItem(CONSTANTS.CACHE_KEY);
    } catch (error) {
        console.error('Error clearing orders cache:', error);
    }
};

export const useStaffOrders = () => {
    const dispatch = useDispatch();
    const [refreshing, setRefreshing] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState(0);
    
    // Auto refresh
    const autoRefreshRef = useRef(null);
    const isMountedRef = useRef(true);
    const initialLoadRef = useRef(false);
    const loadingInProgressRef = useRef(false); // Защита от множественных параллельных загрузок
    
    const staffOrders = useSelector(selectStaffOrders);
    const isLoading = useSelector(selectStaffOrdersLoading);
    
    const loadInitialData = useCallback(async (forceRefresh = false) => {
        // Защита от множественных одновременных вызовов
        if (loadingInProgressRef.current) {
            if (!forceRefresh) {
                console.log('⚠️ loadInitialData уже выполняется, пропускаем');
                return;
            }
            // Даже для forceRefresh ждем завершения предыдущей загрузки
            console.log('⚠️ loadInitialData уже выполняется, ждем завершения...');
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (!loadingInProgressRef.current) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }
        
        loadingInProgressRef.current = true;
        
        try {
            // Try cache first on initial load
            if (!forceRefresh && !dataLoaded && !initialLoadRef.current) {
                const cachedData = await loadCacheData();
                if (cachedData) {
                    console.log('Using cached orders data');
                    setDataLoaded(true);
                    initialLoadRef.current = true;
                    setInitializing(false);
                    setLastFetchTime(cachedData.timestamp || Date.now());
                    return;
                }
            }

            // Parallel loading with force refresh
            const [profileResult, ordersResult] = await Promise.allSettled([
                dispatch(loadUserProfile({ forceRefresh })).unwrap(),
                dispatch(fetchStaffOrders({ forceRefresh })).unwrap()
            ]);
            
            if (profileResult.status === 'rejected') {
                console.error('Profile update error:', profileResult.reason);
            }
            
            if (ordersResult.status === 'rejected') {
                console.error('Orders loading error:', ordersResult.reason);
                throw ordersResult.reason;
            }

            // НЕ очищаем локальные действия при обновлении - они должны сохраняться
            // чтобы UI корректно отображал состояние после действий сотрудника
            // dispatch(clearAllLocalOrderActions());

            // Save to cache
            const currentTime = Date.now();
            setLastFetchTime(currentTime);
            setDataLoaded(true);
            initialLoadRef.current = true;

            const cacheData = {
                timestamp: currentTime,
                profile: profileResult.value,
                orders: ordersResult.value
            };
            await saveCacheData(cacheData);

        } catch (error) {
            console.error('Data loading error:', error);
            Alert.alert('Error', 'Failed to load data. Check your internet connection.');
        } finally {
            setInitializing(false);
            loadingInProgressRef.current = false; // Освобождаем блокировку
        }
    }, [dispatch, dataLoaded]);
    
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await clearCache();
            await loadInitialData(true);
        } catch (error) {
            console.error('Refresh error:', error.message);
        } finally {
            setRefreshing(false);
        }
    }, [loadInitialData]);
    
    // Auto refresh setup - DISABLED because WebSocket provides real-time updates
    useEffect(() => {
        isMountedRef.current = true;
        
        // Auto refresh disabled - WebSocket handles real-time updates
        // autoRefreshRef.current = setInterval(() => {
        //     if (!isMountedRef.current) return;
        //     dispatch(fetchStaffOrders({ forceRefresh: true })).catch(() => {});
        // }, CONSTANTS.AUTO_REFRESH_INTERVAL);

        return () => {
            isMountedRef.current = false;
            if (autoRefreshRef.current) {
                clearInterval(autoRefreshRef.current);
            }
        };
    }, [dispatch]);
    
    // Подгрузка следующей страницы
    const [loadingMore, setLoadingMore] = useState(false);
    const autoLoadingRef = useRef(false);
    
    const loadMore = useCallback(async () => {
        // loadMore работает только с активными заказами
        const state = dispatch((_, getState) => getState());
        const activeOrdersState = state.order?.staffOrders?.activeOrders;
        
        if (!activeOrdersState || loadingMore || isLoading) {
            return;
        }
        
        const currentPage = activeOrdersState.page || 1;
        const totalPages = activeOrdersState.pages || 1;
        const hasMore = activeOrdersState.hasMore !== false && currentPage < totalPages;
        
        // Логирование отключено для производительности
        // console.log('📄 loadMore: проверка пагинации', {
        //     currentPage,
        //     totalPages,
        //     hasMore
        // });
        
        if (!hasMore) {
            // console.log('📄 loadMore: больше нет страниц');
            return;
        }
        
        setLoadingMore(true);
        try {
            const nextPage = currentPage + 1;
            // console.log(`📄 Загрузка страницы ${nextPage}...`);
            
            await dispatch(fetchStaffOrders({ 
                page: nextPage,
                forceRefresh: false 
            })).unwrap();
            
            // console.log(`✅ Страница ${nextPage} загружена`);
        } catch (error) {
            console.error('Ошибка при загрузке следующей страницы:', error);
        } finally {
            setLoadingMore(false);
        }
    }, [dispatch, loadingMore, isLoading]);
    
    // Автозагрузка следующих страниц при недостаточном количестве данных
    // (полезно когда клиентская фильтрация оставляет мало заказов)
    const autoLoadMore = useCallback(async () => {
        if (autoLoadingRef.current || loadingMore || isLoading) {
            return;
        }
        
        autoLoadingRef.current = true;
        
        try {
            // Загружаем до 5 страниц или пока не наберется минимум 10 заказов
            const MAX_AUTO_PAGES = 5;
            let pagesLoaded = 0;
            
            while (pagesLoaded < MAX_AUTO_PAGES) {
                const state = dispatch((_, getState) => getState());
                const activeOrdersState = state.order?.staffOrders?.activeOrders;
                
                if (!activeOrdersState) break;
                
                const hasMore = activeOrdersState.hasMore !== false && 
                               (activeOrdersState.page || 1) < (activeOrdersState.pages || 1);
                
                // Прекращаем если больше нет страниц или уже достаточно данных
                if (!hasMore || (activeOrdersState.data?.length || 0) >= 40) {
                    break;
                }
                
                await loadMore();
                pagesLoaded++;
                
                // Небольшая задержка между запросами
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            // console.log(`📄 Автозагрузка завершена: загружено ${pagesLoaded} дополнительных страниц`);
        } catch (error) {
            console.error('Ошибка при автозагрузке:', error);
        } finally {
            autoLoadingRef.current = false;
        }
    }, [dispatch, loadMore, loadingMore, isLoading]);
    
    return {
        staffOrders,
        isLoading,
        refreshing,
        initializing,
        dataLoaded,
        lastFetchTime,
        loadInitialData,
        handleRefresh,
        loadMore,
        loadingMore,
        autoLoadMore
    };
};