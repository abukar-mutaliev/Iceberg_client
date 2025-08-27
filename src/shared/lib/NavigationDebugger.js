
import {ScrollView, Text, TouchableOpacity} from "react-native";
import React from "react";

export class NavigationDebugger {
    static isEnabled = __DEV__;
    static logs = [];
    static maxLogs = 100;

    static log(type, message, data = {}) {
        if (!this.isEnabled) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            type,
            message,
            data: JSON.stringify(data, null, 2)
        };

        console.log(`[NAV-${type}] ${message}`, data);

        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    }

    static logNavigationAttempt(screenName, params, from) {
        this.log('NAVIGATE', `Attempting navigation to ${screenName}`, {
            targetScreen: screenName,
            params,
            fromScreen: from,
            timestamp: Date.now()
        });
    }

    static logNavigationSuccess(screenName, params) {
        this.log('SUCCESS', `Successfully navigated to ${screenName}`, {
            targetScreen: screenName,
            params
        });
    }

    static logNavigationError(screenName, error, params) {
        this.log('ERROR', `Navigation failed to ${screenName}`, {
            targetScreen: screenName,
            error: error.message || error,
            params,
            stack: error.stack
        });
    }

    static logComponentRender(componentName, props = {}) {
        this.log('RENDER', `Component ${componentName} rendered`, {
            component: componentName,
            props: Object.keys(props),
            propsCount: Object.keys(props).length
        });
    }

    static logComponentError(componentName, error) {
        this.log('COMPONENT_ERROR', `Component ${componentName} error`, {
            component: componentName,
            error: error.message || error,
            stack: error.stack
        });
    }

    static getLogs() {
        return this.logs;
    }

    static clearLogs() {
        this.logs = [];
    }

    static exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }
}

// HOC для автоматического логирования рендеринга компонентов
export const withNavigationDebug = (WrappedComponent, componentName) => {
    return React.forwardRef((props, ref) => {
        React.useEffect(() => {
            NavigationDebugger.logComponentRender(componentName, props);
        }, [props]);

        try {
            return <WrappedComponent {...props} ref={ref} />;
        } catch (error) {
            NavigationDebugger.logComponentError(componentName, error);
            throw error;
        }
    });
};

// Хук для отладки навигации
export const useNavigationDebug = (navigation, screenName) => {
    const navigate = React.useCallback((targetScreen, params) => {
        try {
            NavigationDebugger.logNavigationAttempt(targetScreen, params, screenName);

            navigation.navigate(targetScreen, params);

            NavigationDebugger.logNavigationSuccess(targetScreen, params);
        } catch (error) {
            NavigationDebugger.logNavigationError(targetScreen, error, params);
            throw error;
        }
    }, [navigation, screenName]);

    const goBack = React.useCallback(() => {
        try {
            NavigationDebugger.logNavigationAttempt('BACK', {}, screenName);

            if (navigation.canGoBack()) {
                navigation.goBack();
            } else {
                navigation.navigate('MainTab');
            }

            NavigationDebugger.logNavigationSuccess('BACK', {});
        } catch (error) {
            NavigationDebugger.logNavigationError('BACK', error, {});
            throw error;
        }
    }, [navigation, screenName]);

    return { navigate, goBack };
};

// Компонент для вывода логов отладки (для разработчиков)
export const NavigationDebugPanel = () => {
    const [isVisible, setIsVisible] = React.useState(false);
    const [logs, setLogs] = React.useState([]);

    React.useEffect(() => {
        if (isVisible) {
            setLogs(NavigationDebugger.getLogs());
        }
    }, [isVisible]);

    if (!__DEV__) return null;

    return (
        <>
            <TouchableOpacity
                style={{
                    position: 'absolute',
                    top: 100,
                    right: 10,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: 10,
                    borderRadius: 5,
                    zIndex: 9999
                }}
                onPress={() => setIsVisible(!isVisible)}
            >
                <Text style={{ color: 'white', fontSize: 12 }}>
                    DEBUG
                </Text>
            </TouchableOpacity>

            {isVisible && (
                <View style={{
                    position: 'absolute',
                    top: 150,
                    right: 10,
                    width: 300,
                    height: 400,
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    padding: 10,
                    borderRadius: 5,
                    zIndex: 9998
                }}>
                    <ScrollView>
                        <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
                            Navigation Debug Logs:
                        </Text>
                        {logs.map((log, index) => (
                            <View key={index} style={{ marginVertical: 5 }}>
                                <Text style={{ color: getLogColor(log.type), fontSize: 10 }}>
                                    [{log.type}] {log.message}
                                </Text>
                                <Text style={{ color: '#ccc', fontSize: 8 }}>
                                    {log.timestamp}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>

                    <TouchableOpacity
                        style={{
                            backgroundColor: '#ff4444',
                            padding: 5,
                            borderRadius: 3,
                            marginTop: 10
                        }}
                        onPress={() => {
                            NavigationDebugger.clearLogs();
                            setLogs([]);
                        }}
                    >
                        <Text style={{ color: 'white', textAlign: 'center' }}>
                            Clear Logs
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </>
    );
};

const getLogColor = (type) => {
    switch (type) {
        case 'ERROR':
        case 'COMPONENT_ERROR':
            return '#ff4444';
        case 'SUCCESS':
            return '#44ff44';
        case 'NAVIGATE':
            return '#4444ff';
        case 'RENDER':
            return '#ffff44';
        default:
            return '#ffffff';
    }
};