import { useCallback, useMemo } from 'react';
import { useCartProduct } from '@entities/cart';
import { useProductStock } from '@entities/warehouse';
import { getUploadsBaseUrl } from '@shared/api/api';

// Дефолтное изображение
const DEFAULT_PRODUCT_IMAGE = null;

// Базовый URL сервера для изображений (используем централизованную функцию)
const getImageBaseUrl = getUploadsBaseUrl;

/**
 * Расширенный хук для карточки продукта с поддержкой складов
 * @param {Object} product - Данные продукта
 * @param {Object} options - Опции
 * @param {boolean} options.useWarehouseStock - Использовать данные складов для подсчета остатков
 * @param {boolean} options.findNearestWarehouses - Искать ближайшие склады с товаром
 * @returns {Object} - Данные продукта с информацией о складах
 */
export const useProductCardWithStock = (product, {
    useWarehouseStock = false,
    findNearestWarehouses = false
} = {}) => {
    // Извлечение и проверка корректности ID продукта
    const productId = useMemo(() => {
        if (!product) return null;

        // Используем originalData, если она есть (из ProductsList)
        const actualProduct = product.originalData || product;

        let rawId = null;
        if (actualProduct.id) {
            rawId = actualProduct.id;
        } else if (actualProduct.productId) {
            rawId = actualProduct.productId;
        } else if (actualProduct.product && actualProduct.product.id) {
            rawId = actualProduct.product.id;
        } else if (product.id) {
            rawId = product.id;
        }

        if (rawId === null) return null;

        // Преобразуем в число и проверяем корректность
        try {
            const numericId = Number(rawId);
            if (isNaN(numericId) || numericId <= 0) {
                return null;
            }
            return numericId;
        } catch (error) {
            return null;
        }
    }, [product]);

    // Используем хук корзины для этого продукта
    const {
        isInCart,
        quantity,
        cartItem,
        isAdding,
        isUpdating,
        isRemoving,
        isLoading: cartLoading,
        addToCart,
        updateQuantity,
        removeFromCart,
        incrementQuantity,
        decrementQuantity
    } = useCartProduct(productId);

    // Используем хук склада для получения остатков
    const {
        totalStock,
        availableStock,
        warehousesWithStock,
        nearestWarehouses,
        loading: stockLoading,
        error: stockError,
        hasStock,
        isAvailable: stockAvailable,
        isLowStock,
        stats: stockStats,
        getWarehouseStock,
        hasStockInWarehouse
    } = useProductStock(productId, {
        autoLoad: useWarehouseStock,
        findWarehouses: findNearestWarehouses
    });

    // Безопасное извлечение данных продукта
    const productData = useMemo(() => {
        if (!product) return {
            id: null,
            name: '',
            description: '',
            price: 0,
            image: DEFAULT_PRODUCT_IMAGE,
            stockQuantity: 0,
            availableQuantity: 0,
            isActive: false,
            weight: null,
            supplier: null,
            formattedPrice: '0 ₽'
        };

        // Используем originalData, если она есть (из ProductsList)
        const actualProduct = product.originalData || product;

        const price = typeof actualProduct.price === 'number' ? actualProduct.price :
            typeof actualProduct.price === 'string' ? parseFloat(actualProduct.price) || 0 : 0;

        const formattedPrice = new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);

        // Определяем количество товара в зависимости от настроек
        let stockQuantity, availableQuantity;
        
        if (useWarehouseStock && hasStock) {
            // Используем данные со складов
            stockQuantity = totalStock;
            availableQuantity = availableStock;
        } else {
            // Используем стандартные данные продукта
            stockQuantity = actualProduct.stockQuantity || 0;
            availableQuantity = actualProduct.availableQuantity !== undefined && actualProduct.availableQuantity !== null 
                ? actualProduct.availableQuantity 
                : stockQuantity;
        }

        console.log('🏢 useProductCardWithStock data processing:', {
            productId,
            name: actualProduct.name || actualProduct.title,
            useWarehouseStock,
            fromWarehouse: { totalStock, availableStock },
            fromProduct: { 
                stockQuantity: actualProduct.stockQuantity, 
                availableQuantity: actualProduct.availableQuantity 
            },
            final: { stockQuantity, availableQuantity },
            warehousesCount: warehousesWithStock?.length || 0
        });

        return {
            id: productId,
            name: actualProduct.name || actualProduct.title || '',
            description: actualProduct.description || '',
            price: price,
            image: getProductImage(actualProduct),
            stockQuantity: stockQuantity,
            availableQuantity: availableQuantity,
            isActive: actualProduct.isActive !== undefined ? actualProduct.isActive : true,
            weight: actualProduct.weight || null,
            supplier: actualProduct.supplier || null,
            formattedPrice: formattedPrice
        };
    }, [product, productId, useWarehouseStock, totalStock, availableStock, hasStock, warehousesWithStock]);

    // Проверка доступности товара - используем availableQuantity
    const isAvailable = useMemo(() => {
        const isActive = productData.isActive !== false;
        const availableQuantity = productData.availableQuantity || 0;
        return isActive && availableQuantity > 0;
    }, [productData.isActive, productData.availableQuantity]);

    // Проверка превышения доступного количества - используем availableQuantity
    const isExceedsStock = useMemo(() => {
        return quantity >= productData.availableQuantity;
    }, [quantity, productData.availableQuantity]);

    // Статус товара - используем availableQuantity
    const status = useMemo(() => {
        if (!productData.isActive) return 'inactive';
        if (productData.availableQuantity <= 0) return 'out_of_stock';
        if (isExceedsStock) return 'exceeds_stock';
        if (productData.availableQuantity < 5) return 'low_stock';
        return 'available';
    }, [productData.isActive, productData.availableQuantity, isExceedsStock]);

    // Обработчик добавления в корзину (заменяет старый Redux dispatch)
    const handleAddToCart = useCallback(async (qty = 1) => {
        if (!productId || !productData.isActive) {
            console.warn('Попытка добавить недоступный товар в корзину');
            return;
        }

        try {
            await addToCart(qty);
            console.log(`Товар ${productData.name} добавлен в корзину`);
        } catch (error) {
            console.error('Ошибка при добавлении товара в корзину:', error);
            throw error;
        }
    }, [productId, productData.isActive, productData.name, addToCart]);

    // Получить информацию о конкретном складе
    const getWarehouseInfo = useCallback((warehouseId) => {
        if (!useWarehouseStock) return null;
        
        const stock = getWarehouseStock(warehouseId);
        const warehouse = warehousesWithStock?.find(w => w.id === parseInt(warehouseId, 10));
        
        return {
            warehouse,
            stock,
            hasStock: hasStockInWarehouse(warehouseId),
            availableQuantity: stock ? Math.max(0, (stock.quantity || 0) - (stock.reserved || 0)) : 0
        };
    }, [useWarehouseStock, getWarehouseStock, warehousesWithStock, hasStockInWarehouse]);

    return {
        // Основные данные (совместимость со старым API)
        productId,
        productData,
        handleAddToCart, // Обновленный метод

        // Новые данные состояния корзины
        isInCart,
        quantity,
        cartItem,

        // Состояния загрузки
        isAdding,
        isUpdating,
        isRemoving,
        isLoading: cartLoading || stockLoading,

        // Доступность
        isAvailable,
        isExceedsStock,
        status,

        // Дополнительные действия с корзиной
        addToCart,
        updateQuantity,
        removeFromCart,
        incrementQuantity,
        decrementQuantity,

        // Данные складов (новое)
        warehouseData: useWarehouseStock ? {
            totalStock,
            availableStock,
            warehousesWithStock,
            nearestWarehouses,
            stockStats,
            hasStock,
            isLowStock,
            getWarehouseInfo,
            
            // Методы проверки складов
            hasStockInWarehouse,
            getWarehouseStock,
            
            // Состояние загрузки складов
            stockLoading,
            stockError
        } : null
    };
};

// Функция для получения изображения продукта (без изменений)
function getProductImage(product) {
    try {
        // Функция для формирования полного URL изображения
        const formatImageUrl = (imagePath) => {
            if (!imagePath) return null;

            // Если это уже полный URL, возвращаем как есть
            if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                return imagePath;
            }

            // Если это относительный путь, добавляем базовый URL
            return `${getImageBaseUrl()}${imagePath}`;
        };

        // Вариант 1: product.images (массив)
        if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
            const firstImage = product.images[0];

            if (typeof firstImage === 'string') {
                const fullUrl = formatImageUrl(firstImage);
                return fullUrl ? { uri: fullUrl } : null;
            } else if (firstImage && typeof firstImage === 'object') {
                const imageUrl = firstImage.url || firstImage.uri || firstImage.path || firstImage.src;
                if (imageUrl) {
                    const fullUrl = formatImageUrl(imageUrl);
                    return fullUrl ? { uri: fullUrl } : null;
                }
            }
        }

        // Вариант 2: product.image (строка или объект)
        if (product?.image) {
            if (typeof product.image === 'string') {
                const fullUrl = formatImageUrl(product.image);
                return fullUrl ? { uri: fullUrl } : null;
            } else if (typeof product.image === 'object' && product.image.uri) {
                const fullUrl = formatImageUrl(product.image.uri);
                return fullUrl ? { uri: fullUrl } : product.image;
            } else if (typeof product.image === 'object') {
                const imageUrl = product.image.url || product.image.uri || product.image.path || product.image.src;
                if (imageUrl) {
                    const fullUrl = formatImageUrl(imageUrl);
                    return fullUrl ? { uri: fullUrl } : null;
                }
            }
        }

        // Вариант 3: product.product.images (вложенная структура)
        if (product?.product?.images && Array.isArray(product.product.images) && product.product.images.length > 0) {
            const firstImage = product.product.images[0];

            if (typeof firstImage === 'string') {
                const fullUrl = formatImageUrl(firstImage);
                return fullUrl ? { uri: fullUrl } : null;
            } else if (firstImage && typeof firstImage === 'object') {
                const imageUrl = firstImage.url || firstImage.uri || firstImage.path || firstImage.src;
                if (imageUrl) {
                    const fullUrl = formatImageUrl(imageUrl);
                    return fullUrl ? { uri: fullUrl } : null;
                }
            }
        }

        // Вариант 4: Проверяем другие возможные поля
        const possibleImageFields = [
            'imageUrl', 'img', 'picture', 'photo', 'thumbnail', 'cover'
        ];

        for (const field of possibleImageFields) {
            if (product?.[field]) {
                if (typeof product[field] === 'string') {
                    const fullUrl = formatImageUrl(product[field]);
                    return fullUrl ? { uri: fullUrl } : null;
                }
            }
        }

        return DEFAULT_PRODUCT_IMAGE;
    } catch (e) {
        console.error('getProductImage - Ошибка при обработке изображения:', e);
        return DEFAULT_PRODUCT_IMAGE;
    }
}

export default useProductCardWithStock; 