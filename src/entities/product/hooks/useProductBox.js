import { useMemo } from 'react';

/**
 * Хук для работы с коробочной логикой продукта
 * @param {Object} product - Данные продукта
 * @returns {Object} - Обработанные данные с коробочной логикой
 */
export const useProductBox = (product) => {
    return useMemo(() => {
        if (!product) {
            return {
                id: null,
                name: '',
                description: '',
                isActive: false,

                itemsPerBox: 1,
                pricePerItem: 0,
                boxPrice: 0,
                stockQuantityBoxes: 0,
                totalItems: 0,

                availableBoxes: 0,
                availableItems: 0,
                isAvailable: false,
                isLowStock: false,

                formattedPricePerItem: '0 ₽',
                formattedBoxPrice: '0 ₽',

                minimumOrderBoxes: 1,
                minimumOrderItems: 1,

                savingsPerBox: 0,
                savingsPercentage: 0,

                calculateBoxesFromItems: () => 0,
                calculateItemsFromBoxes: () => 0,
                calculateTotalPrice: () => 0,
                canOrderQuantity: () => false
            };
        }

        const actualProduct = product.originalData || product;

        const itemsPerBox = actualProduct.itemsPerBox || 1;
        const pricePerItem = typeof actualProduct.price === 'number'
            ? actualProduct.price
            : parseFloat(actualProduct.price) || 0;

        const boxPrice = actualProduct.boxPrice || (pricePerItem * itemsPerBox);

        const stockQuantityBoxes = actualProduct.stockQuantity || 0;

        const totalItems = stockQuantityBoxes * itemsPerBox;

        const reservedBoxes = actualProduct.reservedQuantity || 0;
        const availableBoxes = Math.max(0, stockQuantityBoxes - reservedBoxes);
        const availableItems = availableBoxes * itemsPerBox;

        const isActive = actualProduct.isActive !== false;
        const isAvailable = isActive && availableBoxes > 0;
        const isLowStock = availableBoxes > 0 && availableBoxes <= 5; // Мало коробок на складе

        const formatPrice = (price) => new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(price);

        const formattedPricePerItem = formatPrice(pricePerItem);
        const formattedBoxPrice = formatPrice(boxPrice);

        const minimumOrderBoxes = 1;
        const minimumOrderItems = itemsPerBox;

        const calculatedBoxPrice = pricePerItem * itemsPerBox;
        const savingsPerBox = Math.max(0, calculatedBoxPrice - boxPrice);
        const savingsPercentage = calculatedBoxPrice > 0
            ? (savingsPerBox / calculatedBoxPrice) * 100
            : 0;

        const calculateBoxesFromItems = (itemsCount) => {
            return Math.ceil(itemsCount / itemsPerBox);
        };

        const calculateItemsFromBoxes = (boxesCount) => {
            return boxesCount * itemsPerBox;
        };

        const calculateTotalPrice = (boxesCount, useBoxPrice = true) => {
            if (useBoxPrice) {
                return boxesCount * boxPrice;
            } else {
                return boxesCount * itemsPerBox * pricePerItem;
            }
        };

        const canOrderQuantity = (requestedBoxes) => {
            return isAvailable && requestedBoxes >= minimumOrderBoxes && requestedBoxes <= availableBoxes;
        };

        const boxInfo = {
            itemsPerBox,
            boxPrice,
            pricePerItem,
            availableBoxes,
            totalItems: availableItems,
            minimumOrder: minimumOrderBoxes
        };

        console.log('🔍 useProductBox processing:', {
            productId: actualProduct.id,
            name: actualProduct.name,
            itemsPerBox,
            stockQuantityBoxes,
            availableBoxes,
            totalItems,
            availableItems,
            boxPrice,
            pricePerItem,
            isActive,
            isAvailable
        });

        return {
            id: actualProduct.id,
            name: actualProduct.name || '',
            description: actualProduct.description || '',
            isActive,
            supplier: actualProduct.supplier,
            categories: actualProduct.categories || [],
            images: actualProduct.images || [],
            weight: actualProduct.weight,

            itemsPerBox,
            pricePerItem,
            boxPrice,
            stockQuantityBoxes,
            totalItems,

            availableBoxes,
            availableItems,
            isAvailable,
            isLowStock,

            formattedPricePerItem,
            formattedBoxPrice,

            minimumOrderBoxes,
            minimumOrderItems,

            savingsPerBox,
            savingsPercentage,

            boxInfo,

            calculateBoxesFromItems,
            calculateItemsFromBoxes,
            calculateTotalPrice,
            canOrderQuantity,

            price: pricePerItem,
            stockQuantity: availableBoxes,
            availableQuantity: availableBoxes
        };
    }, [product]);
};

export default useProductBox;