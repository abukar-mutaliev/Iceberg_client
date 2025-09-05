import React, { useState, useRef, useEffect, useCallback } from 'react';
import {View, StyleSheet, Text, TouchableOpacity} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchProducts } from '@entities/product/model/slice';
import {
    selectProducts,
    selectProductsLoading,
    selectProductsLoadingMore,
    selectProductsError,
    selectProductsHasMore,
    selectProductsCurrentPage
} from '@entities/product/model/selectors';
import { fetchBanners, selectActiveMainBanners, selectBannerStatus } from '@entities/banner';
import { fetchCategories } from '@entities/category/model/slice';
import { fetchCart, useCartAvailability } from '@entities/cart';

import { Color } from '@app/styles/GlobalStyles';
import { Header } from "@widgets/header";
import { PromoBanner } from "@widgets/promoSlider";
import { CategoriesBar } from "@widgets/categoriesBar";
import { ProductsList } from "@widgets/product/productsList";

import { selectCategories, selectCategoriesLoading, setCategories } from "@entities/category";
import DriverLocator from "@features/driver/driverLocator/ui/DriverLocator";
import { useFocusEffect } from '@react-navigation/native';

import { useNotifications } from '@entities/notification';
import { useAuth } from '@entities/auth/hooks/useAuth';

const PRODUCTS_PER_PAGE = 10;
const LOAD_MORE_THRESHOLD = 8;
const REFRESH_INTERVAL = 300000;
const CACHE_KEY = 'main_screen_cache';
const CACHE_EXPIRY = 10 * 60 * 1000;


// Функции для работы с кэшем
const saveCacheData = async (data) => {
    try {
        const cacheData = {
            timestamp: Date.now(),
            data
        };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Ошибка сохранения кэша:', error);
    }
};

const loadCacheData = async () => {
    try {
        const cacheStr = await AsyncStorage.getItem(CACHE_KEY);
        if (cacheStr) {
            const cache = JSON.parse(cacheStr);
            const now = Date.now();
            
            if (now - cache.timestamp < CACHE_EXPIRY) {
                const { timestamp, ...data } = cache;
                return data;
            } else {
                await AsyncStorage.removeItem(CACHE_KEY);
            }
        }
        return null;
    } catch (error) {
        console.error('Ошибка загрузки кэша:', error);
        return null;
    }
};


export const MainScreen = ({ navigation, route }) => {
    const dispatch = useDispatch();
    const { isCartAvailable } = useCartAvailability();
    const { currentUser: user } = useAuth();

    const notifications = useNotifications(navigation);

    const unreadCount = useSelector(state => state.notification?.unreadCount || 0);

    useEffect(() => {
    }, [unreadCount]);

    const products = useSelector(selectProducts);
    const isProductsLoading = useSelector(selectProductsLoading);
    const isLoadingMore = useSelector(selectProductsLoadingMore);
    const productsError = useSelector(selectProductsError);
    const hasMore = useSelector(selectProductsHasMore);
    const currentPage = useSelector(selectProductsCurrentPage);
    const activeBanners = useSelector(selectActiveMainBanners);
    const bannerStatus = useSelector(selectBannerStatus);
    const categories = useSelector(selectCategories);
    const isCategoriesLoading = useSelector(selectCategoriesLoading);

    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState(0);
    const [loadingStates, setLoadingStates] = useState({
        products: false,
        banners: false,
        categories: false
    });

    const refreshTimerRef = useRef(null);
    const isMountedRef = useRef(true);
    const loadingRef = useRef(false);
    const initialLoadRef = useRef(false);
    const cacheTimeoutRef = useRef(null);

    const shouldRefreshData = useCallback(() => {
        const now = Date.now();
        const timeSinceLastFetch = now - lastFetchTime;
        return !isProductsLoading && timeSinceLastFetch > REFRESH_INTERVAL;
    }, [lastFetchTime, isProductsLoading]);

    const hasCachedData = useCallback(() => {
        return (Array.isArray(products) && products.length > 0) || 
               (Array.isArray(activeBanners) && activeBanners.length > 0) || 
               (Array.isArray(categories) && categories.length > 0);
    }, [products, activeBanners, categories]);

    const loadAllData = useCallback(async (refresh = false) => {
        if (loadingRef.current) {
            console.log('loadAllData: Пропуск загрузки - уже идет загрузка');
            return;
        }

        if (!refresh && hasCachedData() && dataLoaded) {
            setIsInitialLoading(false);
            initialLoadRef.current = true;
            return;
        }

        if (!refresh && !dataLoaded && !initialLoadRef.current) {
            const cachedData = await loadCacheData();
            if (cachedData) {

                if (cachedData.products && cachedData.products.length > 0) {
                }
                if (cachedData.categories && cachedData.categories.length > 0) {
                    dispatch(setCategories(cachedData.categories));
                }
                
                setIsInitialLoading(false);
                initialLoadRef.current = true;
                setDataLoaded(true);
                setLastFetchTime(cachedData.timestamp || Date.now());
                return;
            }
        }

        if (refresh || shouldRefreshData() || !dataLoaded) {

            loadingRef.current = true;
            setLoadingStates({
                products: true,
                banners: true,
                categories: true
            });

            try {
                const promises = [];

                const productsPromise = dispatch(fetchProducts({ page: 1, limit: PRODUCTS_PER_PAGE, refresh }))
                    .finally(() => {
                        if (isMountedRef.current) {
                            setLoadingStates(prev => ({ ...prev, products: false }));
                        }
                    });
                promises.push(productsPromise);

                if (!activeBanners?.length && bannerStatus !== 'loading') {
                    const bannersPromise = dispatch(fetchBanners({ type: 'MAIN', active: true }))
                        .finally(() => {
                            if (isMountedRef.current) {
                                setLoadingStates(prev => ({ ...prev, banners: false }));
                            }
                        });
                    promises.push(bannersPromise);
                } else {
                    setLoadingStates(prev => ({ ...prev, banners: false }));
                }

                if (refresh || !categories?.length || !dataLoaded) {
                    const categoriesPromise = dispatch(fetchCategories())
                        .finally(() => {
                            if (isMountedRef.current) {
                                setLoadingStates(prev => ({ ...prev, categories: false }));
                            }
                        });
                    promises.push(categoriesPromise);
                } else {
                    setLoadingStates(prev => ({ ...prev, categories: false }));
                }

                await Promise.all(promises);

                if (isMountedRef.current) {
                    const currentTime = Date.now();
                    setLastFetchTime(currentTime);
                    setDataLoaded(true);
                    setIsInitialLoading(false);
                    initialLoadRef.current = true;

                    const currentState = {
                        products: products,
                        banners: activeBanners,
                        categories: categories
                    };

                    const cacheData = {
                        timestamp: currentTime,
                        ...currentState
                    };
                    await saveCacheData(cacheData);
                }
            } catch (error) {
                if (isMountedRef.current) {
                    setIsInitialLoading(false);
                    initialLoadRef.current = true;
                }
            } finally {
                loadingRef.current = false;
            }
        }
    }, [dispatch, isProductsLoading, shouldRefreshData, dataLoaded,
        activeBanners, bannerStatus, categories, isCategoriesLoading, hasCachedData]);

    const loadMoreProducts = useCallback(() => {
        if (!hasMore || isLoadingMore || isProductsLoading) {
            return;
        }

        const nextPage = currentPage + 1;

        dispatch(fetchProducts({ page: nextPage, limit: PRODUCTS_PER_PAGE }));
    }, [dispatch, hasMore, isLoadingMore, isProductsLoading, currentPage]);

    useEffect(() => {
        isMountedRef.current = true;
        
        const initializeScreen = async () => {
            if (hasCachedData()) {
                if (!initialLoadRef.current) {
                    setIsInitialLoading(false);
                    initialLoadRef.current = true;
                }
                if (!dataLoaded) setDataLoaded(true);
                if (!lastFetchTime) setLastFetchTime(Date.now());
                return;
            }

            const cachedData = await loadCacheData();
            if (cachedData) {

                if (cachedData.categories && cachedData.categories.length > 0) {
                    dispatch(setCategories(cachedData.categories));
                }

                if (!initialLoadRef.current) {
                    setIsInitialLoading(false);
                    initialLoadRef.current = true;
                }
                if (!dataLoaded) setDataLoaded(true);
                if (!lastFetchTime) setLastFetchTime(cachedData.timestamp || Date.now());
                return;
            }

            if (!initialLoadRef.current) {
                loadAllData();
            }
        };

        initializeScreen();

        if (!categories?.length && !isCategoriesLoading) {
            dispatch(fetchCategories());
        }

        if (notifications.initializePushNotifications) {
            notifications.initializePushNotifications();
        }


        return () => {
            isMountedRef.current = false;
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
            }
            if (cacheTimeoutRef.current) {
                clearTimeout(cacheTimeoutRef.current);
            }
        };
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (route?.params?.resetProduct) {
                navigation.setParams({ resetProduct: undefined });
            }

            if (isCartAvailable) {
                dispatch(fetchCart(true));
            }

            if (notifications?.refreshNotifications && user?.role === 'CLIENT') {
                notifications.refreshNotifications();
            }
        }, [navigation, route?.params, isCartAvailable, dispatch, notifications, user?.role])
    );

    const handleProductPress = useCallback((productId) => {
        navigation.navigate('ProductDetail', {
            productId,
            fromScreen: 'MainTab'
        });
    }, [navigation]);

    const handleDriverLocatorPress = useCallback(() => {
        navigation.navigate('StopsListScreen');
    }, [navigation]);

    const handleRefresh = useCallback(() => {
        loadAllData(true);
    }, [loadAllData]);

    const renderHeader = useCallback(() => {

        return (
            <>
                <Header navigation={navigation} />
                <PromoBanner hideLoader={true} />
                <CategoriesBar hideLoader={true} />
                <DriverLocator onPress={handleDriverLocatorPress} />

            </>
        );
    }, [handleDriverLocatorPress, navigation, isInitialLoading]);

    const renderFooter = useCallback(() => (
        <View style={styles.bottomSpacer} />
    ), []);

    const isAnyLoading = loadingStates.products || loadingStates.banners || loadingStates.categories || isProductsLoading;
    const hasAnyData = (Array.isArray(products) && products.length > 0) || 
                       (Array.isArray(activeBanners) && activeBanners.length > 0) || 
                       (Array.isArray(categories) && categories.length > 0);

    const shouldShowLoader = (isInitialLoading || (isAnyLoading && !hasAnyData)) && !hasCachedData();

    if (shouldShowLoader) {
        return (
            <View style={styles.container}>
                <Header navigation={navigation} />
                <PromoBanner hideLoader={false} />
                <CategoriesBar hideLoader={false} />
                {/* Скелетон списка товаров */}
                <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                    {[...Array(8)].map((_, i) => (
                        <View key={i} style={styles.skeletonProductCard}>
                            <View style={styles.skeletonProductImage} />
                            <View style={styles.skeletonProductContent}>
                                <View style={styles.skeletonLineWide} />
                                <View style={styles.skeletonLine} />
                                <View style={styles.skeletonPrice} />
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    // Обработка ошибок
    if (productsError) {
        return (
            <View style={styles.container}>
                <Header navigation={navigation} />
                <View style={styles.messageContainer}>
                    <Text style={styles.errorText}>Ошибка загрузки товаров: {productsError}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={handleRefresh}
                    >
                        <Text style={styles.retryButtonText}>Повторить</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Обработка пустого состояния
    if (!Array.isArray(products) || products.length === 0) {
        return (
            <View style={styles.container}>
                <Header navigation={navigation} />
                <PromoBanner hideLoader={false} />
                <CategoriesBar hideLoader={false} />
                <DriverLocator onPress={handleDriverLocatorPress} />
                <View style={styles.messageContainer}>
                    <Text style={styles.messageText}>Товары не найдены</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={handleRefresh}
                    >
                        <Text style={styles.retryButtonText}>Обновить</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ProductsList
                onProductPress={handleProductPress}
                fromScreen="MainTab"
                onEndReached={loadMoreProducts}
                onEndReachedThreshold={LOAD_MORE_THRESHOLD}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore}
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderFooter}
                hideLoader={isInitialLoading || (isAnyLoading && !hasAnyData)}
                key={`products-${products.length}`}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    skeletonProductCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    skeletonProductImage: {
        width: 64,
        height: 64,
        borderRadius: 8,
        backgroundColor: '#eee',
        marginRight: 12,
    },
    skeletonProductContent: {
        flex: 1,
        justifyContent: 'center',
    },
    skeletonLineWide: {
        height: 14,
        width: '80%',
        backgroundColor: '#eee',
        borderRadius: 6,
        marginBottom: 6,
    },
    skeletonLine: {
        height: 12,
        width: '60%',
        backgroundColor: '#eee',
        borderRadius: 6,
        marginBottom: 10,
    },
    skeletonPrice: {
        height: 16,
        width: 90,
        backgroundColor: '#eee',
        borderRadius: 8,
    },
    bottomSpacer: {
        height: 60,
    },
    messageContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
    },
    messageText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 10,
        color: '#666',
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
        color: '#d32f2f',
    },
    retryButton: {
        backgroundColor: '#3339b0',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginTop: 10,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
});