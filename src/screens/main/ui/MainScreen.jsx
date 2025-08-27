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
// import { Loader } from "@shared/ui/Loader";

import { selectCategories, selectCategoriesLoading, setCategories } from "@entities/category";
import DriverLocator from "@features/driver/driverLocator/ui/DriverLocator";
import { useFocusEffect } from '@react-navigation/native';

import { useNotifications } from '@entities/notification';
import { useAuth } from '@entities/auth/hooks/useAuth';

const PRODUCTS_PER_PAGE = 10;
const LOAD_MORE_THRESHOLD = 8;
const REFRESH_INTERVAL = 300000; // отключим автообновление для избежания подгрузок на каждый фокус
const CACHE_KEY = 'main_screen_cache';
const CACHE_EXPIRY = 10 * 60 * 1000; // 10 минут

const selectFetchCompleted = (state) => state.products?.fetchCompleted || false;

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
            
            // Проверяем, не истек ли кэш
            if (now - cache.timestamp < CACHE_EXPIRY) {
                // Возвращаем данные напрямую, так как они сохраняются не в поле data
                const { timestamp, ...data } = cache;
                return data;
            } else {
                // Удаляем истекший кэш
                await AsyncStorage.removeItem(CACHE_KEY);
            }
        }
        return null;
    } catch (error) {
        console.error('Ошибка загрузки кэша:', error);
        return null;
    }
};

const clearCache = async () => {
    try {
        await AsyncStorage.removeItem(CACHE_KEY);
    } catch (error) {
        console.error('Ошибка очистки кэша:', error);
    }
};

export const MainScreen = ({ navigation, route }) => {
    const dispatch = useDispatch();
    const { isCartAvailable } = useCartAvailability();
    const { currentUser: user } = useAuth();

    const notifications = useNotifications(navigation);

    const unreadCount = useSelector(state => state.notification?.unreadCount || 0);

    useEffect(() => {
        // Badge sync logic
    }, [unreadCount]);

    // Селекторы данных
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
    const fetchCompleted = useSelector(selectFetchCompleted);

    // Состояние загрузки
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

    // Проверяем, нужно ли обновить данные
    const shouldRefreshData = useCallback(() => {
        const now = Date.now();
        const timeSinceLastFetch = now - lastFetchTime;
        return !isProductsLoading && timeSinceLastFetch > REFRESH_INTERVAL;
    }, [lastFetchTime, isProductsLoading]);

    // Проверяем, есть ли кэшированные данные
    const hasCachedData = useCallback(() => {
        return (Array.isArray(products) && products.length > 0) || 
               (Array.isArray(activeBanners) && activeBanners.length > 0) || 
               (Array.isArray(categories) && categories.length > 0);
    }, [products, activeBanners, categories]);

    // Единая функция загрузки всех данных
    const loadAllData = useCallback(async (refresh = false) => {
        if (loadingRef.current) {
            console.log('loadAllData: Пропуск загрузки - уже идет загрузка');
            return;
        }

        // Если есть кэшированные данные и это не принудительное обновление, показываем их сразу
        if (!refresh && hasCachedData() && dataLoaded) {
            console.log('loadAllData: Используем кэшированные данные');
            setIsInitialLoading(false);
            initialLoadRef.current = true;
            return;
        }

        // Пытаемся загрузить из кэша при первом запуске
        if (!refresh && !dataLoaded && !initialLoadRef.current) {
            const cachedData = await loadCacheData();
            if (cachedData) {
                console.log('loadAllData: Используем данные из кэша');
                
                // Восстанавливаем данные в Redux store если они есть
                if (cachedData.products && cachedData.products.length > 0) {
                    // Продукты уже должны быть в store, но можно обновить если нужно
                }
                if (cachedData.categories && cachedData.categories.length > 0) {
                    // Восстанавливаем категории в store
                    console.log('📦 Восстанавливаем категории из кэша:', cachedData.categories.length);
                    dispatch(setCategories(cachedData.categories));
                }
                if (cachedData.banners && cachedData.banners.length > 0) {
                    // Баннеры уже должны быть в store, но можно обновить если нужно
                }
                
                setIsInitialLoading(false);
                initialLoadRef.current = true;
                setDataLoaded(true);
                setLastFetchTime(cachedData.timestamp || Date.now());
                return;
            }
        }

        if (refresh || shouldRefreshData() || !dataLoaded) {
            console.log('loadAllData: Начинаем загрузку всех данных', { 
                refresh, 
                shouldRefresh: shouldRefreshData(), 
                dataLoaded,
                isInitialLoading,
                hasCachedData: hasCachedData()
            });

            loadingRef.current = true;
            setLoadingStates({
                products: true,
                banners: true,
                categories: true
            });

            try {
                // Загружаем все данные параллельно для ускорения
                const promises = [];

                // Загрузка продуктов с приоритетом
                const productsPromise = dispatch(fetchProducts({ page: 1, limit: PRODUCTS_PER_PAGE, refresh }))
                    .finally(() => {
                        if (isMountedRef.current) {
                            setLoadingStates(prev => ({ ...prev, products: false }));
                        }
                    });
                promises.push(productsPromise);

                // Загрузка баннеров (если еще не загружены)
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

                // Загрузка категорий (всегда загружаем при первом запуске или принудительном обновлении)
                if (refresh || !categories?.length || !dataLoaded) {
                    console.log('🔄 Загружаем категории:', { refresh, categoriesLength: categories?.length, dataLoaded });
                    const categoriesPromise = dispatch(fetchCategories())
                        .finally(() => {
                            if (isMountedRef.current) {
                                setLoadingStates(prev => ({ ...prev, categories: false }));
                            }
                        });
                    promises.push(categoriesPromise);
                } else {
                    console.log('⏭️ Пропускаем загрузку категорий:', { refresh, categoriesLength: categories?.length, dataLoaded });
                    setLoadingStates(prev => ({ ...prev, categories: false }));
                }

                // Ждем завершения всех загрузок
                await Promise.all(promises);

                if (isMountedRef.current) {
                    const currentTime = Date.now();
                    setLastFetchTime(currentTime);
                    setDataLoaded(true);
                    setIsInitialLoading(false);
                    initialLoadRef.current = true;

                    // Получаем актуальные данные после загрузки
                    const currentState = {
                        products: products,
                        banners: activeBanners,
                        categories: categories
                    };

                    // Сохраняем данные в кэш
                    const cacheData = {
                        timestamp: currentTime,
                        ...currentState
                    };
                    await saveCacheData(cacheData);
                }
            } catch (error) {
                console.error('Ошибка при загрузке данных:', error);
                // Даже при ошибке снимаем состояние загрузки
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

    // Функция для загрузки следующей страницы продуктов
    const loadMoreProducts = useCallback(() => {
        if (!hasMore || isLoadingMore || isProductsLoading) {
            console.log('Загрузка отменена:', { hasMore, isLoadingMore, isProductsLoading });
            return;
        }

        const nextPage = currentPage + 1;
        console.log('Загрузка страницы:', nextPage);
        
        dispatch(fetchProducts({ page: nextPage, limit: PRODUCTS_PER_PAGE }));
    }, [dispatch, hasMore, isLoadingMore, isProductsLoading, currentPage]);

    // Инициализация при монтировании
    useEffect(() => {
        isMountedRef.current = true;
        
        const initializeScreen = async () => {
            // Если в Redux уже есть данные — используем их без сетевых запросов (однократно)
            if (hasCachedData()) {
                console.log('🚀 Используем данные из Redux при инициализации');
                if (!initialLoadRef.current) {
                    setIsInitialLoading(false);
                    initialLoadRef.current = true;
                }
                if (!dataLoaded) setDataLoaded(true);
                if (!lastFetchTime) setLastFetchTime(Date.now());
                return;
            }

            // Пытаемся загрузить из локального кэша
            const cachedData = await loadCacheData();
            if (cachedData) {
                console.log('🚀 Используем данные из кэша при инициализации');

                if (cachedData.categories && cachedData.categories.length > 0) {
                    console.log('📦 Восстанавливаем категории из кэша при инициализации:', cachedData.categories.length);
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

            // Данных нет ни в Redux, ни в кэше — загружаем с сервера один раз
            if (!initialLoadRef.current) {
                console.log('🚀 Инициализация главного экрана - начинаем загрузку данных');
                loadAllData();
            }
        };

        initializeScreen();

        // Дополнительная проверка: если категории не загружены, загружаем их принудительно
        if (!categories?.length && !isCategoriesLoading) {
            console.log('🚀 Принудительная загрузка категорий при инициализации');
            dispatch(fetchCategories());
        }

        if (notifications.initializePushNotifications) {
            notifications.initializePushNotifications();
        }

        // Отключено автообновление, чтобы не было подгрузок при каждом возвращении на экран
        // refreshTimerRef.current = setInterval(() => {
        //     if (isMountedRef.current && shouldRefreshData()) {
        //         console.log('🔄 Автоматическое обновление данных');
        //         loadAllData(true);
        //     }
        // }, REFRESH_INTERVAL);

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

    // Обновление при фокусе экрана
    useFocusEffect(
        useCallback(() => {
            // На фокусе ничего не перезагружаем, только мягкие операции
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
        const isInitialLoad = isInitialLoading || (isAnyLoading && !hasAnyData);
        
        return (
            <>
                <Header navigation={navigation} />
                <PromoBanner hideLoader={true} />
                <CategoriesBar hideLoader={true} />
                <DriverLocator onPress={handleDriverLocatorPress} />
            </>
        );
    }, [handleDriverLocatorPress, navigation, isInitialLoading, isAnyLoading, hasAnyData]);

    const renderFooter = useCallback(() => (
        <View style={styles.bottomSpacer} />
    ), []);

    // Проверяем общее состояние загрузки
    const isAnyLoading = loadingStates.products || loadingStates.banners || loadingStates.categories || isProductsLoading;
    const hasAnyData = (Array.isArray(products) && products.length > 0) || 
                       (Array.isArray(activeBanners) && activeBanners.length > 0) || 
                       (Array.isArray(categories) && categories.length > 0);

    // Показываем лоадер только если нет данных и идет загрузка
    const shouldShowLoader = (isInitialLoading || (isAnyLoading && !hasAnyData)) && !hasCachedData();

    // Единый лоадер со скелетоном для начальной загрузки
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