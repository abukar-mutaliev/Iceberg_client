import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchSupplierWithProducts,
    fetchSupplierRating
} from '../model/slice';
import {
    selectSupplierById,
    selectSuppliersLoading,
    selectSuppliersError
} from '../model/selectors';
import { fetchSupplierFeedbacks } from '@entities/feedback/model/slice';
import { 
    selectAllSupplierFeedbacks,
    selectSupplierProductsBySupplierId 
} from '@entities/supplier/model/selectors';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 5000, 10000];

/**
 * Хук для управления данными поставщика.
 * Мгновенно показывает закешированные данные из Redux,
 * обновляет их в фоне и делает повторные попытки при ошибках сети.
 */
export const useSupplierData = (supplierId) => {
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadAttempted, setLoadAttempted] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const retryTimerRef = useRef(null);
    const mountedRef = useRef(true);

    const normalizedSupplierId = useMemo(() => {
        return supplierId ? Number(supplierId) : null;
    }, [supplierId]);

    const supplier = useSelector(state => selectSupplierById(state, normalizedSupplierId));
    const suppliersLoading = useSelector(selectSuppliersLoading);
    const suppliersError = useSelector(selectSuppliersError);

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

    const hasValidSupplier = useMemo(() => {
        return supplier && (
            supplier.role === 'SUPPLIER' ||
            (supplier.supplier && supplier.supplier.companyName) ||
            (supplier.user && supplier.user.role === 'SUPPLIER')
        );
    }, [supplier]);

    // Флаг: есть ли уже данные в Redux (из кеша или из prefill)
    const hasCachedData = useMemo(() => !!supplier, [supplier]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        };
    }, []);

    const loadSupplierData = useCallback(async (force = false) => {
        if (!normalizedSupplierId) return;

        if (!force && isLoading) return;

        // Не ставим isLoading=true если данные уже есть (background refresh)
        if (!hasCachedData) {
            setIsLoading(true);
        }
        setLoadAttempted(true);

        try {
            const [productsResult, feedbacksResult, ratingResult] = await Promise.allSettled([
                dispatch(fetchSupplierWithProducts(normalizedSupplierId)).unwrap(),
                dispatch(fetchSupplierFeedbacks(normalizedSupplierId)).unwrap(),
                dispatch(fetchSupplierRating(normalizedSupplierId)).unwrap()
            ]);

            if (!mountedRef.current) return;

            const anyFailed = [productsResult, feedbacksResult, ratingResult]
                .some(r => r.status === 'rejected');

            if (anyFailed) {
                throw new Error('Partial load failure');
            }

            // Успех — сбрасываем счётчик ретраев
            setRetryCount(0);
        } catch (error) {
            if (!mountedRef.current) return;

            // Если основные данные (supplier+products) не загрузились и нет кеша — ретрай
            const supplierStillMissing = !hasCachedData;
            if (supplierStillMissing && retryCount < MAX_RETRIES) {
                const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
                console.warn(
                    `⏳ Повторная попытка загрузки поставщика ${normalizedSupplierId}`,
                    `через ${delay / 1000}с (попытка ${retryCount + 1}/${MAX_RETRIES})`
                );
                retryTimerRef.current = setTimeout(() => {
                    if (mountedRef.current) {
                        setRetryCount(prev => prev + 1);
                        loadSupplierData(true);
                    }
                }, delay);
            }
        } finally {
            if (mountedRef.current) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
    }, [normalizedSupplierId, dispatch, isLoading, hasCachedData, retryCount]);

    const handleRefresh = useCallback(async () => {
        setRetryCount(0);
        setIsRefreshing(true);
        await loadSupplierData(true);
    }, [loadSupplierData]);

    useEffect(() => {
        if (normalizedSupplierId) {
            setLoadAttempted(false);
            setRetryCount(0);
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
        }
    }, [normalizedSupplierId]);

    useEffect(() => {
        if (normalizedSupplierId && !loadAttempted && !isLoading) {
            loadSupplierData(false);
        }
    }, [normalizedSupplierId, loadAttempted, isLoading, loadSupplierData]);

    const supplierProductsCount = useMemo(() =>
            supplierProducts.length,
        [supplierProducts]
    );

    const hasProducts = useMemo(() =>
            supplierProductsCount > 0,
        [supplierProductsCount]
    );

    const feedbacksCount = useMemo(() =>
            allFeedbacks.length,
        [allFeedbacks]
    );

    const hasFeedbacks = useMemo(() =>
            feedbacksCount > 0,
        [feedbacksCount]
    );

    // Показываем полноэкранный лоадер только если нет закешированных данных
    const isInitialLoading = useMemo(() =>
            (isLoading || suppliersLoading) && !hasCachedData,
        [isLoading, suppliersLoading, hasCachedData]
    );

    // Ошибка показывается только когда нет данных, нет загрузки,
    // все ретраи исчерпаны и загрузка уже была
    const hasError = useMemo(() =>
            (suppliersError || (!supplier && !suppliersLoading && !isLoading && loadAttempted))
            && retryCount >= MAX_RETRIES,
        [suppliersError, supplier, suppliersLoading, isLoading, loadAttempted, retryCount]
    );

    const hasInvalidSupplierType = useMemo(() =>
            supplier && !hasValidSupplier,
        [supplier, hasValidSupplier]
    );

    return {
        supplier,
        supplierProducts,
        allFeedbacks,
        supplierProductsCount,
        feedbacksCount,

        isLoading,
        isInitialLoading,
        isRefreshing,
        suppliersError,
        hasError,
        hasProducts,
        hasFeedbacks,
        hasValidSupplier,
        hasInvalidSupplierType,
        hasCachedData,

        loadSupplierData,
        handleRefresh
    };
};
