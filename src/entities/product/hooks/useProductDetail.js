import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { InteractionManager } from 'react-native';
import {
    fetchProductById,
    selectCurrentProduct,
    resetCurrentProduct,
    selectProductById
} from '@entities/product';
import {
    fetchProductFeedbacks,
    selectIsFeedbacksLoadedSafe
} from '@entities/feedback';
import {
    fetchSupplierById,
    selectSupplierById
} from '@entities/supplier';

/**
 * Кастомный хук для управления данными продукта с оптимизацией ререндеринга
 * @param {number|string} productId - ID продукта для загрузки
 * @returns {Object} - Объект с данными продукта, поставщика, состоянием загрузки и ошибками
 */
export const useProductDetail = (productId) => {
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastLoadedId, setLastLoadedId] = useState(null);
    const [shouldReload, setShouldReload] = useState(false);

    // Ref для отслеживания состояния компонента
    const isMountedRef = useRef(true);

    // Refs для отслеживания состояния загрузки
    const loadingStates = useRef({
        product: false,
        supplier: false,
        feedbacks: false
    });

    // Предотвращаем запросы без ID
    const validProductId = productId ? parseInt(productId, 10) : null;

    // Получаем данные из Redux - СНАЧАЛА ПРОВЕРЯЕМ КЭШИРОВАННЫЕ ДАННЫЕ
    const currentProduct = useSelector(selectCurrentProduct);
    const cachedProduct = useSelector(state =>
        validProductId ? selectProductById(state, validProductId) : null
    );

    // Используем кэшированный продукт, если текущий не загружен
    const product = currentProduct || cachedProduct;

    const supplier = useSelector(state =>
        product?.supplierId ? selectSupplierById(state, product.supplierId) : null
    );
    const isFeedbacksLoaded = useSelector(state =>
        validProductId ? selectIsFeedbacksLoadedSafe(validProductId)(state) : false
    );

    // Обработка размонтирования компонента
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Функция для принудительной загрузки данных
    const forceLoadProductData = useCallback(async () => {
        if (!validProductId || !isMountedRef.current) return;

        console.log('[useProductDetail] Принудительная загрузка продукта:', validProductId);

        loadingStates.current.product = true;
        setIsLoading(true);
        setError(null);

        try {
            // Передаем объект с force: true для принудительного обновления
            const result = await dispatch(fetchProductById({ productId: validProductId, force: true })).unwrap();

            if (isMountedRef.current) {
                setLastLoadedId(validProductId);
                setShouldReload(false);
                setIsLoading(false);
                console.log('Продукт принудительно загружен:', result.data?.name || result.data?.id);
            }
        } catch (err) {
            console.error(`Ошибка при принудительной загрузке продукта ${validProductId}:`, err);
            if (isMountedRef.current) {
                setError(err.message || 'Ошибка при загрузке товара');
                setIsLoading(false);
            }
        } finally {
            loadingStates.current.product = false;
        }
    }, [dispatch, validProductId]);

    // Функция для принудительного обновления данных
    const refreshData = useCallback(async (force = false) => {
        if (isMountedRef.current) {
            console.log('[useProductDetail] Принудительное обновление данных, force:', force);
            
            if (force) {
                // При принудительном обновлении сбрасываем состояние и немедленно загружаем данные
                setLastLoadedId(null);
                setShouldReload(true);
                
                // Немедленно загружаем данные принудительно
                return forceLoadProductData();
            } else {
                setShouldReload(force);
            }
        }
    }, [forceLoadProductData]);

    // Проверяем, нужно ли загружать продукт
    const shouldFetchProduct = useCallback(() => {
        if (!validProductId) return false;
        if (loadingStates.current.product) return false;
        
        // Если shouldReload = true, всегда загружаем
        if (shouldReload) return true;

        // Если продукт уже есть в кэше или в currentProduct, не загружаем
        // НО только если это не принудительное обновление
        if (product && product.id === validProductId && lastLoadedId === validProductId && !shouldReload) {
            return false;
        }

        return true;
    }, [validProductId, shouldReload, product, lastLoadedId]);

    // Загружаем данные о товаре
    const loadProductData = useCallback(async () => {
        const shouldFetch = shouldFetchProduct();
        
        console.log('[useProductDetail] loadProductData:', {
            validProductId,
            shouldFetch,
            shouldReload,
            hasProduct: !!product,
            productId: product?.id,
            lastLoadedId
        });
        
        if (!shouldFetch) {
            // Если продукт уже есть, просто устанавливаем его как текущий
            if (product && !currentProduct) {
                // Устанавливаем кэшированный продукт как текущий
                setLastLoadedId(validProductId);
            }
            setIsLoading(false);
            return;
        }

        loadingStates.current.product = true;
        setIsLoading(true);
        setError(null);

        try {
            console.log('Загружаем продукт с ID:', validProductId, 'принудительно:', shouldReload);

            // При принудительном обновлении используем флаг refresh=true
            const result = await dispatch(fetchProductById(shouldReload ? { productId: validProductId, force: true } : validProductId)).unwrap();

            // Обновляем состояние только если компонент все еще смонтирован
            if (isMountedRef.current) {
                setLastLoadedId(validProductId);
                setShouldReload(false);
                setIsLoading(false);
                console.log('Продукт успешно загружен:', result.data?.name || result.data?.id);
            }
        } catch (err) {
            console.error(`Ошибка при загрузке продукта ${validProductId}:`, err);
            if (isMountedRef.current) {
                setError(err.message || 'Ошибка при загрузке товара');
                setIsLoading(false);
            }
        } finally {
            loadingStates.current.product = false;
        }
    }, [dispatch, validProductId, shouldFetchProduct, product, currentProduct, shouldReload]);

    // Загружаем данные о поставщике
    const loadSupplierData = useCallback(async () => {
        if (!product?.supplierId || loadingStates.current.supplier || supplier) return;

        loadingStates.current.supplier = true;

        try {
            await dispatch(fetchSupplierById(product.supplierId)).unwrap();
        } catch (err) {
            console.error('Ошибка при загрузке поставщика:', err);
        } finally {
            loadingStates.current.supplier = false;
        }
    }, [dispatch, product?.supplierId, supplier]);

    // Загружаем отзывы
    const loadFeedbacksData = useCallback(async () => {
        if (!validProductId || isFeedbacksLoaded || loadingStates.current.feedbacks) return;

        loadingStates.current.feedbacks = true;

        try {
            await dispatch(fetchProductFeedbacks(validProductId)).unwrap();
        } catch (err) {
            console.error('Ошибка при загрузке отзывов:', err);
        } finally {
            loadingStates.current.feedbacks = false;
        }
    }, [dispatch, validProductId, isFeedbacksLoaded]);

    // Основной эффект для загрузки данных
    useEffect(() => {
        if (!validProductId) return;

        // Если это новый продукт, сбрасываем состояние
        if (validProductId !== lastLoadedId) {
            loadingStates.current = {
                product: false,
                supplier: false,
                feedbacks: false
            };
            setError(null);
        }

        // Загружаем основные данные
        loadProductData();

        // Возвращаем функцию очистки
        return () => {
            // Дополнительная обработка при размонтировании
        };
    }, [validProductId, loadProductData]);

    // Эффект для загрузки дополнительных данных
    useEffect(() => {
        if (product && !isLoading && product.id === validProductId) {
            const task = InteractionManager.runAfterInteractions(() => {
                if (isMountedRef.current) {
                    loadSupplierData();
                    loadFeedbacksData();
                }
            });

            // Отменяем таск при размонтировании
            return () => task.cancel();
        }
    }, [product, isLoading, validProductId, loadSupplierData, loadFeedbacksData]);

    // Определяем финальное состояние загрузки
    const finalIsLoading = isLoading && !product;

    return {
        product,
        supplier,
        isLoading: finalIsLoading,
        error,
        refreshData
    };
};

export default useProductDetail;