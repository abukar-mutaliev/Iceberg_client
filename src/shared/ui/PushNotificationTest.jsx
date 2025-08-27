import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Constants from 'expo-constants';
import PushNotificationService from '@shared/services/PushNotificationService';
import { useSelector } from 'react-redux';
import { selectUser } from '@entities/auth';

export const PushNotificationTest = () => {
    const [testResults, setTestResults] = useState({});
    const [loading, setLoading] = useState(false);
    const [pushToken, setPushToken] = useState(null);
    const [permissions, setPermissions] = useState(null);
    const [serviceStatus, setServiceStatus] = useState(null);
    
    const user = useSelector(selectUser);

    useEffect(() => {
        checkPermissions();
        getPushToken();
        getServiceStatus();
    }, []);

    const checkPermissions = async () => {
        try {
            const permissionStatus = await Notifications.getPermissionsAsync();
            setPermissions(permissionStatus);
            console.log('🔐 Permissions status:', permissionStatus);
        } catch (error) {
            console.error('❌ Error checking permissions:', error);
        }
    };

    const getPushToken = async () => {
        try {
            const projectId = PushNotificationService.getProjectId();
            console.log('🔑 ProjectId for getting token:', projectId);
            
            const tokenResult = await Notifications.getExpoPushTokenAsync({ 
                projectId: projectId 
            });
            setPushToken(tokenResult.data);
            console.log('🎫 Push token obtained:', tokenResult.data?.substring(0, 50) + '...');
        } catch (error) {
            console.error('❌ Error getting push token:', error);
        }
    };

    const getServiceStatus = () => {
        try {
            const status = PushNotificationService.getServiceStatus();
            setServiceStatus(status);
            console.log('📊 Service status:', status);
        } catch (error) {
            console.error('❌ Error getting service status:', error);
        }
    };

    const requestPermissions = async () => {
        try {
            setLoading(true);
            const { status } = await Notifications.requestPermissionsAsync();
            setPermissions({ status, canAskAgain: true });
            Alert.alert('Permissions', `Status: ${status}`);
            console.log('🔐 Permissions requested, status:', status);
        } catch (error) {
            Alert.alert('Error', error.message);
            console.error('❌ Error requesting permissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const testLocalNotification = async () => {
        try {
            setLoading(true);
            
            const result = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '🧪 Local Test',
                    body: `Test at ${new Date().toLocaleTimeString()}`,
                    data: { type: 'LOCAL_TEST' },
                    sound: 'default',
                    priority: 'high'
                },
                trigger: null
            });
            
            setTestResults(prev => ({
                ...prev,
                local: { success: true, id: result }
            }));
            
            Alert.alert('Success', 'Local notification sent!');
            console.log('✅ Local notification sent successfully');
        } catch (error) {
            setTestResults(prev => ({
                ...prev,
                local: { success: false, error: error.message }
            }));
            Alert.alert('Error', error.message);
            console.error('❌ Error sending local notification:', error);
        } finally {
            setLoading(false);
        }
    };

    const testServerNotification = async () => {
        try {
            setLoading(true);
            
            const response = await fetch('http://212.67.11.134:5000/api/push-tokens/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token || ''}`
                },
                body: JSON.stringify({
                    token: pushToken,
                    title: '🧪 Server Test',
                    body: `Server test at ${new Date().toLocaleTimeString()}`,
                    data: { type: 'SERVER_TEST' }
                })
            });
            
            const result = await response.json();
            
            setTestResults(prev => ({
                ...prev,
                server: { success: response.ok, result }
            }));
            
            if (response.ok) {
                Alert.alert('Success', 'Server notification sent!');
                console.log('✅ Server notification sent successfully');
            } else {
                Alert.alert('Error', `Server error: ${result.message || 'Unknown error'}`);
                console.error('❌ Server notification error:', result);
            }
        } catch (error) {
            setTestResults(prev => ({
                ...prev,
                server: { success: false, error: error.message }
            }));
            Alert.alert('Error', error.message);
            console.error('❌ Error sending server notification:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveTokenToServer = async () => {
        if (!pushToken) {
            Alert.alert('Error', 'No push token available');
            return;
        }

        try {
            setLoading(true);
            
            const response = await fetch('http://212.67.11.134:5000/api/push-tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token || ''}`
                },
                body: JSON.stringify({
                    token: pushToken,
                    deviceId: Device.deviceName || 'unknown',
                    platform: Device.osName
                })
            });
            
            const result = await response.json();
            
            setTestResults(prev => ({
                ...prev,
                saveToken: { success: response.ok, result }
            }));
            
            if (response.ok) {
                Alert.alert('Success', 'Token saved to server!');
                console.log('✅ Token saved to server successfully');
            } else {
                Alert.alert('Error', `Save error: ${result.message || 'Unknown error'}`);
                console.error('❌ Token save error:', result);
            }
        } catch (error) {
            setTestResults(prev => ({
                ...prev,
                saveToken: { success: false, error: error.message }
            }));
            Alert.alert('Error', error.message);
            console.error('❌ Error saving token:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderTestResult = (testName, result) => {
        if (!result) return null;
        
        return (
            <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>{testName}:</Text>
                <Text style={[styles.resultValue, { color: result.success ? '#34C759' : '#FF3B30' }]}>
                    {result.success ? '✅ Success' : `❌ Error: ${result.error}`}
                </Text>
            </View>
        );
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>🔔 Push Notification Test</Text>
            
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📱 Build Information:</Text>
                <Text style={styles.infoText}>Build Type: {process.env.EXPO_PUBLIC_BUILD_TYPE || 'unknown'}</Text>
                <Text style={styles.infoText}>Device: {Device.deviceName || 'unknown'}</Text>
                <Text style={styles.infoText}>Platform: {Device.osName}</Text>
                <Text style={styles.infoText}>User: {user?.email || 'Not authenticated'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔐 Permissions:</Text>
                <Text style={styles.infoText}>
                    Status: {permissions?.status || 'Unknown'}
                </Text>
                <TouchableOpacity 
                    style={styles.button} 
                    onPress={requestPermissions}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Requesting...' : 'Request Permissions'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎫 Push Token:</Text>
                <Text style={styles.infoText}>
                    {pushToken ? pushToken.substring(0, 50) + '...' : 'No token'}
                </Text>
                <TouchableOpacity 
                    style={styles.button} 
                    onPress={saveTokenToServer}
                    disabled={loading || !pushToken}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Saving...' : 'Save Token to Server'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📊 Service Status:</Text>
                <Text style={styles.infoText}>
                    Initialized: {serviceStatus?.isInitialized ? '✅ Yes' : '❌ No'}
                </Text>
                <Text style={styles.infoText}>
                    Has Token: {serviceStatus?.hasToken ? '✅ Yes' : '❌ No'}
                </Text>
                <Text style={styles.infoText}>
                    Navigation Ready: {serviceStatus?.navigationReady ? '✅ Yes' : '❌ No'}
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🧪 Tests:</Text>
                <TouchableOpacity 
                    style={styles.button} 
                    onPress={testLocalNotification}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Testing...' : 'Test Local Notification'}
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.button} 
                    onPress={testServerNotification}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Testing...' : 'Test Server Notification'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📋 Test Results:</Text>
                {renderTestResult('Local Notification', testResults.local)}
                {renderTestResult('Server Notification', testResults.server)}
                {renderTestResult('Save Token', testResults.saveToken)}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333'
    },
    section: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333'
    },
    infoText: {
        fontSize: 14,
        marginBottom: 5,
        color: '#666'
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 8,
        marginTop: 10,
        alignItems: 'center'
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },
    resultItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5
    },
    resultLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333'
    },
    resultValue: {
        fontSize: 14,
        fontWeight: '600'
    }
});

export default PushNotificationTest; 