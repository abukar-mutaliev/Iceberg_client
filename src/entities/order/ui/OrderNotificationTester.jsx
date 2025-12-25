import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useOrderNotifications } from '../hooks/useOrderNotifications';

const OrderNotificationTester = () => {
    const {
        testEmployeeAssignment,
        testClientStatusChange,
        testEmployeeTaken,
        testNewOrder,
        testOrderCancelled,
        getStats,
        loading,
        error
    } = useOrderNotifications();

    // Состояние для форм
    const [employeeAssignmentData, setEmployeeAssignmentData] = useState({
        orderId: '1',
        employeeUserId: '2',
        assignedBy: 'admin'
    });

    const [clientStatusData, setClientStatusData] = useState({
        orderId: '1',
        clientUserId: '1',
        newStatus: 'IN_DELIVERY',
        oldStatus: 'CONFIRMED'
    });

    const [employeeTakenData, setEmployeeTakenData] = useState({
        orderId: '1',
        employeeUserId: '2'
    });

    const [newOrderData, setNewOrderData] = useState({
        orderId: '1',
        warehouseId: '1'
    });

    const [cancelledData, setCancelledData] = useState({
        orderId: '1',
        clientUserId: '1',
        employeeUserId: '2',
        reason: 'Тестовая отмена'
    });

    const [stats, setStats] = useState(null);
    const [testLoading, setTestLoading] = useState(false);

    // Обработчики тестов
    const handleTestEmployeeAssignment = useCallback(async () => {
        setTestLoading(true);
        try {
            const result = await testEmployeeAssignment(employeeAssignmentData);
            if (result.success) {
                Alert.alert('Готово', 'Уведомление о назначении заказа отправлено!');
            } else {
                Alert.alert('Ошибка', result.error);
            }
        } catch (error) {
            Alert.alert('Ошибка', error.message);
        } finally {
            setTestLoading(false);
        }
    }, [testEmployeeAssignment, employeeAssignmentData]);

    const handleTestClientStatusChange = useCallback(async () => {
        setTestLoading(true);
        try {
            const result = await testClientStatusChange(clientStatusData);
            if (result.success) {
                Alert.alert('Готово', 'Уведомление об изменении статуса отправлено!');
            } else {
                Alert.alert('Ошибка', result.error);
            }
        } catch (error) {
            Alert.alert('Ошибка', error.message);
        } finally {
            setTestLoading(false);
        }
    }, [testClientStatusChange, clientStatusData]);

    const handleTestEmployeeTaken = useCallback(async () => {
        setTestLoading(true);
        try {
            const result = await testEmployeeTaken(employeeTakenData);
            if (result.success) {
                Alert.alert('Готово', 'Уведомление о взятии заказа отправлено!');
            } else {
                Alert.alert('Ошибка', result.error);
            }
        } catch (error) {
            Alert.alert('Ошибка', error.message);
        } finally {
            setTestLoading(false);
        }
    }, [testEmployeeTaken, employeeTakenData]);

    const handleTestNewOrder = useCallback(async () => {
        setTestLoading(true);
        try {
            const result = await testNewOrder(newOrderData);
            if (result.success) {
                Alert.alert('Готово', 'Уведомление о новом заказе отправлено!');
            } else {
                Alert.alert('Ошибка', result.error);
            }
        } catch (error) {
            Alert.alert('Ошибка', error.message);
        } finally {
            setTestLoading(false);
        }
    }, [testNewOrder, newOrderData]);

    const handleTestOrderCancelled = useCallback(async () => {
        setTestLoading(true);
        try {
            const result = await testOrderCancelled(cancelledData);
            if (result.success) {
                Alert.alert('Готово', 'Уведомление об отмене заказа отправлено!');
            } else {
                Alert.alert('Ошибка', result.error);
            }
        } catch (error) {
            Alert.alert('Ошибка', error.message);
        } finally {
            setTestLoading(false);
        }
    }, [testOrderCancelled, cancelledData]);

    const handleGetStats = useCallback(async () => {
        setTestLoading(true);
        try {
            const result = await getStats();
            if (result.success) {
                setStats(result.data);
                Alert.alert('Готово', 'Статистика загружена!');
            } else {
                Alert.alert('Ошибка', result.error);
            }
        } catch (error) {
            Alert.alert('Ошибка', error.message);
        } finally {
            setTestLoading(false);
        }
    }, [getStats]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={styles.loadingText}>Загрузка...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Тестирование уведомлений заказов</Text>

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Тест назначения заказа сотруднику */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Назначение заказа сотруднику</Text>
                
                <TextInput
                    style={styles.input}
                    placeholder="ID заказа"
                    value={employeeAssignmentData.orderId}
                    onChangeText={(text) => setEmployeeAssignmentData(prev => ({ ...prev, orderId: text }))}
                />
                <TextInput
                    style={styles.input}
                    placeholder="ID сотрудника"
                    value={employeeAssignmentData.employeeUserId}
                    onChangeText={(text) => setEmployeeAssignmentData(prev => ({ ...prev, employeeUserId: text }))}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Кто назначил"
                    value={employeeAssignmentData.assignedBy}
                    onChangeText={(text) => setEmployeeAssignmentData(prev => ({ ...prev, assignedBy: text }))}
                />
                
                <TouchableOpacity 
                    style={styles.button} 
                    onPress={handleTestEmployeeAssignment}
                    disabled={testLoading}
                >
                    <Text style={styles.buttonText}>
                        {testLoading ? 'Отправка...' : 'Отправить уведомление'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Тест изменения статуса для клиента */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Изменение статуса заказа клиенту</Text>
                
                <TextInput
                    style={styles.input}
                    placeholder="ID заказа"
                    value={clientStatusData.orderId}
                    onChangeText={(text) => setClientStatusData(prev => ({ ...prev, orderId: text }))}
                />
                <TextInput
                    style={styles.input}
                    placeholder="ID клиента"
                    value={clientStatusData.clientUserId}
                    onChangeText={(text) => setClientStatusData(prev => ({ ...prev, clientUserId: text }))}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Новый статус"
                    value={clientStatusData.newStatus}
                    onChangeText={(text) => setClientStatusData(prev => ({ ...prev, newStatus: text }))}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Старый статус"
                    value={clientStatusData.oldStatus}
                    onChangeText={(text) => setClientStatusData(prev => ({ ...prev, oldStatus: text }))}
                />
                
                <TouchableOpacity 
                    style={styles.button} 
                    onPress={handleTestClientStatusChange}
                    disabled={testLoading}
                >
                    <Text style={styles.buttonText}>
                        {testLoading ? 'Отправка...' : 'Отправить уведомление'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Тест взятия заказа в работу */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Взятие заказа в работу</Text>
                
                <TextInput
                    style={styles.input}
                    placeholder="ID заказа"
                    value={employeeTakenData.orderId}
                    onChangeText={(text) => setEmployeeTakenData(prev => ({ ...prev, orderId: text }))}
                />
                <TextInput
                    style={styles.input}
                    placeholder="ID сотрудника"
                    value={employeeTakenData.employeeUserId}
                    onChangeText={(text) => setEmployeeTakenData(prev => ({ ...prev, employeeUserId: text }))}
                />
                
                <TouchableOpacity 
                    style={styles.button} 
                    onPress={handleTestEmployeeTaken}
                    disabled={testLoading}
                >
                    <Text style={styles.buttonText}>
                        {testLoading ? 'Отправка...' : 'Отправить уведомление'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Тест нового заказа */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Новый заказ</Text>
                
                <TextInput
                    style={styles.input}
                    placeholder="ID заказа"
                    value={newOrderData.orderId}
                    onChangeText={(text) => setNewOrderData(prev => ({ ...prev, orderId: text }))}
                />
                <TextInput
                    style={styles.input}
                    placeholder="ID склада"
                    value={newOrderData.warehouseId}
                    onChangeText={(text) => setNewOrderData(prev => ({ ...prev, warehouseId: text }))}
                />
                
                <TouchableOpacity 
                    style={styles.button} 
                    onPress={handleTestNewOrder}
                    disabled={testLoading}
                >
                    <Text style={styles.buttonText}>
                        {testLoading ? 'Отправка...' : 'Отправить уведомление'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Тест отмены заказа */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Отмена заказа</Text>
                
                <TextInput
                    style={styles.input}
                    placeholder="ID заказа"
                    value={cancelledData.orderId}
                    onChangeText={(text) => setCancelledData(prev => ({ ...prev, orderId: text }))}
                />
                <TextInput
                    style={styles.input}
                    placeholder="ID клиента"
                    value={cancelledData.clientUserId}
                    onChangeText={(text) => setCancelledData(prev => ({ ...prev, clientUserId: text }))}
                />
                <TextInput
                    style={styles.input}
                    placeholder="ID сотрудника"
                    value={cancelledData.employeeUserId}
                    onChangeText={(text) => setCancelledData(prev => ({ ...prev, employeeUserId: text }))}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Причина отмены"
                    value={cancelledData.reason}
                    onChangeText={(text) => setCancelledData(prev => ({ ...prev, reason: text }))}
                />
                
                <TouchableOpacity 
                    style={styles.button} 
                    onPress={handleTestOrderCancelled}
                    disabled={testLoading}
                >
                    <Text style={styles.buttonText}>
                        {testLoading ? 'Отправка...' : 'Отправить уведомление'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Статистика */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Статистика</Text>
                
                <TouchableOpacity 
                    style={styles.statsButton} 
                    onPress={handleGetStats}
                    disabled={testLoading}
                >
                    <Text style={styles.buttonText}>
                        {testLoading ? 'Загрузка...' : 'Получить статистику'}
                    </Text>
                </TouchableOpacity>

                {stats && (
                    <View style={styles.statsContainer}>
                        <Text style={styles.statsText}>
                            Отправлено уведомлений: {stats.totalSent || 0}
                        </Text>
                        <Text style={styles.statsText}>
                            Успешных: {stats.successful || 0}
                        </Text>
                        <Text style={styles.statsText}>
                            Ошибок: {stats.failed || 0}
                        </Text>
                        <Text style={styles.statsText}>
                            Активных токенов: {stats.activeTokens || 0}
                        </Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f8f9fa'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        marginTop: 8,
        fontSize: 16,
        color: '#666'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333'
    },
    errorContainer: {
        backgroundColor: '#f8d7da',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#f5c6cb'
    },
    errorText: {
        color: '#721c24',
        fontSize: 14
    },
    section: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333'
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        fontSize: 16,
        backgroundColor: '#f8f9fa'
    },
    button: {
        backgroundColor: '#007bff',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center'
    },
    statsButton: {
        backgroundColor: '#28a745',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 16
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    statsContainer: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#dee2e6'
    },
    statsText: {
        fontSize: 14,
        color: '#333',
        marginBottom: 4
    }
});

export default OrderNotificationTester;