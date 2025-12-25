import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';

// Redux imports
import { fetchProducts } from '@entities/product/model/slice';
import {
    selectProducts,
    selectProductsLoadingMore,
    selectProductsHasMore,
    selectProductsCurrentPage,
    selectProductsLoading
} from '@entities/product/model/selectors';
import { fetchBanners, selectActiveMainBanners, selectBannerStatus } from '@entities/banner';
import { fetchCategories } from '@entities/category/model/slice';
import { selectCategoriesLoading, selectCategories } from '@entities/category/model/selectors';
import { fetchCart, useCartAvailability } from '@entities/cart';

// UI Components
import { Color } from '@app/styles/GlobalStyles';
import { Header } from "@widgets/header";
import { PromoBanner } from "@widgets/promoSlider";
import { CategoriesBar } from "@widgets/categoriesBar";
import { ProductsList } from "@widgets/product/productsList";
import DriverLocator from "@features/driver/driverLocator/ui/DriverLocator";

// Hooks
import { useNotifications } from '@entities/notification';
import { useAuth } from '@entities/auth/hooks/useAuth';

// Constants
const PRODUCTS_PER_PAGE = 10;
const LOAD_MORE_THRESHOLD = 8;
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

export const MainScreen = ({ navigation, route }) => {
    const dispatch = useDispatch();
    const { isCartAvailable } = useCartAvailability();
    const { currentUser: user } = useAuth();
    const notifications = useNotifications(navigation);

    // Redux selectors
    const products = useSelector(selectProducts);
    const isLoadingMore = useSelector(selectProductsLoadingMore);
    const hasMore = useSelector(selectProductsHasMore);
    const currentPage = useSelector(selectProductsCurrentPage);
    const productsLoading = useSelector(selectProductsLoading);
    const activeBanners = useSelector(selectActiveMainBanners);
    const categories = useSelector(selectCategories);
    const bannerStatus = useSelector(selectBannerStatus);
    const categoriesLoading = useSelector(selectCategoriesLoading);
    const unreadCount = useSelector(state => state.notification?.unreadCount || 0);

    // Local state
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [shuffledProducts, setShuffledProducts] = useState([]);

    // Refs
    const isMountedRef = useRef(true);
    const lastFetchTimeRef = useRef(0);
    const isInitializedRef = useRef(false);
    const previousProductsLengthRef = useRef(0);
    const previousProductsIdsRef = useRef(new Set());
    const isRefreshingRef = useRef(false);
    const loadAllDataRef = useRef(null);

    // Проверка готовности данных
    const isDataReady = useMemo(() => {
        return products?.length > 0 && 
               activeBanners !== undefined && 
               categories?.length > 0;
    }, [products?.length, activeBanners, categories?.length]);

    // Функция перемешивания массива (алгоритм Фишера-Йетса)
    const shuffleArray = useCallback((array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }, []);

    // Перемешивание продуктов при изменении
    useEffect(() => {
        if (!products || products.length === 0) {
            setShuffledProducts([]);
            previousProductsLengthRef.current = 0;
            previousProductsIdsRef.current = new Set();
            return;
        }

        const currentLength = products.length;
        const previousLength = previousProductsLengthRef.current;
        const currentProductsIds = new Set(products.map(p => p?.id).filter(Boolean));
        
        // Проверяем, изменился ли набор ID (обновление/refresh)
        // Если первый продукт изменился или набор ID полностью отличается - это обновление
        const firstProductId = products[0]?.id;
        const previousFirstId = previousProductsIdsRef.current.size > 0 
            ? [...previousProductsIdsRef.current][0] 
            : null;
        
        // Проверяем, является ли это обновлением (refresh) или подгрузкой (load more)
        // Refresh происходит только если:
        // 1. Это первая загрузка (previousLength === 0)
        // 2. Текущая страница = 1 И длина не увеличилась (значит это refresh, а не подгрузка)
        // 3. Первый продукт изменился (значит список обновился)
        // 4. Длина уменьшилась или осталась той же, но набор ID изменился (refresh)
        const isRefresh = previousLength === 0 || 
                         (currentPage === 1 && currentLength <= previousLength) ||
                         (firstProductId && previousFirstId && firstProductId !== previousFirstId) ||
                         (currentLength <= previousLength && previousProductsIdsRef.current.size > 0 &&
                          ![...previousProductsIdsRef.current].every(id => currentProductsIds.has(id)));

        // Первая загрузка или обновление (refresh) - перемешиваем все
        if (isRefresh) {
            setShuffledProducts(shuffleArray(products));
            previousProductsLengthRef.current = currentLength;
            previousProductsIdsRef.current = currentProductsIds;
        } 
        // Подгрузка новых продуктов - добавляем перемешанные новые в конец
        else if (currentLength > previousLength) {
            setShuffledProducts(prevShuffled => {
                const existingIds = new Set(prevShuffled.map(p => p?.id));
                const newProducts = products.filter(p => p?.id && !existingIds.has(p.id));
                
                if (newProducts.length > 0) {
                    // Перемешиваем только новые продукты и добавляем в конец
                    const shuffledNewProducts = shuffleArray(newProducts);
                    return [...prevShuffled, ...shuffledNewProducts];
                }
                
                // Если новых продуктов не найдено, но длина увеличилась, 
                // возможно продукты были обновлены - обновляем весь список
                if (prevShuffled.length < currentLength) {
                    return shuffleArray(products);
                }
                
                return prevShuffled;
            });
            previousProductsLengthRef.current = currentLength;
            previousProductsIdsRef.current = currentProductsIds;
        }
    }, [products, currentPage, shuffleArray]);

    // Проверка необходимости обновления кэша
    const shouldRefreshCache = useCallback(() => {
        const now = Date.now();
        const timeSinceLastFetch = now - lastFetchTimeRef.current;
        return timeSinceLastFetch > CACHE_DURATION;
    }, []);

    // Загрузка всех данных
    const loadAllData = useCallback(async (forceRefresh = false) => {
        // Проверяем готовность данных напрямую через селекторы
        const productsReady = products?.length > 0;
        const bannersReady = activeBanners !== undefined;
        const categoriesReady = categories?.length > 0;
        const dataReady = productsReady && bannersReady && categoriesReady;
        
        // Если данные уже есть и кэш свежий, не загружаем
        if (!forceRefresh && dataReady && !shouldRefreshCache()) {
            return;
        }

        const isRefresh = forceRefresh || isRefreshingRef.current;
        
        if (isRefresh) {
            isRefreshingRef.current = true;
            setIsRefreshing(true);
        } else if (!isInitializedRef.current) {
            setIsInitialLoading(true);
        }

        setError(null);

        try {
            
            await Promise.all([
                dispatch(fetchProducts({ 
                    page: 1, 
                    limit: PRODUCTS_PER_PAGE, 
                    refresh: forceRefresh 
                })).unwrap(),
                dispatch(fetchBanners({ 
                    type: 'MAIN', 
                    active: true, 
                    refresh: forceRefresh 
                })).unwrap(),
                dispatch(fetchCategories({ 
                    refresh: forceRefresh 
                })).unwrap()
            ]);

            lastFetchTimeRef.current = Date.now();
            isInitializedRef.current = true;
            
        } catch (err) {
            console.error('MainScreen: Ошибка загрузки данных:', err);
            if (isMountedRef.current) {
                setError('Не удалось загрузить данные. Проверьте подключение к интернету.');
            }
        } finally {
            if (isMountedRef.current) {
                setIsInitialLoading(false);
                isRefreshingRef.current = false;
                setIsRefreshing(false);
            }
        }
    }, [dispatch, products?.length, activeBanners, categories?.length, shouldRefreshCache]);
    
    // Сохраняем стабильную ссылку на loadAllData
    useEffect(() => {
        loadAllDataRef.current = loadAllData;
    }, [loadAllData]);

    // Загрузка дополнительных продуктов
    const loadMoreProducts = useCallback(() => {
        if (!hasMore || isLoadingMore) {
            return;
        }

        dispatch(fetchProducts({ 
            page: currentPage + 1, 
            limit: PRODUCTS_PER_PAGE 
        }));
    }, [dispatch, hasMore, isLoadingMore, currentPage, products?.length]);

    // Принудительное обновление
    const handleRefresh = useCallback(() => {
        if (loadAllDataRef.current) {
            loadAllDataRef.current(true);
        }
    }, []);

    // Инициализация при монтировании
    useEffect(() => {
        isMountedRef.current = true;

        const initialize = async () => {
            if (loadAllDataRef.current) {
                await loadAllDataRef.current(false);
            }

            // Инициализация push уведомлений
            if (notifications?.initializePushNotifications) {
                notifications.initializePushNotifications();
            }
        };

        initialize();

        return () => {
            isMountedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Обработка фокуса экрана
    useFocusEffect(
        useCallback(() => {
            // Сброс параметров навигации
            if (route?.params?.resetProduct) {
                navigation.setParams({ resetProduct: undefined });
            }

            // Принудительное обновление по запросу
            if (route?.params?.refreshMainScreen) {
                navigation.setParams({ refreshMainScreen: undefined });
                if (loadAllDataRef.current) {
                    loadAllDataRef.current(true);
                }
                return;
            }

            // Обновление корзины для доступных ролей
            if (isCartAvailable && user) {
                // Принудительно обновляем корзину при фокусе экрана для синхронизации
                dispatch(fetchCart(true));
            }

            // Обновление уведомлений для клиентов
            if (notifications?.refreshNotifications && user?.role === 'CLIENT') {
                notifications.refreshNotifications();
            }

            // Проверка и обновление устаревшего кэша
            if (isInitializedRef.current && shouldRefreshCache()) {
                if (loadAllDataRef.current) {
                    loadAllDataRef.current(false);
                }
            }
        }, [
            route?.params?.resetProduct,
            route?.params?.refreshMainScreen,
            navigation,
            isCartAvailable,
            user?.role,
            dispatch,
            notifications?.refreshNotifications
        ])
    );

    // Обработчики
    const handleProductPress = useCallback((product) => {
        const productId = typeof product === 'object' && product?.id ? product.id : product;
        navigation.navigate('ProductDetail', {
            productId,
            fromScreen: 'MainTab'
        });
    }, [navigation]);

    const handleDriverLocatorPress = useCallback(() => {
        navigation.navigate('StopsListScreen');
    }, [navigation]);

    // Компоненты рендеринга
    const renderHeader = useCallback(() => (
        <>
            <Header navigation={navigation} />
            <PromoBanner hideLoader={isDataReady} />
            <CategoriesBar hideLoader={false} />
            <DriverLocator onPress={handleDriverLocatorPress} />
        </>
    ), [navigation, isDataReady, handleDriverLocatorPress]);

    const renderFooter = useCallback(() => (
        <View style={styles.bottomSpacer} />
    ), []);

    const renderSkeletonLoader = useCallback(() => (
        <View style={styles.skeletonContainer}>
            {[...Array(8)].map((_, index) => (
                <View key={`skeleton-${index}`} style={styles.skeletonProductCard}>
                    <View style={styles.skeletonProductImage} />
                    <View style={styles.skeletonProductContent}>
                        <View style={styles.skeletonLineWide} />
                        <View style={styles.skeletonLine} />
                        <View style={styles.skeletonPrice} />
                    </View>
                </View>
            ))}
        </View>
    ), []);

    const renderErrorState = useCallback(() => (
        <View style={styles.messageContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryButtonText}>Повторить</Text>
            </TouchableOpacity>
        </View>
    ), [error, handleRefresh]);

    const renderEmptyState = useCallback(() => (
        <View style={styles.messageContainer}>
            <Text style={styles.messageText}>Товары не найдены</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryButtonText}>Обновить</Text>
            </TouchableOpacity>
        </View>
    ), [handleRefresh]);

    // Рендер состояний загрузки
    if (isInitialLoading && !isDataReady) {
        return (
            <View style={styles.container}>
                {renderHeader()}
                {renderSkeletonLoader()}
            </View>
        );
    }

    // Рендер ошибки
    if (error && !isDataReady) {
        return (
            <View style={styles.container}>
                {renderHeader()}
                {renderErrorState()}
            </View>
        );
    }

    // Рендер пустого состояния
    if (!products?.length && isInitializedRef.current) {
        return (
            <View style={styles.container}>
                {renderHeader()}
                {renderEmptyState()}
            </View>
        );
    }

    // Основной рендер
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
                hideLoader={isDataReady}
                products={shuffledProducts.length > 0 ? shuffledProducts : products}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    skeletonContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
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