/**
 * Конфигурация тем приложения.
 *
 * isDarkThemeEnabled — фичефлаг для релиза тёмной темы.
 * Пока тема в разработке, флаг = false:
 *   - переключатель в настройках скрыт;
 *   - ThemeProvider принудительно использует светлую тему.
 * Для тестирования поставьте true локально (не коммитить).
 */
export const isDarkThemeEnabled = true;

/**
 * Режимы темы, которые пользователь может выбрать в настройках.
 *  - 'system' — следовать за системной темой устройства
 *  - 'light'  — всегда светлая
 *  - 'dark'   — всегда тёмная
 */
export const ThemeMode = Object.freeze({
    SYSTEM: 'system',
    LIGHT: 'light',
    DARK: 'dark',
});

export const THEME_STORAGE_KEY = '@iceberg:themeMode';

/**
 * Семантические токены светлой темы.
 * Значения синхронизированы с существующей палитрой (@app/styles/GlobalStyles).
 */
export const lightPalette = {
    // Поверхности
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceElevated: '#F7F7FA',
    surfaceSecondary: '#F2F2F7',

    // Текст
    textPrimary: '#000000',
    textSecondary: '#666666',
    textTertiary: '#919191',
    textInverse: '#FFFFFF',

    // Разделители / границы
    border: '#E5E5EA',
    borderSubtle: '#EFEFF4',
    divider: '#E5E5E5',

    // Акценты
    primary: '#3339B0',
    primarySoft: '#6A5AE0',
    accent: '#6A5AE0',
    accentPressed: '#5448C4',

    // Статусы
    error: '#FF3B30',
    errorSubtle: '#FFF5F5',
    errorBorder: '#FFD6D6',
    success: '#34C759',
    warning: '#FFCC00',
    info: '#3339B0',

    // Компоненты
    cardBackground: '#FFFFFF',
    inputBackground: '#FFFFFF',
    inputBorder: '#E0E0E0',
    menuItemActive: '#6A5AE0',
    menuItemActiveText: '#FFFFFF',
    modalOverlay: 'rgba(0, 0, 0, 0.5)',
    shadowColor: 'rgba(51, 57, 176, 0.1)',

    // Системное
    statusBarStyle: 'dark-content',
    keyboardAppearance: 'light',
};

/**
 * Семантические токены тёмной темы — палитра «Midnight Purple».
 * Классический тёмный фон с фирменным фиолетовым акцентом в стиле material design.
 */
export const darkPalette = {
    // Поверхности
    background: '#0E0F14',
    surface: '#1A1C24',
    surfaceElevated: '#252836',
    surfaceSecondary: '#252836',

    // Текст
    textPrimary: '#ECEDF2',
    textSecondary: '#9296A6',
    textTertiary: '#6F7487',
    textInverse: '#0E0F14',

    // Разделители / границы
    border: '#2B2E3B',
    borderSubtle: '#252836',
    divider: '#2B2E3B',

    // Акценты (осветлены для контраста на тёмном)
    primary: '#7C7FE8',
    primarySoft: '#8B7EFF',
    accent: '#8B7EFF',
    accentPressed: '#7477E6',

    // Статусы
    error: '#FF5C52',
    errorSubtle: '#3A2022',
    errorBorder: '#5A3134',
    success: '#4ADE80',
    warning: '#FFD24A',
    info: '#7C7FE8',

    // Компоненты
    cardBackground: '#1A1C24',
    inputBackground: '#252836',
    inputBorder: '#2B2E3B',
    menuItemActive: '#8B7EFF',
    menuItemActiveText: '#FFFFFF',
    modalOverlay: 'rgba(0, 0, 0, 0.7)',
    shadowColor: 'rgba(0, 0, 0, 0.4)',

    // Системное
    statusBarStyle: 'light-content',
    keyboardAppearance: 'dark',
};

export const palettes = {
    light: lightPalette,
    dark: darkPalette,
};
