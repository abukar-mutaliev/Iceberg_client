const WEIGHT_CATEGORY_NAMES = new Set(['рыба', 'fish']);

const categoryLabel = (category) => {
    if (!category) return '';
    if (typeof category === 'string') return category;
    return category.name || category.description || '';
};

const categoryIsWeightBased = (category) => {
    if (!category) return false;
    if (typeof category === 'object' && category.isWeightBased === true) return true;
    return WEIGHT_CATEGORY_NAMES.has(categoryLabel(category).toLowerCase().trim());
};

const collectCategories = (source) => {
    if (!source) return [];
    const categories = [];
    if (Array.isArray(source.categories)) categories.push(...source.categories);
    if (source.category) categories.push(source.category);
    return categories;
};

/**
 * Рыба и другие весовые товары: цена за кг, в коробке — килограммы, не штуки.
 */
export const isWeightBasedProduct = (product) => {
    if (!product) return false;
    if (product.isWeightBased === true || product.boxInfo?.isWeightBased === true) return true;

    return [product, product.originalData]
        .filter(Boolean)
        .some((source) => collectCategories(source).some(categoryIsWeightBased));
};

/**
 * Для рыбы itemsPerBox хранит килограммы в одной коробке.
 */
export const getWeightBasedKgPerBox = (product) => {
    const source = product?.itemsPerBox != null || product?.boxInfo?.itemsPerBox != null
        ? product
        : (product?.originalData || product);
    const raw = source?.itemsPerBox ?? source?.boxInfo?.itemsPerBox;
    const kg = Number(raw);
    if (Number.isFinite(kg) && kg > 0) return kg;
    return 1;
};

export const getWeightBasedBoxPrice = (product, unitPrice) => {
    const pricePerKg = Number(unitPrice ?? product?.price) || 0;
    return pricePerKg * getWeightBasedKgPerBox(product);
};

export const formatWeightKg = (kg) => {
    const value = Number(kg);
    if (!Number.isFinite(value) || value <= 0) return '1';
    const rounded = Math.round(value * 1000) / 1000;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

/**
 * Ориентировочная цена одной штуки: цена за кг × вес штуки.
 * Вес хранится в граммах; если не задан — 1 кг.
 */
export const estimateWeightBasedUnitPrice = (product) => {
    const pricePerKg = Number(product?.price) || 0;
    const grams = Number(product?.weight);
    const unitGrams = Number.isFinite(grams) && grams > 0 ? grams : 1000;
    return pricePerKg * (unitGrams / 1000);
};
