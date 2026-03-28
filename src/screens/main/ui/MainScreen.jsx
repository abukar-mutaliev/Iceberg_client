import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Redux imports
import { fetchProducts, clearProductsError } from '@entities/product/model/slice';
import {
    selectProducts,
    selectProductsLoadingMore,
    selectProductsHasMore,
    selectProductsCurrentPage,
    selectProductsLoading,
    selectProductsError
} from '@entities/product/model/selectors';
import { fetchBanners, selectActiveMainBanners, selectBannerStatus } from '@entities/banner';
import { fetchCategories } from '@entities/category/model/slice';
import { selectCategoriesLoading, selectCategories } from '@entities/category/model/selectors';
import { fetchCart, useCartAvailability } from '@entities/cart';
import productsApi from '@entities/product/api/productsApi';

// UI Components
import { Color } from '@app/styles/GlobalStyles';
import { Header } from "@widgets/header";
// import { PromoBanner } from "@widgets/promoSlider";
import { CategoriesBar } from "@widgets/categoriesBar";
import { ProductsList } from "@widgets/product/productsList";
import { LocatorsSlider } from "@features/locatorsSlider";
import { IceCreamSeasonBanner } from "@features/iceCreamSeasonBanner";

// Hooks
import { useNotifications } from '@entities/notification';
import { useAuth } from '@entities/auth/hooks/useAuth';

// Constants
const PRODUCTS_PER_PAGE = 10;
const LOAD_MORE_THRESHOLD = 8;
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут
const SHUFFLE_INTERVAL = 30 * 60 * 1000; // 30 минут между перемешиваниями

/**
 * Полный список /api/products (не public) — для ADMIN/EMPLOYEE сервер отдаёт весь каталог.
 * SUPER_ADMIN не включён: на бэкенде эта роль часто не попадает в ту же ветку, из‑за чего
 * пропадают уже опубликованные товары. Для SUPER_ADMIN: публичный каталог + отдельная подгрузка PENDING.
 */
const MAIN_FULL_CATALOG_ROLES = new Set(['ADMIN', 'EMPLOYEE']);

function parseProductsListResponse(response) {
    if (response?.status === 'success' && Array.isArray(response.data)) {
        return response.data;
    }
    if (Array.isArray(response?.data)) {
        return response.data;
    }
    if (Array.isArray(response?.data?.data)) {
        return response.data.data;
    }
    if (Array.isArray(response)) {
        return response;
    }
    return [];
}

export const MainScreen = ({ navigation, route }) => {
    const dispatch = useDispatch();
    const { isCartAvailable } = useCartAvailability();
    const { currentUser: user } = useAuth();
    const notifications = useNotifications(navigation);
    const isAndroid = Platform.OS === 'android';
    const insets = useSafeAreaInsets();
    const tabBarHeight = 80 + insets.bottom;
    const listContentPadding = tabBarHeight + 12;

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
    const productsError = useSelector(selectProductsError);
    const unreadCount = useSelector(state => state.notification?.unreadCount || 0);
    const categoriesError = useSelector(state => state.category?.error || null);

    // Гости и обычные роли — публичный каталог; админы/сотрудники — полный список (иначе PENDING пропадают после refresh)
    const usePublicCatalogForMain = useMemo(
        () => !MAIN_FULL_CATALOG_ROLES.has(user?.role),
        [user?.role]
    );

    // Local state
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [shuffledProducts, setShuffledProducts] = useState([]);
    /** Товары поставщика со статусом PENDING — показываются вместе с публичным каталогом */
    const [supplierModerationProducts, setSupplierModerationProducts] = useState([]);
    /** Очередь модерации для SUPER_ADMIN (публичный список + эти позиции) */
    const [superAdminPendingProducts, setSuperAdminPendingProducts] = useState([]);

    // Refs
    const isMountedRef = useRef(true);
    const lastFetchTimeRef = useRef(0);
    const isInitializedRef = useRef(false);
    const previousProductsLengthRef = useRef(0);
    const previousProductsIdsRef = useRef(new Set());
    const isRefreshingRef = useRef(false);
    const loadAllDataRef = useRef(null);
    const lastShuffleTimeRef = useRef(0);
    const forceShuffleRef = useRef(false);
    const categoriesRetryAttemptedRef = useRef(false);
    /** Чтобы не дергать /supplier дважды при первой загрузке (loadAllData + effect) */
    const supplierModerationFetchedForIdRef = useRef(null);
    /** Переключение гость↔логин или смена роли меняет источник каталога — нужен refresh */
    const catalogSourceKeyRef = useRef(null);

    const loadSupplierModerationProducts = useCallback(async () => {
        if (user?.role !== 'SUPPLIER' || !user?.supplier?.id) {
            supplierModerationFetchedForIdRef.current = null;
            setSupplierModerationProducts([]);
            return;
        }
        const supplierId = user.supplier.id;
        try {
            const response = await productsApi.getSupplierProducts(supplierId);
            const list = parseProductsListResponse(response);
            const pending = list.filter(
                (p) => p && p.id && String(p.moderationStatus) === 'PENDING'
            );
            setSupplierModerationProducts(pending);
            supplierModerationFetchedForIdRef.current = supplierId;
        } catch (err) {
            console.error('MainScreen: Ошибка загрузки товаров на модерации:', err);
            setSupplierModerationProducts([]);
        }
    }, [user?.role, user?.supplier?.id]);

    const loadSuperAdminPendingProducts = useCallback(async () => {
        if (user?.role !== 'SUPER_ADMIN') {
            setSuperAdminPendingProducts([]);
            return;
        }
        try {
            const response = await productsApi.getProducts(
                { page: 1, limit: 200 },
                { usePublicCatalog: false }
            );
            const list = parseProductsListResponse(response);
            const pending = list.filter(
                (p) => p && p.id && String(p.moderationStatus) === 'PENDING'
            );
            setSuperAdminPendingProducts(pending);
        } catch (err) {
            console.error('MainScreen: Ошибка загрузки очереди модерации (SUPER_ADMIN):', err);
            setSuperAdminPendingProducts([]);
        }
    }, [user?.role]);

    // Проверка готовности данных
    const isDataReady = useMemo(() => {
        const hasCatalog =
            (products?.length > 0) ||
            (user?.role === 'SUPPLIER' && supplierModerationProducts.length > 0) ||
            (user?.role === 'SUPER_ADMIN' && superAdminPendingProducts.length > 0);
        return (
            hasCatalog &&
            activeBanners !== undefined &&
            categories?.length > 0
        );
    }, [
        products?.length,
        activeBanners,
        categories?.length,
        user?.role,
        supplierModerationProducts.length,
        superAdminPendingProducts.length,
    ]);

    const catalogProducts = shuffledProducts.length > 0 ? shuffledProducts : products;
    const productsForList = useMemo(() => {
        const extras = [];
        if (superAdminPendingProducts.length) {
            extras.push(...superAdminPendingProducts);
        }
        if (supplierModerationProducts.length) {
            extras.push(...supplierModerationProducts);
        }
        if (!extras.length) {
            return catalogProducts;
        }
        const ids = new Set(catalogProducts.map((p) => p?.id).filter(Boolean));
        const mergedExtras = extras.filter((p) => p?.id && !ids.has(p.id));
        return mergedExtras.length ? [...mergedExtras, ...catalogProducts] : catalogProducts;
    }, [catalogProducts, supplierModerationProducts, superAdminPendingProducts]);

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
    // Перемешивание происходит ТОЛЬКО при:
    //   1. Первой загрузке (shuffledProducts пуст)
    //   2. Pull-to-refresh (forceShuffleRef === true)
    //   3. Прошло больше SHUFFLE_INTERVAL с последнего перемешивания
    // В остальных случаях порядок сохраняется, а данные обновляются на месте
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

        // Определяем, является ли это refresh (а не load-more)
        const firstProductId = products[0]?.id;
        const previousFirstId = previousProductsIdsRef.current.size > 0 
            ? [...previousProductsIdsRef.current][0] 
            : null;

        const isRefresh = previousLength === 0 || 
                         (currentPage === 1 && currentLength <= previousLength) ||
                         (firstProductId && previousFirstId && firstProductId !== previousFirstId) ||
                         (currentLength <= previousLength && previousProductsIdsRef.current.size > 0 &&
                          ![...previousProductsIdsRef.current].every(id => currentProductsIds.has(id)));

        // Определяем, нужно ли перемешивать
        const now = Date.now();
        const timeSinceLastShuffle = now - lastShuffleTimeRef.current;
        const shouldShuffle = forceShuffleRef.current ||
                              previousLength === 0 ||
                              timeSinceLastShuffle > SHUFFLE_INTERVAL;

        if (isRefresh && shouldShuffle) {
            // Полное перемешивание: первая загрузка, pull-to-refresh или истёк интервал
            setShuffledProducts(shuffleArray(products));
            lastShuffleTimeRef.current = now;
            forceShuffleRef.current = false;
            previousProductsLengthRef.current = currentLength;
            previousProductsIdsRef.current = currentProductsIds;
        } else if (isRefresh && !shouldShuffle) {
            // Данные обновились, но порядок сохраняем — обновляем товары на местах
            setShuffledProducts(prev => {
                if (prev.length === 0) {
                    // Защита: если массив пуст, всё-таки перемешиваем
                    lastShuffleTimeRef.current = now;
                    return shuffleArray(products);
                }
                const productMap = new Map(products.map(p => [p.id, p]));
                // Обновляем существующие товары свежими данными, сохраняя порядок
                const updated = prev
                    .map(p => productMap.get(p.id) || p)
                    .filter(p => currentProductsIds.has(p.id));
                // Добавляем действительно новые товары в конец
                const existingIds = new Set(updated.map(p => p.id));
                const newProducts = products.filter(p => p.id && !existingIds.has(p.id));
                return newProducts.length > 0
                    ? [...updated, ...shuffleArray(newProducts)]
                    : updated;
            });
            previousProductsLengthRef.current = currentLength;
            previousProductsIdsRef.current = currentProductsIds;
        } else if (currentLength > previousLength) {
            // Подгрузка (load more) — добавляем перемешанные новые в конец
            setShuffledProducts(prevShuffled => {
                const existingIds = new Set(prevShuffled.map(p => p?.id));
                const newProducts = products.filter(p => p?.id && !existingIds.has(p.id));
                
                if (newProducts.length > 0) {
                    const shuffledNewProducts = shuffleArray(newProducts);
                    return [...prevShuffled, ...shuffledNewProducts];
                }
                
                if (prevShuffled.length < currentLength) {
                    // Новых ID нет, но длина выросла — обновляем на месте
                    const productMap = new Map(products.map(p => [p.id, p]));
                    return prevShuffled.map(p => productMap.get(p.id) || p);
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
        
        // При первой инициализации всегда загружаем данные, даже если кэш свежий
        const isFirstLoad = !isInitializedRef.current;
        
        // Если данные уже есть и кэш свежий, и это не первая загрузка, не загружаем
        if (!forceRefresh && !isFirstLoad && dataReady && !shouldRefreshCache()) {
            return;
        }

        const isRefresh = forceRefresh || isRefreshingRef.current;
        
        if (isRefresh) {
            isRefreshingRef.current = true;
            setIsRefreshing(true);
        } else if (!isInitializedRef.current) {
            setIsInitialLoading(true);
        }

        try {
            // При первой загрузке или принудительном обновлении используем refresh: true
            const shouldRefresh = forceRefresh || isFirstLoad;
            
            await Promise.all([
                dispatch(fetchProducts({ 
                    page: 1, 
                    limit: PRODUCTS_PER_PAGE, 
                    refresh: shouldRefresh,
                    usePublicCatalog: usePublicCatalogForMain
                })).unwrap(),
                dispatch(fetchBanners({ 
                    type: 'MAIN', 
                    active: true, 
                    refresh: shouldRefresh 
                })).unwrap(),
                dispatch(fetchCategories({ 
                    refresh: shouldRefresh 
                })).unwrap()
            ]);

            await loadSupplierModerationProducts();
            await loadSuperAdminPendingProducts();

            lastFetchTimeRef.current = Date.now();
            isInitializedRef.current = true;
            
        } catch (err) {
            console.error('MainScreen: Ошибка загрузки данных:', err);
            isInitializedRef.current = true;
        } finally {
            if (isMountedRef.current) {
                setIsInitialLoading(false);
                isRefreshingRef.current = false;
                setIsRefreshing(false);
            }
        }
    }, [dispatch, activeBanners, categories?.length, shouldRefreshCache, loadSupplierModerationProducts, loadSuperAdminPendingProducts, usePublicCatalogForMain]);
    
    // Сохраняем стабильную ссылку на loadAllData
    useEffect(() => {
        loadAllDataRef.current = loadAllData;
    }, [loadAllData]);

    useEffect(() => {
        const key = usePublicCatalogForMain ? 'public' : 'full';
        if (!isInitializedRef.current) {
            catalogSourceKeyRef.current = key;
            return;
        }
        if (catalogSourceKeyRef.current !== key) {
            catalogSourceKeyRef.current = key;
            if (loadAllDataRef.current) {
                loadAllDataRef.current(true);
            }
        }
    }, [usePublicCatalogForMain]);

    // Если supplier.id появился после первой инициализации (профиль догрузился) — подгружаем товары на модерации
    useEffect(() => {
        if (!isInitializedRef.current) return;
        if (user?.role !== 'SUPPLIER' || user?.supplier?.id == null) return;
        if (supplierModerationFetchedForIdRef.current === user.supplier.id) return;
        loadSupplierModerationProducts();
    }, [user?.role, user?.supplier?.id, loadSupplierModerationProducts]);

    // Загрузка дополнительных продуктов
    const loadMoreProducts = useCallback(() => {
        if (!hasMore || isLoadingMore) {
            return;
        }

        dispatch(fetchProducts({ 
            page: currentPage + 1, 
            limit: PRODUCTS_PER_PAGE,
            usePublicCatalog: usePublicCatalogForMain
        }));
    }, [dispatch, hasMore, isLoadingMore, currentPage, usePublicCatalogForMain]);

    // Принудительное обновление (pull-to-refresh) — перемешивает товары
    const handleRefresh = useCallback(() => {
        dispatch(clearProductsError());
        forceShuffleRef.current = true;
        categoriesRetryAttemptedRef.current = false;
        if (loadAllDataRef.current) {
            loadAllDataRef.current(true);
        }
    }, [dispatch]);

    // Автоматическая повторная загрузка категорий при ошибке или пустом списке.
    // Повторяет до 3 раз с увеличивающимся интервалом.
    const categoriesRetryCountRef = useRef(0);
    const MAX_CATEGORIES_RETRIES = 3;

    useEffect(() => {
        const hasCategories = Array.isArray(categories) && categories.length > 0;

        if (hasCategories || categoriesLoading) {
            categoriesRetryCountRef.current = 0;
            return;
        }

        if (categoriesRetryAttemptedRef.current && categoriesRetryCountRef.current >= MAX_CATEGORIES_RETRIES) {
            return;
        }

        const needsRetry = categoriesError || isInitializedRef.current;
        if (!needsRetry) return;

        categoriesRetryAttemptedRef.current = true;
        const attempt = categoriesRetryCountRef.current;
        const delay = 600 + attempt * 2000;

        const retryTimeout = setTimeout(() => {
            categoriesRetryCountRef.current = attempt + 1;
            dispatch(fetchCategories({ refresh: true }));
        }, delay);

        return () => clearTimeout(retryTimeout);
    }, [dispatch, categories, categoriesLoading, categoriesError]);

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

    const handleWarehouseLocatorPress = useCallback(() => {
        // Пока просто навигация на список складов
        // В будущем можно добавить логику выбора конкретного склада
        navigation.navigate('WarehouseList');
    }, [navigation]);

    // Компоненты рендеринга
    const renderHeader = useCallback(() => (
        <>
            <Header navigation={navigation} />
            {/* <PromoBanner hideLoader={isDataReady} /> */}
            <CategoriesBar hideLoader={false} />
            <LocatorsSlider 
                onDriverPress={handleDriverLocatorPress}
                onWarehousePress={handleWarehouseLocatorPress}
            />
            <IceCreamSeasonBanner />
        </>
    ), [navigation, isDataReady, handleDriverLocatorPress, handleWarehouseLocatorPress]);

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

    // Рендер состояний загрузки (только при первой загрузке без данных)
    if (isInitialLoading && !isDataReady) {
        return (
            <View style={styles.container}>
                {renderHeader()}
                {renderSkeletonLoader()}
            </View>
        );
    }

    // Основной рендер — ProductsList всегда отображает header (баннеры, поиск, логотип),
    // а при ошибке сети / пустых данных показывает retry-кнопку вместо товаров
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
                products={productsForList}
                scrollEnabled={true}
                nestedScrollEnabled={isAndroid}
                contentContainerStyle={{ paddingBottom: listContentPadding }}
                onRetry={handleRefresh}
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
        height: 0,
    },
});