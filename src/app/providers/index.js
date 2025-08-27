import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '@app/store/store';
import { ThemeProvider } from "@app/providers/themeProvider/ThemeProvider";

export const AppProviders = ({ children }) => {
    return (
        <ReduxProvider store={store}>
            <ThemeProvider>
                <SafeAreaProvider>
                    {children}
                </SafeAreaProvider>
            </ThemeProvider>
        </ReduxProvider>
    );
};