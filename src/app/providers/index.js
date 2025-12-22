import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '@app/store/store';
import { ThemeProvider } from "@app/providers/themeProvider/ThemeProvider";
import { CustomAlertProvider } from "@shared/ui/CustomAlert/CustomAlertProvider";

export const AppProviders = ({ children }) => {
    return (
        <ReduxProvider store={store}>
            <ThemeProvider>
                <CustomAlertProvider>
                    {/* CustomAlert теперь рендерится автоматически внутри CustomAlertProvider */}
                    {children}
                </CustomAlertProvider>
            </ThemeProvider>
        </ReduxProvider>
    );
};