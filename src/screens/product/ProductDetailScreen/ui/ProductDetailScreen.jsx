import React, {useState, useRef, useMemo, useCallback, useEffect} from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    Animated,
    Dimensions,
    Alert,
    TouchableOpacity,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import {resetCurrentProduct, selectSimilarProducts} from '@entities/product';
import {
    selectFeedbacksByProductId,
    fetchProductFeedbacks
} from '@entities/feedback';
import { selectCategories, fetchCategories } from '@entities/category';
import { useProductDetail } from '@entities/product';
import { useCartProduct } from '@entities/cart';
import { ProductHeader } from '@widgets/product/productHeader';
import { ProductContent } from '@widgets/product/ProductContent';
import { SimilarProducts } from '@widgets/similarProducts';
import { RecentFeedbacks } from '@widgets/recentFeedbacks';
import { BrandCard } from '@widgets/brandCard';
import { ProductActions } from '@widgets/product/ProductActions';
import ChatApi from '@entities/chat/api/chatApi';

import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { Loader } from '@shared/ui/Loader';
import Text from '@shared/ui/Text/Text';

import {
    StaticBackgroundGradient,
    ScrollableBackgroundGradient,
} from '@shared/ui/BackgroundGradient';
import { useAuth } from "@entities/auth/hooks/useAuth";
import {Color} from "@app/styles/GlobalStyles";

const placeholderImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ProductDetailScreen = ({ route, navigation }) => {
    const params = route.params || {};
    const productId = params.productId;
    const fromScreen = params.fromScreen;
    const previousProductId = params.previousProductId;
    const supplierId = params.supplierId;

    const hasLoggedRef = useRef(false);
    
    if (process.env.NODE_ENV === 'development' && productId && !hasLoggedRef.current) {
        console.log('ProductDetailScreen: Component mounting with params:', route.params);
        console.log('ProductDetailScreen: Initial setup complete, productId:', productId);
        hasLoggedRef.current = true;
    }

    const dispatch = useDispatch();
    const { colors } = useTheme();
    const { isAuthenticated, currentUser, hasPermission } = useAuth();

    const isMountedRef = useRef(true);
    const timersRef = useRef([]);
    const scrollViewRef = useRef(null);
    const scrollY = useRef(new Animated.Value(0)).current; // Стабилизируем Animated.Value
    const previousProductIdRef = useRef(productId);
    const isNavigatingRef = useRef(false);
    const backInterceptRef = useRef(false);

    const navigationParamsRef = useRef({
        productId,
        fromScreen,
        previousProductId,
        originalFromScreen: params.originalFromScreen,
        supplierId,
    });

    useEffect(() => {
        navigationParamsRef.current = {
            productId,
            fromScreen,
            previousProductId,
            originalFromScreen: params.originalFromScreen,
            supplierId,
        };
    }, [productId, fromScreen, previousProductId, params.originalFromScreen, supplierId]);

    // Перехватываем системную кнопку назад/жест назад: если пришли из чата, не возвращаемся в чат
    useEffect(() => {
        const sub = navigation.addListener('beforeRemove', (e) => {
            const origin = navigationParamsRef.current?.fromScreen || fromScreen;
            if (origin === 'ChatRoom' || origin === 'ChatList') {
                // защита от рекурсии: reset тоже триггерит beforeRemove
                if (backInterceptRef.current) return;
                backInterceptRef.current = true;
                e.preventDefault();
                navigation.dispatch(
                    CommonActions.reset({ index: 0, routes: [{ name: 'MainTab' }] })
                );
                setTimeout(() => { backInterceptRef.current = false; }, 800);
            }
        });
        return sub;
    }, [navigation, fromScreen]);

    const {
        product,
        supplier,
        isLoading,
        error,
        refreshData
    } = useProductDetail(productId);

    const {
        isInCart,
        quantity: cartQuantity,
        addToCart,
        updateQuantity,
        removeFromCart,
        isAdding,
        isUpdating
    } = useCartProduct(productId);

    const [contentHeight, setContentHeight] = useState(SCREEN_HEIGHT * 2);
    const [selectedQuantity, setSelectedQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('description');
    const [optimisticProduct, setOptimisticProduct] = useState(null);
    const handleAskQuestion = useCallback(async () => {
        try {
            if (!product?.id) return;
            
            // Получаем или создаем комнату для товара
            const res = await ChatApi.getOrCreateProductRoom(product.id);
            const data = res?.data;
            const roomObj = data?.room || data?.data?.room;
            const roomId = roomObj?.id
                || data?.data?.id
                || data?.roomId
                || data?.id;

            if (!roomId) {
                console.warn('handleAskQuestion: roomId not found in response', res?.data);
                return;
            }

            // Подготавливаем информацию о товаре для передачи в чат
            const productInfo = {
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.images?.[0] || null,
                supplierId: product.supplierId,
                supplier: supplier || product.supplier,
                images: product.images || [],
                description: product.description,
                category: product.category,
                categories: product.categories,
                weight: product.weight,
                itemsPerBox: product.itemsPerBox,
                stockQuantity: product.stockQuantity,
                ...product
            };

            // Получаем название компании поставщика для заголовка
            const companyName = supplier?.companyName 
                || supplier?.user?.companyName
                || product.supplier?.companyName 
                || product.supplier?.user?.companyName
                || supplier?.name
                || product.supplier?.name
                || 'Компания';

            const roomTitle = companyName;

            // Получаем текущего пользователя
            const currentUserId = currentUser?.id;
            
            // Надежная навигация в ChatList стек
            try {
                // Сначала переходим в ChatList таб, а затем в конкретную комнату
                navigation.navigate('ChatList', {
                    screen: 'ChatRoom',
                    params: {
                        roomId,
                        roomTitle,
                        productId: product.id,
                        productInfo,
                        roomData: roomObj,
                        currentUserId,
                        fromScreen: 'ProductDetail', // Указываем, что пришли из товара
                        autoSendProduct: true // Флаг для автоматической отправки товара
                    }
                });
            } catch (err) {
                try {
                    navigation.navigate('ChatRoom', { 
                        roomId, 
                        roomTitle,
                        productId: product.id,
                        productInfo,
                        roomData: roomObj,
                        currentUserId,
                        fromScreen: 'ProductDetail',
                        autoSendProduct: true
                    });
                } catch (err2) {
                    const { navigationRef } = require('@shared/utils/NavigationRef');
                    navigationRef?.current?.navigate('ChatRoom', { 
                        roomId, 
                        roomTitle,
                        productId: product.id,
                        productInfo,
                        roomData: roomObj,
                        currentUserId,
                        fromScreen: 'ProductDetail',
                        autoSendProduct: true
                    });
                }
            }
        } catch (e) {
            console.error('Open product chat error', e);
        }
    }, [product, supplier, navigation, currentUser]);

    const fadeAnim = useRef(new Animated.Value(1)).current;

    // Загружаем категории для правильного отображения названий
    const categories = useSelector(selectCategories);

    // Загружаем категории при инициализации
    useEffect(() => {
        if (!categories || categories.length === 0) {
            dispatch(fetchCategories());
        }
    }, [dispatch, categories]);

    useEffect(() => {
        if (!isMountedRef.current) return;
        
        if (isInCart && cartQuantity > 0) {
            setSelectedQuantity(cartQuantity);
        } else {
            setSelectedQuantity(1);
        }
    }, [isInCart, cartQuantity]);

    const scrollToTop = useCallback(() => {
        if (isMountedRef.current && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
                y: 0,
                animated: true
            });
        }
    }, []);

    const createSafeTimeout = useCallback((callback, delay) => {
        const timeoutId = setTimeout(() => {
            if (isMountedRef.current) {
                callback();
            }
        }, delay);
        
        timersRef.current.push(timeoutId);
        return timeoutId;
    }, []);

    const clearAllTimers = useCallback(() => {
        timersRef.current.forEach(timerId => clearTimeout(timerId));
        timersRef.current = [];
    }, []);

    useEffect(() => {
        if (productId && productId !== previousProductIdRef.current) {
            if (previousProductIdRef.current) {
                console.log('ProductDetailScreen: Очищаем состояние при смене продукта:', {
                    from: previousProductIdRef.current,
                    to: productId
                });
                dispatch(resetCurrentProduct());
                setOptimisticProduct(null);
            }

            createSafeTimeout(() => {
                scrollToTop();
            }, 100);

            previousProductIdRef.current = productId;
        }
    }, [productId, scrollToTop, createSafeTimeout, dispatch]);

    useFocusEffect(
        useCallback(() => {
            if (!isMountedRef.current) return;
            
            let isFirstFocus = true;
            
            const timer = createSafeTimeout(() => {
                if (isFirstFocus && isMountedRef.current) {
                    scrollToTop();
                    isFirstFocus = false;
                }
            }, 150);

            return () => {
                isFirstFocus = false;
                if (timer) {
                    clearTimeout(timer);
                    const index = timersRef.current.indexOf(timer);
                    if (index > -1) {
                        timersRef.current.splice(index, 1);
                    }
                }
            };
        }, [scrollToTop, createSafeTimeout])
    );

    const displayProduct = useMemo(() => {
        if (!product || !productId || product.id !== productId) {
            return null;
        }
        
        if (optimisticProduct) {
            console.log('ProductDetailScreen: Используем оптимистичные данные:', optimisticProduct);
            return { ...product, ...optimisticProduct };
        }
        
        return product;
    }, [product, productId, optimisticProduct]);

    const animateUpdate = useCallback(() => {
        if (!isMountedRef.current) return;
        
        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 0.7,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start((finished) => {
            // Проверяем, что анимация завершилась успешно и компонент все еще смонтирован
            if (!finished || !isMountedRef.current) {
                return;
            }
        });
    }, [fadeAnim]);

    const handleScroll = useCallback(
        Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false }),
        [scrollY]
    );

    const similarProducts = useSelector(state => {
        if (!productId) return [];
        try {
            return selectSimilarProducts(state, productId) || [];
        } catch (error) {
            console.warn('Ошибка в selectSimilarProducts:', error);
            return [];
        }
    });

    const feedbacks = useSelector(state => {
        if (!productId) return [];
        try {
            return selectFeedbacksByProductId(state, productId) || [];
        } catch (error) {
            console.warn('Ошибка в selectFeedbacksByProductId:', error);
            return [];
        }
    });

    useEffect(() => {
        if (!productId) {
            console.warn('ProductDetailScreen: Нет productId в параметрах:', route.params);

            const possibleId = route.params?.id || route.params?.productId;
            if (possibleId) {
                navigation.setParams({ productId: possibleId });
            } else {
                createSafeTimeout(() => {
                    if (isMountedRef.current && navigation.canGoBack()) {
                        navigation.goBack();
                    }
                }, 100);
            }
            return;
        }

        if (!navigation.getState) {
            console.warn('ProductDetailScreen: Navigation state недоступен');
            return;
        }

    }, [navigation, productId, createSafeTimeout, route.params]);

    const handleGoBack = useCallback(() => {
        if (isNavigatingRef.current) {
            console.log('ProductDetailScreen: Навигация уже в процессе, игнорируем');
            return;
        }

        isNavigatingRef.current = true;

        try {
            dispatch(resetCurrentProduct());

            setTimeout(() => {
                const origin = navigationParamsRef.current?.fromScreen || fromScreen;
                if (origin === 'ChatRoom' || origin === 'ChatList') {
                    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'MainTab' }] }));
                    setTimeout(() => { isNavigatingRef.current = false; }, 500);
                    return;
                }
                try {
                    navigation.goBack();
                } catch (innerError) {
                    console.error('ProductDetailScreen: Ошибка при навигации назад:', innerError);
                    try {
                        navigation.goBack();
                    } catch (fallbackError) {
                        console.error('ProductDetailScreen: Критическая ошибка навигации:', fallbackError);
                    }
                } finally {
                    setTimeout(() => {
                        isNavigatingRef.current = false;
                    }, 1000);
                }
            }, 50);
        } catch (error) {
            console.error('ProductDetailScreen: Критическая ошибка:', error);
            isNavigatingRef.current = false;
        }
    }, [dispatch, fromScreen, navigation, params]);

    useEffect(() => {
        if (!isMountedRef.current || !error) return;
        
        console.error('Ошибка при загрузке продукта:', error);

        if (error.includes('не найден') || error.includes('недоступен') || error.includes('Продукт не найден')) {
            createSafeTimeout(() => {
                if (isMountedRef.current && navigation.canGoBack()) {
                    navigation.goBack();
                }
            }, 500);
        }
    }, [error, navigation, createSafeTimeout]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            isNavigatingRef.current = false;
            
            clearAllTimers();
            
            fadeAnim.stopAnimation();
            scrollY.stopAnimation();
            
            const currentRoute = navigation.getState()?.routes?.[navigation.getState()?.index];
            if (currentRoute?.name !== 'ProductDetail') {
                dispatch(resetCurrentProduct());
            }
        };
    }, [dispatch, navigation, clearAllTimers, fadeAnim, scrollY]);

    const handleContentSizeChange = useCallback((width, height) => {
        setContentHeight(height + 100);
    }, []);

    const handleProductUpdated = useCallback((updatedProductData) => {
        if (!isMountedRef.current) return;
        
        console.log('ProductDetailScreen: Получены обновленные данные продукта:', updatedProductData);
        
        setOptimisticProduct(updatedProductData);

        animateUpdate();

        // Сразу обновляем данные, не ждем 1 секунду
        createSafeTimeout(() => {
            if (isMountedRef.current) {
                console.log('ProductDetailScreen: Обновляем данные после изменения');
                refreshData(true);
                setOptimisticProduct(null);
            }
        }, 100); // Уменьшаем задержку до 100мс
    }, [animateUpdate, refreshData, createSafeTimeout]);

    const handleCartAdd = useCallback(async (quantity) => {
        try {
            await addToCart(quantity);
            Alert.alert('Товар добавлен', `"${product?.name}" добавлен в корзину (${quantity} шт.)`);
        } catch (error) {
            console.error('Ошибка при добавлении в корзину:', error);
            Alert.alert('Ошибка', 'Не удалось добавить товар в корзину');
        }
    }, [addToCart, product?.name]);

    const handleCartUpdate = useCallback(async (quantity) => {
        try {
            await updateQuantity(quantity);
        } catch (error) {
            console.error('Ошибка при обновлении количества:', error);
            Alert.alert('Ошибка', 'Не удалось обновить количество');
        }
    }, [updateQuantity]);

    const handleCartRemove = useCallback(async () => {
        try {
            await removeFromCart();
            Alert.alert('Товар удален', `"${product?.name}" удален из корзины`);
        } catch (error) {
            console.error('Ошибка при удалении из корзины:', error);
            Alert.alert('Ошибка', 'Не удалось удалить товар из корзины');
        }
    }, [removeFromCart, product?.name]);

    const handleAddToCart = useCallback(async () => {
        if (product && productId) {
            try {
                if (isInCart) {
                    await updateQuantity(selectedQuantity);
                    Alert.alert('Количество обновлено', `Количество "${product.name}" обновлено до ${selectedQuantity}`);
                } else {
                    await addToCart(selectedQuantity);
                    Alert.alert('Товар добавлен', `"${product.name}" добавлен в корзину (${selectedQuantity} шт.)`);
                }
            } catch (error) {
                console.error('Ошибка при работе с корзиной:', error);
                Alert.alert('Ошибка', 'Не удалось обновить корзину');
            }
        }
    }, [product, productId, selectedQuantity, isInCart, addToCart, updateQuantity]);

    const handleQuantityChange = useCallback((newQuantity) => {
        setSelectedQuantity(newQuantity);
    }, []);

    const handleTabChange = useCallback((tabId) => {
        setActiveTab(tabId);
    }, []);

    const handleViewAllReviews = useCallback(() => {
        if (!isMountedRef.current) return;
        
        setActiveTab('reviews');
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: 350, animated: true });
        }
    }, []);

    const handleSupplierPress = useCallback(() => {
        if (product?.supplierId) {
            navigation.navigate('SupplierScreen', {
                supplierId: product.supplierId,
                fromScreen: 'ProductDetail',
                previousProductId: productId
            });
        }
    }, [navigation, product?.supplierId, productId]);

    const handleSimilarProductPress = useCallback((similarProductId) => {
        if (!isMountedRef.current || !similarProductId) return;
        
        console.log('ProductDetailScreen: Переход к похожему продукту', {
            from: productId,
            to: similarProductId,
            fromScreen
        });
        
        dispatch(resetCurrentProduct());
        
        navigation.push('ProductDetail', {
            productId: similarProductId,
            fromScreen: 'SimilarProducts',
            previousProductId: productId,
            originalFromScreen: fromScreen || 'MainTab'
        });
    }, [navigation, productId, fromScreen, dispatch]);

    const handleRefreshFeedbacks = useCallback(async () => {
        if (productId) {
            try {
                await dispatch(fetchProductFeedbacks(productId)).unwrap();
            } catch (err) {
                console.error('Ошибка при обновлении отзывов:', err);
            }
        }
    }, [dispatch, productId]);

    const productImages = useMemo(() => {
        const baseProduct = displayProduct || product;
        if (!baseProduct || !baseProduct.images || !Array.isArray(baseProduct.images)) {
            return [];
        }
        return baseProduct.images;
    }, [displayProduct, product]);

    const enrichedProduct = useMemo(() => {
        const baseProduct = displayProduct || product;
        if (!baseProduct || !baseProduct.id) return null;
        
        // Добавляем коробочную информацию
        const itemsPerBox = baseProduct.itemsPerBox || 1;
        const pricePerItem = baseProduct.price || 0;
        const boxPrice = baseProduct.boxPrice || (pricePerItem * itemsPerBox);
        const stockBoxes = baseProduct.stockQuantity || 0;
        const totalItems = stockBoxes * itemsPerBox;
        
        // Обрабатываем категории - поддерживаем как старый формат (category), так и новый (categories)
        let productCategories = [];
        if (baseProduct.categories && Array.isArray(baseProduct.categories)) {
            productCategories = baseProduct.categories;
        } else if (baseProduct.category) {
            // Для обратной совместимости
            productCategories = [baseProduct.category];
        }

        // Обогащаем категории названиями из загруженных категорий
        const enrichedCategories = productCategories.map(category => {
            // Если category уже объект с именем, возвращаем как есть
            if (typeof category === 'object' && category.name) {
                return category;
            }
            
            // Если category - это ID, ищем в загруженных категориях
            if (typeof category === 'number' || typeof category === 'string') {
                const categoryId = parseInt(category);
                const foundCategory = categories?.find(cat => cat.id === categoryId);
                if (foundCategory) {
                    return foundCategory;
                }
                // Если не нашли, создаем объект с ID
                return { id: categoryId, name: `Категория ${category}` };
            }
            
            return category;
        });
        
        const enriched = {
            ...baseProduct,
            itemsPerBox,
            pricePerItem,
            boxPrice,
            stockBoxes,
            totalItems,
            categories: enrichedCategories, // Обновленные категории с названиями
            // Для обратной совместимости с существующими компонентами
            availableQuantity: totalItems,
            // Обновляем stockQuantity для отображения общего количества штук в некоторых компонентах
            displayStockQuantity: stockBoxes, // количество коробок для админки
            stockQuantity: totalItems, // общее количество штук для корзины
        };
        
        return supplier ? { ...enriched, supplier } : enriched;
    }, [displayProduct, product, supplier, categories]);

    const headerBackHandler = handleGoBack;

    const productHeaderComponent = useMemo(() => {
        try {
            if (!enrichedProduct || !enrichedProduct.id) return null;
            
            return (
                <ProductHeader
                    product={{ ...enrichedProduct, images: productImages }}
                    scrollY={scrollY}
                    onGoBack={headerBackHandler}
                />
            );
        } catch (error) {
            console.error('ProductDetailScreen: Error in productHeaderComponent:', error);
            return null;
        }
    }, [enrichedProduct, productImages, scrollY, headerBackHandler]);

    const productContentComponent = useMemo(() => {
        try {
            if (!enrichedProduct || !enrichedProduct.id) return null;
            
            return (
                <ProductContent
                    product={enrichedProduct}
                    feedbacks={feedbacks || []}
                    feedbackLoading={false}
                    feedbackError={null}
                    isFeedbacksLoaded={Array.isArray(feedbacks) && feedbacks.length > 0}
                    quantity={cartQuantity || 0}
                    activeTab={activeTab}
                    onQuantityChange={handleQuantityChange}
                    onTabChange={handleTabChange}
                    onRefreshFeedbacks={handleRefreshFeedbacks}
                    isUpdatingQuantity={isUpdating}
                    maxQuantity={enrichedProduct?.availableQuantity || enrichedProduct?.stockQuantity}
                    isInCart={isInCart}
                    onAddToCart={handleCartAdd}
                    onUpdateQuantity={handleCartUpdate}
                    onRemoveFromCart={handleCartRemove}
                    autoCartManagement={true}
                    currentUser={currentUser}
                />
            );
        } catch (error) {
            console.error('ProductDetailScreen: Error in productContentComponent:', error);
            return null;
        }
    }, [
        enrichedProduct,
        feedbacks,
        cartQuantity,
        activeTab,
        handleQuantityChange,
        handleTabChange,
        handleRefreshFeedbacks,
        isUpdating,
        isInCart,
        handleCartAdd,
        handleCartUpdate,
        handleCartRemove,
        currentUser
    ]);

    const productActionsComponent = useMemo(() => {
        try {
            if (!enrichedProduct || !enrichedProduct.id) {
                return null;
            }
            
            console.log('ProductDetailScreen: Rendering ProductActions safely');
            return (
                <ProductActions
                    product={enrichedProduct}
                    onAddToCart={handleAddToCart}
                    quantity={selectedQuantity}
                    onProductUpdated={handleProductUpdated}
                    onAskQuestion={handleAskQuestion}
                />
            );
        } catch (error) {
            console.error('ProductDetailScreen: Error in productActionsComponent:', error);
            return null;
        }
    }, [enrichedProduct, handleAddToCart, selectedQuantity, handleProductUpdated]);

    const brandCardComponent = useMemo(() => (
        activeTab === 'description' && supplier ? (
            <View style={styles.brandCardContainer}>
                <BrandCard
                    key={`brand-card-${supplier.id}`}
                    supplier={supplier}
                    onSupplierPress={handleSupplierPress}
                />
            </View>
        ) : null
    ), [activeTab, supplier, handleSupplierPress]);

    const recentFeedbacksComponent = useMemo(() => (
        activeTab === 'description' && Array.isArray(feedbacks) && feedbacks.length > 0 ? (
            <RecentFeedbacks
                feedbacks={feedbacks}
                productId={product?.id || 0}
                onViewAllPress={handleViewAllReviews}
            />
        ) : null
    ), [activeTab, feedbacks, product?.id, handleViewAllReviews]);

    const similarProductsComponent = useMemo(() => {
        try {
            if (!similarProducts || !Array.isArray(similarProducts) || similarProducts.length === 0 || !productId) {
                return null;
            }
            
            return (
                <SimilarProducts
                    key={`similar-products-${productId}`} // Принудительное обновление при смене продукта
                    products={similarProducts}
                    color={colors}
                    onProductPress={handleSimilarProductPress}
                    currentProductId={productId}
                />
            );
        } catch (error) {
            console.error('ProductDetailScreen: Error in similarProductsComponent:', error);
            return null;
        }
    }, [similarProducts, colors, handleSimilarProductPress, productId]);

    if (isLoading && !enrichedProduct) {
        return (
            <View style={styles.fullScreenContainer}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.errorContainer}>
                        <Loader />
                        <Text style={[styles.loadingText, { color: Color.dark }]}>
                            Загрузка продукта...
                        </Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    if (error && !enrichedProduct) {
        return (
            <View style={styles.fullScreenContainer}>
                <SafeAreaView style={styles.safeArea}>
                    <StaticBackgroundGradient />
                    <View style={styles.errorContainer}>
                        <Text style={[styles.errorText, { color: Color.dark }]}>
                            Произошла ошибка: {error}
                        </Text>
                        <TouchableOpacity 
                            style={styles.retryButton} 
                            onPress={() => {
                                setError(null);
                                refreshData(true);
                            }}
                        >
                            <Text style={styles.retryButtonText}>Попробовать снова</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    if (!enrichedProduct && !isLoading) {
        return (
            <View style={styles.fullScreenContainer}>
                <SafeAreaView style={styles.safeArea}>
                    <StaticBackgroundGradient />
                    <View style={styles.errorContainer}>
                        <Text style={[styles.errorText, { color: colors.primary }]}>
                            Продукт не найден
                        </Text>
                        <TouchableOpacity 
                            style={styles.retryButton} 
                            onPress={handleGoBack}
                        >
                            <Text style={styles.retryButtonText}>Вернуться назад</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    if (process.env.NODE_ENV === 'development' && (error || !enrichedProduct)) {
        console.log('ProductDetailScreen render state:', {
            productId,
            hasEnrichedProduct: !!enrichedProduct,
            isLoading,
            error
        });
    }

    try {
        if (!enrichedProduct) {
            console.log('ProductDetailScreen: enrichedProduct is null, showing loader');
            return (
                <View style={styles.fullScreenContainer}>
                    <Loader />
                </View>
            );
        }
    } catch (error) {
        console.error('ProductDetailScreen: Error in render preparation:', error);
        return (
            <View style={styles.fullScreenContainer}>
                <StaticBackgroundGradient />
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: Color.dark }]}>
                        Произошла ошибка при отображении продукта
                    </Text>
                </View>
            </View>
        );
    }

    try {
        return (
            <View style={styles.fullScreenContainer}>
                <SafeAreaView style={styles.safeArea}>
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.contentScrollView}
                        showsVerticalScrollIndicator={false}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        contentContainerStyle={styles.scrollContent}
                        onContentSizeChange={handleContentSizeChange}
                        overScrollMode="never"
                        bounces={false}
                    >
                        <ScrollableBackgroundGradient
                            showOverlayGradient={true}
                            showShadowGradient={false}
                            contentHeight={contentHeight}
                        />

                        <View style={styles.contentContainer}>
                            {productHeaderComponent}
                            {productContentComponent}
                            {productActionsComponent}
                            {brandCardComponent}
                            {recentFeedbacksComponent}
                            {similarProductsComponent}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </View>
        );
    } catch (error) {
        console.error('ProductDetailScreen: Critical render error:', error);
        return (
            <View style={styles.fullScreenContainer}>
                <StaticBackgroundGradient />
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: Color.dark }]}>
                        Критическая ошибка при отображении продукта
                    </Text>
                </View>
            </View>
        );
    }
};

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        paddingBottom: 0
    },
    safeArea: {
        flex: 1,
        width: '100%',
    },
    contentScrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 10,
    },
    contentContainer: {
        position: 'relative',
        zIndex: 0,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'transparent',
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
    },
    brandCardContainer: {
        paddingHorizontal: 16,
        marginVertical: 10,
    },
    loadingText: {
        marginTop: 20,
        fontSize: 16,
        textAlign: 'center',
    },
    retryButton: {
        padding: 10,
        backgroundColor: Color.blue2,
        borderRadius: 5,
        marginTop: 20,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
    },
});

export default React.memo(ProductDetailScreen);