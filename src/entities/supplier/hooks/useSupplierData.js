import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchSupplierWithProducts,
    fetchSupplierRating,
    selectSupplierById,
    selectSuppliersLoading,
    selectSuppliersError,
    selectSupplierProducts
} from '@entities/supplier';
import { fetchSupplierFeedbacks } from '@entities/feedback/model/slice';
import { selectAllSupplierFeedbacks } from '@entities/supplier/model/selectors';

/**
 * Кастомный хук для управления данными поставщика с исправленным порядком загрузки
 *
 * @param {number|string} supplierId - ID поставщика
 * @returns {Object} Объект с данными и функциями для управления данными поставщика
 */
export const useSupplierData = (supplierId) => {
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [productsLoaded, setProductsLoaded] = useState(false);

    // Отслеживаем состояние загрузки с помощью useRef
    const loadingState = useRef({
        initialLoadDone: false,
        isLoading: false,
        prevId: null,
        productsLoaded: false,
        feedbacksLoaded: false
    });

    // Выбираем данные из Redux
    const supplier = useSelector(state => selectSupplierById(state, supplierId));
    const suppliersLoading = useSelector(selectSuppliersLoading);
    const suppliersError = useSelector(selectSuppliersError);

    // Безопасное получение продуктов
    const supplierProducts = useSelector(state => {
        if (!supplierId) return [];

        // Получаем продукты напрямую из Redux
        const productsMap = state.suppliers?.supplierProducts || {};
        const products = productsMap[supplierId] || [];

        return Array.isArray(products) ? products : [];
    }, [supplierId]);

    // Используем селектор для получения отзывов
    // Мемоизируем результат селектора через useMemo для предотвращения лишних ререндеров
    const allFeedbacks = useSelector((state) => selectAllSupplierFeedbacks(state, supplierId));

    // Проверяем валидность поставщика
    const hasValidSupplier = useMemo(() => {
        return supplier && (
            supplier.role === 'SUPPLIER' ||
            (supplier.supplier && supplier.supplier.companyName) ||
            (supplier.user && supplier.user.role === 'SUPPLIER')
        );
    }, [supplier]);

    // Функция загрузки данных поставщика
    const loadSupplierData = useCallback(async (shouldSetLoading = true) => {
        // Если нет ID или уже идет загрузка, прерываем
        if (!supplierId || loadingState.current.isLoading) return;

        // Устанавливаем флаг загрузки
        loadingState.current.isLoading = true;

        if (shouldSetLoading && !isRefreshing) {
            setIsLoading(true);
        }

        try {
            // Сначала загружаем данные поставщика и продукты
            await dispatch(fetchSupplierWithProducts(supplierId)).unwrap();

            // Отмечаем, что продукты загружены
            loadingState.current.productsLoaded = true;
            setProductsLoaded(true);

            // Загружаем рейтинг сразу (быстрая операция)
            dispatch(fetchSupplierRating(supplierId));

            // Загружаем отзывы асинхронно (не блокируем UI)
            // fetchSupplierFeedbacks теперь оптимизирован - загружает только те, которых нет в кэше
            // и использует батчинг для оптимизации (по 10 продуктов за раз)
            dispatch(fetchSupplierFeedbacks(supplierId)).then((result) => {
                if (result.type.endsWith('/fulfilled')) {
                    loadingState.current.feedbacksLoaded = true;
                }
            }).catch(() => {
                // Ошибка уже обработана в thunk
            });

            // Отмечаем, что начальная загрузка выполнена (продукты загружены)
            loadingState.current.initialLoadDone = true;
        } catch (error) {
            console.error('Ошибка загрузки данных поставщика:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            loadingState.current.isLoading = false;
        }
    }, [supplierId, dispatch, isRefreshing]);

    // Обработчик для pull-to-refresh
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);

        // Сбрасываем состояние загрузки
        loadingState.current.productsLoaded = false;
        loadingState.current.feedbacksLoaded = false;
        setProductsLoaded(false);

        await loadSupplierData(false);
    }, [loadSupplierData]);

    // Эффект для загрузки данных при изменении ID
    useEffect(() => {
        // Если ID изменился, сбрасываем состояние
        if (loadingState.current.prevId !== supplierId) {
            loadingState.current = {
                initialLoadDone: false,
                isLoading: false,
                prevId: supplierId,
                productsLoaded: false,
                feedbacksLoaded: false
            };
            setProductsLoaded(false);
        }

        // Если нет ID или данные уже загружены, прерываем
        if (!supplierId || loadingState.current.initialLoadDone) {
            return;
        }

        // Загружаем данные
        loadSupplierData();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supplierId]); // Убираем loadSupplierData из зависимостей, чтобы избежать бесконечных циклов

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
            (isLoading || suppliersLoading) && (!hasValidSupplier || supplierProductsCount === 0),
        [isLoading, suppliersLoading, hasValidSupplier, supplierProductsCount]
    );

    // Проверяем наличие ошибки
    const hasError = useMemo(() =>
            suppliersError || (!supplier && !suppliersLoading && !isLoading),
        [suppliersError, supplier, suppliersLoading, isLoading]
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
        productsLoaded,
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