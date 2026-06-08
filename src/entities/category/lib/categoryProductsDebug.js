const TAG = '[CategoryProducts]';

const safeStringify = (value) => {
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
};

export const summarizeProduct = (product) => {
    if (!product || typeof product !== 'object') {
        return null;
    }
    return {
        id: product.id,
        name: product.name,
        categoryIds: Array.isArray(product.categories)
            ? product.categories.map((c) => c?.id)
            : [],
        categoryNames: Array.isArray(product.categories)
            ? product.categories.map((c) => c?.name)
            : [],
    };
};

export const summarizeProducts = (products, maxItems = 5) => {
    if (!Array.isArray(products)) {
        return { count: 0, sample: [], allIds: [] };
    }
    return {
        count: products.length,
        sample: products.slice(0, maxItems).map(summarizeProduct),
        allIds: products.map((p) => p?.id).filter((id) => id != null),
    };
};

export const summarizePagination = (pagination) => {
    if (!pagination || typeof pagination !== 'object') {
        return null;
    }
    return {
        currentPage: pagination.currentPage ?? pagination.page,
        totalPages: pagination.totalPages,
        totalItems: pagination.totalItems,
        hasMore: pagination.hasMore,
        limit: pagination.limit,
    };
};

export const summarizeReduxProductsByCategory = (categoryState) => {
    const map = categoryState?.productsByCategory || {};
    const paginationMap = categoryState?.productsPaginationByCategory || {};
    const loadingMap = categoryState?.productsLoadingByCategory || {};

    return {
        storedCategoryKeys: Object.keys(map),
        countsByCategory: Object.fromEntries(
            Object.entries(map).map(([key, list]) => [key, Array.isArray(list) ? list.length : 0])
        ),
        paginationByCategory: paginationMap,
        loadingByCategory: loadingMap,
    };
};

export const logCategoryProducts = (step, payload = {}) => {
    if (!__DEV__) {
        return;
    }

    console.log(`${TAG} ${step}`, safeStringify(payload));
};
