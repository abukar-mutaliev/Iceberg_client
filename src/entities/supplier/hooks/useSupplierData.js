import { useState, useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchSupplierWithProducts,
    fetchSupplierRating,
    selectSupplierById,
    selectSuppliersLoading,
    selectSuppliersError
} from '@entities/supplier';
import { fetchSupplierFeedbacks } from '@entities/feedback/model/slice';
import { 
    selectAllSupplierFeedbacks,
    selectSupplierProductsBySupplierId 
} from '@entities/supplier/model/selectors';

/**
 * Оптимизированный хук для управления данными поставщика
 * Убраны race conditions и упрощена логика загрузки
 */
export const useSupplierData = (supplierId) => {
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadAttempted, setLoadAttempted] = useState(false);

    // Нормализуем supplierId к числу для консистентности
    const normalizedSupplierId = useMemo(() => {
        return supplierId ? Number(supplierId) : null;
    }, [supplierId]);

    // Выбираем данные из Redux с нормализованным ID
    const supplier = useSelector(state => selectSupplierById(state, normalizedSupplierId));
    const suppliersLoading = useSelector(selectSuppliersLoading);
    const suppliersError = useSelector(selectSuppliersError);

    // Безопасное получение продуктов через мемоизированный селектор с нормализованным ID
    const supplierProducts = useSelector(
        state => selectSupplierProductsBySupplierId(state, normalizedSupplierId),
        (left, right) => {
            if (!Array.isArray(left) || !Array.isArray(right)) {
                return left === right;
            }
            if (left.length !== right.length) return false;
            return left.every((item, index) => {
                const other = right[index];
                return item && other && item.id === other.id;
            });
        }
    );

    // Используем селектор для получения отзывов с нормализованным ID
    const allFeedbacks = useSelector(
        state => {
            if (!normalizedSupplierId) return [];
            return selectAllSupplierFeedbacks(state, normalizedSupplierId);
        },
        (left, right) => {
            if (!Array.isArray(left) || !Array.isArray(right)) {
                return left === right;
            }
            if (left.length !== right.length) return false;
            return left.every((item, index) => {
                const other = right[index];
                if (!item || !other) return item === other;
                return item.id === other.id && 
                       item.productId === other.productId &&
                       item.rating === other.rating &&
                       item.createdAt === other.createdAt;
            });
        }
    );

    // Проверяем валидность поставщика
    const hasValidSupplier = useMemo(() => {
        return supplier && (
            supplier.role === 'SUPPLIER' ||
            (supplier.supplier && supplier.supplier.companyName) ||
            (supplier.user && supplier.user.role === 'SUPPLIER')
        );
    }, [supplier]);

    // Функция загрузки данных поставщика
    const loadSupplierData = useCallback(async (force = false) => {
        // Если нет ID, прерываем
        if (!normalizedSupplierId) {
            console.log('SupplierData - нет supplierId');
            return;
        }

        // Защита от двойной загрузки (но не блокируем force refresh)
        if (!force && isLoading) {
            console.log('SupplierData - загрузка уже идет');
            return;
        }

        setIsLoading(true);
        setLoadAttempted(true);

        try {
            console.log('🔄 SupplierData - Начало загрузки данных для:', normalizedSupplierId);

            // Загружаем продукты, отзывы и рейтинг ПАРАЛЛЕЛЬНО
            // Теперь отзывы НЕ зависят от продуктов - они загружаются напрямую с сервера
            // Используем normalizedSupplierId для запросов (но API может принимать и строку)
            const [productsResult, feedbacksResult, ratingResult] = await Promise.allSettled([
                dispatch(fetchSupplierWithProducts(normalizedSupplierId)).unwrap(),
                dispatch(fetchSupplierFeedbacks(normalizedSupplierId)).unwrap(),
                dispatch(fetchSupplierRating(normalizedSupplierId)).unwrap()
            ]);

            console.log('✅ SupplierData - Все данные загружены:', {
                supplierId: normalizedSupplierId,
                products: productsResult.status,
                productsCount: productsResult.status === 'fulfilled' ? productsResult.value?.products?.length : 0,
                feedbacks: feedbacksResult.status,
                feedbacksCount: feedbacksResult.status === 'fulfilled' ? feedbacksResult.value?.feedbacks?.length : 0,
                rating: ratingResult.status
            });

        } catch (error) {
            console.error('❌ Ошибка загрузки данных поставщика:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [normalizedSupplierId, dispatch, isLoading]);

    // Обработчик для pull-to-refresh
    const handleRefresh = useCallback(async () => {
        console.log('🔄 SupplierData - Pull to refresh');
        setIsRefreshing(true);
        await loadSupplierData(true);
    }, [loadSupplierData]);

    // Эффект для загрузки данных при изменении ID
    useEffect(() => {
        console.log('📍 SupplierData - useEffect triggered:', { 
            supplierId: normalizedSupplierId, 
            loadAttempted,
            hasSupplier: !!supplier,
            hasProducts: supplierProducts.length > 0
        });

        // Сбрасываем флаг при смене ID
        if (normalizedSupplierId) {
            setLoadAttempted(false);
        }
    }, [normalizedSupplierId]);

    // Отдельный эффект для загрузки (чтобы не было циклических зависимостей)
    useEffect(() => {
        if (normalizedSupplierId && !loadAttempted && !isLoading) {
            console.log('🚀 SupplierData - Запуск загрузки для:', normalizedSupplierId);
            loadSupplierData(false);
        }
    }, [normalizedSupplierId, loadAttempted, isLoading, loadSupplierData]);

    // Мемоизируем количество продуктов и наличие продуктов
    const supplierProductsCount = useMemo(() =>
            supplierProducts.length,
        [supplierProducts]
    );

    const hasProducts = useMemo(() =>
            supplierProductsCount > 0,
        [supplierProductsCount]
    );

    // Мемоизируем количество отзывов и наличие отзывов
    const feedbacksCount = useMemo(() =>
            allFeedbacks.length,
        [allFeedbacks]
    );

    const hasFeedbacks = useMemo(() =>
            feedbacksCount > 0,
        [feedbacksCount]
    );

    // Проверяем состояние загрузки
    const isInitialLoading = useMemo(() =>
            (isLoading || suppliersLoading) && !hasValidSupplier,
        [isLoading, suppliersLoading, hasValidSupplier]
    );

    // Проверяем наличие ошибки
    const hasError = useMemo(() =>
            suppliersError || (!supplier && !suppliersLoading && !isLoading && loadAttempted),
        [suppliersError, supplier, suppliersLoading, isLoading, loadAttempted]
    );

    // Проверка на неправильный тип пользователя
    const hasInvalidSupplierType = useMemo(() =>
            supplier && !hasValidSupplier,
        [supplier, hasValidSupplier]
    );

    return {
        // Данные
        supplier,
        supplierProducts,
        allFeedbacks,
        supplierProductsCount,
        feedbacksCount,

        // Состояния
        isLoading,
        isInitialLoading,
        isRefreshing,
        suppliersError,
        hasError,
        hasProducts,
        hasFeedbacks,
        hasValidSupplier,
        hasInvalidSupplierType,

        // Действия
        loadSupplierData,
        handleRefresh
    };
};