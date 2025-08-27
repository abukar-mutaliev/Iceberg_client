import { useState, useCallback } from 'react';

/**
 * Хук для управления модальным окном просмотра изображений
 * @returns {object} объект с состоянием и методами управления
 */
export const useImageViewer = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [imageUri, setImageUri] = useState(null);
    const [imageTitle, setImageTitle] = useState('');

    /**
     * Открыть модальное окно с изображением
     * @param {string} uri - URI изображения
     * @param {string} title - заголовок (опционально)
     */
    const openImage = useCallback((uri, title = '') => {
        if (!uri) return;

        setImageUri(uri);
        setImageTitle(title);
        setIsVisible(true);
    }, []);

    /**
     * Закрыть модальное окно
     */
    const closeImage = useCallback(() => {
        setIsVisible(false);
        // Сбрасываем URI и заголовок с небольшой задержкой для плавности анимации
        setTimeout(() => {
            setImageUri(null);
            setImageTitle('');
        }, 300);
    }, []);

    return {
        isVisible,
        imageUri,
        imageTitle,
        openImage,
        closeImage,
    };
};