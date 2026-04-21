import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useColorScheme, StyleSheet, Appearance, AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    isDarkThemeEnabled,
    ThemeMode,
    THEME_STORAGE_KEY,
    palettes,
} from '@app/styles/themeConfig';

const defaultMode = ThemeMode.SYSTEM;

const ThemeContext = createContext({
    mode: defaultMode,
    resolvedTheme: 'light',
    isDark: false,
    colors: palettes.light,
    setThemeMode: () => {},
    toggleTheme: () => {},
    isDarkThemeEnabled,
});

/**
 * Нормализует сохранённое значение в допустимый ThemeMode.
 */
const normalizeMode = (value) => {
    if (value === ThemeMode.LIGHT || value === ThemeMode.DARK || value === ThemeMode.SYSTEM) {
        return value;
    }
    return defaultMode;
};

/**
 * На Android `useColorScheme()` нередко возвращает устаревшее/null-значение
 * до тех пор, пока не произойдёт перерисовка, а `Appearance.getColorScheme()` —
 * даёт актуальный системный режим сразу. Поэтому используем Appearance как
 * основной источник и подписываемся на его события вручную.
 */
const readSystemScheme = () => {
    try {
        return Appearance.getColorScheme() || 'light';
    } catch (_) {
        return 'light';
    }
};

export const ThemeProvider = ({ children }) => {
    // Хук (держим для iOS/совместимости), но полагаемся больше на Appearance.
    const rnColorScheme = useColorScheme();
    const [systemScheme, setSystemScheme] = useState(readSystemScheme);
    const [mode, setMode] = useState(defaultMode);
    const [isHydrated, setIsHydrated] = useState(false);
    const hydratedRef = useRef(false);

    // Подписка на реальные изменения системной темы + синхронизация при возврате
    // приложения из фона (Android иногда не присылает событие вовремя).
    useEffect(() => {
        const sync = () => setSystemScheme(readSystemScheme());
        sync();

        const appearanceSub = Appearance.addChangeListener(({ colorScheme }) => {
            setSystemScheme(colorScheme || 'light');
        });

        const appStateSub = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                sync();
            }
        });

        return () => {
            appearanceSub?.remove?.();
            appStateSub?.remove?.();
        };
    }, []);

    // Если хук всё же даёт значение — используем его как подсказку.
    useEffect(() => {
        if (rnColorScheme && rnColorScheme !== systemScheme) {
            setSystemScheme(rnColorScheme);
        }
    }, [rnColorScheme, systemScheme]);

    useEffect(() => {
        if (hydratedRef.current) return;
        hydratedRef.current = true;

        (async () => {
            try {
                const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (stored) {
                    setMode(normalizeMode(stored));
                }
            } catch (e) {
                console.warn('⚠️ ThemeProvider: failed to load persisted theme mode:', e?.message);
            } finally {
                setIsHydrated(true);
            }
        })();
    }, []);

    const resolvedTheme = useMemo(() => {
        if (!isDarkThemeEnabled) return 'light';
        if (mode === ThemeMode.SYSTEM) {
            return systemScheme === 'dark' ? 'dark' : 'light';
        }
        return mode === ThemeMode.DARK ? 'dark' : 'light';
    }, [mode, systemScheme]);

    const colors = palettes[resolvedTheme] || palettes.light;
    const isDark = resolvedTheme === 'dark';

    const setThemeMode = useCallback(async (nextMode) => {
        const normalized = normalizeMode(nextMode);
        setMode(normalized);
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, normalized);
        } catch (e) {
            console.warn('⚠️ ThemeProvider: failed to persist theme mode:', e?.message);
        }
    }, []);

    const toggleTheme = useCallback(() => {
        const next = resolvedTheme === 'dark' ? ThemeMode.LIGHT : ThemeMode.DARK;
        setThemeMode(next);
    }, [resolvedTheme, setThemeMode]);

    const value = useMemo(
        () => ({
            mode,
            resolvedTheme,
            isDark,
            colors,
            setThemeMode,
            toggleTheme,
            isHydrated,
            isDarkThemeEnabled,
        }),
        [mode, resolvedTheme, isDark, colors, setThemeMode, toggleTheme, isHydrated],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Хук доступа к текущей теме и API её переключения.
 */
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

/**
 * Удобный помощник: объявляет стили, зависящие от темы.
 * Пересчитываются мемоизированно при смене палитры.
 *
 * Пример:
 *   const styles = useThemedStyles((c) => ({
 *       container: { backgroundColor: c.background },
 *   }));
 */
export const useThemedStyles = (factory) => {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors, factory]);
};

