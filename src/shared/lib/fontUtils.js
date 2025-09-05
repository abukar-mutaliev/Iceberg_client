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
 * Имена соответствуют тому, как шрифты загружаются в App.jsx
 */
export const SafeFonts = {
    BezierSans: getSafeFont('BezierSans'), // соответствует 'BezierSans_Regular.ttf'
    SFProText: getSafePlatformFont('SFProText'), // соответствует 'SFProText-Regular.ttf'
    SFProDisplay: getSafeFont('SF Pro Display'), // соответствует 'SF-Pro-Display-Regular.otf'
    SFProDisplayMedium: getSafeFont('SFProDisplayMedium'), // соответствует 'SF-Pro-Display-Medium.otf'
    System: Platform.OS === 'ios' ? 'System' : 'sans-serif',
}; 