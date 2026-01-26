import { Platform } from 'react-native';

// Флаг для принудительного использования системных шрифтов (можно установить в true для production)
const FORCE_SYSTEM_FONTS = process.env.FORCE_SYSTEM_FONTS === 'true';

/**
 * Безопасная функция для получения шрифта
 * В production можно использовать системные шрифты для стабильности (через FORCE_SYSTEM_FONTS)
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
 * В production могут возвращать системные шрифты (через FORCE_SYSTEM_FONTS)
 */
export const SafeFonts = {
    BezierSans: getSafeFont('BezierSans'),
    SFProText: getSafePlatformFont('SFProText', 'sans-serif'),
    SFProDisplay: getSafeFont('SF Pro Display'),
    SFProDisplayMedium: getSafeFont('SFProDisplayMedium'),
    System: Platform.OS === 'ios' ? 'System' : 'sans-serif',
}; 