import React, { useState } from 'react';
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

const normalize = (size) => {
    const scale = 375 / 375;
    return Math.round(size * scale);
};

export const GuestCheckoutScreen = ({ navigation, route }) => {
    const { items = [], stats = {}, clientType } = route.params || {};
    
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        deliveryAddress: '',
        comment: '',
        paymentMethod: 'CASH'
    });

    const handleFieldChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validateForm = () => {
        if (!formData.customerName.trim()) {
            Alert.alert('Ошибка', 'Укажите ваше имя');
            return false;
        }
        if (!formData.customerPhone.trim()) {
            Alert.alert('Ошибка', 'Укажите номер телефона');
            return false;
        }
        if (!formData.deliveryAddress.trim()) {
            Alert.alert('Ошибка', 'Укажите адрес доставки');
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            Alert.alert(
                'Заказ принят!',
                'Ваш заказ принят в обработку. Мы свяжемся с вами в ближайшее время для подтверждения.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            navigation.navigate('MainTab', { 
                                screen: 'Main',
                                params: { clearGuestCart: true }
                            });
                        }
                    }
                ]
            );
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось создать заказ. Попробуйте позже.');
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
                    <View style={styles.guestNotice}>
                        <Text style={styles.guestNoticeTitle}>Заказ без регистрации</Text>
                        <Text style={styles.guestNoticeText}>
                            Вы оформляете заказ как гость. Для быстрого повторного заказа рекомендуем зарегистрироваться.
                        </Text>
                        <TouchableOpacity
                            style={styles.registerButton}
                            onPress={() => navigation.navigate('Auth', { screen: 'RegisterScreen' })}
                        >
                            <Text style={styles.registerButtonText}>Зарегистрироваться</Text>
                        </TouchableOpacity>
                    </View>

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
                            <View style={[styles.orderRow, styles.totalRow]}>
                                <Text style={styles.totalLabel}>Итого:</Text>
                                <Text style={styles.totalValue}>
                                    {formatPrice(stats.finalPrice || stats.totalAmount || 0)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Контактные данные</Text>
                        
                        <CustomTextInput
                            label="Ваше имя *"
                            value={formData.customerName}
                            onChangeText={(value) => handleFieldChange('customerName', value)}
                            placeholder="Введите ваше имя"
                        />

                        <CustomTextInput
                            label="Номер телефона *"
                            value={formData.customerPhone}
                            onChangeText={(value) => handleFieldChange('customerPhone', value)}
                            placeholder="+7 (999) 123-45-67"
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Данные для доставки</Text>
                        
                        <CustomTextInput
                            label="Адрес доставки *"
                            value={formData.deliveryAddress}
                            onChangeText={(value) => handleFieldChange('deliveryAddress', value)}
                            placeholder="Укажите полный адрес доставки"
                            multiline
                            numberOfLines={3}
                            style={styles.textArea}
                        />

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
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                Оформить заказ
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
    guestNotice: {
        margin: normalize(20),
        padding: normalize(16),
        backgroundColor: '#FFF9E6',
        borderRadius: normalize(12),
        borderLeftWidth: 4,
        borderLeftColor: '#FFB800',
    },
    guestNoticeTitle: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: '#000000',
        marginBottom: normalize(8),
    },
    guestNoticeText: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: 'rgba(60, 60, 67, 0.80)',
        lineHeight: normalize(20),
        marginBottom: normalize(12),
    },
    registerButton: {
        backgroundColor: '#FFB800',
        borderRadius: normalize(8),
        paddingVertical: normalize(8),
        paddingHorizontal: normalize(12),
        alignSelf: 'flex-start',
    },
    registerButtonText: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: '#FFFFFF',
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
}); 