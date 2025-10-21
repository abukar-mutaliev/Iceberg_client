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

    // Refs
    const isMountedRef = useRef(true);
    const lastFetchTimeRef = useRef(0);
    const isInitializedRef = useRef(false);

    // Проверка готовности данных
    const isDataReady = useMemo(() => {
        return products?.length > 0 && 
               activeBanners !== undefined && 
               categories?.length > 0;
    }, [products?.length, activeBanners, categories?.length]);

    // Проверка необходимости обновления кэша
    const shouldRefreshCache = useCallback(() => {
        const now = Date.now();
        const timeSinceLastFetch = now - lastFetchTimeRef.current;
        return timeSinceLastFetch > CACHE_DURATION;
    }, []);

    // Загрузка всех данных
    const loadAllData = useCallback(async (forceRefresh = false) => {
        // Если данные уже есть и кэш свежий, не загружаем
        if (!forceRefresh && isDataReady && !shouldRefreshCache()) {
            return;
        }

        const isRefresh = forceRefresh || isRefreshing;
        
        if (isRefresh) {
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
                setIsRefreshing(false);
            }
        }
    }, [dispatch, isDataReady, shouldRefreshCache, isRefreshing]);

    // Загрузка дополнительных продуктов
    const loadMoreProducts = useCallback(() => {
        if (!hasMore || isLoadingMore) {
            return;
        }

        dispatch(fetchProducts({ 
            page: currentPage + 1, 
            limit: PRODUCTS_PER_PAGE 
        }));
    }, [dispatch, hasMore, isLoadingMore, currentPage]);

    // Принудительное обновление
    const handleRefresh = useCallback(() => {
        loadAllData(true);
    }, [loadAllData]);

    // Инициализация при монтировании
    useEffect(() => {
        isMountedRef.current = true;

        const initialize = async () => {
            await loadAllData(false);

            // Инициализация push уведомлений
            if (notifications?.initializePushNotifications) {
                notifications.initializePushNotifications();
            }
        };

        initialize();

        return () => {
            isMountedRef.current = false;
        };
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
                handleRefresh();
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
                loadAllData(false);
            }
        }, [
            route?.params,
            navigation,
            isCartAvailable,
            user,
            dispatch,
            notifications,
            shouldRefreshCache,
            loadAllData,
            handleRefresh
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
            <CategoriesBar hideLoader={isDataReady} />
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
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
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