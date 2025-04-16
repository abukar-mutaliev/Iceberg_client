import { createProtectedRequest } from '@/shared/api/api';

const formatFeedback = (feedback, userData) => {
    // Если в отзыве уже есть клиент с именем, возвращаем его как есть с проверкой на photoUrls
    if (feedback.client && feedback.client.name) {
        // Убедимся, что у отзыва есть поле photoUrls, даже если photos пустой
        return {
            ...feedback,
            photoUrls: feedback.photoUrls || (feedback.photos ? feedback.photos.map(photo =>
                `${process.env.REACT_APP_API_URL || ''}/uploads/${photo}`
            ) : [])
        };
    }

    // Проверяем, принадлежит ли отзыв текущему пользователю по id профиля
    if (userData && userData.profile && feedback.clientId === userData.profile.id) {
        return {
            ...feedback,
            client: {
                id: feedback.clientId,
                name: 'Вы'
            },
            photoUrls: feedback.photoUrls || (feedback.photos ? feedback.photos.map(photo =>
                `${process.env.REACT_APP_API_URL || ''}/uploads/${photo}`
            ) : [])
        };
    }

    // ВАЖНО: Если у отзыва уже есть client, но нет имени, и это не текущий пользователь,
    // используем имя из client или другую доступную информацию
    if (feedback.client) {
        return {
            ...feedback,
            client: {
                ...feedback.client,
                name: feedback.client.name || `Пользователь ${feedback.clientId}`
            },
            photoUrls: feedback.photoUrls || (feedback.photos ? feedback.photos.map(photo =>
                `${process.env.REACT_APP_API_URL || ''}/uploads/${photo}`
            ) : [])
        };
    }

    // Для отзывов, которые не принадлежат текущему пользователю
    // ПРИМЕЧАНИЕ: В идеале здесь нужно получить реальное имя пользователя из API,
    // но как временное решение используем clientId
    if (feedback.clientId) {
        // Если у нас есть данные о клиенте из сервера
        if (feedback.clientName) {
            return {
                ...feedback,
                client: {
                    id: feedback.clientId,
                    name: feedback.clientName
                },
                photoUrls: feedback.photoUrls || (feedback.photos ? feedback.photos.map(photo =>
                    `${process.env.REACT_APP_API_URL || ''}/uploads/${photo}`
                ) : [])
            };
        }

        return {
            ...feedback,
            client: {
                id: feedback.clientId,
                // Используем просто "Клиент" вместо "Пользователь ID"
                name: `Клиент`
            },
            photoUrls: feedback.photoUrls || (feedback.photos ? feedback.photos.map(photo =>
                `${process.env.REACT_APP_API_URL || ''}/uploads/${photo}`
            ) : [])
        };
    }

    // Убедимся, что у отзыва есть поле photoUrls, даже если photos пустой
    return {
        ...feedback,
        photoUrls: feedback.photoUrls || (feedback.photos ? feedback.photos.map(photo =>
            `${process.env.REACT_APP_API_URL || ''}/uploads/${photo}`
        ) : [])
    };
};

const formatFeedbacks = (feedbacks, userData) => {
    if (!Array.isArray(feedbacks)) {
        return [];
    }

    return feedbacks.map(feedback => formatFeedback(feedback, userData));
};

// Функция для получения информации о клиенте по ID
const getClientInfo = async (clientId) => {
    try {
        const response = await createProtectedRequest('get', `/api/clients/${clientId}`);
        if (response && response.status === 'success' && response.data) {
            return response.data;
        }
        return null;
    } catch (error) {
        console.warn(`Не удалось получить информацию о клиенте ${clientId}:`, error);
        return null;
    }
};

// Функция для создания FormData из массива файлов
const createFormDataWithPhotos = (photos) => {
    const formData = new FormData();

    photos.forEach((photo, index) => {
        // Поддержка как для объектов из expo-image-picker, так и для File объектов
        if (photo.uri) {
            // Формат из expo-image-picker
            const uriParts = photo.uri.split('.');
            const fileType = uriParts[uriParts.length - 1];

            formData.append('photos', {
                uri: photo.uri,
                name: `photo_${index}.${fileType}`,
                type: `image/${fileType}`
            });
        } else if (photo instanceof File) {
            // Стандартный File объект (для веб)
            formData.append('photos', photo);
        }
    });

    return formData;
};

export const feedbackApi = {
    getProductFeedbacks: async (productId, userData) => {
        try {
            const response = await createProtectedRequest('get', `/api/feedbacks?productId=${productId}`);

            if (response && response.status === 'success' && Array.isArray(response.data)) {
                // Форматируем все отзывы, добавляя информацию о клиенте и URL фотографий
                const formattedFeedbacks = formatFeedbacks(response.data, userData);
                return {
                    ...response,
                    data: formattedFeedbacks
                };
            }

            return response;
        } catch (error) {
            console.error('Ошибка при получении отзывов:', error);
            throw error;
        }
    },

    createFeedback: async (feedbackData, userData) => {
        try {
            const response = await createProtectedRequest('post', '/api/feedbacks', feedbackData);

            if (response && response.status === 'success' && response.data) {
                // После успешного создания отзыва, форматируем его, добавляя информацию о клиенте
                const formattedFeedback = formatFeedback(response.data, userData);
                return {
                    ...response,
                    data: formattedFeedback
                };
            }

            return response;
        } catch (error) {
            console.error('Ошибка при создании отзыва:', error);
            throw error;
        }
    },

    updateFeedback: async (id, feedbackData, userData) => {
        try {
            const response = await createProtectedRequest('put', `/api/feedbacks/${id}`, feedbackData);

            if (response && response.status === 'success' && response.data) {
                // После успешного обновления, форматируем отзыв
                const formattedFeedback = formatFeedback(response.data, userData);
                return {
                    ...response,
                    data: formattedFeedback
                };
            }

            return response;
        } catch (error) {
            console.error(`Ошибка при обновлении отзыва ${id}:`, error);
            throw error;
        }
    },

    deleteFeedback: async (id) => {
        try {
            return await createProtectedRequest('delete', `/api/feedbacks/${id}`);
        } catch (error) {
            console.error(`Ошибка при удалении отзыва ${id}:`, error);
            throw error;
        }
    },

    // Новые методы для работы с фотографиями
    uploadFeedbackPhotos: async (feedbackId, photos) => {
        try {
            const formData = createFormDataWithPhotos(photos);

            const response = await createProtectedRequest(
                'post',
                `/api/feedbacks/${feedbackId}/photos`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            return response;
        } catch (error) {
            console.error(`Ошибка при загрузке фотографий к отзыву ${feedbackId}:`, error);
            throw error;
        }
    },

    deleteFeedbackPhoto: async (feedbackId, photoIndex) => {
        try {
            return await createProtectedRequest(
                'delete',
                `/api/feedbacks/${feedbackId}/photos/${photoIndex}`
            );
        } catch (error) {
            console.error(`Ошибка при удалении фотографии ${photoIndex} из отзыва ${feedbackId}:`, error);
            throw error;
        }
    },

    // Получение полной информации об отзыве, включая фотографии
    getFeedbackById: async (feedbackId, userData) => {
        try {
            const response = await createProtectedRequest(
                'get',
                `/api/feedbacks/${feedbackId}`
            );

            if (response && response.status === 'success' && response.data) {
                // Форматируем отзыв, добавляя информацию о клиенте и URL фотографий
                const formattedFeedback = formatFeedback(response.data, userData);
                return {
                    ...response,
                    data: formattedFeedback
                };
            }

            return response;
        } catch (error) {
            console.error(`Ошибка при получении отзыва ${feedbackId}:`, error);
            throw error;
        }
    }
};

export default feedbackApi;