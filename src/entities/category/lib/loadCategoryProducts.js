import { categoryApi } from '@entities/category/api/categoryApi';
import {
    normalizeCategoryId,
    setCategoryProductsLoading,
    setCategoryProductsResult,
    setCategoryProductsError,
} from '@entities/category/model/slice';
import {
    logCategoryProducts,
    summarizeProducts,
    summarizePagination,
} from '@entities/category/lib/categoryProductsDebug';

const PRODUCTS_PAGE_SIZE = 20;

/** Отмена только предыдущего запроса той же категории (не глобальный RTK-abort по типу thunk). */
const inFlightByCategory = new Map();

const handleError = (error) => {
    if (error?.name === 'TypeError' && error.message?.includes('undefined')) {
        return 'Ошибка формата данных от сервера. Пожалуйста, повторите попытку.';
    }
    if (error?.code === 'ECONNABORTED') {
        return 'Превышено время ожидания. Проверьте подключение к сети.';
    }
    if (!error?.response) {
        return 'Ошибка сети. Проверьте подключение.';
    }
    return error.response?.data?.message || 'Произошла ошибка';
};

const buildPagination = (serverPagination, page, limit, productsCount) => {
    const currentPage = serverPagination?.page || page;
    const totalPages = serverPagination?.totalPages || 1;
    const totalItems = serverPagination?.totalItems ?? productsCount;
    const hasMore = currentPage < totalPages;

    return {
        currentPage,
        totalPages,
        totalItems,
        hasMore: serverPagination?.hasMore ?? hasMore,
    };
};

const parseProductsResponse = (response, page, limit, normalizedCategoryId, categoryName, getState) => {
    const matchesCategory = (product) => {
        if (!Array.isArray(product?.categories)) {
            return false;
        }

        const normalizedName = typeof categoryName === 'string'
            ? categoryName.trim().toLowerCase()
            : '';

        return product.categories.some((cat) => {
            const catId = normalizeCategoryId(cat?.id);
            if (catId === normalizedCategoryId) {
                return true;
            }
            if (!normalizedName) {
                return false;
            }
            const catName = (cat?.name || '').trim().toLowerCase();
            const catDescription = (cat?.description || '').trim().toLowerCase();
            return catName === normalizedName || catDescription === normalizedName;
        });
    };

    const pickFallbackProducts = () => {
        const catalogProducts = getState()?.products?.items;
        if (!Array.isArray(catalogProducts) || catalogProducts.length === 0) {
            return [];
        }
        return catalogProducts.filter(matchesCategory);
    };

    if (!response || response.status !== 'success') {
        return null;
    }

    if (response.data?.products) {
        let products = response.data.products || [];
        let usedFallback = false;

        if (page === 1 && products.length === 0) {
            products = pickFallbackProducts();
            usedFallback = products.length > 0;
            logCategoryProducts('loader.fallbackCatalog', {
                normalizedCategoryId,
                categoryName,
                fallback: summarizeProducts(products),
            });
        }

        const pagination = buildPagination(
            response.data.pagination,
            page,
            limit,
            products.length
        );

        return { products, pagination, usedFallback };
    }

    if (Array.isArray(response.data)) {
        const products = response.data;
        const inferredHasMore = products.length >= limit;
        return {
            products,
            pagination: {
                currentPage: page,
                totalPages: inferredHasMore ? page + 1 : page,
                totalItems: products.length,
                hasMore: inferredHasMore,
            },
            usedFallback: false,
        };
    }

    return null;
};

export const loadCategoryProducts = ({
    categoryId,
    categoryName = null,
    page = 1,
    limit = PRODUCTS_PAGE_SIZE,
} = {}) => async (dispatch, getState) => {
    const normalizedCategoryId = normalizeCategoryId(categoryId);
    if (!normalizedCategoryId) {
        logCategoryProducts('loader.skip.invalidId', { categoryId, categoryName, page });
        return;
    }

    const prevToken = inFlightByCategory.get(normalizedCategoryId);
    if (prevToken) {
        prevToken.aborted = true;
    }
    const token = { aborted: false };
    inFlightByCategory.set(normalizedCategoryId, token);

    dispatch(setCategoryProductsLoading({ categoryId: normalizedCategoryId, page }));

    try {
        logCategoryProducts('loader.start', {
            normalizedCategoryId,
            categoryName,
            page,
            limit,
        });

        const response = await categoryApi.getProductsByCategory(normalizedCategoryId, { page, limit });

        if (token.aborted) {
            logCategoryProducts('loader.aborted', { normalizedCategoryId, page });
            return;
        }

        const parsed = parseProductsResponse(
            response,
            page,
            limit,
            normalizedCategoryId,
            categoryName,
            getState
        );

        if (!parsed) {
            logCategoryProducts('loader.invalidResponse', {
                normalizedCategoryId,
                responseStatus: response?.status,
            });
            dispatch(setCategoryProductsError({
                categoryId: normalizedCategoryId,
                page,
                error: 'Некорректный формат ответа от сервера',
            }));
            return;
        }

        logCategoryProducts('loader.success', {
            normalizedCategoryId,
            categoryName,
            page,
            products: summarizeProducts(parsed.products),
            pagination: summarizePagination(parsed.pagination),
            usedFallback: parsed.usedFallback,
        });

        dispatch(setCategoryProductsResult({
            categoryId: normalizedCategoryId,
            products: parsed.products,
            pagination: parsed.pagination,
            page,
        }));
    } catch (error) {
        if (token.aborted) {
            return;
        }
        logCategoryProducts('loader.error', {
            normalizedCategoryId,
            page,
            message: error?.message || String(error),
        });
        dispatch(setCategoryProductsError({
            categoryId: normalizedCategoryId,
            page,
            error: handleError(error),
        }));
    } finally {
        if (inFlightByCategory.get(normalizedCategoryId) === token) {
            inFlightByCategory.delete(normalizedCategoryId);
        }
    }
};
