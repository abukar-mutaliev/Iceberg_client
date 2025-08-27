import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Color } from '@app/styles/GlobalStyles';
import { CustomTextInput } from '@shared/ui/CustomTextInput/CustomTextInput';
import {DeliveryAddressApi} from "@entities/deliveryAddress";
import CustomButton from "@shared/ui/Button/CustomButton";

const normalize = (size) => size;

export const AddressPickerModal = ({ 
    visible, 
    onClose, 
    onAddressSelected,
    currentAddress = null 
}) => {
    const [loading, setLoading] = useState(false);
    const [addresses, setAddresses] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showNewAddressForm, setShowNewAddressForm] = useState(false);
    
    const [newAddress, setNewAddress] = useState({
        title: '',
        address: '',
        districtId: ''
    });

    useEffect(() => {
        if (visible) {
            loadAddresses();
            setSelectedAddress(currentAddress);
        }
    }, [visible, currentAddress]);

    const loadAddresses = async () => {
        try {
            setLoading(true);
            const [addressesResponse, districtsResponse] = await Promise.all([
                DeliveryAddressApi.getAddresses(),
                DeliveryAddressApi.getDistricts()
            ]);
            
            // Извлекаем данные из ответа API
            const addressesData = addressesResponse.data || addressesResponse;
            const districtsData = districtsResponse.data || districtsResponse;
            
            console.log('📧 Loaded addresses:', addressesData);
            console.log('🗺️ Loaded districts:', districtsData);
            
            setAddresses(addressesData);
            setDistricts(districtsData);
            
            if (addressesData.length === 0) {
                setShowNewAddressForm(true);
            }
        } catch (error) {
            console.error('Ошибка загрузки адресов:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить адреса');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAddress = async () => {
        if (!newAddress.title || !newAddress.address || !newAddress.districtId) {
            Alert.alert('Ошибка', 'Заполните все обязательные поля');
            return;
        }

        try {
            setLoading(true);
            const response = await DeliveryAddressApi.createAddress({
                title: newAddress.title,
                address: newAddress.address,
                districtId: parseInt(newAddress.districtId)
            });
            
            // Извлекаем данные из ответа API
            const createdAddress = response.data || response;
            console.log('✅ Address created:', createdAddress);
            
            onAddressSelected(createdAddress);
        } catch (error) {
            console.error('Ошибка создания адреса:', error);
            Alert.alert('Ошибка', 'Не удалось создать адрес');
        } finally {
            setLoading(false);
        }
    };



    const renderAddressItem = (address) => (
        <TouchableOpacity
            key={address.id}
            style={[
                styles.addressItem,
                selectedAddress?.id === address.id && styles.selectedAddressItem
            ]}
            onPress={() => {
                console.log('🎯 Address selected immediately:', address);
                setSelectedAddress(address);
                onAddressSelected(address);
            }}
        >
            <View style={styles.addressHeader}>
                <Text style={styles.addressTitle}>{address.title}</Text>
                {address.isDefault && (
                    <Text style={styles.defaultBadge}>По умолчанию</Text>
                )}
            </View>
            <Text style={styles.addressText}>{address.address}</Text>
            <Text style={styles.districtText}>{address.district?.name}</Text>
        </TouchableOpacity>
    );

    const renderNewAddressForm = () => (
        <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Новый адрес доставки</Text>
            
            <CustomTextInput
                label="Название"
                placeholder="Дом, Работа, и т.д."
                value={newAddress.title}
                onChangeText={(text) => setNewAddress(prev => ({ ...prev, title: text }))}
            />

            <CustomTextInput
                label="Адрес"
                placeholder="Введите полный адрес"
                value={newAddress.address}
                onChangeText={(text) => setNewAddress(prev => ({ ...prev, address: text }))}
                multiline
                numberOfLines={3}
            />

            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Район:</Text>
                <ScrollView style={styles.districtsList} horizontal showsHorizontalScrollIndicator={false}>
                    {districts.map(district => (
                        <TouchableOpacity
                            key={district.id}
                            style={[
                                styles.districtChip,
                                newAddress.districtId === district.id.toString() && styles.selectedDistrictChip
                            ]}
                            onPress={() => setNewAddress(prev => ({ ...prev, districtId: district.id.toString() }))}
                        >
                            <Text style={[
                                styles.districtChipText,
                                newAddress.districtId === district.id.toString() && styles.selectedDistrictChipText
                            ]}>
                                {district.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.formButtons}>
                <CustomButton
                    title="Создать адрес"
                    onPress={handleCreateAddress}
                    disabled={loading}
                />
                {addresses.length > 0 && (
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setShowNewAddressForm(false)}
                    >
                        <Text style={styles.backButtonText}>Выбрать существующий</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Выбор адреса доставки</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Color.colorPrimary} />
                        <Text style={styles.loadingText}>Загрузка...</Text>
                    </View>
                ) : (
                    <ScrollView style={styles.content}>
                        {showNewAddressForm ? (
                            renderNewAddressForm()
                        ) : (
                            <View>
                                <View style={styles.addressesHeader}>
                                    <Text style={styles.sectionTitle}>Ваши адреса:</Text>
                                    <TouchableOpacity
                                        style={styles.addButton}
                                        onPress={() => setShowNewAddressForm(true)}
                                    >
                                        <Text style={styles.addButtonText}>+ Добавить</Text>
                                    </TouchableOpacity>
                                </View>

                                {addresses.map(renderAddressItem)}

                                {addresses.length > 0 && (
                                    <View style={styles.footer}>
                                        <Text style={styles.footerHint}>
                                            Нажмите на адрес для выбора
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#ffffff'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000'
    },
    closeButton: {
        padding: 8
    },
    closeButtonText: {
        fontSize: 18,
        color: '#666666'
    },
    content: {
        flex: 1,
        padding: 20
    },
    addressesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000'
    },
    addButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6
    },
    addButtonText: {
        fontSize: 14,
        color: '#ffffff',
        fontWeight: '500'
    },
    addressItem: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    },
    selectedAddressItem: {
        borderColor: '#007AFF',
        borderWidth: 2
    },
    addressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    addressTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000'
    },
    defaultBadge: {
        fontSize: 12,
        color: '#007AFF',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12
    },
    addressText: {
        fontSize: 14,
        color: '#333333',
        marginBottom: 4
    },
    districtText: {
        fontSize: 12,
        color: '#666666'
    },
    formContainer: {
        flex: 1
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 20
    },
    inputContainer: {
        marginBottom: 16
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#000000',
        marginBottom: 8
    },
    districtsList: {
        flexDirection: 'row'
    },
    districtChip: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8
    },
    selectedDistrictChip: {
        backgroundColor: '#007AFF'
    },
    districtChipText: {
        fontSize: 14,
        color: '#333333'
    },
    selectedDistrictChipText: {
        color: '#ffffff'
    },
    formButtons: {
        marginTop: 20
    },
    backButton: {
        marginTop: 12,
        alignItems: 'center'
    },
    backButtonText: {
        fontSize: 14,
        color: '#007AFF'
    },
    footer: {
        marginTop: 20
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        fontSize: 14,
        color: '#666666',
        marginTop: 12
    },
    footerHint: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        fontStyle: 'italic'
    }
}); 