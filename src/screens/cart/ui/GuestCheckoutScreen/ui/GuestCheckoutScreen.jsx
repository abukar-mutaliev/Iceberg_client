import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontFamily } from '@app/styles/GlobalStyles';
import { CustomTextInput } from '@shared/ui/CustomTextInput/CustomTextInput';
import { Toast } from '@shared/ui/Toast';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const normalize = (size) => {
    const scale = 375 / 375;
    return Math.round(size * scale);
};

export const GuestCheckoutScreen = ({ navigation, route }) => {
    const { items = [], stats = {}, clientType } = route.params || {};
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    
    const [loading, setLoading] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        deliveryAddress: '',
        comment: '',
        paymentMethod: 'ONLINE' // Только онлайн оплата
    });

    const handleFieldChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Обработчик скрытия Toast и навигации
    const handleToastHide = () => {
        setShowSuccessToast(false);
        navigation.navigate('MainTab', {
            screen: 'Main',
            params: { clearGuestCart: true }
        });
    };

    const validateForm = () => {
        if (!formData.customerName.trim()) {
            setValidationError('Укажите ваше имя');
            return false;
        }
        if (!formData.customerPhone.trim()) {
            setValidationError('Укажите номер телефона');
            return false;
        }
        if (!formData.deliveryAddress.trim()) {
            setValidationError('Укажите адрес доставки');
            return false;
        }
        setValidationError('');
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            setShowSuccessToast(true);
        } catch (error) {
            setValidationError('Не удалось создать заказ. Попробуйте позже.');
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
                            style={styles.inputField}
                            inputStyle={styles.inputText}
                            labelStyle={styles.inputLabel}
                        />

                        <CustomTextInput
                            label="Номер телефона *"
                            value={formData.customerPhone}
                            onChangeText={(value) => handleFieldChange('customerPhone', value)}
                            placeholder="+7 (999) 123-45-67"
                            keyboardType="phone-pad"
                            style={styles.inputField}
                            inputStyle={styles.inputText}
                            labelStyle={styles.inputLabel}
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
                            inputStyle={styles.textAreaInput}
                            labelStyle={styles.textAreaLabel}
                        />

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
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.textInverse} size="small" />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                Оформить заказ
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Toast уведомление об успешном заказе */}
            {showSuccessToast && (
                <Toast
                    message="Заказ принят в обработку!"
                    type="success"
                    duration={4000}
                    onHide={handleToastHide}
                    position="top"
                />
            )}

            {/* Toast уведомление об ошибке валидации */}
            {validationError && (
                <Toast
                    message={validationError}
                    type="error"
                    duration={3000}
                    onHide={() => setValidationError('')}
                    position="top"
                />
            )}
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
    guestNotice: {
        margin: normalize(20),
        padding: normalize(16),
        backgroundColor: isDark ? colors.surface : colors.warning + '18',
        borderRadius: normalize(12),
        borderLeftWidth: 4,
        borderLeftColor: colors.warning,
    },
    guestNoticeTitle: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: normalize(8),
    },
    guestNoticeText: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
        lineHeight: normalize(20),
        marginBottom: normalize(12),
    },
    registerButton: {
        backgroundColor: colors.warning,
        borderRadius: normalize(8),
        paddingVertical: normalize(8),
        paddingHorizontal: normalize(12),
        alignSelf: 'flex-start',
    },
    registerButtonText: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: colors.textInverse,
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
        marginBottom: normalize(16),
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
    inputField: {
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        borderRadius: normalize(12),
        padding: normalize(16),
        marginTop: normalize(8),
    },
    inputText: {
        fontSize: normalize(16),
        color: colors.textPrimary,
        lineHeight: normalize(22),
    },
    inputLabel: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: normalize(8),
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
}); 