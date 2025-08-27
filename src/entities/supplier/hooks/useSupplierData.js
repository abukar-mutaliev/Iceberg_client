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
    const allFeedbacks = useSelector(state => {
        if (!supplierId) return [];

        // Используем наш мемоизированный селектор
        return selectAllSupplierFeedbacks(state, supplierId);
    }, [supplierId]);

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
            if (process.env.NODE_ENV === 'development') {
                console.log('SupplierData - Начало загрузки данных для:', supplierId);
            }

            // Сначала загружаем данные поставщика и продукты
            await dispatch(fetchSupplierWithProducts(supplierId)).unwrap();

            // Отмечаем, что продукты загружены
            loadingState.current.productsLoaded = true;
            setProductsLoaded(true);

            // После загрузки продуктов (с небольшой задержкой для последовательности)
            await new Promise(resolve => setTimeout(resolve, 100));

            // Загружаем отзывы и рейтинг
            await Promise.all([
                dispatch(fetchSupplierFeedbacks(supplierId)).unwrap(),
                dispatch(fetchSupplierRating(supplierId)).unwrap()
            ]);

            // Отмечаем, что отзывы загружены
            loadingState.current.feedbacksLoaded = true;

            // Отмечаем, что начальная загрузка выполнена
            loadingState.current.initialLoadDone = true;

            if (process.env.NODE_ENV === 'development') {
                console.log('SupplierData - Загрузка данных завершена для:', supplierId, {
                    productsLoaded: loadingState.current.productsLoaded,
                    feedbacksLoaded: loadingState.current.feedbacksLoaded
                });
            }
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

    }, [supplierId, loadSupplierData]);

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