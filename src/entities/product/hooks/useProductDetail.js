import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { InteractionManager } from 'react-native';
// Импортируем напрямую из файлов, чтобы избежать циклической зависимости
import {
    fetchProductById,
    resetCurrentProduct
} from '../model/slice';
import {
    selectCurrentProduct,
    selectProductById
} from '../model/selectors';
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
    const [shouldReload, setShouldReload] = useState(false);

    // Ref для отслеживания состояния компонента
    const isMountedRef = useRef(true);

    // Используем ref для lastLoadedId, чтобы избежать ререндеров
    const lastLoadedIdRef = useRef(null);

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

        loadingStates.current.product = true;
        setIsLoading(true);
        setError(null);

        try {
            // Передаем объект с force: true для принудительного обновления
            await dispatch(fetchProductById({ productId: validProductId, force: true })).unwrap();

            if (isMountedRef.current) {
                lastLoadedIdRef.current = validProductId;
                setShouldReload(false);
                setIsLoading(false);
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
            if (force) {
                // При принудительном обновлении сбрасываем состояние и немедленно загружаем данные
                lastLoadedIdRef.current = null;
                setShouldReload(true);
                
                // Немедленно загружаем данные принудительно
                return forceLoadProductData();
            } else {
                setShouldReload(force);
            }
        }
    }, [forceLoadProductData]);

    // Используем ref для хранения актуального продукта, чтобы избежать замыканий
    const productRef = useRef(product);
    const currentProductRef = useRef(currentProduct);
    const cachedProductRef = useRef(cachedProduct);
    
    // Обновляем refs при изменении продуктов
    useEffect(() => {
        productRef.current = product;
        currentProductRef.current = currentProduct;
        cachedProductRef.current = cachedProduct;
    }, [product, currentProduct, cachedProduct]);

    // Проверяем, нужно ли загружать продукт
    // УБИРАЕМ setState из этой функции - она должна быть чистой
    // Используем refs для доступа к актуальным данным без создания зависимостей
    const shouldFetchProduct = useCallback(() => {
        if (!validProductId) return false;
        if (loadingStates.current.product) return false;
        
        // Если shouldReload = true, всегда загружаем
        if (shouldReload) return true;

        // Используем актуальные данные из refs
        const productState = productRef.current;
        const cachedState = cachedProductRef.current;
        const currentState = currentProductRef.current;

        // Если продукт уже есть в кэше (cachedProduct) или в currentProduct и он соответствует запрашиваемому ID, не загружаем
        // Это позволяет корректно восстанавливать продукты при возврате назад
        const hasValidCache = (productState && productState.id === validProductId) ||
                             (cachedState && cachedState.id === validProductId) ||
                             (currentState && currentState.id === validProductId);

        if (hasValidCache) {
            // Обновляем ref без вызова ререндера
            if (lastLoadedIdRef.current !== validProductId) {
                lastLoadedIdRef.current = validProductId;
            }
            return false;
        }

        return true;
    }, [validProductId, shouldReload]);

    // Загружаем данные о товаре
    const loadProductData = useCallback(async () => {
        // Используем актуальные данные из refs
        const currentProductState = currentProductRef.current;
        const productState = productRef.current;
        const cachedState = cachedProductRef.current;
        
        const shouldFetch = shouldFetchProduct();
        
        // Если продукт уже есть в кэше, не загружаем и сразу устанавливаем состояние
        if (!shouldFetch) {
            // Если продукт уже есть, просто обновляем lastLoadedId и устанавливаем loading в false
            lastLoadedIdRef.current = validProductId;
            setIsLoading(false);
            setError(null);
            return;
        }

        // Защита от повторных запросов
        if (loadingStates.current.product) {
            return;
        }

        loadingStates.current.product = true;
        setIsLoading(true);
        setError(null);

        try {
            // При принудительном обновлении используем флаг force=true
            const result = await dispatch(fetchProductById(shouldReload ? { productId: validProductId, force: true } : validProductId)).unwrap();

            // Обновляем состояние только если компонент все еще смонтирован
            if (isMountedRef.current) {
                lastLoadedIdRef.current = validProductId;
                setShouldReload(false);
                setIsLoading(false);
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
    }, [dispatch, validProductId, shouldFetchProduct, shouldReload]);

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
    // УПРОЩАЕМ ЗАВИСИМОСТИ: используем только validProductId, проверку кэша делаем через refs
    useEffect(() => {
        if (!validProductId || !isMountedRef.current) return;

        // Проверяем кэш через актуальные refs (без создания зависимостей)
        const productState = productRef.current;
        const cachedState = cachedProductRef.current;
        const currentState = currentProductRef.current;
        
        const hasCachedProduct = (productState && productState.id === validProductId) ||
                                 (cachedState && cachedState.id === validProductId) ||
                                 (currentState && currentState.id === validProductId);

        // Если это новый продукт (переход вперед), сбрасываем состояние
        if (validProductId !== lastLoadedIdRef.current) {
            // Если продукт есть в кэше, используем его без загрузки
            if (hasCachedProduct) {
                // Продукт есть в кэше, очищаем состояние загрузки
                loadingStates.current = {
                    product: false,
                    supplier: false,
                    feedbacks: false
                };
                lastLoadedIdRef.current = validProductId;
                setIsLoading(false);
                setError(null);
                // НЕ вызываем loadProductData - используем кэш
            } else {
                // Продукта нет в кэше - загружаем
                loadingStates.current = {
                    product: false,
                    supplier: false,
                    feedbacks: false
                };
                setError(null);
                loadProductData();
            }
        }

        // Возвращаем функцию очистки
        return () => {
            // Дополнительная обработка при размонтировании
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [validProductId]);

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