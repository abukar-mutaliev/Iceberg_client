import { Platform } from 'react-native';

/**
 * Безопасная функция для получения шрифта
 * Возвращает кастомный шрифт в development и системный в production
 */
export const getSafeFont = (customFont) => {
    if (!__DEV__) {
        return Platform.OS === 'ios' ? 'System' : 'sans-serif';
    }
    return customFont;
};

/**
 * Безопасная функция для получения шрифта по Platform
 * Используется для замены конструкций типа Platform.OS === 'ios' ? 'SFProText' : 'sans-serif'
 */
export const getSafePlatformFont = (iosFont, androidFont = 'sans-serif') => {
    if (!__DEV__) {
        return Platform.OS === 'ios' ? 'System' : 'sans-serif';
    }
    return Platform.OS === 'ios' ? iosFont : androidFont;
};

/**
 * Готовые безопасные шрифты
 */
export const SafeFonts = {
    BezierSans: getSafeFont('BezierSans'),
    SFProText: getSafePlatformFont('SFProText'),
    SFProDisplay: getSafeFont('SF Pro Display'),
    SFProDisplayMedium: getSafeFont('SFProDisplayMedium'),
    System: Platform.OS === 'ios' ? 'System' : 'sans-serif',
}; 