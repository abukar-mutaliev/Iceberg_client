import React from 'react';
import { Appearance, Button, StyleSheet, Text, View } from 'react-native';
import { darkPalette, isDarkThemeEnabled, lightPalette } from '@app/styles/themeConfig';

export class AppErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            colorScheme: Appearance.getColorScheme?.() || 'light',
        };
        this._appearanceSubscription = null;
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidMount() {
        try {
            this._appearanceSubscription = Appearance.addChangeListener(({ colorScheme }) => {
                this.setState({ colorScheme: colorScheme || 'light' });
            });
        } catch (e) {
            // Non-critical fallback for old RN/Expo runtimes.
        }
    }

    componentWillUnmount() {
        try {
            this._appearanceSubscription?.remove?.();
        } catch (e) {
            // Non-critical cleanup guard.
        }
    }

    componentDidCatch(error, errorInfo) {
        const errorDetails = {
            message: error?.message || 'Unknown error',
            name: error?.name || 'Error',
            stack: error?.stack || 'No stack trace',
            componentStack: errorInfo?.componentStack || 'No component stack',
            errorInfo,
            timestamp: new Date().toISOString(),
        };

        console.error('🚨 ErrorBoundary caught error:', errorDetails);
        console.error('🚨 Full error object:', JSON.stringify(errorDetails, null, 2));
        console.error('🚨 Error stack:', error?.stack);
        console.error('🚨 Component stack:', errorInfo?.componentStack);

        try {
            if (__DEV__) {
                console.error('🚨 Error boundary state:', this.state);
            }
        } catch (e) {
            console.error('🚨 Failed to log error details:', e);
        }

        this.setState({
            error,
            errorInfo: errorInfo?.componentStack || 'No component stack available'
        });
    }

    render() {
        if (this.state.hasError) {
            const isDark = isDarkThemeEnabled && this.state.colorScheme === 'dark';
            const palette = isDark ? darkPalette : lightPalette;

            return (
                <View style={[styles.errorContainer, { backgroundColor: palette.background }]}>
                    <Text style={[styles.errorTitle, { color: palette.error }]}>Что-то пошло не так!</Text>
                    <Text style={[styles.errorText, { color: palette.textSecondary }]}>
                        {this.state.error?.message || 'Произошла ошибка в приложении'}
                    </Text>
                    <Button
                        title="Перезагрузить приложение"
                        color={palette.primary}
                        onPress={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                    />
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f8f8',
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#d32f2f',
        textAlign: 'center',
    },
    errorText: {
        textAlign: 'center',
        marginBottom: 20,
        fontSize: 16,
        color: '#666',
        lineHeight: 22,
    },
});
