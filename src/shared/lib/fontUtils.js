import { Platform } from 'react-native';

// Флаг для принудительного использования системных шрифтов (можно установить в true для production)
const FORCE_SYSTEM_FONTS = !__DEV__ || process.env.FORCE_SYSTEM_FONTS === 'true';

/**
 * Безопасная функция для получения шрифта
 * В production используются системные шрифты для стабильности
 */
export const getSafeFont = (customFont) => {
    if (FORCE_SYSTEM_FONTS || !__DEV__) {
        return Platform.OS === 'ios' ? 'System' : 'sans-serif';
    }
    return customFont;
};

/**
 * Безопасная функция для получения шрифта по Platform
 */
export const getSafePlatformFont = (iosFont, androidFont = 'sans-serif') => {
    if (FORCE_SYSTEM_FONTS || !__DEV__) {
        return Platform.OS === 'ios' ? 'System' : 'sans-serif';
    }
    return Platform.OS === 'ios' ? iosFont : androidFont;
};

/**
 * Готовые безопасные шрифты
 * В production всегда возвращают системные шрифты
 */
export const SafeFonts = {
    BezierSans: getSafeFont('BezierSans'),
    SFProText: getSafePlatformFont('SFProText', 'sans-serif'),
    SFProDisplay: getSafeFont('SF Pro Display'),
    SFProDisplayMedium: getSafeFont('SFProDisplayMedium'),
    System: Platform.OS === 'ios' ? 'System' : 'sans-serif',
}; 