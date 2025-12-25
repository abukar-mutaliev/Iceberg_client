import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export const LogViewer = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadLogs = async () => {
        try {
            setLoading(true);
            
            // Получаем список файлов в директории документов
            const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
            const logFiles = files.filter(file => file.includes('push-diagnostic-logs'));
            
            if (logFiles.length === 0) {
                Alert.alert('Информация', 'Логи не найдены. Запустите диагностику push-уведомлений.');
                return;
            }
            
            // Читаем последний файл логов
            const latestLogFile = logFiles.sort().pop();
            const logContent = await FileSystem.readAsStringAsync(
                `${FileSystem.documentDirectory}${latestLogFile}`
            );
            
            const logLines = logContent.split('\n').filter(line => line.trim());
            setLogs(logLines);
            
            Alert.alert('Готово', `Загружено ${logLines.length} записей из файла ${latestLogFile}`);
        } catch (error) {
            Alert.alert('Ошибка', `Не удалось загрузить логи: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const clearLogs = () => {
        setLogs([]);
        Alert.alert('Готово', 'Логи очищены');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>📋 Просмотр логов</Text>
            
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={loadLogs}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Загрузка...' : '📂 Загрузить логи'}
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#FF3B30' }]}
                    onPress={clearLogs}
                    disabled={logs.length === 0}
                >
                    <Text style={styles.buttonText}>
                        🗑️ Очистить
                    </Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.logCount}>
                Записей: {logs.length}
            </Text>

            <ScrollView style={styles.logsContainer}>
                {logs.map((log, index) => (
                    <View key={index} style={styles.logEntry}>
                        <Text style={styles.logText}>{log}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5'
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center'
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 4
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 12
    },
    logCount: {
        fontSize: 14,
        color: '#555',
        marginBottom: 8,
        textAlign: 'center'
    },
    logsContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 8
    },
    logEntry: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    logText: {
        fontSize: 11,
        fontFamily: 'monospace',
        color: '#333'
    }
}); 