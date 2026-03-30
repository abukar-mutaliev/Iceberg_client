import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
// Импортируем напрямую из файлов, чтобы избежать циклической зависимости
import {
    fetchProducts,
    fetchProductById,
    clearProductsCache,
    setCurrentProductFromCache,
    updateProductOptimistic
} from '../model/slice';
import {
    selectProducts,
    selectProductsLoading,
    selectProductsError
} from '../model/selectors';
import {
    fetchProfile,
    selectProfile,
    selectProfileLoading,
    selectProfileError
} from '@entities/profile';
import { useAuth } from '@entities/auth/hooks/useAuth';
import productsApiService from '@entities/product/api/productsApi';

/**
 * Утилиты для работы с коробочной логикой (встроенные в хук)
 */
const formatPrice = (price, options = {}) => {
    const {
        currency = 'RUB',
        minimumFractionDigits = 0,
        maximumFractionDigits = 2,
        locale = 'ru-RU'
    } = options;

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(price || 0);
};

const calculateBoxesFromItems = (itemsCount, itemsPerBox) => {
    if (!itemsPerBox || itemsPerBox <= 0) return itemsCount;
    return Math.ceil(itemsCount / itemsPerBox);
};

const calculateItemsFromBoxes = (boxesCount, itemsPerBox) => {
    return (boxesCount || 0) * (itemsPerBox || 1);
};

const calculateSavings = (itemsPerBox, pricePerItem, boxPrice) => {
    const calculatedBoxPrice = itemsPerBox * pricePerItem;
    const savingsAmount = Math.max(0, calculatedBoxPrice - boxPrice);
    const savingsPercentage = calculatedBoxPrice > 0
        ? (savingsAmount / calculatedBoxPrice) * 100
        : 0;

    return {
        savingsAmount,
        savingsPercentage,
        calculatedBoxPrice,
        actualBoxPrice: boxPrice,
        hasSavings: savingsAmount > 0
    };
};

const getProductStatus = (product) => {
    if (!product) {
        return {
            status: 'unknown',
            label: 'Неизвестно',
            color: '#999999',
            isAvailable: false
        };
    }

    const {
        isActive = true,
        availableBoxes = 0,
        stockQuantity = 0,
        itemsPerBox = 1
    } = product;

    const available = availableBoxes || stockQuantity || 0;
    const totalItems = available * itemsPerBox;

    if (!isActive) {
        return {
            status: 'inactive',
            label: 'Не продается',
            color: '#FF3B30',
            isAvailable: false
        };
    }

    if (available === 0) {
        return {
            status: 'out_of_stock',
            label: 'Нет в наличии',
            color: '#FF3B30',
            isAvailable: false
        };
    }

    if (available <= 5) {
        return {
            status: 'low_stock',
            label: `Остается мало (${available} коробок)`,
            color: '#FF9500',
            isAvailable: true
        };
    }

    return {
        status: 'available',
        label: `В наличии (${available} коробок, ${totalItems} шт.)`,
        color: '#34C759',
        isAvailable: true
    };
};

const normalizeProductData = (rawProduct) => {
    if (!rawProduct) return null;

    const product = rawProduct.originalData || rawProduct;

    const id = product.id || null;
    const name = product.name || product.title || '';
    const description = product.description || '';
    const isActive = product.isActive !== false;
    const moderationStatus = product.moderationStatus || 'APPROVED';
    const moderationReason = product.moderationReason || null;
    const supplierProposedPrice = product.supplierProposedPrice ?? null;
    const supplierProposedBoxPrice = product.supplierProposedBoxPrice ?? null;

    const itemsPerBox = Math.max(1, parseInt(product.itemsPerBox, 10) || 1);
    const pricePerItem = parseFloat(product.price) || 0;
    const boxPrice = parseFloat(product.boxPrice) || (pricePerItem * itemsPerBox);

    const stockQuantityBoxes = parseInt(product.stockQuantity, 10) || 0;
    const reservedBoxes = parseInt(product.reservedQuantity, 10) || 0;
    const availableBoxes = Math.max(0, stockQuantityBoxes - reservedBoxes);
    const totalItems = stockQuantityBoxes * itemsPerBox;
    const availableItems = availableBoxes * itemsPerBox;

    const minimumOrderBoxes = Math.max(1, parseInt(product.minimumOrder, 10) || 1);
    const minimumOrderItems = minimumOrderBoxes * itemsPerBox;

    const savings = calculateSavings(itemsPerBox, pricePerItem, boxPrice);

    const status = getProductStatus({
        isActive,
        availableBoxes,
        stockQuantity: stockQuantityBoxes,
        itemsPerBox
    });

    return {
        id,
        name,
        description,
        isActive,
        moderationStatus,
        moderationReason,
        supplierProposedPrice,
        supplierProposedBoxPrice,
        isPendingModeration: moderationStatus === 'PENDING',
        isRejectedModeration: moderationStatus === 'REJECTED',
        isApprovedModeration: moderationStatus === 'APPROVED',
        supplier: product.supplier || null,
        supplierId: product.supplierId || null,
        categories: product.categories || [],
        images: product.images || [],
        weight: product.weight || null,

        itemsPerBox,
        pricePerItem,
        boxPrice,
        stockQuantityBoxes,
        totalItems,

        availableBoxes,
        availableItems,
        reservedBoxes,

        minimumOrderBoxes,
        minimumOrderItems,

        savingsPerBox: savings.savingsAmount,
        savingsPercentage: savings.savingsPercentage,
        hasSavings: savings.hasSavings,

        status: status.status,
        statusLabel: status.label,
        statusColor: status.color,
        isAvailable: status.isAvailable,
        isLowStock: status.status === 'low_stock',

        formattedPricePerItem: formatPrice(pricePerItem),
        formattedBoxPrice: formatPrice(boxPrice),
        formattedSavings: formatPrice(savings.savingsAmount),

        boxInfo: {
            itemsPerBox,
            boxPrice,
            pricePerItem,
            availableBoxes,
            totalItems: availableItems,
            minimumOrder: minimumOrderBoxes
        },

        calculateBoxesFromItems: (items) => calculateBoxesFromItems(items, itemsPerBox),
        calculateItemsFromBoxes: (boxes) => calculateItemsFromBoxes(boxes, itemsPerBox),
        calculateTotalPrice: (quantity, useBoxPrice = true) => {
            const unitPrice = useBoxPrice ? boxPrice : pricePerItem * itemsPerBox;
            return quantity * unitPrice;
        },
        canOrderQuantity: (quantity) => {
            return isActive &&
                quantity > 0 &&
                quantity >= minimumOrderBoxes &&
                quantity <= availableBoxes;
        },

        price: pricePerItem,
        stockQuantity: availableBoxes,
        availableQuantity: availableBoxes
    };
};

/**
 * Хук для управления продуктами с поддержкой коробочной логики
 * @param {Object} options - Опции
 * @param {boolean} options.normalizeForBoxes - Нормализовать данные для коробочной логики
 * @param {boolean} options.autoRefresh - Автоматически обновлять данные
 * @param {number} options.refreshInterval - Интервал автообновления в миллисекундах
 * @param {boolean} options.enableOptimisticUpdates - Включить оптимистичные обновления
 * @returns {Object} - Управление продуктами с коробочной логикой
 */
export const useProductManagement = ({
                                         normalizeForBoxes = true,
                                         autoRefresh = false,
                                         refreshInterval = 30000,
                                         enableOptimisticUpdates = true
                                     } = {}) => {
    const dispatch = useDispatch();

    const { currentUser, isAuthenticated } = useAuth();

    const products = useSelector(selectProducts);
    const productsLoading = useSelector(selectProductsLoading);
    const productsError = useSelector(selectProductsError);

    const profile = useSelector(selectProfile);
    const profileLoading = useSelector(selectProfileLoading);
    const profileError = useSelector(selectProfileError);

    const [supplierProducts, setSupplierProducts] = useState([]);
    const [supplierProductsLoading, setSupplierProductsLoading] = useState(false);
    const [supplierProductsError, setSupplierProductsError] = useState(null);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
    const [optimisticUpdates, setOptimisticUpdates] = useState(new Map());

    const loadSupplierProducts = useCallback(async () => {

        setSupplierProductsLoading(true);
        setSupplierProductsError(null);

        try {
            const response = await productsApiService.getProducts({ page: 1, limit: 100 });

            if (response && response.status === 'success' && response.data) {
                let processedProducts = response.data;

                if (normalizeForBoxes) {
                    processedProducts = response.data.map(product => {
                        const normalized = normalizeProductData(product);
  
                        return normalized;
                    }).filter(Boolean);
                }

                setSupplierProducts(processedProducts);
            } else {
                setSupplierProducts([]);
                console.warn('⚠️ Неожиданный формат ответа API продуктов поставщика:', response);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки продуктов поставщика:', error);
            setSupplierProductsError(error.message);
            setSupplierProducts([]);
        } finally {
            setSupplierProductsLoading(false);
        }
    }, [normalizeForBoxes]);

    const normalizedProducts = useMemo(() => {
        if (!normalizeForBoxes || !Array.isArray(products)) {
            return products;
        }


        const normalized = products.map(product => {
            const optimisticUpdate = optimisticUpdates.get(product.id);
            const productToNormalize = optimisticUpdate ? { ...product, ...optimisticUpdate } : product;

            const normalizedProduct = normalizeProductData(productToNormalize);

            return normalizedProduct;
        }).filter(Boolean);

        return normalized;
    }, [normalizeForBoxes, products, optimisticUpdates]);

    useEffect(() => {
        loadData(true);
    }, []);

    useEffect(() => {
        if (currentUser?.role === 'SUPPLIER' && profile?.supplier?.id) {
            loadSupplierProducts();
        }
    }, [currentUser?.role, profile?.supplier?.id, loadSupplierProducts]);

    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            loadData(true, false);
        }, refreshInterval);

        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval]);

    useEffect(() => {
        if (optimisticUpdates.size === 0) return;

        const timeout = setTimeout(() => {
            setOptimisticUpdates(new Map());
        }, 60000);

        return () => clearTimeout(timeout);
    }, [optimisticUpdates]);

    const loadData = useCallback(async (forceRefresh = true, clearCache = true) => {
        try {
            if (forceRefresh && clearCache) {
                dispatch(clearProductsCache());
            }

            if (currentUser?.role === 'SUPPLIER') {
                dispatch(fetchProfile());
            } else {
                dispatch(fetchProducts({
                    page: 1,
                    limit: 200,
                    refresh: forceRefresh,
                    usePublicCatalog: false
                }));
            }

            setLastUpdateTime(Date.now());

            if (forceRefresh) {
                setOptimisticUpdates(new Map());
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
        }
    }, [dispatch, currentUser?.role]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            if (currentUser?.role === 'SUPPLIER' && profile?.supplier?.id) {
                await Promise.all([
                    dispatch(fetchProfile()),
                    loadSupplierProducts()
                ]);
            } else {
                await loadData(true, true);
            }
            setLastUpdateTime(Date.now());
        } catch (error) {
            console.error('❌ Ошибка обновления данных:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [loadData, currentUser?.role, profile?.supplier?.id, dispatch, loadSupplierProducts]);

    const filteredProducts = currentUser?.role === 'SUPPLIER'
        ? supplierProducts
        : normalizedProducts;

    const isLoading = currentUser?.role === 'SUPPLIER'
        ? (profileLoading || supplierProductsLoading)
        : productsLoading;

    let error = null;
    if (currentUser?.role === 'SUPPLIER') {
        if (profileError) {
            error = `Ошибка загрузки профиля: ${profileError}`;
        } else if (supplierProductsError) {
            error = `Ошибка загрузки продуктов: ${supplierProductsError}`;
        }
    } else {
        if (productsError) {
            error = `Ошибка загрузки продуктов: ${productsError}`;
        }
    }

    const updateProductItem = useCallback(async (updatedProduct) => {
        if (!updatedProduct || !updatedProduct.id) {
            console.warn('useProductManagement: Невалидные данные продукта для обновления');
            return false;
        }

        try {

            if (enableOptimisticUpdates) {
                setOptimisticUpdates(prev => new Map(prev).set(updatedProduct.id, updatedProduct));

                dispatch(updateProductOptimistic(updatedProduct));
            }

            setTimeout(async () => {
                try {

                    if (currentUser?.role === 'SUPPLIER' && profile?.supplier?.id) {
                        await loadSupplierProducts();
                    } else {
                        dispatch(clearProductsCache());
                        dispatch(fetchProducts({
                            page: 1,
                            limit: 200,
                            refresh: true,
                            usePublicCatalog: false
                        }));
                    }

                    setLastUpdateTime(Date.now());

                    setOptimisticUpdates(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(updatedProduct.id);
                        return newMap;
                    });

                } catch (error) {
                    console.error('❌ useProductManagement: Ошибка перезагрузки данных:', error);

                    setOptimisticUpdates(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(updatedProduct.id);
                        return newMap;
                    });
                }
            }, 1000);

            return true;
        } catch (error) {
            console.error('❌ useProductManagement: Ошибка при обновлении продукта:', error);

            setOptimisticUpdates(prev => {
                const newMap = new Map(prev);
                newMap.delete(updatedProduct.id);
                return newMap;
            });

            return false;
        }
    }, [dispatch, currentUser?.role, profile?.supplier?.id, loadSupplierProducts, enableOptimisticUpdates]);

    const forceReloadData = useCallback(async () => {
        try {

            dispatch(clearProductsCache());
            setOptimisticUpdates(new Map());

            if (currentUser?.role === 'SUPPLIER') {
                dispatch(fetchProfile());
                if (profile?.supplier?.id) {
                    await loadSupplierProducts();
                }
            } else {
                dispatch(fetchProducts({
                    page: 1,
                    limit: 200,
                    refresh: true,
                    usePublicCatalog: false
                }));
            }

            setLastUpdateTime(Date.now());
        } catch (error) {
            console.error('❌ useProductManagement: Ошибка принудительной перезагрузки:', error);
        }
    }, [dispatch, currentUser?.role, profile?.supplier?.id, loadSupplierProducts]);

    const searchProducts = useCallback((query, filters = {}) => {
        if (!filteredProducts || filteredProducts.length === 0) return [];

        let results = filteredProducts;

        if (query && query.trim()) {
            const searchLower = query.toLowerCase().trim();
            results = results.filter(product => {
                const name = product.name?.toLowerCase() || '';
                const description = product.description?.toLowerCase() || '';
                const supplierName = product.supplier?.companyName?.toLowerCase() || '';
                return name.includes(searchLower) ||
                    description.includes(searchLower) ||
                    supplierName.includes(searchLower);
            });
        }

        if (filters.onlyAvailable) {
            results = results.filter(product => product.isAvailable);
        }

        if (filters.onlyLowStock) {
            results = results.filter(product => product.isLowStock);
        }

        if (filters.categoryIds && filters.categoryIds.length > 0) {
            results = results.filter(product =>
                product.categories?.some(cat => filters.categoryIds.includes(cat.id))
            );
        }

        if (filters.supplierId) {
            results = results.filter(product =>
                product.supplier?.id === parseInt(filters.supplierId, 10)
            );
        }

        if (filters.minBoxes) {
            results = results.filter(product =>
                product.availableBoxes >= parseInt(filters.minBoxes, 10)
            );
        }

        if (filters.minBoxPrice || filters.maxBoxPrice) {
            results = results.filter(product => {
                const price = product.boxPrice || 0;
                const minPrice = filters.minBoxPrice ? parseFloat(filters.minBoxPrice) : 0;
                const maxPrice = filters.maxBoxPrice ? parseFloat(filters.maxBoxPrice) : Infinity;
                return price >= minPrice && price <= maxPrice;
            });
        }

        if (filters.sortBy) {
            results = [...results].sort((a, b) => {
                const direction = filters.sortDirection === 'desc' ? -1 : 1;

                switch (filters.sortBy) {
                    case 'name':
                        return direction * (a.name || '').localeCompare(b.name || '');
                    case 'boxPrice':
                        return direction * ((a.boxPrice || 0) - (b.boxPrice || 0));
                    case 'pricePerItem':
                        return direction * ((a.pricePerItem || 0) - (b.pricePerItem || 0));
                    case 'availableBoxes':
                        return direction * ((a.availableBoxes || 0) - (b.availableBoxes || 0));
                    case 'itemsPerBox':
                        return direction * ((a.itemsPerBox || 0) - (b.itemsPerBox || 0));
                    case 'savingsPerBox':
                        return direction * ((a.savingsPerBox || 0) - (b.savingsPerBox || 0));
                    default:
                        return 0;
                }
            });
        }

        return results;
    }, [filteredProducts]);

    const getProductsStats = useCallback(() => {
        if (!filteredProducts || filteredProducts.length === 0) {
            return {
                total: 0,
                available: 0,
                lowStock: 0,
                outOfStock: 0,
                inactive: 0,
                totalBoxes: 0,
                totalItems: 0,
                averageBoxPrice: 0,
                averagePricePerItem: 0,
                totalValue: 0,
                withSavings: 0,
                averageSavings: 0
            };
        }

        const stats = filteredProducts.reduce((acc, product) => {
            acc.total += 1;

            if (product.isActive) {
                if (product.isAvailable) {
                    acc.available += 1;
                    acc.totalBoxes += product.availableBoxes || 0;
                    acc.totalItems += product.availableItems || 0;
                    acc.totalBoxPrice += product.boxPrice || 0;
                    acc.totalPricePerItem += product.pricePerItem || 0;
                    acc.totalValue += (product.availableBoxes || 0) * (product.boxPrice || 0);

                    if (product.hasSavings) {
                        acc.withSavings += 1;
                        acc.totalSavings += product.savingsPerBox || 0;
                    }
                }

                if (product.isLowStock) {
                    acc.lowStock += 1;
                }

                if (product.status === 'out_of_stock') {
                    acc.outOfStock += 1;
                }
            } else {
                acc.inactive += 1;
            }

            return acc;
        }, {
            total: 0,
            available: 0,
            lowStock: 0,
            outOfStock: 0,
            inactive: 0,
            totalBoxes: 0,
            totalItems: 0,
            totalBoxPrice: 0,
            totalPricePerItem: 0,
            totalValue: 0,
            withSavings: 0,
            totalSavings: 0
        });

        const availableCount = stats.available || 1;

        return {
            ...stats,
            averageBoxPrice: stats.totalBoxPrice / availableCount,
            averagePricePerItem: stats.totalPricePerItem / availableCount,
            averageSavings: stats.withSavings > 0 ? stats.totalSavings / stats.withSavings : 0,
            formattedTotalValue: formatPrice(stats.totalValue),
            formattedAverageBoxPrice: formatPrice(stats.totalBoxPrice / availableCount),
            formattedAverageSavings: formatPrice(stats.totalSavings / (stats.withSavings || 1))
        };
    }, [filteredProducts]);

    const getProductById = useCallback((productId) => {
        const product = filteredProducts?.find(p => p.id === parseInt(productId, 10));
        return product || null;
    }, [filteredProducts]);

    const getProductsBySupplier = useCallback(() => {
        if (!filteredProducts || filteredProducts.length === 0) return [];

        const suppliers = new Map();

        filteredProducts.forEach(product => {
            const supplierId = product.supplier?.id || 'unknown';
            const supplierName = product.supplier?.companyName || 'Неизвестный поставщик';

            if (!suppliers.has(supplierId)) {
                suppliers.set(supplierId, {
                    supplierId,
                    supplierName,
                    supplier: product.supplier,
                    products: [],
                    stats: {
                        total: 0,
                        available: 0,
                        totalBoxes: 0,
                        totalItems: 0,
                        totalValue: 0
                    }
                });
            }

            const supplierGroup = suppliers.get(supplierId);
            supplierGroup.products.push(product);
            supplierGroup.stats.total += 1;

            if (product.isAvailable) {
                supplierGroup.stats.available += 1;
                supplierGroup.stats.totalBoxes += product.availableBoxes || 0;
                supplierGroup.stats.totalItems += product.availableItems || 0;
                supplierGroup.stats.totalValue += (product.availableBoxes || 0) * (product.boxPrice || 0);
            }
        });

        return Array.from(suppliers.values()).sort((a, b) =>
            a.supplierName.localeCompare(b.supplierName)
        );
    }, [filteredProducts]);

    return {
        filteredProducts,
        isLoading,
        error,
        isRefreshing,
        lastUpdateTime,

        handleRefresh,
        loadData,
        updateProduct: updateProductItem,
        forceReloadData,
        searchProducts,
        getProductById,

        stats: getProductsStats(),
        getProductsBySupplier,

        normalizeForBoxes,
        autoRefresh,
        enableOptimisticUpdates,

        optimisticUpdates: Array.from(optimisticUpdates.entries()),
        clearOptimisticUpdate: useCallback((productId) => {
            setOptimisticUpdates(prev => {
                const newMap = new Map(prev);
                newMap.delete(productId);
                return newMap;
            });
        }, []),

        normalizeProductData,
        formatPrice,
        calculateBoxesFromItems,
        calculateItemsFromBoxes,

        sortProducts: useCallback((products, sortBy, direction = 'asc') => {
            if (!Array.isArray(products)) return [];

            return [...products].sort((a, b) => {
                const dir = direction === 'desc' ? -1 : 1;

                switch (sortBy) {
                    case 'name':
                        return dir * (a.name || '').localeCompare(b.name || '');
                    case 'boxPrice':
                        return dir * ((a.boxPrice || 0) - (b.boxPrice || 0));
                    case 'pricePerItem':
                        return dir * ((a.pricePerItem || 0) - (b.pricePerItem || 0));
                    case 'availableBoxes':
                        return dir * ((a.availableBoxes || 0) - (b.availableBoxes || 0));
                    case 'itemsPerBox':
                        return dir * ((a.itemsPerBox || 0) - (b.itemsPerBox || 0));
                    case 'savingsPerBox':
                        return dir * ((a.savingsPerBox || 0) - (b.savingsPerBox || 0));
                    case 'totalItems':
                        return dir * ((a.availableItems || 0) - (b.availableItems || 0));
                    case 'supplier':
                        return dir * (a.supplier?.companyName || '').localeCompare(b.supplier?.companyName || '');
                    default:
                        return 0;
                }
            });
        }, []),

        getProductsByStatus: useCallback((status) => {
            if (!filteredProducts) return [];

            switch (status) {
                case 'available':
                    return filteredProducts.filter(p => p.isAvailable);
                case 'low_stock':
                    return filteredProducts.filter(p => p.isLowStock);
                case 'out_of_stock':
                    return filteredProducts.filter(p => p.status === 'out_of_stock');
                case 'inactive':
                    return filteredProducts.filter(p => !p.isActive);
                case 'with_savings':
                    return filteredProducts.filter(p => p.hasSavings);
                default:
                    return filteredProducts;
            }
        }, [filteredProducts]),

        advancedSearch: useCallback((searchParams) => {
            const {
                query = '',
                filters = {},
                sortBy = 'name',
                sortDirection = 'asc',
                limit = null,
                offset = 0
            } = searchParams;

            let results = searchProducts(query, filters);

            if (sortBy) {
                results = [...results].sort((a, b) => {
                    const dir = sortDirection === 'desc' ? -1 : 1;

                    switch (sortBy) {
                        case 'name':
                            return dir * (a.name || '').localeCompare(b.name || '');
                        case 'relevance':
                            const aRelevance = query ? (a.name?.toLowerCase().includes(query.toLowerCase()) ? 1 : 0) : 0;
                            const bRelevance = query ? (b.name?.toLowerCase().includes(query.toLowerCase()) ? 1 : 0) : 0;
                            return dir * (bRelevance - aRelevance);
                        case 'boxPrice':
                            return dir * ((a.boxPrice || 0) - (b.boxPrice || 0));
                        case 'availableBoxes':
                            return dir * ((a.availableBoxes || 0) - (b.availableBoxes || 0));
                        case 'savingsPerBox':
                            return dir * ((a.savingsPerBox || 0) - (b.savingsPerBox || 0));
                        default:
                            return 0;
                    }
                });
            }

            if (limit) {
                results = results.slice(offset, offset + limit);
            }

            return {
                results,
                total: filteredProducts?.length || 0,
                filtered: results.length,
                hasMore: limit ? (offset + limit) < (filteredProducts?.length || 0) : false
            };
        }, [searchProducts, filteredProducts]),

        exportProductsData: useCallback((format = 'json') => {
            if (!filteredProducts || filteredProducts.length === 0) return null;

            const exportData = filteredProducts.map(product => ({
                id: product.id,
                name: product.name,
                description: product.description,
                itemsPerBox: product.itemsPerBox,
                pricePerItem: product.pricePerItem,
                boxPrice: product.boxPrice,
                availableBoxes: product.availableBoxes,
                availableItems: product.availableItems,
                minimumOrderBoxes: product.minimumOrderBoxes,
                savingsPerBox: product.savingsPerBox,
                savingsPercentage: product.savingsPercentage,
                status: product.status,
                isAvailable: product.isAvailable,
                isLowStock: product.isLowStock,
                supplier: product.supplier?.companyName || 'Неизвестный',
                categories: product.categories?.map(cat => cat.name).join(', ') || ''
            }));

            switch (format) {
                case 'csv':
                    const headers = Object.keys(exportData[0]).join(',');
                    const rows = exportData.map(row => Object.values(row).join(','));
                    return [headers, ...rows].join('\n');
                case 'json':
                default:
                    return JSON.stringify(exportData, null, 2);
            }
        }, [filteredProducts]),

        validateProductData: useCallback((productData) => {
            const errors = [];

            if (!productData.name || productData.name.trim().length < 2) {
                errors.push('Название продукта должно содержать минимум 2 символа');
            }

            if (!productData.itemsPerBox || productData.itemsPerBox < 1) {
                errors.push('Количество штук в коробке должно быть больше 0');
            }

            if (!productData.pricePerItem || productData.pricePerItem <= 0) {
                errors.push('Цена за штуку должна быть больше 0');
            }

            if (productData.boxPrice && productData.pricePerItem && productData.itemsPerBox) {
                const calculatedBoxPrice = productData.pricePerItem * productData.itemsPerBox;
                const minBoxPrice = calculatedBoxPrice * 0.5;

                if (productData.boxPrice < minBoxPrice) {
                    errors.push('Цена за коробку не может быть меньше 50% от расчетной цены');
                }
            }

            if (productData.stockQuantity < 0) {
                errors.push('Количество на складе не может быть отрицательным');
            }

            return {
                isValid: errors.length === 0,
                errors
            };
        }, []),

        getRecommendations: useCallback((productId, type = 'similar') => {
            const currentProduct = getProductById(productId);
            if (!currentProduct || !filteredProducts) return [];

            switch (type) {
                case 'similar':
                    return filteredProducts
                        .filter(p => p.id !== productId)
                        .filter(p => {
                            const hasCommonCategory = currentProduct.categories?.some(cat =>
                                p.categories?.some(pCat => pCat.id === cat.id)
                            );

                            const sameSupplier = p.supplier?.id === currentProduct.supplier?.id;

                            const priceDiff = Math.abs(p.boxPrice - currentProduct.boxPrice) / currentProduct.boxPrice;
                            const similarPrice = priceDiff < 0.5;

                            return hasCommonCategory || sameSupplier || similarPrice;
                        })
                        .sort((a, b) => {
                            const aScore = (a.supplier?.id === currentProduct.supplier?.id ? 2 : 0) +
                                (a.categories?.some(cat => currentProduct.categories?.some(c => c.id === cat.id)) ? 1 : 0);
                            const bScore = (b.supplier?.id === currentProduct.supplier?.id ? 2 : 0) +
                                (b.categories?.some(cat => currentProduct.categories?.some(c => c.id === cat.id)) ? 1 : 0);
                            return bScore - aScore;
                        })
                        .slice(0, 6);

                case 'cheaper':
                    return filteredProducts
                        .filter(p => p.id !== productId && p.boxPrice < currentProduct.boxPrice)
                        .sort((a, b) => b.boxPrice - a.boxPrice)
                        .slice(0, 5);

                case 'savings':
                    return filteredProducts
                        .filter(p => p.id !== productId && p.hasSavings)
                        .sort((a, b) => (b.savingsPerBox || 0) - (a.savingsPerBox || 0))
                        .slice(0, 5);

                default:
                    return [];
            }
        }, [filteredProducts, getProductById])
    };
};

export default useProductManagement;