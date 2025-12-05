import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { resetCurrentProduct } from '@entities/product';
import ChatApi from '@entities/chat/api/chatApi';

import { useAuth } from '@entities/auth/hooks/useAuth';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { useToast } from '@shared/ui/Toast';
import { Loader } from '@shared/ui/Loader';
import Text from '@shared/ui/Text/Text';
import { Color } from '@app/styles/GlobalStyles';
import { useCustomAlert } from '@shared/ui/CustomAlert';
import { ReusableModal } from '@shared/ui/Modal/ui/ReusableModal';
import { RepostProductContent } from '@widgets/product/ProductContent/ui/RepostProductContent';

import {
    StaticBackgroundGradient,
    ScrollableBackgroundGradient,
} from '@shared/ui/BackgroundGradient';

// Компоненты продукта
import { ProductHeader } from '@widgets/product/productHeader';
import { ProductContent } from '@widgets/product/ProductContent';
import { SimilarProducts } from '@widgets/similarProducts';
import { RecentFeedbacks } from '@widgets/recentFeedbacks';
import { BrandCard } from '@widgets/brandCard';
import { ProductActions } from '@widgets/product/ProductActions';

// Кастомные хуки
import { useProductDetailState } from '../hooks/useProductDetailState';
import { useProductDetailData } from '../hooks/useProductDetailData';
import { useProductDetailNavigation } from '../hooks/useProductDetailNavigation';

/**
 * Рефакторенный экран детального просмотра продукта
 */
export const ProductDetailScreen = ({ route, navigation }) => {
    const params = route.params || {};
    const productId = params.productId;
    const fromScreen = params.fromScreen;
    const dispatch = useDispatch();
    const { colors } = useTheme();
    const { isAuthenticated, currentUser } = useAuth();
    const { showError, showWarning } = useToast();
    const { showError: showCustomError, showInfo } = useCustomAlert();
    const [isRepostModalVisible, setIsRepostModalVisible] = useState(false);

    // Кастомные хуки для разделения логики
    const {
        contentHeight,
        selectedQuantity,
        activeTab,
        optimisticProduct,
        isMountedRef,
        scrollViewRef,
        scrollY,
        previousProductIdRef,
        visitedProductIdsRef,
        createSafeTimeout,
        scrollToTop,
        handleScroll,
        handleContentSizeChange,
        handleQuantityChange,
        handleTabChange,
        handleViewAllReviews,
        handleProductUpdated,
        setSelectedQuantity,
        setOptimisticProduct
    } = useProductDetailState(productId);

    const {
        product,
        supplier,
        isLoading,
        error,
        refreshData,
        enrichedProduct,
        productImages,
        isInCart,
        cartQuantity,
        addToCart,
        updateQuantity,
        removeFromCart,
        isAdding,
        isUpdating,
        categories,
        similarProducts,
        feedbacks,
        handleRefreshFeedbacks
    } = useProductDetailData(productId, isMountedRef, createSafeTimeout, navigation);

    const {
        handleGoBack,
        handleSupplierPress,
        handleSimilarProductPress
    } = useProductDetailNavigation(navigation, fromScreen, params);

    // Обработка изменения продукта
    useEffect(() => {
        if (productId && productId !== previousProductIdRef.current) {
            // Проверяем, возвращаемся ли мы назад с похожего товара
            // Если текущий productId уже был посещен ранее, это возврат назад
            const isReturningBack = visitedProductIdsRef.current.has(productId);
            
            // Добавляем текущий productId в историю посещений
            visitedProductIdsRef.current.add(productId);
            
            // Ограничиваем размер истории (храним последние 10 посещений)
            if (visitedProductIdsRef.current.size > 10) {
                const firstId = Array.from(visitedProductIdsRef.current)[0];
                visitedProductIdsRef.current.delete(firstId);
            }
            
            // Сбрасываем только при переходе ВПЕРЕД на новый продукт
            // При возврате назад не сбрасываем, чтобы сохранить возможность восстановления из кэша
            const isMovingForward = previousProductIdRef.current && productId && !isReturningBack;
            if (isMovingForward) {
                dispatch(resetCurrentProduct());
                setOptimisticProduct(null);
            }

            // Не скроллим вверх при возврате назад (когда товар уже был посещен)
            if (!isReturningBack) {
                createSafeTimeout(() => {
                    scrollToTop();
                }, 100);
            }

            previousProductIdRef.current = productId;
        }
    }, [productId, scrollToTop, createSafeTimeout, dispatch, setOptimisticProduct]);

    // Обновление количества в корзине
    useEffect(() => {
        if (!isMountedRef.current) return;
        
        if (isInCart && cartQuantity > 0) {
            setSelectedQuantity(cartQuantity);
        } else {
            setSelectedQuantity(1);
        }
    }, [isInCart, cartQuantity, setSelectedQuantity, isMountedRef]);

    // Прокрутка к верху при фокусе
    // НЕ скроллим при возврате назад (когда товар уже был посещен)
    useFocusEffect(
        useCallback(() => {
            if (!isMountedRef.current) return;
            
            // Проверяем, возвращаемся ли мы назад (товар уже был посещен ранее)
            // При первом фокусе на экране не скроллим, если это возврат назад
            const isReturningBack = productId && visitedProductIdsRef.current.has(productId);
            
            // Если это возврат назад, не скроллим
            if (isReturningBack) {
                return;
            }
            
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
                }
            };
        }, [scrollToTop, createSafeTimeout, isMountedRef, productId])
    );

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            const currentRoute = navigation.getState()?.routes?.[navigation.getState()?.index];
            if (currentRoute?.name !== 'ProductDetail') {
                dispatch(resetCurrentProduct());
            }
        };
    }, [dispatch, navigation]);

    // Обработчики корзины
    const handleCartAdd = useCallback(async (quantity) => {
        try {
            await addToCart(quantity);
        } catch (error) {
            console.error('Error adding to cart:', error);
            if (error.message && error.message.includes('403')) {
                showWarning('Корзина доступна только для клиентов', {
                    duration: 4000,
                    position: 'top'
                });
            } else {
                showError('Не удалось добавить товар в корзину', {
                    duration: 3000,
                    position: 'top'
                });
            }
        }
    }, [addToCart, showError, showWarning]);

    const handleCartUpdate = useCallback(async (quantity) => {
        try {
            await updateQuantity(quantity);
        } catch (error) {
            console.error('Error updating quantity:', error);
            if (error.message && error.message.includes('403')) {
                showWarning('Корзина доступна только для клиентов', {
                    duration: 4000,
                    position: 'top'
                });
            } else {
                showError('Не удалось обновить количество', {
                    duration: 3000,
                    position: 'top'
                });
            }
        }
    }, [updateQuantity, showError, showWarning]);

    const handleCartRemove = useCallback(async () => {
        try {
            await removeFromCart();
            // Используем Toast вместо Alert для успешного удаления
            const { showSuccess } = require('@shared/ui/Toast').useToast();
            showSuccess(`"${enrichedProduct?.name}" удален из корзины`, {
                duration: 3000,
                position: 'top'
            });
        } catch (error) {
            console.error('Error removing from cart:', error);
            if (error.message && error.message.includes('403')) {
                showWarning('Корзина доступна только для клиентов', {
                    duration: 4000,
                    position: 'top'
                });
            } else {
                showError('Не удалось удалить товар из корзины', {
                    duration: 3000,
                    position: 'top'
                });
            }
        }
    }, [removeFromCart, enrichedProduct?.name, showError, showWarning]);

    const handleAddToCart = useCallback(async () => {
        if (enrichedProduct && productId) {
            try {
                if (isInCart) {
                    await updateQuantity(selectedQuantity);
                } else {
                    await addToCart(selectedQuantity);
                }
            } catch (error) {
                console.error('Error with cart operation:', error);
                if (error.message && error.message.includes('403')) {
                    showWarning('Корзина доступна только для клиентов', {
                        duration: 4000,
                        position: 'top'
                    });
                } else {
                    showError('Не удалось обновить корзину', {
                        duration: 3000,
                        position: 'top'
                    });
                }
            }
        }
    }, [enrichedProduct, productId, selectedQuantity, isInCart, addToCart, updateQuantity, showError, showWarning]);

    // Обработчик репоста товара
    const handleSharePress = useCallback(() => {
        if (!isAuthenticated) {
            showInfo('Требуется авторизация', 'Для отправки товара в чат необходимо войти в систему');
            return;
        }
        setIsRepostModalVisible(true);
    }, [isAuthenticated, showInfo]);

    // Обработчик вопроса о продукте
    const handleAskQuestion = useCallback(async () => {
        if (!isAuthenticated) {
            showInfo('Требуется авторизация', 'Для отправки вопросов необходимо войти в систему');
            return;
        }

        try {
            if (!enrichedProduct?.id) return;
            
            const res = await ChatApi.getOrCreateProductRoom(enrichedProduct.id);
            const data = res?.data;
            const roomObj = data?.room || data?.data?.room;
            const roomId = roomObj?.id || data?.data?.id || data?.roomId || data?.id;

            if (!roomId) {
                console.warn('handleAskQuestion: roomId not found in response', res?.data);
                return;
            }

            const productInfo = {
                id: enrichedProduct.id,
                name: enrichedProduct.name,
                price: enrichedProduct.price,
                image: enrichedProduct.images?.[0] || null,
                supplierId: enrichedProduct.supplierId,
                supplier: supplier || enrichedProduct.supplier,
                ...enrichedProduct
            };

            const companyName = supplier?.companyName 
                || supplier?.user?.companyName
                || enrichedProduct.supplier?.companyName 
                || enrichedProduct.supplier?.user?.companyName
                || supplier?.name
                || enrichedProduct.supplier?.name
                || 'Компания';

            const roomTitle = companyName;
            const currentUserId = currentUser?.id;
            
            try {
                navigation.navigate('ChatList', {
                    screen: 'ChatRoom',
                    params: {
                        roomId,
                        roomTitle,
                        productId: enrichedProduct.id,
                        productInfo,
                        roomData: roomObj,
                        currentUserId,
                        fromScreen: 'ProductDetail', 
                        autoSendProduct: true
                    }
                });
            } catch (err) {
                navigation.navigate('ChatRoom', { 
                    roomId, 
                    roomTitle,
                    productId: enrichedProduct.id,
                    productInfo,
                    roomData: roomObj,
                    currentUserId,
                    fromScreen: 'ProductDetail',
                    autoSendProduct: true
                });
            }
        } catch (e) {
            console.error('Open product chat error', e);
            showCustomError('Ошибка', 'Не удалось открыть чат');
        }
    }, [enrichedProduct, supplier, navigation, currentUser, isAuthenticated, showInfo, showCustomError]);

    // Мемоизированные компоненты
    const displayProduct = useMemo(() => {
        if (!enrichedProduct || !productId || enrichedProduct.id !== productId) {
            return null;
        }
        
        if (optimisticProduct) {
            return { ...enrichedProduct, ...optimisticProduct };
        }
        
        return enrichedProduct;
    }, [enrichedProduct, productId, optimisticProduct]);

    const productHeaderComponent = useMemo(() => {
        if (!displayProduct?.id) return null;
        
        return (
            <ProductHeader
                product={{ ...displayProduct, images: productImages }}
                scrollY={scrollY}
                onGoBack={handleGoBack}
                onSharePress={handleSharePress}
                isAuthenticated={isAuthenticated}
            />
        );
    }, [displayProduct, productImages, scrollY, handleGoBack, handleSharePress, isAuthenticated]);

    const productContentComponent = useMemo(() => {
        if (!displayProduct?.id) return null;
        
        return (
            <ProductContent
                product={displayProduct}
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
                maxQuantity={displayProduct?.availableQuantity || displayProduct?.stockQuantity}
                isInCart={isInCart}
                onAddToCart={handleCartAdd}
                onUpdateQuantity={handleCartUpdate}
                onRemoveFromCart={handleCartRemove}
                autoCartManagement={true}
                currentUser={currentUser}
            />
        );
    }, [
        displayProduct,
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
        if (!displayProduct?.id) return null;
        
        return (
            <ProductActions
                product={displayProduct}
                onAddToCart={handleAddToCart}
                quantity={selectedQuantity}
                onProductUpdated={(data) => handleProductUpdated(data, refreshData)}
                onAskQuestion={handleAskQuestion}
            />
        );
    }, [displayProduct, handleAddToCart, selectedQuantity, handleProductUpdated, refreshData, handleAskQuestion]);

    const brandCardComponent = useMemo(() => (
        activeTab === 'description' && supplier ? (
            <View style={styles.brandCardContainer}>
                <BrandCard
                    key={`brand-card-${supplier.id}`}
                    supplier={supplier}
                    onSupplierPress={() => handleSupplierPress(productId, displayProduct?.supplierId)}
                />
            </View>
        ) : null
    ), [activeTab, supplier, handleSupplierPress, productId, displayProduct?.supplierId]);

    const recentFeedbacksComponent = useMemo(() => (
        activeTab === 'description' && Array.isArray(feedbacks) && feedbacks.length > 0 ? (
            <RecentFeedbacks
                feedbacks={feedbacks}
                productId={displayProduct?.id || 0}
                onViewAllPress={handleViewAllReviews}
            />
        ) : null
    ), [activeTab, feedbacks, displayProduct?.id, handleViewAllReviews]);

    const similarProductsComponent = useMemo(() => {
        if (!similarProducts || !Array.isArray(similarProducts) || similarProducts.length === 0 || !productId) {
            return null;
        }
        
        return (
            <SimilarProducts
                key={`similar-products-${productId}`}
                products={similarProducts}
                color={colors}
                onProductPress={(similarProductId) => handleSimilarProductPress(similarProductId, productId)}
                currentProductId={productId}
            />
        );
    }, [similarProducts, colors, handleSimilarProductPress, productId]);

    // Состояния загрузки и ошибок
    if (isLoading && !displayProduct) {
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

    if (error && !displayProduct) {
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
                            onPress={() => refreshData(true)}
                        >
                            <Text style={styles.retryButtonText}>Попробовать снова</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // Показываем ошибку только если:
    // 1. Нет продукта
    // 2. Не загружается
    // 3. Есть ошибка или продукт действительно не найден (не просто временная задержка)
    // 4. productId существует (чтобы не показывать ошибку при инициализации)
    if (!displayProduct && !isLoading && productId && (error || !product)) {
        return (
            <View style={styles.fullScreenContainer}>
                <SafeAreaView style={styles.safeArea}>
                    <StaticBackgroundGradient />
                    <View style={styles.errorContainer}>
                        <Text style={[styles.errorText, { color: colors.primary }]}>
                            {error || 'Продукт не найден'}
                        </Text>
                        <TouchableOpacity 
                            style={styles.retryButton} 
                            onPress={() => {
                                if (error) {
                                    refreshData(true);
                                } else {
                                    handleGoBack();
                                }
                            }}
                        >
                            <Text style={styles.retryButtonText}>
                                {error ? 'Попробовать снова' : 'Вернуться назад'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // Основной рендер
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

            {/* Модальное окно репоста товара */}
            {isAuthenticated && displayProduct && (
                <ReusableModal
                    visible={isRepostModalVisible}
                    onClose={() => setIsRepostModalVisible(false)}
                    title="Отправить товар"
                    height={85}
                    fullScreenOnKeyboard={true}
                >
                    <RepostProductContent 
                        product={displayProduct}
                        currentUser={currentUser}
                        onClose={() => setIsRepostModalVisible(false)}
                    />
                </ReusableModal>
            )}
        </View>
    );
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
