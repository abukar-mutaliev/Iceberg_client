import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Clipboard, Alert, Platform } from 'react-native';
import InAppLogger from '@shared/services/InAppLogger';

export const InAppLogsViewer = () => {
    const [logs, setLogs] = useState([]);
    const [autoScroll, setAutoScroll] = useState(true);
    const scrollViewRef = React.useRef(null);

    useEffect(() => {
        // Получаем текущие логи
        setLogs(InAppLogger.getLogs());

        // Подписываемся на обновления
        const unsubscribe = InAppLogger.subscribe((newLogs) => {
            setLogs([...newLogs]);
            
            // Автоскролл к верху (новые логи)
            if (autoScroll && scrollViewRef.current && newLogs.length > 0) {
                setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                }, 100);
            }
        });

        return unsubscribe;
    }, [autoScroll]);

    const handleClearLogs = () => {
        Alert.alert(
            'Очистить логи?',
            'Все сохраненные логи будут удалены',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Очистить',
                    style: 'destructive',
                    onPress: async () => {
                        await InAppLogger.clearLogs();
                        Alert.alert('Успех', 'Логи очищены');
                    },
                },
            ]
        );
    };

    const handleCopyLogs = async () => {
        try {
            const text = InAppLogger.exportLogs();
            await Clipboard.setString(text);
            Alert.alert('Успех', 'Логи скопированы в буфер обмена');
        } catch (error) {
            Alert.alert('Ошибка', `Не удалось скопировать логи: ${error.message}`);
        }
    };

    const getLogColor = (type) => {
        switch (type) {
            case 'error':
                return '#ff4444';
            case 'warn':
                return '#ff9800';
            case 'info':
                return '#2196f3';
            default:
                return '#666666';
        }
    };

    const getLogIcon = (type) => {
        switch (type) {
            case 'error':
                return '❌';
            case 'warn':
                return '⚠️';
            case 'info':
                return 'ℹ️';
            default:
                return '📝';
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🔍 Логи уведомлений в реальном времени</Text>
                <Text style={styles.subtitle}>
                    Последние {logs.length} записей • 👆 Скроллится отдельно
                </Text>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#2196f3' }]}
                    onPress={handleCopyLogs}
                >
                    <Text style={styles.buttonText}>📋 Копировать</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: autoScroll ? '#4caf50' : '#9e9e9e' }]}
                    onPress={() => setAutoScroll(!autoScroll)}
                >
                    <Text style={styles.buttonText}>
                        {autoScroll ? '✅ Автоскролл' : '⏸️ Автоскролл'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#f44336' }]}
                    onPress={handleClearLogs}
                >
                    <Text style={styles.buttonText}>🗑️ Очистить</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                ref={scrollViewRef}
                style={styles.logsContainer}
                contentContainerStyle={styles.logsContent}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
            >
                {logs.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>📭 Логов пока нет</Text>
                        <Text style={styles.emptyHint}>
                            Отправьте себе тестовое уведомление и логи появятся здесь автоматически
                        </Text>
                    </View>
                ) : (
                    logs.map((log) => {
                        const time = new Date(log.timestamp).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                        });

                        return (
                            <View key={log.id} style={styles.logEntry}>
                                <View style={styles.logHeader}>
                                    <Text style={styles.logIcon}>{getLogIcon(log.type)}</Text>
                                    <Text style={styles.logTime}>{time}</Text>
                                    <View
                                        style={[
                                            styles.logTypeBadge,
                                            { backgroundColor: getLogColor(log.type) },
                                        ]}
                                    >
                                        <Text style={styles.logTypeText}>
                                            {log.type.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.logMessage}>{log.message}</Text>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    💡 Логи собираются автоматически в фоне
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderWidth: 2,
        borderColor: '#2196f3',
        borderRadius: 8,
    },
    header: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        color: '#666',
    },
    buttonContainer: {
        flexDirection: 'row',
        padding: 8,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        gap: 8,
    },
    button: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    logsContainer: {
        flex: 1,
    },
    logsContent: {
        padding: 8,
        flexGrow: 1,
    },
    logEntry: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#2196f3',
    },
    logHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 8,
    },
    logIcon: {
        fontSize: 14,
    },
    logTime: {
        fontSize: 11,
        color: '#666',
        fontWeight: '600',
    },
    logTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    logTypeText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: 'bold',
    },
    logMessage: {
        fontSize: 12,
        color: '#333',
        lineHeight: 18,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        minHeight: 200,
    },
    emptyText: {
        fontSize: 18,
        color: '#999',
        marginBottom: 8,
    },
    emptyHint: {
        fontSize: 13,
        color: '#999',
        textAlign: 'center',
        lineHeight: 20,
    },
    footer: {
        padding: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    footerText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
});

