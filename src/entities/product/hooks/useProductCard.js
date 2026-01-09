import { useCallback, useMemo } from 'react';
import { useCartProduct } from '@entities/cart';
import { getUploadsBaseUrl } from '@shared/api/api';
import { useProductBox } from './useProductBox';

const DEFAULT_PRODUCT_IMAGE = null;

// Базовый URL сервера для изображений (используем централизованную функцию)
const getImageBaseUrl = getUploadsBaseUrl;

/**
 * Расширенный хук для карточки продукта с поддержкой коробочной логики
 * @param {Object} product - Данные продукта
 * @param {Object} options - Опции
 * @param {boolean} options.useBoxLogic - Использовать коробочную логику (по умолчанию true)
 * @returns {Object} - Данные продукта с коробочной логикой и управлением корзиной
 */
export const useProductCard = (product, { useBoxLogic = true } = {}) => {
    const boxProduct = useProductBox(product);

    const productId = useMemo(() => {
        return boxProduct.id;
    }, [boxProduct.id]);

    const {
        isInCart,
        quantity: cartQuantityBoxes,
        cartItem,
        isAdding,
        isUpdating,
        isRemoving,
        isLoading,
        addToCart,
        updateQuantity,
        removeFromCart,
        incrementQuantity,
        decrementQuantity
    } = useCartProduct(productId);

    const cartQuantityItems = useMemo(() => {
        return cartQuantityBoxes * boxProduct.itemsPerBox;
    }, [cartQuantityBoxes, boxProduct.itemsPerBox]);

    const isExceedsStock = useMemo(() => {
        return cartQuantityBoxes >= boxProduct.availableBoxes;
    }, [cartQuantityBoxes, boxProduct.availableBoxes]);

    const status = useMemo(() => {
        if (!boxProduct.isActive) return 'inactive';
        if (boxProduct.availableBoxes <= 0) return 'out_of_stock';
        if (isExceedsStock) return 'exceeds_stock';
        if (boxProduct.isLowStock) return 'low_stock';
        return 'available';
    }, [boxProduct.isActive, boxProduct.availableBoxes, boxProduct.isLowStock, isExceedsStock]);

    const handleAddBoxesToCart = useCallback(async (boxesCount = 1) => {
        if (!productId || !boxProduct.isActive) {
            console.warn('Попытка добавить недоступный товар в корзину');
            return;
        }

        if (!boxProduct.canOrderQuantity(boxesCount)) {
            console.warn(`Нельзя заказать ${boxesCount} коробок. Доступно: ${boxProduct.availableBoxes}`);
            return;
        }

        try {
            await addToCart(boxesCount);
            console.log(`Товар ${boxProduct.name} добавлен в корзину: ${boxesCount} коробок (${boxesCount * boxProduct.itemsPerBox} штук)`);
        } catch (error) {
            console.error('Ошибка при добавлении товара в корзину:', error);
            throw error;
        }
    }, [productId, boxProduct, addToCart]);

    const handleAddItemsToCart = useCallback(async (itemsCount = 1) => {
        const requiredBoxes = boxProduct.calculateBoxesFromItems(itemsCount);
        return handleAddBoxesToCart(requiredBoxes);
    }, [boxProduct, handleAddBoxesToCart]);

    const handleUpdateBoxesQuantity = useCallback(async (boxesCount) => {
        if (boxesCount < 0) return;

        if (boxesCount === 0) {
            return removeFromCart();
        }

        if (!boxProduct.canOrderQuantity(boxesCount)) {
            console.warn(`Нельзя установить ${boxesCount} коробок. Доступно: ${boxProduct.availableBoxes}`);
            return;
        }

        try {
            await updateQuantity(boxesCount);
        } catch (error) {
            console.error('Ошибка при обновлении количества:', error);
            throw error;
        }
    }, [boxProduct, updateQuantity, removeFromCart]);

    const cartTotalPrice = useMemo(() => {
        if (!isInCart || cartQuantityBoxes === 0) return 0;
        return boxProduct.calculateTotalPrice(cartQuantityBoxes);
    }, [isInCart, cartQuantityBoxes, boxProduct]);

    const formattedCartTotalPrice = useMemo(() => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(cartTotalPrice);
    }, [cartTotalPrice]);

    const productImage = useMemo(() => {
        return getProductImage(product);
    }, [product]);

    const orderInfo = useMemo(() => {
        return {
            canOrder: boxProduct.isAvailable,
            maxBoxes: boxProduct.availableBoxes,
            maxItems: boxProduct.availableItems,
            minBoxes: boxProduct.minimumOrderBoxes,
            minItems: boxProduct.minimumOrderItems,
            recommendedBoxes: Math.min(boxProduct.minimumOrderBoxes, boxProduct.availableBoxes),

            warnings: {
                lowStock: boxProduct.isLowStock,
                outOfStock: boxProduct.availableBoxes === 0,
                inactive: !boxProduct.isActive,
                exceedsStock: isExceedsStock
            }
        };
    }, [boxProduct, isExceedsStock]);

    return {
        productId,
        productData: {
            ...boxProduct,
            image: productImage,
            formattedCartTotalPrice
        },

        isInCart,
        cartQuantityBoxes,
        cartQuantityItems,
        cartItem,
        cartTotalPrice,
        formattedCartTotalPrice,

        isAdding,
        isUpdating,
        isRemoving,
        isLoading,

        isAvailable: boxProduct.isAvailable,
        status,
        orderInfo,

        addBoxesToCart: handleAddBoxesToCart,
        updateBoxesQuantity: handleUpdateBoxesQuantity,
        incrementBoxes: incrementQuantity,
        decrementBoxes: decrementQuantity,

        addItemsToCart: handleAddItemsToCart,

        addToCart: handleAddBoxesToCart,
        updateQuantity: handleUpdateBoxesQuantity,
        removeFromCart,

        handleAddToCart: handleAddBoxesToCart,
        quantity: cartQuantityBoxes,
        isExceedsStock
    };
};

function getProductImage(product) {
    try {
        const formatImageUrl = (imagePath) => {
            if (!imagePath) return null;

            if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                return imagePath;
            }

            return `${getImageBaseUrl()}${imagePath}`;
        };

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

