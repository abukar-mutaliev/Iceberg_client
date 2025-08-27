import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { normalize } from '@shared/lib/normalize';
import ArrowBackIcon from '@shared/ui/Icon/Common/ArrowBackIcon';

export const NotificationSettingsScreen = () => {
    const navigation = useNavigation();
    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [smsEnabled, setSmsEnabled] = useState(false);
    const [promoEnabled, setPromoEnabled] = useState(true);
    const [orderStatusEnabled, setOrderStatusEnabled] = useState(true);

    const handleGoBack = () => {
        console.log('Going back from NotificationSettingsScreen');
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                    <ArrowBackIcon width={24} height={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>Центр уведомлений</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Каналы уведомлений</Text>
                    
                    <View style={styles.settingItem}>
                        <Text style={styles.settingText}>Push-уведомления</Text>
                        <Switch
                            value={pushEnabled}
                            onValueChange={setPushEnabled}
                            trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                    
                    <View style={styles.settingItem}>
                        <Text style={styles.settingText}>Email-уведомления</Text>
                        <Switch
                            value={emailEnabled}
                            onValueChange={setEmailEnabled}
                            trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                    
                    <View style={styles.settingItem}>
                        <Text style={styles.settingText}>SMS-уведомления</Text>
                        <Switch
                            value={smsEnabled}
                            onValueChange={setSmsEnabled}
                            trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Типы уведомлений</Text>
                    
                    <View style={styles.settingItem}>
                        <Text style={styles.settingText}>Промо-акции и скидки</Text>
                        <Switch
                            value={promoEnabled}
                            onValueChange={setPromoEnabled}
                            trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                    
                    <View style={styles.settingItem}>
                        <Text style={styles.settingText}>Статус заказов</Text>
                        <Switch
                            value={orderStatusEnabled}
                            onValueChange={setOrderStatusEnabled}
                            trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '500',
        marginLeft: 24,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    settingText: {
        fontSize: 16,
    },
});

export default NotificationSettingsScreen; 