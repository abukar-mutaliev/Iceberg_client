import { useState, useEffect } from 'react';
import { Dimensions, Platform, StatusBar } from 'react-native';

/**
 * Хук для получения адаптивных размеров с учетом размера экрана
 * и ориентации устройства
 *
 * @returns {Object} Объект с адаптивными размерами и функциями
 */
export const useResponsiveStyles = () => {
    const [dimensions, setDimensions] = useState({
        window: Dimensions.get('window'),
        screen: Dimensions.get('screen')
    });

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window, screen }) => {
            setDimensions({ window, screen });
        });

        return () => subscription.remove();
    }, []);

    const { width, height } = dimensions.window;

    const isSmallDevice = height < 700;
    const isLargeDevice = height > 800;
    const isLandscape = width > height;

    const statusBarHeight = StatusBar.currentHeight || 0;
    const safeTop = Platform.OS === 'android' ? statusBarHeight + 10 : 44;

    /**
     * Функция для получения адаптивного размера на основе базового значения
     * @param {number} baseSize - Базовый размер для среднего устройства
     * @returns {number} Адаптированный размер
     */
    const adaptiveSize = (baseSize) => {
        let size = baseSize;

        if (isSmallDevice) size *= 0.85;
        else if (isLargeDevice) size *= 1.1;

        if (isLandscape) size *= 0.95;

        return size;
    };

    /**
     * Функция для получения адаптивного горизонтального отступа
     * @param {number} baseSize - Базовый отступ для среднего устройства
     * @returns {number} Адаптированный отступ
     */
    const horizontalSpacing = (baseSize = 20) => {
        return adaptiveSize(baseSize);
    };

    /**
     * Функция для получения адаптивной ширины с учетом отступов
     * @param {number} factor - Коэффициент от ширины экрана (0-1)
     * @param {number} maxWidth - Максимальная ширина
     * @returns {number} Адаптированная ширина
     */
    const adaptiveWidth = (factor = 1, maxWidth = Infinity) => {
        const padding = horizontalSpacing() * 2;
        return Math.min((width - padding) * factor, maxWidth);
    };

    /**
     * Возвращает стандартную высоту для интерактивных элементов
     * @param {string} size - Размер элемента ('small', 'medium', 'large')
     * @returns {number} Адаптированная высота
     */
    const controlHeight = (size = 'medium') => {
        const baseHeights = {
            small: 40,
            medium: 56,
            large: 70
        };

        return adaptiveSize(baseHeights[size] || baseHeights.medium);
    };

    /**
     * Возвращает семейство шрифтов в зависимости от платформы
     * @returns {string} Семейство шрифтов
     */
    const fontFamily = () => {
        return Platform.OS === 'ios' ? 'SFProText' : 'sans-serif';
    };

    /**
     * Функция для получения размера шрифта
     * @param {string} size - Размер шрифта ('xs', 'sm', 'md', 'lg', 'xl', '2xl')
     * @returns {number} Размер шрифта
     */
    const fontSize = (size = 'md') => {
        const sizes = {
            xs: 12,
            sm: 14,
            md: 16,
            lg: 18,
            xl: 20,
            '2xl': 24,
            '3xl': 30
        };

        return adaptiveSize(sizes[size] || sizes.md);
    };

    return {
        width,
        height,
        isSmallDevice,
        isLargeDevice,
        isLandscape,
        safeTop,
        adaptiveSize,
        horizontalSpacing,
        adaptiveWidth,
        controlHeight,
        fontFamily,
        fontSize
    };
};