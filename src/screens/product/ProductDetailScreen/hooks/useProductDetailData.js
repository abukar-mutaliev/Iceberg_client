import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    selectSimilarProducts,
    resetCurrentProduct 
} from '@entities/product';
import { 
    selectFeedbacksByProductId,
    fetchProductFeedbacks 
} from '@entities/feedback';
import { selectCategories, fetchCategories } from '@entities/category';
import { useProductDetail } from '@entities/product';
import { useCartProduct } from '@entities/cart';

/**
 * Хук для управления данными ProductDetailScreen
 */
export const useProductDetailData = (productId, isMountedRef, createSafeTimeout, navigation) => {
    const dispatch = useDispatch();

    // Основные данные продукта
    const {
        product,
        supplier,
        isLoading,
        error,
        refreshData
    } = useProductDetail(productId);

    // Данные корзины
    const {
        isInCart,
        quantity: cartQuantity,
        addToCart,
        updateQuantity,
        removeFromCart,
        isAdding,
        isUpdating
    } = useCartProduct(productId);

    // Селекторы для дополнительных данных
    const categories = useSelector(selectCategories);
    
    const similarProducts = useSelector(state => {
        if (!productId) return [];
        try {
            return selectSimilarProducts(state, productId) || [];
        } catch (error) {
            console.warn('Error in selectSimilarProducts:', error);
            return [];
        }
    });

    const feedbacks = useSelector(state => {
        if (!productId) return [];
        try {
            return selectFeedbacksByProductId(state, productId) || [];
        } catch (error) {
            console.warn('Error in selectFeedbacksByProductId:', error);
            return [];
        }
    });

    // Загрузка категорий
    useEffect(() => {
        if (!categories || categories.length === 0) {
            dispatch(fetchCategories());
        }
    }, [dispatch, categories]);

    // Обработка ошибок продукта
    useEffect(() => {
        if (!isMountedRef.current || !error) return;
        
        if (error.includes('не найден') || error.includes('недоступен') || error.includes('Продукт не найден')) {
            // Делаем одну повторную попытку загрузки через 1 секунду (для новосозданных продуктов)
            const retryTimeout = createSafeTimeout(() => {
                if (isMountedRef.current && productId) {
                    console.log('[useProductDetailData] Повторная попытка загрузки продукта:', productId);
                    refreshData(true);
                    
                    // Если и после повторной попытки ошибка - возвращаемся назад
                    const finalTimeout = createSafeTimeout(() => {
                        if (isMountedRef.current && error && navigation.canGoBack()) {
                            console.log('[useProductDetailData] Продукт не найден после повторной попытки, возврат назад');
                            navigation.goBack();
                        }
                    }, 2000);
                    
                    return () => {
                        if (finalTimeout) clearTimeout(finalTimeout);
                    };
                }
            }, 1000);
            
            return () => {
                if (retryTimeout) clearTimeout(retryTimeout);
            };
        }
    }, [error, navigation, createSafeTimeout, isMountedRef, productId, refreshData]);

    // Обработка отсутствующего productId
    useEffect(() => {
        if (!productId) {
            const possibleId = navigation.getState()?.routes?.find(route => 
                route.params?.id || route.params?.productId
            )?.params;
            
            if (possibleId?.id || possibleId?.productId) {
                navigation.setParams({ productId: possibleId.id || possibleId.productId });
            } else {
                createSafeTimeout(() => {
                    if (isMountedRef.current && navigation.canGoBack()) {
                        navigation.goBack();
                    }
                }, 100);
            }
        }
    }, [navigation, productId, createSafeTimeout, isMountedRef]);

    // Обогащение продукта дополнительными данными
    const enrichedProduct = useMemo(() => {
        if (!product || !product.id) return null;
        
        // Добавляем коробочную информацию
        const itemsPerBox = product.itemsPerBox || 1;
        const pricePerItem = product.price || 0;
        const boxPrice = product.boxPrice || (pricePerItem * itemsPerBox);
        const stockBoxes = product.stockQuantity || 0;
        const totalItems = stockBoxes * itemsPerBox;
        
        // Обрабатываем категории
        let productCategories = [];
        if (product.categories && Array.isArray(product.categories)) {
            productCategories = product.categories;
        } else if (product.category) {
            productCategories = [product.category];
        }

        // Обогащаем категории данными
        const enrichedCategories = productCategories.map(category => {
            if (typeof category === 'object' && category.name) {
                return category;
            }
            
            if (typeof category === 'number' || typeof category === 'string') {
                const categoryId = parseInt(category);
                const foundCategory = categories?.find(cat => cat.id === categoryId);
                if (foundCategory) {
                    return foundCategory;
                }
                return { id: categoryId, name: `Категория ${category}` };
            }
            
            return category;
        });
        
        const enriched = {
            ...product,
            itemsPerBox,
            pricePerItem,
            boxPrice,
            stockBoxes,
            totalItems,
            categories: enrichedCategories,
            availableQuantity: totalItems,
            displayStockQuantity: stockBoxes,
            stockQuantity: totalItems,
        };
        
        return supplier ? { ...enriched, supplier } : enriched;
    }, [product, supplier, categories]);

    // Изображения продукта
    const productImages = useMemo(() => {
        if (!enrichedProduct || !enrichedProduct.images || !Array.isArray(enrichedProduct.images)) {
            return [];
        }
        return enrichedProduct.images;
    }, [enrichedProduct]);

    // Функция обновления отзывов
    const handleRefreshFeedbacks = async () => {
        if (productId) {
            try {
                await dispatch(fetchProductFeedbacks(productId)).unwrap();
            } catch (err) {
                console.error('Error refreshing feedbacks:', err);
            }
        }
    };

    return {
        // Основные данные
        product,
        supplier,
        isLoading,
        error,
        refreshData,
        enrichedProduct,
        productImages,
        
        // Данные корзины
        isInCart,
        cartQuantity,
        addToCart,
        updateQuantity,
        removeFromCart,
        isAdding,
        isUpdating,
        
        // Дополнительные данные
        categories,
        similarProducts,
        feedbacks,
        
        // Функции
        handleRefreshFeedbacks
    };
};

