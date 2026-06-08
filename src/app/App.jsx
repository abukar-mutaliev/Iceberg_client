import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistGate } from 'redux-persist/integration/react';
import { AppNavigator } from '@app/providers/navigation/AppNavigator';
import { AppProviders } from './providers';
import { persistor } from '@app/store/store';
import { ToastContainer } from '@shared/ui/Toast';
import { AppErrorBoundary } from './bootstrap/AppErrorBoundary';
import { AppInitializer } from './bootstrap/AppInitializer';
import { setupGlobalErrorHandlers } from './bootstrap/setupGlobalErrorHandlers';
import { useLoadAppFonts } from './bootstrap/useLoadAppFonts';

setupGlobalErrorHandlers();

const AppContent = () => {
    const fontsReady = useLoadAppFonts();

    return (
        <AppInitializer>
            <AppNavigator fontsReady={fontsReady} />
        </AppInitializer>
    );
};

const SafePersistGate = ({ children }) => {
    try {
        if (!persistor) {
            console.warn('App: Persistor not available, skipping PersistGate');
            return children;
        }

        return (
            <PersistGate
                loading={null}
                persistor={persistor}
            >
                {children}
            </PersistGate>
        );
    } catch (error) {
        console.error('App: PersistGate error:', error);
        return children;
    }
};

export default function App() {
    return (
        <AppErrorBoundary>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaProvider>
                    <AppProviders>
                        <SafePersistGate>
                            <AppContent />
                        </SafePersistGate>
                        <ToastContainer />
                    </AppProviders>
                </SafeAreaProvider>
            </GestureHandlerRootView>
        </AppErrorBoundary>
    );
}