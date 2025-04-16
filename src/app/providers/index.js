import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '@app/store/store';
import { ThemeProvider } from "@app/providers/themeProvider/ThemeProvider";

export const withProviders = (Component) => {
    return (props) => (
        <ReduxProvider store={store}>
            <ThemeProvider>
                <SafeAreaProvider>
                    <Component {...props} />
                </SafeAreaProvider>
            </ThemeProvider>
        </ReduxProvider>
    );
};

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