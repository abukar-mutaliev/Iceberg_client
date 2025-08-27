import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Color } from '@app/styles/GlobalStyles';

const ThemeContext = createContext({
    theme: 'light',
    colors: {},
    setTheme: () => {},
});

const themes = {
    light: {
        background: Color.colorLightMode,
        text: Color.colorLightMode,
        primary: Color.purpleSoft,
        secondary: Color.colorCornflowerblue,
        border: Color.colorSilver_100,
        card: Color.colorLightMode,
        statusBar: 'dark-content',
    },
    dark: {
        background: '#121212',
        text: Color.colorLightMode,
        primary: Color.purpleSoft,
        secondary: '#9195e0',
        border: '#444444',
        card: '#1E1E1E',
        statusBar: 'light-content',
    },
};

export const ThemeProvider = ({ children }) => {
    const systemTheme = useColorScheme();
    const [themeName, setThemeName] = useState(systemTheme || 'light');

    const theme = themes[themeName] || themes.light;

    const setTheme = (name) => {
        if (themes[name]) {
            setThemeName(name);
        }
    };

    return (
        <ThemeContext.Provider
            value={{
                theme: themeName,
                colors: theme,
                setTheme
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

// Хук для использования темы в компонентах
export const useTheme = () => {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }

    return context;
};