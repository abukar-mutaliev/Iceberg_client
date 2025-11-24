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
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
    Color,
    FontFamily
} from '@app/styles/GlobalStyles';
import { CustomTextInput } from '@shared/ui/CustomTextInput/CustomTextInput';
import { useCustomAlert } from '@shared/ui/CustomAlert';

import { CartService, clearCart, clearCartCache } from '@entities/cart';
import { AddressPickerModal, DeliveryAddressApi } from '@entities/deliveryAddress';
import { useDelivery, DeliveryTypeSelector, DeliveryInfo } from '@entities/delivery';
import WarehouseService from '@entities/warehouse/api/warehouseApi';
import { useDispatch, useSelector } from 'react-redux';

const normalize = (size) => {
    const scale = 375 / 375;
    return Math.round(size * scale);
};

export const CheckoutScreen = ({ navigation, route }) => {
    const { items = [], stats = {}, clientType } = route.params || {};
    const dispatch = useDispatch();
    const { showError } = useCustomAlert();

    // Delivery hook
    const {
        deliveryType,
        deliveryCost,
        deliveryDistance,
        isFreeDelivery,
        calculating,
        warehouseName,
        freeDeliveryInfo,
        totalWithDelivery,
        calculateDeliveryFee,
        setDeliveryType: setDeliveryTypeAction,
        clearDeliveryCalculation,
    } = useDelivery();

    const [loading, setLoading] = useState(false);
    const [addressLoading, setAddressLoading] = useState(true);
    const [showAddressPicker, setShowAddressPicker] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [warehouseId, setWarehouseId] = useState(null);
    const [formData, setFormData] = useState({
        comment: '',
        expectedDeliveryDate: null,
        paymentMethod: 'ONLINE' // Только онлайн оплата
    });
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);


    useEffect(() => {
        const loadDefaultAddress = async () => {
            try {
                setAddressLoading(true);
                const response = await DeliveryAddressApi.getDefaultAddress();
                
                // Безопасная обработка ответа - проверяем все возможные варианты структуры
                let defaultAddress = null;
                if (response && response.data !== null && response.data !== undefined) {
                    defaultAddress = response.data;
                } else if (response && response.data === null) {
                    // Адрес по умолчанию не установлен
                    defaultAddress = null;
                } else if (response && !response.data) {
                    // Прямой ответ без обертки data
                    defaultAddress = response;
                }
                
                if (defaultAddress) {
                    const districtId = defaultAddress.district?.id || defaultAddress.districtId;
                    
                    console.log('📍 Загружен адрес по умолчанию:', {
                        id: defaultAddress.id,
                        title: defaultAddress.title,
                        districtId,
                        districtName: defaultAddress.district?.name,
                        hasDistrictId: !!districtId
                    });
                    
                    setSelectedAddress(defaultAddress);
                    
                    // Получаем склад для района адреса
                    if (districtId) {
                        console.log('📍 Загрузка склада для района:', districtId);
                        try {
                            const warehousesResponse = await WarehouseService.getWarehousesByDistrict(districtId);
                            console.log('🏭 Ответ складов:', warehousesResponse);
                            
                            // Извлекаем массив складов из ответа
                            const warehouses = warehousesResponse.data?.warehouses || warehousesResponse.data || [];
                            console.log('📦 Извлечено складов:', warehouses.length);
                            
                            if (warehousesResponse.status === 'success' && warehouses.length > 0) {
                                const warehouse = warehouses[0]; // Берем первый активный склад
                                console.log('✅ Найден склад:', {
                                    id: warehouse.id,
                                    name: warehouse.name,
                                    districtId: warehouse.districtId
                                });
                                setWarehouseId(warehouse.id);
                                setSelectedWarehouse(warehouse);
                            } else {
                                console.warn('⚠️ Склад не найден для района:', districtId);
                                setWarehouseId(null);
                                setSelectedWarehouse(null);
                            }
                        } catch (warehouseError) {
                            console.error('❌ Error loading warehouse:', warehouseError);
                            setWarehouseId(null);
                            setSelectedWarehouse(null);
                        }
                    } else {
                        console.warn('⚠️ У адреса нет districtId:', defaultAddress);
                        setWarehouseId(null);
                        setSelectedWarehouse(null);
                    }
                } else {
                    setSelectedAddress(null);
                    setWarehouseId(null);
                    setSelectedWarehouse(null);
                }
            } catch (error) {
                console.error('❌ Error loading default address:', error);
                setSelectedAddress(null);
                setWarehouseId(null);
                setSelectedWarehouse(null);
            } finally {
                setAddressLoading(false);
            }
        };

        loadDefaultAddress();
    }, []);

    // Эффект для расчета доставки при изменении адреса или типа доставки
    useEffect(() => {
        const calculateDelivery = async () => {
            console.log('🔍 Проверка условий для расчета доставки:', {
                deliveryType,
                hasAddress: !!selectedAddress,
                addressId: selectedAddress?.id,
                hasWarehouse: !!warehouseId,
                warehouseId,
                orderAmount: stats.totalAmount || 0,
                addressLoading
            });

            // Расчитываем только для доставки курьером
            if (deliveryType !== 'DELIVERY') {
                console.log('⏭️ Пропуск расчета: тип доставки не DELIVERY');
                return;
            }

            if (!selectedAddress) {
                console.log('⏭️ Пропуск расчета: адрес не выбран');
                return;
            }

            if (!warehouseId) {
                console.log('⏭️ Пропуск расчета: склад не определен');
                return;
            }

            if (addressLoading) {
                console.log('⏭️ Пропуск расчета: адрес еще загружается');
                return;
            }

            try {
                console.log('🚚 Начинаем расчет стоимости доставки', {
                    warehouseId,
                    addressId: selectedAddress.id,
                    orderAmount: stats.totalAmount || 0
                });

                await calculateDeliveryFee(
                    warehouseId,
                    selectedAddress.id,
                    stats.totalAmount || 0
                );

                console.log('✅ Расчет доставки завершен успешно');
            } catch (error) {
                console.error('❌ Ошибка расчета доставки:', error);
                // Ошибка расчета не блокирует оформление заказа
            }
        };

        calculateDelivery();
    }, [selectedAddress, deliveryType, warehouseId, stats.totalAmount, calculateDeliveryFee, addressLoading]);

    const handleFieldChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAddressSelected = async (address) => {
        setShowAddressPicker(false);
        setAddressLoading(true);
        setSelectedAddress(address);
        clearDeliveryCalculation();

        // Получаем склад для района нового адреса
        const districtId = address?.district?.id || address?.districtId;
        let resolvedWarehouse = null;

        if (districtId) {
            console.log('📍 Загрузка склада для нового адреса, район:', districtId);
            try {
                const warehousesResponse = await WarehouseService.getWarehousesByDistrict(districtId);
                console.log('🏭 Ответ складов:', warehousesResponse);

                // Извлекаем массив складов из ответа
                const warehouses = warehousesResponse.data?.warehouses || warehousesResponse.data || [];
                console.log('📦 Извлечено складов:', warehouses.length);

                if (warehousesResponse.status === 'success' && warehouses.length > 0) {
                    resolvedWarehouse = warehouses[0];
                    console.log('✅ Найден склад:', {
                        id: resolvedWarehouse.id,
                        name: resolvedWarehouse.name,
                        districtId: resolvedWarehouse.districtId
                    });
                    setWarehouseId(resolvedWarehouse.id);
                    setSelectedWarehouse(resolvedWarehouse);
                } else {
                    console.warn('⚠️ Склад не найден для района:', districtId);
                    setWarehouseId(null);
                    setSelectedWarehouse(null);
                }
            } catch (error) {
                console.error('❌ Error loading warehouse for new address:', error);
                setWarehouseId(null);
                setSelectedWarehouse(null);
            }
        } else {
            console.warn('⚠️ Адрес не имеет districtId:', address);
            setWarehouseId(null);
            setSelectedWarehouse(null);
        }

        try {
            if (
                deliveryType === 'DELIVERY' &&
                resolvedWarehouse?.id &&
                address?.id
            ) {
                console.log('🚚 Перерасчет доставки после выбора нового адреса', {
                    warehouseId: resolvedWarehouse.id,
                    addressId: address.id,
                    orderAmount: stats.totalAmount || 0
                });

                await calculateDeliveryFee(
                    resolvedWarehouse.id,
                    address.id,
                    stats.totalAmount || 0
                );
            }
        } catch (error) {
            console.error('❌ Ошибка при перерасчете доставки после выбора адреса:', error);
        } finally {
            setAddressLoading(false);
        }
    };

    const handleDeliveryTypeChange = (type) => {
        console.log('🔄 Изменение типа доставки:', type);
        setDeliveryTypeAction(type);

        // Если выбран самовывоз, очищаем расчет доставки
        if (type === 'PICKUP') {
            console.log('🚚 Очистка расчета доставки для самовывоза');
            clearDeliveryCalculation();
        }
    };

    const handleSubmit = async () => {
        if (!selectedAddress && deliveryType === 'DELIVERY') {
            showError('Ошибка', 'Выберите адрес доставки');
            return;
        }

        setLoading(true);
        try {
            console.log('✅ Создание заказа перед оплатой', {
                deliveryType,
                deliveryFee: deliveryCost,
                addressId: selectedAddress?.id
            });
            
            const result = await CartService.checkout({
                addressId: selectedAddress?.id,
                comment: formData.comment,
                expectedDeliveryDate: formData.expectedDeliveryDate,
                paymentMethod: formData.paymentMethod,
                deliveryType: deliveryType, // Передаем тип доставки: DELIVERY или PICKUP
                usePreauthorization: true // Включаем предавторизацию по умолчанию
            });

            const order = result.data?.order;

            // Проверяем, требуется ли выбор клиента
            if (order?.requiresClientChoice) {
                console.log('⚠️ Требуется выбор клиента, переход к OrderChoice');
                
                // НЕ очищаем корзину - она может понадобиться для замены товаров
                
                // Переходим к экрану выбора альтернатив
                setTimeout(() => {
                    navigation.navigate('OrderChoice', {
                        choiceId: order.clientChoiceId,
                        orderId: order.id,
                        fromCheckout: true
                    });
                }, 100);
                return;
            }

            // Обычное завершение заказа - переходим к оплате
            console.log('💳 Заказ создан, переход к оплате', {
                orderId: order?.id,
                orderNumber: order?.orderNumber,
                totalAmount: order?.totalAmount,
                itemsCount: stats.totalItems || 0,
                boxesCount: stats.totalBoxes || 0
            });

            // НЕ очищаем корзину - она очистится после успешной оплаты в PaymentScreen
            
            // Переходим к экрану оплаты
            navigation.navigate('PaymentScreen', {
                orderId: order?.id,
                orderNumber: order?.orderNumber,
                totalAmount: order?.totalAmount,
                itemsCount: stats.totalItems || 0,
                boxesCount: stats.totalBoxes || 0,
                usePreauthorization: false, // Для обычных заказов без предавторизации
                returnScreen: 'MyOrders'
            });

        } catch (error) {
            console.error('❌ Checkout error:', error);

            let errorMessage = 'Не удалось создать заказ';

            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            showError('Ошибка', errorMessage);
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
                            
                            {/* Сумма товаров */}
                            <View style={styles.orderRow}>
                                <Text style={styles.orderLabel}>Сумма товаров:</Text>
                                <Text style={styles.orderValue}>
                                    {formatPrice(stats.totalAmount || 0)}
                                </Text>
                            </View>
                            
                            {/* Стоимость доставки */}
                            {deliveryType === 'DELIVERY' && deliveryCost > 0 && (
                                <View style={styles.orderRow}>
                                    <Text style={styles.orderLabel}>
                                        {isFreeDelivery ? 'Доставка (бесплатно):' : 'Доставка:'}
                                    </Text>
                                    <Text style={isFreeDelivery ? styles.savingsValue : styles.orderValue}>
                                        {isFreeDelivery ? '0 ₽' : formatPrice(deliveryCost)}
                                    </Text>
                                </View>
                            )}

                            {/* Для самовывоза показываем информацию о бесплатной доставке */}
                            {deliveryType === 'PICKUP' && (
                                <View style={styles.orderRow}>
                                    <Text style={styles.orderLabel}>Самовывоз:</Text>
                                    <Text style={styles.savingsValue}>Бесплатно</Text>
                                </View>
                            )}
                            <View style={[styles.orderRow, styles.totalRow]}>
                                <Text style={styles.totalLabel}>Итого:</Text>
                                <Text style={styles.totalValue}>
                                    {(() => {
                                        const baseAmount = stats.finalPrice || stats.totalAmount || 0;
                                        const deliveryAmount = deliveryType === 'DELIVERY' ? deliveryCost : 0;
                                        const total = baseAmount + deliveryAmount;
                                        console.log('💰 Расчет итоговой суммы:', {
                                            deliveryType,
                                            baseAmount,
                                            deliveryCost,
                                            deliveryAmount,
                                            total
                                        });
                                        return formatPrice(total);
                                    })()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Форма заказа */}
                    <View style={styles.section}>
                        
                        {/* Выбор типа доставки */}
                        <View style={styles.deliveryTypeSection}>
                            <DeliveryTypeSelector
                                selectedType={deliveryType}
                                onTypeChange={handleDeliveryTypeChange}
                                disabled={loading}
                            />
                        </View>

              
                        {deliveryType === 'DELIVERY' && (
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
                        )}


                        {/* Информация о доставке - только для доставки */}
                        {deliveryType === 'DELIVERY' && (
                            <View style={styles.deliveryAddressSection}>
                                <View style={styles.deliveryInfoSection}>
                                    <DeliveryInfo
                                        deliveryType={deliveryType}
                                        deliveryCost={deliveryCost}
                                        deliveryDistance={deliveryDistance}
                                        isFreeDelivery={isFreeDelivery}
                                        calculating={calculating}
                                        warehouseName={warehouseName}
                                        freeDeliveryInfo={freeDeliveryInfo}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Для самовывоза показываем информацию о складе */}
                        {deliveryType === 'PICKUP' && (selectedWarehouse || warehouseName) && (
                            <View style={styles.pickupInfoSection}>
                                <DeliveryInfo
                                    deliveryType={deliveryType}
                                    warehouseName={selectedWarehouse?.name || warehouseName}
                                    warehouseAddress={
                                        selectedWarehouse?.address ||
                                        selectedWarehouse?.fullAddress ||
                                        selectedWarehouse?.formattedAddress ||
                                        [
                                            selectedWarehouse?.city,
                                            selectedWarehouse?.street,
                                            selectedWarehouse?.house
                                        ].filter(Boolean).join(', ') ||
                                        null
                                    }
                                />
                            </View>
                        )}

                        <CustomTextInput
                            label="Комментарий к заказу"
                            value={formData.comment}
                            onChangeText={(value) => handleFieldChange('comment', value)}
                            placeholder="Дополнительные пожелания (необязательно)"
                            multiline
                            numberOfLines={3}
                            style={styles.textArea}
                            inputStyle={styles.textAreaInput}
                            labelStyle={styles.textAreaLabel}
                        />
                    </View>

                    {/* Способ оплаты */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Способ оплаты</Text>
                            <TouchableOpacity
                                style={styles.infoButton}
                                onPress={() => navigation.navigate('PreauthorizationInfo', {
                                    orderAmount: stats.finalPrice || stats.totalAmount || 0,
                                    orderNumber: 'новый заказ'
                                })}
                            >
                                <Icon name="info-outline" size={20} color="#667eea" />
                                <Text style={styles.infoButtonText}>Как это работает?</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Онлайн оплата */}
                        <View style={styles.onlinePaymentInfo}>
                            <View style={styles.paymentMethodCard}>
                                <Icon name="payment" size={24} color="#667eea" />
                                <View style={styles.paymentMethodContent}>
                                    <Text style={styles.paymentMethodTitle}>Онлайн оплата</Text>
                                    <Text style={styles.paymentMethodDescription}>
                                        Безопасная оплата через Т-Бизнес
                                    </Text>
                                </View>
                            </View>

                            {/* Информация о предавторизации */}
                            <View style={styles.preauthorizationInfo}>
                                <Icon name="security" size={16} color="#28a745" />
                                <Text style={styles.preauthorizationText}>
                                    Средства будут заблокированы на карте, но списаны только после подтверждения наличия товаров
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                {/* Кнопка оформления */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[
                            styles.submitButton, 
                            (loading || addressLoading || (deliveryType === 'DELIVERY' && !selectedAddress)) && styles.submitButtonDisabled
                        ]}
                        onPress={handleSubmit}
                        disabled={loading || addressLoading || (deliveryType === 'DELIVERY' && !selectedAddress)}
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
    },

    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(16),
    },

    infoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: normalize(4),
        paddingHorizontal: normalize(8),
    },

    infoButtonText: {
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: '#667eea',
        marginLeft: normalize(4),
        fontWeight: '500',
    },

    preauthorizationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f8ff',
        padding: normalize(12),
        borderRadius: normalize(8),
        marginBottom: normalize(16),
        borderWidth: 1,
        borderColor: '#b8daff',
    },

    preauthorizationText: {
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: '#0c5460',
        lineHeight: normalize(16),
        marginLeft: normalize(8),
        flex: 1,
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
        minHeight: normalize(100),
        textAlignVertical: 'top',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E1E5E9',
        borderRadius: normalize(12),
        padding: normalize(16),
        marginTop: normalize(8),
    },
    textAreaInput: {
        minHeight: normalize(60),
        fontSize: normalize(16),
        color: '#333333',
        lineHeight: normalize(22),
        textAlignVertical: 'top',
    },
    textAreaLabel: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: '#333333',
        marginBottom: normalize(8),
    },

    onlinePaymentInfo: {
        gap: normalize(12),
    },

    paymentMethodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: normalize(16),
        backgroundColor: '#F8F9FF',
        borderRadius: normalize(12),
        borderWidth: 1,
        borderColor: '#667eea',
        gap: normalize(12),
    },

    paymentMethodContent: {
        flex: 1,
    },

    paymentMethodTitle: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: '#000000',
        marginBottom: normalize(4),
    },

    paymentMethodDescription: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: 'rgba(60, 60, 67, 0.60)',
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

    // Стили для секций доставки
    deliveryTypeSection: {
        marginBottom: normalize(16),
        marginTop: normalize(12),
    },

    deliveryInfoSection: {
        marginBottom: normalize(16),
    },

    deliveryAddressSection: {
        marginBottom: normalize(12),
    },

    pickupInfoSection: {
        marginTop: normalize(12),
        marginBottom: normalize(16),
    },
});