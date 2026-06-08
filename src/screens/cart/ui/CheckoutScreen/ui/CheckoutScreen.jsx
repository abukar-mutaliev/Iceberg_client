import React, { useMemo, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { FontFamily } from '@app/styles/GlobalStyles';
import { CustomTextInput } from '@shared/ui/CustomTextInput/CustomTextInput';
import { useToast } from '@shared/ui/Toast';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

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
    const { showError } = useToast();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    // Delivery hook (упрощённая версия: фикс. цена)
    const {
        deliveryType,
        deliveryCost,
        calculating,
        warehouseName,
        totalWithDelivery,
        calculateDeliveryFee,
        fetchActiveTariff,
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
    const [skipPaymentForTesting, setSkipPaymentForTesting] = useState(__DEV__);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);


    useEffect(() => {
        // После упрощения логики склад доставки всегда один (Warehouse.isMain).
        // Здесь мы только подгружаем дефолтный адрес клиента и единственный
        // склад доставки — без выбора по району.
        const loadAddressAndMainWarehouse = async () => {
            try {
                setAddressLoading(true);

                const [addressResponse, warehouseResponse] = await Promise.all([
                    DeliveryAddressApi.getDefaultAddress(),
                    WarehouseService.getMainDeliveryWarehouse().catch(() => null)
                ]);

                let defaultAddress = null;
                if (addressResponse && addressResponse.data !== null && addressResponse.data !== undefined) {
                    defaultAddress = addressResponse.data;
                } else if (addressResponse && !addressResponse.data) {
                    defaultAddress = addressResponse;
                }
                setSelectedAddress(defaultAddress || null);

                const mainWarehouse = warehouseResponse?.data?.warehouses?.[0]
                    || warehouseResponse?.data?.[0]
                    || null;

                if (mainWarehouse) {
                    setWarehouseId(mainWarehouse.id);
                    setSelectedWarehouse(mainWarehouse);
                } else {
                    setWarehouseId(null);
                    setSelectedWarehouse(null);
                    console.warn('⚠️ Основной склад доставки (isMain=true) не найден');
                }
            } catch (error) {
                console.error('❌ Error loading address / main warehouse:', error);
                setSelectedAddress(null);
                setWarehouseId(null);
                setSelectedWarehouse(null);
            } finally {
                setAddressLoading(false);
            }
        };

        loadAddressAndMainWarehouse();
    }, []);

    // Тариф и стоимость доставки — с сервера (фиксированная цена по deliveryType).
    useEffect(() => {
        fetchActiveTariff().catch((error) => {
            console.error('❌ Ошибка загрузки тарифа доставки:', error);
        });
    }, [fetchActiveTariff]);

    useEffect(() => {
        const syncDeliveryFee = async () => {
            try {
                await calculateDeliveryFee(deliveryType);
            } catch (error) {
                console.error('❌ Ошибка расчёта доставки:', error);
            }
        };

        syncDeliveryFee();
    }, [deliveryType, calculateDeliveryFee]);

    const handleFieldChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAddressSelected = (address) => {
        setShowAddressPicker(false);
        setSelectedAddress(address);
    };

    const handleDeliveryTypeChange = (type) => {
        setDeliveryTypeAction(type);

        if (type === 'PICKUP') {
            clearDeliveryCalculation();
        }
    };

    const handleSubmit = async () => {
        if (!selectedAddress && deliveryType === 'DELIVERY') {
            showError('Выберите адрес доставки', { duration: 5000, position: 'top' });
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
                usePreauthorization: true, // Включаем предавторизацию по умолчанию
                skipPayment: __DEV__ && skipPaymentForTesting
            });

            const order = result?.data?.order ?? result?.order;
            const skipPaymentApplied = order?.skipPaymentApplied === true;
            const requiresPayment = order?.status === 'PENDING_PAYMENT' && !skipPaymentApplied;

            if (__DEV__ && skipPaymentForTesting && order?.status === 'PENDING_PAYMENT' && !skipPaymentApplied) {
                showError(
                    'Тестовая оплата не сработала. Сервер всё ещё требует оплату. Проверьте SKIP_PAYMENT_FOR_TESTING=true в .env и перезапустите сервер (pm2 restart iceberg-web).',
                    { duration: 6000, position: 'top' }
                );
            }

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

            // Тестовый режим или не-онлайн оплата — сразу к успешному заказу
            if (!requiresPayment) {
                console.log('✅ Заказ создан без оплаты', {
                    orderId: order?.id,
                    orderNumber: order?.orderNumber,
                    status: order?.status,
                    skipPaymentApplied
                });

                dispatch(clearCartCache());
                dispatch(clearCart());

                navigation.navigate('OrderSuccess', {
                    orderId: order?.id,
                    orderNumber: order?.orderNumber,
                    totalAmount: order?.totalAmount,
                    deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                    itemsCount: stats.totalItems || 0,
                    boxesCount: stats.totalBoxes || 0
                });
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

            showError(errorMessage, { duration: 5000, position: 'top' });
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
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <StatusBar
                barStyle={colors.statusBarStyle}
                backgroundColor={colors.background}
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
                            
                            {/* Стоимость доставки с сервера */}
                            {deliveryType === 'DELIVERY' && (
                                <View style={styles.orderRow}>
                                    <Text style={styles.orderLabel}>Доставка:</Text>
                                    {calculating ? (
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    ) : (
                                        <Text style={styles.orderValue}>
                                            {formatPrice(deliveryCost)}
                                        </Text>
                                    )}
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
                                        return formatPrice(baseAmount + deliveryAmount);
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
                                    <ActivityIndicator size="small" color={colors.primary} />
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


                        {/* Информация о доставке — только для доставки */}
                        {deliveryType === 'DELIVERY' && (
                            <View style={styles.deliveryAddressSection}>
                                <View style={styles.deliveryInfoSection}>
                                    <DeliveryInfo
                                        deliveryType={deliveryType}
                                        deliveryCost={deliveryCost}
                                        calculating={calculating}
                                        warehouseName={warehouseName}
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
                                <Icon name="info-outline" size={20} color={colors.primary} />
                                <Text style={styles.infoButtonText}>Как это работает?</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Онлайн оплата */}
                        <View style={styles.onlinePaymentInfo}>
                            <View style={styles.paymentMethodCard}>
                                <Icon name="payment" size={24} color={colors.primary} />
                                <View style={styles.paymentMethodContent}>
                                    <Text style={styles.paymentMethodTitle}>Онлайн оплата</Text>
                                    <Text style={styles.paymentMethodDescription}>
                                        Безопасная оплата через Т-Бизнес
                                    </Text>
                                </View>
                            </View>

                            {/* Информация о предавторизации */}
                            <View style={styles.preauthorizationInfo}>
                                <Icon name="security" size={16} color={colors.success} />
                                <Text style={styles.preauthorizationText}>
                                    Средства будут заблокированы на карте, но списаны только после подтверждения наличия товаров
                                </Text>
                            </View>

                            {__DEV__ && (
                                <View style={styles.testModeCard}>
                                    <View style={styles.testModeContent}>
                                        <Text style={styles.testModeTitle}>Тест: пропустить оплату</Text>
                                        <Text style={styles.testModeDescription}>
                                            Заказ сразу перейдёт в обработку. В .env сервера: SKIP_PAYMENT_FOR_TESTING=true и pm2 restart
                                        </Text>
                                    </View>
                                    <Switch
                                        value={skipPaymentForTesting}
                                        onValueChange={setSkipPaymentForTesting}
                                        trackColor={{ false: colors.border, true: colors.primary }}
                                    />
                                </View>
                            )}
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
                            <ActivityIndicator color={colors.textInverse} size="small" />
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

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },

    backButton: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        backgroundColor: colors.surfaceSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },

    backButtonText: {
        fontSize: normalize(20),
        color: colors.primary,
        fontWeight: '600',
    },

    title: {
        fontSize: normalize(18),
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        fontWeight: '600',
        color: colors.textPrimary,
    },

    placeholder: {
        width: normalize(40),
    },

    content: {
        flex: 1,
        backgroundColor: colors.background,
    },

    section: {
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(20),
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
    },

    sectionTitle: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: colors.textPrimary,
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
        color: colors.primary,
        marginLeft: normalize(4),
        fontWeight: '500',
    },

    preauthorizationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: normalize(12),
        borderRadius: normalize(8),
        marginBottom: normalize(16),
        borderWidth: 1,
        borderColor: colors.border,
    },

    preauthorizationText: {
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
        lineHeight: normalize(16),
        marginLeft: normalize(8),
        flex: 1,
    },

    testModeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: normalize(14),
        backgroundColor: isDark ? '#2a2418' : '#fff8e6',
        borderRadius: normalize(12),
        borderWidth: 1,
        borderColor: isDark ? '#5c4a1f' : '#ffd666',
        gap: normalize(12),
    },

    testModeContent: {
        flex: 1,
    },

    testModeTitle: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: normalize(4),
    },

    testModeDescription: {
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
        lineHeight: normalize(16),
    },

    orderInfo: {
        backgroundColor: colors.surface,
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
        color: colors.textSecondary,
    },

    orderValue: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '500',
        color: colors.textPrimary,
    },

    savingsValue: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '500',
        color: colors.success,
    },

    totalRow: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: normalize(12),
        marginTop: normalize(8),
        marginBottom: 0,
    },

    totalLabel: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: colors.textPrimary,
    },

    totalValue: {
        fontSize: normalize(18),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '700',
        color: colors.primary,
    },

    textArea: {
        minHeight: normalize(100),
        textAlignVertical: 'top',
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        borderRadius: normalize(12),
        padding: normalize(16),
        marginTop: normalize(8),
    },
    textAreaInput: {
        minHeight: normalize(60),
        fontSize: normalize(16),
        color: colors.textPrimary,
        lineHeight: normalize(22),
        textAlignVertical: 'top',
    },
    textAreaLabel: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: normalize(8),
    },

    onlinePaymentInfo: {
        gap: normalize(12),
    },

    paymentMethodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: normalize(16),
        backgroundColor: colors.surface,
        borderRadius: normalize(12),
        borderWidth: 1,
        borderColor: colors.primary,
        gap: normalize(12),
    },

    paymentMethodContent: {
        flex: 1,
    },

    paymentMethodTitle: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: normalize(4),
    },

    paymentMethodDescription: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
    },

    footer: {
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },

    submitButton: {
        backgroundColor: colors.primary,
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
        color: colors.textInverse,
    },

    // Стили для выбора адреса
    addressSection: {
        marginBottom: normalize(20),
    },

    addressLabel: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '500',
        color: colors.textPrimary,
        marginBottom: normalize(8),
    },

    selectAddressButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: normalize(16),
        backgroundColor: colors.surface,
        borderRadius: normalize(12),
        borderWidth: 1,
        borderColor: colors.border,
    },

    selectAddressText: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
    },

    selectAddressArrow: {
        fontSize: normalize(16),
        color: colors.primary,
        fontWeight: '600',
    },

    selectedAddressContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: isDark ? colors.surface : colors.primary + '12',
        borderRadius: normalize(12),
        padding: normalize(16),
        borderWidth: 1,
        borderColor: colors.primary,
    },

    selectedAddress: {
        flex: 1,
        marginRight: normalize(12),
    },

    selectedAddressTitle: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: normalize(4),
    },

    selectedAddressText: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
        lineHeight: normalize(20),
        marginBottom: normalize(4),
    },

    selectedAddressDistrict: {
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textTertiary,
    },

    changeAddressButton: {
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(6),
        backgroundColor: colors.primary,
        borderRadius: normalize(8),
    },

    changeAddressText: {
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '500',
        color: colors.textInverse,
    },

    // Стили для загрузки адреса
    addressLoadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: normalize(16),
        backgroundColor: colors.surface,
        borderRadius: normalize(12),
        borderWidth: 1,
        borderColor: colors.border,
    },

    addressLoadingText: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
        marginLeft: normalize(8),
    },

    defaultAddressBadge: {
        fontSize: normalize(11),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.primary,
        backgroundColor: isDark ? colors.surfaceSecondary : colors.primary + '12',
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