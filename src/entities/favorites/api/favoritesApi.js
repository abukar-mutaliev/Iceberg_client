import {createApiModule, handleApiError} from "@shared/services/ApiClient";

const favoritesModule = createApiModule('/api/favorites');

export const favoritesApi = {
    /**
     * Получить список избранных товаров
     */
    getFavorites: async () => {
        try {
            const response = await favoritesModule.get();
            return Array.isArray(response.data) ? response.data :
                Array.isArray(response.data?.data) ? response.data.data : [];
        } catch (error) {
            return [];
        }
    },

    /**
     * Добавить товар в избранное
     */
    addToFavorites: async (productId) => {
        try {
            const response = await favoritesModule.post('', { productId });

            return {
                productId: Number(productId),
                data: {
                    isFavorite: true,
                    ...(response?.data || {})
                }
            };
        } catch (error) {
            throw error;
        }
    },

    /**
     * Удалить товар из избранного
     */
    removeFromFavorites: async (productId) => {
        try {
            const response = await favoritesModule.delete(`/${productId}`);

            return {
                productId: Number(productId),
                data: {
                    isFavorite: false,
                    ...(response?.data || {})
                }
            };
        } catch (error) {
            throw error;
        }
    },

    /**
     * Проверить, находится ли товар в избранном
     */
    checkIsFavorite: async (productId) => {
        try {
            const response = await favoritesModule.get(`/check/${productId}`);

            const isFavorite = response?.data?.isFavorite ||
                response?.data?.data?.isFavorite || false;

            return {
                productId: Number(productId),
                isFavorite
            };
        } catch (error) {
            return { productId: Number(productId), isFavorite: false };
        }
    },

    /**
     * Получить количество избранных товаров
     * @returns {Promise<number>} Количество избранных товаров
     */
    getFavoritesCount: async () => {
        try {
            const favorites = await favoritesApi.getFavorites();
            return Array.isArray(favorites) ? favorites.length : 0;
        } catch (error) {
            const errorData = handleApiError(error);
            throw new Error(errorData.message);
        }
    }
};