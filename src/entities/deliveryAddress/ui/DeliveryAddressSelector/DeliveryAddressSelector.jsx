import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal
} from 'react-native';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import { CustomTextInput } from '@shared/ui/CustomTextInput/CustomTextInput';
import { Picker } from '@react-native-picker/picker';
// Импортируем напрямую из API, чтобы избежать циклической зависимости
import { DeliveryAddressApi } from '../../api/deliveryAddressApi';
import CustomButton from "@shared/ui/Button/CustomButton";
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';

const normalize = (size) => size;

export const DeliveryAddressSelector = ({ 
    onAddressSelect, 
    visible, 
    onClose,
    selectedAddressId = null 
}) => {
    const { showError, showConfirm } = useCustomAlert();
    const [loading, setLoading] = useState(false);
    const [addresses, setAddresses] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [mode, setMode] = useState('existing'); // 'existing' or 'new'
    const [selectedAddress, setSelectedAddress] = useState(null);
    
    // Форма нового адреса
    const [newAddressForm, setNewAddressForm] = useState({
        title: '',
        address: '',
        districtId: '',
        contactName: '',
        contactPhone: '',
        notes: '',
        saveAddress: true
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (visible) {
            loadData();
        }
    }, [visible]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [addressesData, districtsData] = await Promise.all([
                DeliveryAddressApi.getAddresses(),
                DeliveryAddressApi.getDistricts()
            ]);

            setAddresses(addressesData);
            setDistricts(districtsData);

            // Если есть выбранный адрес, устанавливаем его
            if (selectedAddressId) {
                const selected = addressesData.find(addr => addr.id === selectedAddressId);
                if (selected) {
                    setSelectedAddress(selected);
                }
            } else {
                // Иначе выбираем адрес по умолчанию
                const defaultAddress = addressesData.find(addr => addr.isDefault);
                if (defaultAddress) {
                    setSelectedAddress(defaultAddress);
                }
            }

            // Если нет адресов, переключаемся на режим создания
            if (addressesData.length === 0) {
                setMode('new');
            }

        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            showError('Ошибка', 'Не удалось загрузить данные адресов');
        } finally {
            setLoading(false);
        }
    };

    const handleNewAddressChange = (field, value) => {
        setNewAddressForm(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Очищаем ошибку для этого поля
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: null
            }));
        }
    };

    const validateNewAddress = () => {
        const newErrors = {};

        if (!newAddressForm.title.trim()) {
            newErrors.title = 'Введите название адреса';
        }

        if (!newAddressForm.address.trim()) {
            newErrors.address = 'Введите адрес';
        } else if (newAddressForm.address.trim().length < 10) {
            newErrors.address = 'Адрес должен содержать не менее 10 символов';
        }

        if (!newAddressForm.districtId) {
            newErrors.districtId = 'Выберите район';
        }

        if (newAddressForm.contactPhone && !/^\+?[0-9]{10,15}$/.test(newAddressForm.contactPhone)) {
            newErrors.contactPhone = 'Неверный формат номера телефона';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleConfirm = async () => {
        if (mode === 'existing') {
            if (!selectedAddress) {
                showError('Ошибка', 'Выберите адрес доставки');
                return;
            }

            onAddressSelect({
                type: 'existing',
                address: selectedAddress
            });
        } else {
            if (!validateNewAddress()) {
                return;
            }

            try {
                setLoading(true);

                let addressToUse = newAddressForm;

                // Если нужно сохранить адрес, создаем его
                if (newAddressForm.saveAddress) {
                    const savedAddress = await DeliveryAddressApi.createAddress({
                        title: newAddressForm.title,
                        address: newAddressForm.address,
                        districtId: parseInt(newAddressForm.districtId),
                        contactName: newAddressForm.contactName || null,
                        contactPhone: newAddressForm.contactPhone || null,
                        notes: newAddressForm.notes || null
                    });
                    addressToUse = savedAddress;
                }

                onAddressSelect({
                    type: 'new',
                    address: addressToUse,
                    saved: newAddressForm.saveAddress
                });

            } catch (error) {
                console.error('Ошибка при создании адреса:', error);
                showError('Ошибка', 'Не удалось создать адрес');
            } finally {
                setLoading(false);
            }
        }

        onClose();
    };

    const handleDeleteAddress = async (addressId) => {
        showConfirm(
            'Подтверждение',
            'Вы уверены, что хотите удалить этот адрес?',
            async () => {
                try {
                    setLoading(true);
                    await DeliveryAddressApi.deleteAddress(addressId);
                    await loadData();
                    
                    // Если удаленный адрес был выбран, сбрасываем выбор
                    if (selectedAddress?.id === addressId) {
                        setSelectedAddress(null);
                    }
                } catch (error) {
                    console.error('Ошибка при удалении адреса:', error);
                    showError('Ошибка', 'Не удалось удалить адрес');
                } finally {
                    setLoading(false);
                }
            },
            () => {
                // Отмена удаления - ничего не делаем
            }
        );
    };

    const renderAddressItem = (address) => (
        <TouchableOpacity
            key={address.id}
            style={[
                styles.addressItem,
                selectedAddress?.id === address.id && styles.selectedAddressItem
            ]}
            onPress={() => setSelectedAddress(address)}
        >
            <View style={styles.addressHeader}>
                <Text style={styles.addressTitle}>{address.title}</Text>
                {address.isDefault && (
                    <Text style={styles.defaultBadge}>По умолчанию</Text>
                )}
            </View>
            <Text style={styles.addressText}>{address.address}</Text>
            <Text style={styles.districtText}>{address.district.name}</Text>
            
            {address.contactName && (
                <Text style={styles.contactText}>Контакт: {address.contactName}</Text>
            )}
            
            <View style={styles.addressActions}>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteAddress(address.id)}
                >
                    <Text style={styles.deleteButtonText}>Удалить</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    const renderExistingAddresses = () => (
        <View style={styles.addressesContainer}>
            <Text style={styles.sectionTitle}>Выберите адрес доставки:</Text>
            
            {addresses.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>У вас пока нет сохраненных адресов</Text>
                    <TouchableOpacity
                        style={styles.switchModeButton}
                        onPress={() => setMode('new')}
                    >
                        <Text style={styles.switchModeButtonText}>Добавить новый адрес</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView style={styles.addressesList}>
                    {addresses.map(renderAddressItem)}
                </ScrollView>
            )}
        </View>
    );

    const renderNewAddressForm = () => (
        <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Новый адрес доставки:</Text>
            
            <CustomTextInput
                label="Название адреса"
                placeholder="Например: Дом, Работа"
                value={newAddressForm.title}
                onChangeText={(value) => handleNewAddressChange('title', value)}
                error={errors.title}
            />

            <CustomTextInput
                label="Адрес"
                placeholder="Введите полный адрес"
                value={newAddressForm.address}
                onChangeText={(value) => handleNewAddressChange('address', value)}
                error={errors.address}
                multiline
                numberOfLines={3}
            />

            <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Район:</Text>
                <Picker
                    selectedValue={newAddressForm.districtId}
                    onValueChange={(value) => handleNewAddressChange('districtId', value)}
                    style={styles.picker}
                >
                    <Picker.Item label="Выберите район" value="" />
                    {districts.map(district => (
                        <Picker.Item
                            key={district.id}
                            label={district.name}
                            value={district.id.toString()}
                        />
                    ))}
                </Picker>
                {errors.districtId && (
                    <Text style={styles.errorText}>{errors.districtId}</Text>
                )}
            </View>

            <CustomTextInput
                label="Имя контакта (необязательно)"
                placeholder="Имя получателя"
                value={newAddressForm.contactName}
                onChangeText={(value) => handleNewAddressChange('contactName', value)}
            />

            <CustomTextInput
                label="Телефон контакта (необязательно)"
                placeholder="+7 (900) 123-45-67"
                value={newAddressForm.contactPhone}
                onChangeText={(value) => handleNewAddressChange('contactPhone', value)}
                keyboardType="phone-pad"
                error={errors.contactPhone}
            />

            <CustomTextInput
                label="Примечания (необязательно)"
                placeholder="Домофон, этаж, подъезд"
                value={newAddressForm.notes}
                onChangeText={(value) => handleNewAddressChange('notes', value)}
                multiline
                numberOfLines={2}
            />

            <TouchableOpacity
                style={styles.saveAddressToggle}
                onPress={() => handleNewAddressChange('saveAddress', !newAddressForm.saveAddress)}
            >
                <View style={[
                    styles.checkbox,
                    newAddressForm.saveAddress && styles.checkedCheckbox
                ]}>
                    {newAddressForm.saveAddress && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.saveAddressText}>Сохранить адрес для будущих заказов</Text>
            </TouchableOpacity>
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
                    <Text style={styles.headerTitle}>Адрес доставки</Text>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>

                {/* Переключатель режимов */}
                {addresses.length > 0 && (
                    <View style={styles.modeToggle}>
                        <TouchableOpacity
                            style={[
                                styles.modeButton,
                                mode === 'existing' && styles.activeModeButton
                            ]}
                            onPress={() => setMode('existing')}
                        >
                            <Text style={[
                                styles.modeButtonText,
                                mode === 'existing' && styles.activeModeButtonText
                            ]}>
                                Выбрать существующий
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.modeButton,
                                mode === 'new' && styles.activeModeButton
                            ]}
                            onPress={() => setMode('new')}
                        >
                            <Text style={[
                                styles.modeButtonText,
                                mode === 'new' && styles.activeModeButtonText
                            ]}>
                                Новый адрес
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Color.colorPrimary} />
                        <Text style={styles.loadingText}>Загрузка...</Text>
                    </View>
                ) : (
                    <ScrollView style={styles.content}>
                        {mode === 'existing' ? renderExistingAddresses() : renderNewAddressForm()}
                    </ScrollView>
                )}

                {!loading && (
                    <View style={styles.footer}>
                        <CustomButton
                            title={mode === 'existing' ? 'Выбрать адрес' : 'Использовать адрес'}
                            onPress={handleConfirm}
                            disabled={mode === 'existing' && !selectedAddress}
                        />
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorBackground || '#ffffff'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: normalize(20),
        borderBottomWidth: 1,
        borderBottomColor: Color.colorBorder || '#e0e0e0'
    },
    headerTitle: {
        fontSize: normalize(18),
        fontFamily: FontFamily.interSemiBold || 'System',
        color: Color.colorText || '#000000'
    },
    closeButton: {
        padding: normalize(8)
    },
    closeButtonText: {
        fontSize: normalize(18),
        color: Color.colorText || '#000000'
    },
    modeToggle: {
        flexDirection: 'row',
        margin: normalize(20),
        backgroundColor: Color.colorLightGray,
        borderRadius: normalize(8),
        padding: normalize(4)
    },
    modeButton: {
        flex: 1,
        padding: normalize(12),
        alignItems: 'center',
        borderRadius: normalize(6)
    },
    activeModeButton: {
        backgroundColor: Color.colorPrimary
    },
    modeButtonText: {
        fontSize: normalize(14),
        fontFamily: FontFamily.interMedium,
        color: Color.colorText
    },
    activeModeButtonText: {
        color: Color.colorWhite
    },
    content: {
        flex: 1,
        padding: normalize(20)
    },
    sectionTitle: {
        fontSize: normalize(16),
        fontFamily: FontFamily.interSemiBold,
        color: Color.colorText,
        marginBottom: normalize(16)
    },
    addressesContainer: {
        flex: 1
    },
    addressesList: {
        flex: 1
    },
    addressItem: {
        backgroundColor: Color.colorWhite,
        borderRadius: normalize(12),
        padding: normalize(16),
        marginBottom: normalize(12),
        borderWidth: 2,
        borderColor: Color.colorBorder
    },
    selectedAddressItem: {
        borderColor: Color.colorPrimary
    },
    addressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(8)
    },
    addressTitle: {
        fontSize: normalize(16),
        fontFamily: FontFamily.interSemiBold,
        color: Color.colorText
    },
    defaultBadge: {
        fontSize: normalize(12),
        fontFamily: FontFamily.interMedium,
        color: Color.colorPrimary,
        backgroundColor: Color.colorLightPrimary,
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(4),
        borderRadius: normalize(12)
    },
    addressText: {
        fontSize: normalize(14),
        fontFamily: FontFamily.interRegular,
        color: Color.colorText,
        marginBottom: normalize(4)
    },
    districtText: {
        fontSize: normalize(12),
        fontFamily: FontFamily.interMedium,
        color: Color.colorSecondaryText,
        marginBottom: normalize(8)
    },
    contactText: {
        fontSize: normalize(12),
        fontFamily: FontFamily.interRegular,
        color: Color.colorSecondaryText,
        marginBottom: normalize(8)
    },
    addressActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end'
    },
    deleteButton: {
        padding: normalize(8)
    },
    deleteButtonText: {
        fontSize: normalize(12),
        fontFamily: FontFamily.interMedium,
        color: Color.colorError
    },
    emptyContainer: {
        alignItems: 'center',
        padding: normalize(40)
    },
    emptyText: {
        fontSize: normalize(14),
        fontFamily: FontFamily.interRegular,
        color: Color.colorSecondaryText,
        textAlign: 'center',
        marginBottom: normalize(20)
    },
    switchModeButton: {
        backgroundColor: Color.colorPrimary,
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(12),
        borderRadius: normalize(8)
    },
    switchModeButtonText: {
        fontSize: normalize(14),
        fontFamily: FontFamily.interMedium,
        color: Color.colorWhite
    },
    formContainer: {
        flex: 1
    },
    pickerContainer: {
        marginBottom: normalize(16)
    },
    pickerLabel: {
        fontSize: normalize(14),
        fontFamily: FontFamily.interMedium,
        color: Color.colorText,
        marginBottom: normalize(8)
    },
    picker: {
        backgroundColor: Color.colorWhite,
        borderRadius: normalize(8)
    },
    errorText: {
        fontSize: normalize(12),
        fontFamily: FontFamily.interRegular,
        color: Color.colorError,
        marginTop: normalize(4)
    },
    saveAddressToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: normalize(16)
    },
    checkbox: {
        width: normalize(20),
        height: normalize(20),
        borderWidth: 2,
        borderColor: Color.colorBorder,
        borderRadius: normalize(4),
        marginRight: normalize(12),
        alignItems: 'center',
        justifyContent: 'center'
    },
    checkedCheckbox: {
        backgroundColor: Color.colorPrimary,
        borderColor: Color.colorPrimary
    },
    checkmark: {
        color: Color.colorWhite,
        fontSize: normalize(12),
        fontFamily: FontFamily.interBold
    },
    saveAddressText: {
        fontSize: normalize(14),
        fontFamily: FontFamily.interRegular,
        color: Color.colorText,
        flex: 1
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        fontSize: normalize(14),
        fontFamily: FontFamily.interRegular,
        color: Color.colorSecondaryText,
        marginTop: normalize(12)
    },
    footer: {
        padding: normalize(20),
        borderTopWidth: 1,
        borderTopColor: Color.colorBorder
    }
}); 