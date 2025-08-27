import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert
} from 'react-native';
import { AddressPickerModal } from '../../entities/deliveryAddress';

export const AddressTestScreen = () => {
    const [showAddressPicker, setShowAddressPicker] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(null);

    const handleAddressSelected = (address) => {
        setSelectedAddress(address);
        setShowAddressPicker(false);
        Alert.alert('Адрес выбран', `${address.title}: ${address.address}`);
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.content}>
                <Text style={styles.title}>Тест системы адресов доставки</Text>
                
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => setShowAddressPicker(true)}
                >
                    <Text style={styles.buttonText}>Выбрать адрес доставки</Text>
                </TouchableOpacity>

                {selectedAddress && (
                    <View style={styles.selectedAddressContainer}>
                        <Text style={styles.selectedAddressTitle}>Выбранный адрес:</Text>
                        <View style={styles.addressCard}>
                            <Text style={styles.addressCardTitle}>{selectedAddress.title}</Text>
                            <Text style={styles.addressCardText}>{selectedAddress.address}</Text>
                            <Text style={styles.addressCardDistrict}>
                                Район: {selectedAddress.district?.name}
                            </Text>
                            {selectedAddress.isDefault && (
                                <Text style={styles.defaultBadge}>По умолчанию</Text>
                            )}
                        </View>
                    </View>
                )}

                <View style={styles.infoContainer}>
                    <Text style={styles.infoTitle}>Функции системы:</Text>
                    <Text style={styles.infoItem}>• Просмотр сохраненных адресов</Text>
                    <Text style={styles.infoItem}>• Выбор существующего адреса</Text>
                    <Text style={styles.infoItem}>• Создание нового адреса</Text>
                    <Text style={styles.infoItem}>• Выбор района доставки</Text>
                    <Text style={styles.infoItem}>• Установка адреса по умолчанию</Text>
                    <Text style={styles.infoItem}>• Сохранение для будущих заказов</Text>
                </View>
            </ScrollView>

            <AddressPickerModal
                visible={showAddressPicker}
                onClose={() => setShowAddressPicker(false)}
                onAddressSelected={handleAddressSelected}
                currentAddress={selectedAddress}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff'
    },
    content: {
        flex: 1,
        padding: 20
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: 30,
        textAlign: 'center'
    },
    button: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 30
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff'
    },
    selectedAddressContainer: {
        marginBottom: 30
    },
    selectedAddressTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 12
    },
    addressCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0'
    },
    addressCardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 8
    },
    addressCardText: {
        fontSize: 14,
        color: '#333333',
        marginBottom: 4
    },
    addressCardDistrict: {
        fontSize: 12,
        color: '#666666',
        marginBottom: 8
    },
    defaultBadge: {
        fontSize: 12,
        color: '#007AFF',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start'
    },
    infoContainer: {
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        padding: 16
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 12
    },
    infoItem: {
        fontSize: 14,
        color: '#333333',
        marginBottom: 8,
        lineHeight: 20
    }
}); 