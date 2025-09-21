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
    
    const staffOrders = useSelector(selectStaffOrders);
    const isLoading = useSelector(selectStaffOrdersLoading);
    
    const loadInitialData = useCallback(async (forceRefresh = false) => {
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

            // Clear local actions when updating data
            dispatch(clearAllLocalOrderActions());

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
    
    // Auto refresh setup
    useEffect(() => {
        isMountedRef.current = true;
        
        // Auto refresh every 30 seconds
        autoRefreshRef.current = setInterval(() => {
            if (!isMountedRef.current) return;
            dispatch(fetchStaffOrders({ forceRefresh: true })).catch(() => {});
        }, CONSTANTS.AUTO_REFRESH_INTERVAL);

        return () => {
            isMountedRef.current = false;
            if (autoRefreshRef.current) {
                clearInterval(autoRefreshRef.current);
            }
        };
    }, [dispatch]);
    
    return {
        staffOrders,
        isLoading,
        refreshing,
        initializing,
        dataLoaded,
        lastFetchTime,
        loadInitialData,
        handleRefresh
    };
};