import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import {
    Color,
    FontFamily
} from '@app/styles/GlobalStyles';
import { CustomTextInput } from '@shared/ui/CustomTextInput/CustomTextInput';

import { CartService } from '@entities/cart';
import { AddressPickerModal, DeliveryAddressApi } from '@entities/deliveryAddress';

const normalize = (size) => {
    const scale = 375 / 375;
    return Math.round(size * scale);
};

export const CheckoutScreen = ({ navigation, route }) => {
    const { items = [], stats = {}, clientType } = route.params || {};

    const [loading, setLoading] = useState(false);
    const [addressLoading, setAddressLoading] = useState(true);
    const [showAddressPicker, setShowAddressPicker] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [formData, setFormData] = useState({
        comment: '',
        expectedDeliveryDate: null,
        paymentMethod: 'CASH'
    });

    useEffect(() => {
        const loadDefaultAddress = async () => {
            try {
                setAddressLoading(true);
                const response = await DeliveryAddressApi.getDefaultAddress();
                const defaultAddress = response.data || response;
                
                if (defaultAddress) {
                    setSelectedAddress(defaultAddress);
                    console.log('✅ Default address loaded:', defaultAddress);
                } else {
                    console.log('ℹ️ No default address found');
                }
            } catch (error) {
                console.error('❌ Error loading default address:', error);
            } finally {
                setAddressLoading(false);
            }
        };

        loadDefaultAddress();
    }, []);

    const handleFieldChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAddressSelected = (address) => {
        setSelectedAddress(address);
        console.log('✅ Address selected:', address);
        setShowAddressPicker(false);
    };

    const handleSubmit = async () => {
        if (!selectedAddress) {
            Alert.alert('Ошибка', 'Выберите адрес доставки');
            return;
        }

        setLoading(true);
        try {
            const result = await CartService.checkout({
                addressId: selectedAddress.id,
                deliveryAddress: `${selectedAddress.title}: ${selectedAddress.address}`,
                comment: formData.comment,
                expectedDeliveryDate: formData.expectedDeliveryDate,
                paymentMethod: formData.paymentMethod
            });


            const order = result.data?.order;

            Alert.alert(
                'Заказ создан!',
                `Ваш заказ №${order?.orderNumber || 'N/A'} успешно создан. Мы свяжемся с вами для подтверждения.`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            navigation.navigate('MainTab', {
                                screen: 'MyOrders',
                                params: { refresh: true }
                            });
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('❌ Checkout error:', error);

            let errorMessage = 'Не удалось создать заказ';

            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            Alert.alert('Ошибка', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor={Color.background || '#FFFFFF'}
            />

            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Заголовок */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Оформление заказа</Text>
                    <View style={styles.placeholder} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Информация о заказе */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Ваш заказ</Text>
                        <View style={styles.orderInfo}>
                            <View style={styles.orderRow}>
                                <Text style={styles.orderLabel}>Товаров:</Text>
                                <Text style={styles.orderValue}>{items.length}</Text>
                            </View>
                            <View style={styles.orderRow}>
                                <Text style={styles.orderLabel}>Коробки:</Text>
                                <Text style={styles.orderValue}>{stats.totalBoxes || 0}</Text>
                            </View>
                            <View style={styles.orderRow}>
                                <Text style={styles.orderLabel}>Общее количество:</Text>
                                <Text style={styles.orderValue}>{stats.totalItems || 0} шт.</Text>
                            </View>
                            {stats.totalSavings > 0 && (
                                <View style={styles.orderRow}>
                                    <Text style={styles.orderLabel}>Экономия:</Text>
                                    <Text style={styles.savingsValue}>
                                        {formatPrice(stats.totalSavings)}
                                    </Text>
                                </View>
                            )}
                            <View style={[styles.orderRow, styles.totalRow]}>
                                <Text style={styles.totalLabel}>Итого:</Text>
                                <Text style={styles.totalValue}>
                                    {formatPrice(stats.finalPrice || stats.totalAmount || 0)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Форма заказа */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Данные для доставки</Text>

                        {/* Выбор адреса */}
                        <View style={styles.addressSection}>
                            <Text style={styles.addressLabel}>Адрес доставки *</Text>
                            
                            {addressLoading ? (
                                <View style={styles.addressLoadingContainer}>
                                    <ActivityIndicator size="small" color="#3339B0" />
                                    <Text style={styles.addressLoadingText}>Загрузка адреса...</Text>
                                </View>
                            ) : selectedAddress ? (
                                <View style={styles.selectedAddressContainer}>
                                    <View style={styles.selectedAddress}>
                                        <Text style={styles.selectedAddressTitle}>
                                            {selectedAddress.title}
                                        </Text>
                                        <Text style={styles.selectedAddressText}>
                                            {selectedAddress.address}
                                        </Text>
                                        {selectedAddress.district && (
                                            <Text style={styles.selectedAddressDistrict}>
                                                Район: {selectedAddress.district.name}
                                            </Text>
                                        )}
                                        {selectedAddress.isDefault && (
                                            <Text style={styles.defaultAddressBadge}>По умолчанию</Text>
                                        )}
                                    </View>
                                    <TouchableOpacity 
                                        style={styles.changeAddressButton}
                                        onPress={() => setShowAddressPicker(true)}
                                    >
                                        <Text style={styles.changeAddressText}>Изменить</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    style={styles.selectAddressButton}
                                    onPress={() => setShowAddressPicker(true)}
                                >
                                    <Text style={styles.selectAddressText}>
                                        Выберите адрес доставки
                                    </Text>
                                    <Text style={styles.selectAddressArrow}>→</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <CustomTextInput
                            label="Комментарий к заказу"
                            value={formData.comment}
                            onChangeText={(value) => handleFieldChange('comment', value)}
                            placeholder="Дополнительные пожелания (необязательно)"
                            multiline
                            numberOfLines={2}
                            style={styles.textArea}
                        />
                    </View>

                    {/* Способ оплаты */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Способ оплаты</Text>
                        <View style={styles.paymentOptions}>
                            <TouchableOpacity
                                style={[
                                    styles.paymentOption,
                                    formData.paymentMethod === 'CASH' && styles.paymentOptionSelected
                                ]}
                                onPress={() => handleFieldChange('paymentMethod', 'CASH')}
                            >
                                <View style={[
                                    styles.radio,
                                    formData.paymentMethod === 'CASH' && styles.radioSelected
                                ]}>
                                    {formData.paymentMethod === 'CASH' && (
                                        <View style={styles.radioDot} />
                                    )}
                                </View>
                                <Text style={styles.paymentText}>Наличными при доставке</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.paymentOption,
                                    formData.paymentMethod === 'CARD' && styles.paymentOptionSelected
                                ]}
                                onPress={() => handleFieldChange('paymentMethod', 'CARD')}
                            >
                                <View style={[
                                    styles.radio,
                                    formData.paymentMethod === 'CARD' && styles.radioSelected
                                ]}>
                                    {formData.paymentMethod === 'CARD' && (
                                        <View style={styles.radioDot} />
                                    )}
                                </View>
                                <Text style={styles.paymentText}>Картой при доставке</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>

                {/* Кнопка оформления */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[
                            styles.submitButton, 
                            (loading || addressLoading || !selectedAddress) && styles.submitButtonDisabled
                        ]}
                        onPress={handleSubmit}
                        disabled={loading || addressLoading || !selectedAddress}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {addressLoading ? 'Загрузка...' : 'Оформить заказ'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Модальное окно выбора адреса */}
            <AddressPickerModal
                visible={showAddressPicker}
                onClose={() => setShowAddressPicker(false)}
                onAddressSelected={handleAddressSelected}
                currentAddress={selectedAddress}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    keyboardAvoidingView: {
        flex: 1,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(193, 199, 222, 0.20)',
        backgroundColor: '#FFFFFF',
    },

    backButton: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        backgroundColor: '#F8F9FF',
        justifyContent: 'center',
        alignItems: 'center',
    },

    backButtonText: {
        fontSize: normalize(20),
        color: '#3339B0',
        fontWeight: '600',
    },

    title: {
        fontSize: normalize(18),
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        fontWeight: '600',
        color: '#000000',
    },

    placeholder: {
        width: normalize(40),
    },

    content: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    section: {
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(20),
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(193, 199, 222, 0.10)',
    },

    sectionTitle: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: '#000000',
        marginBottom: normalize(16),
    },

    orderInfo: {
        backgroundColor: '#F8F9FF',
        borderRadius: normalize(12),
        padding: normalize(16),
    },

    orderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(8),
    },

    orderLabel: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: 'rgba(60, 60, 67, 0.60)',
    },

    orderValue: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '500',
        color: '#000000',
    },

    savingsValue: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '500',
        color: '#28a745',
    },

    totalRow: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(193, 199, 222, 0.30)',
        paddingTop: normalize(12),
        marginTop: normalize(8),
        marginBottom: 0,
    },

    totalLabel: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: '#000000',
    },

    totalValue: {
        fontSize: normalize(18),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '700',
        color: '#3339B0',
    },

    textArea: {
        minHeight: normalize(80),
        textAlignVertical: 'top',
    },

    paymentOptions: {
        gap: normalize(12),
    },

    paymentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: normalize(16),
        backgroundColor: '#F8F9FF',
        borderRadius: normalize(12),
        borderWidth: 1,
        borderColor: 'transparent',
    },

    paymentOptionSelected: {
        borderColor: '#3339B0',
        backgroundColor: '#F0F1FF',
    },

    radio: {
        width: normalize(20),
        height: normalize(20),
        borderRadius: normalize(10),
        borderWidth: 2,
        borderColor: '#C1C7DE',
        marginRight: normalize(12),
        justifyContent: 'center',
        alignItems: 'center',
    },

    radioSelected: {
        borderColor: '#3339B0',
    },

    radioDot: {
        width: normalize(8),
        height: normalize(8),
        borderRadius: normalize(4),
        backgroundColor: '#3339B0',
    },

    paymentText: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: '#000000',
    },

    footer: {
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: 'rgba(193, 199, 222, 0.20)',
    },

    submitButton: {
        backgroundColor: '#3339B0',
        borderRadius: normalize(12),
        paddingVertical: normalize(16),
        alignItems: 'center',
        justifyContent: 'center',
    },

    submitButtonDisabled: {
        opacity: 0.6,
    },

    submitButtonText: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: '#FFFFFF',
    },

    // Стили для выбора адреса
    addressSection: {
        marginBottom: normalize(20),
    },

    addressLabel: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '500',
        color: '#000000',
        marginBottom: normalize(8),
    },

    selectAddressButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: normalize(16),
        backgroundColor: '#F8F9FF',
        borderRadius: normalize(12),
        borderWidth: 1,
        borderColor: 'rgba(193, 199, 222, 0.30)',
    },

    selectAddressText: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: 'rgba(60, 60, 67, 0.60)',
    },

    selectAddressArrow: {
        fontSize: normalize(16),
        color: '#3339B0',
        fontWeight: '600',
    },

    selectedAddressContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F0F1FF',
        borderRadius: normalize(12),
        padding: normalize(16),
        borderWidth: 1,
        borderColor: '#3339B0',
    },

    selectedAddress: {
        flex: 1,
        marginRight: normalize(12),
    },

    selectedAddressTitle: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: '#000000',
        marginBottom: normalize(4),
    },

    selectedAddressText: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: 'rgba(60, 60, 67, 0.85)',
        lineHeight: normalize(20),
        marginBottom: normalize(4),
    },

    selectedAddressDistrict: {
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: 'rgba(60, 60, 67, 0.60)',
    },

    changeAddressButton: {
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(6),
        backgroundColor: '#3339B0',
        borderRadius: normalize(8),
    },

    changeAddressText: {
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '500',
        color: '#FFFFFF',
    },

    // Стили для загрузки адреса
    addressLoadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: normalize(16),
        backgroundColor: '#F8F9FF',
        borderRadius: normalize(12),
        borderWidth: 1,
        borderColor: 'rgba(193, 199, 222, 0.30)',
    },

    addressLoadingText: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: 'rgba(60, 60, 67, 0.60)',
        marginLeft: normalize(8),
    },

    defaultAddressBadge: {
        fontSize: normalize(11),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: '#3339B0',
        backgroundColor: '#E8F4FD',
        paddingHorizontal: normalize(6),
        paddingVertical: normalize(2),
        borderRadius: normalize(4),
        marginTop: normalize(4),
        alignSelf: 'flex-start',
    },
});