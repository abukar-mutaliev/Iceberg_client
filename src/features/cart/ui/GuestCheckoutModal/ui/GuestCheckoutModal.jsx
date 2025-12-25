import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    SafeAreaView,
    Dimensions,
} from 'react-native';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import { AuthDialog } from "@entities/auth/ui/AuthDialog";

const { width: screenWidth } = Dimensions.get('window');

const normalize = (size) => {
    const scale = screenWidth / 440;
    return Math.round(size * scale);
};

export const GuestCheckoutModal = ({ 
    visible, 
    onClose, 
    onLogin, 
    onRegister, 
    onGuestCheckout,
    cartStats = {},
    navigation 
}) => {
    const authDialogRef = useRef(null);
    const { totalItems = 0, totalAmount = 0 } = cartStats;

    const handleLogin = () => {
        onClose();
        if (onLogin) {
            onLogin();
        } else {
            navigation?.navigate('Auth', { screen: 'LoginScreen' });
        }
    };

    const handleRegister = () => {
        onClose();
        if (onRegister) {
            onRegister();
        } else {
            navigation?.navigate('Auth', { screen: 'RegisterScreen' });
        }
    };

    const handleGuestCheckout = () => {
        onClose();
        if (onGuestCheckout) {
            onGuestCheckout();
        }
    };

    const handleAuthDialogLogin = () => {
        handleLogin();
    };

    const handleAuthDialogRegister = () => {
        handleRegister();
    };

    const handleShowAuthDialog = () => {
        authDialogRef.current?.show();
    };

    return (
        <>
            <Modal
                visible={visible}
                animationType="slide"
                transparent={true}
                onRequestClose={onClose}
            >
                <View style={styles.modalOverlay}>
                    <SafeAreaView style={styles.safeArea}>
                        <View style={styles.modalContainer}>
                            <View style={styles.modalContent}>
                                {/* Заголовок */}
                                <View style={styles.header}>
                                    <Text style={styles.title}>
                                        Оформление заказа
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.closeButton}
                                        onPress={onClose}
                                    >
                                        <Text style={styles.closeButtonText}>✕</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Информация о заказе */}
                                <View style={styles.orderInfo}>
                                    <Text style={styles.orderInfoTitle}>
                                        Ваш заказ
                                    </Text>
                                    <View style={styles.orderStats}>
                                        <Text style={styles.orderStatsText}>
                                            Товаров: {totalItems}
                                        </Text>
                                        <Text style={styles.orderStatsText}>
                                            Сумма: {totalAmount.toFixed(0)} ₽
                                        </Text>
                                    </View>
                                </View>

                                {/* Описание */}
                                <View style={styles.description}>
                                    <Text style={styles.descriptionTitle}>
                                        Для быстрого оформления заказа
                                    </Text>
                                    <Text style={styles.descriptionText}>
                                        Войдите в свой аккаунт или зарегистрируйтесь. Ваша корзина будет сохранена!
                                    </Text>
                                </View>

                                {/* Кнопки действий */}
                                <View style={styles.actions}>
                                    <TouchableOpacity
                                        style={styles.primaryButton}
                                        onPress={handleLogin}
                                    >
                                        <Text style={styles.primaryButtonText}>
                                            Войти в аккаунт
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.secondaryButton}
                                        onPress={handleRegister}
                                    >
                                        <Text style={styles.secondaryButtonText}>
                                            Зарегистрироваться
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.guestButton}
                                        onPress={handleGuestCheckout}
                                    >
                                        <Text style={styles.guestButtonText}>
                                            Продолжить как гость
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Дополнительная информация */}
                                <View style={styles.benefits}>
                                    <Text style={styles.benefitsTitle}>
                                        Преимущества регистрации:
                                    </Text>
                                    <Text style={styles.benefitsItem}>
                                        • Быстрое оформление повторных заказов
                                    </Text>
                                    <Text style={styles.benefitsItem}>
                                        • История заказов и статус доставки
                                    </Text>
                                    <Text style={styles.benefitsItem}>
                                        • Персональные скидки и предложения
                                    </Text>
                                    <Text style={styles.benefitsItem}>
                                        • Уведомления о новых товарах
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </SafeAreaView>
                </View>
            </Modal>

            <AuthDialog
                ref={authDialogRef}
                onLogin={handleAuthDialogLogin}
                onRegister={handleAuthDialogRegister}
                onClose={() => {}}
            />
        </>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    safeArea: {
        maxHeight: '90%',
    },
    modalContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        flex: 1,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: normalize(20),
        borderTopRightRadius: normalize(20),
        paddingHorizontal: normalize(20),
        paddingTop: normalize(20),
        paddingBottom: normalize(30),
        minHeight: normalize(400),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(20),
    },
    title: {
        fontSize: normalize(22),
        fontWeight: '600',
        color: '#000000',
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
    },
    closeButton: {
        width: normalize(30),
        height: normalize(30),
        borderRadius: normalize(15),
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: normalize(16),
        color: '#666666',
        fontWeight: '600',
    },
    orderInfo: {
        backgroundColor: '#F8F9FF',
        borderRadius: normalize(12),
        padding: normalize(16),
        marginBottom: normalize(20),
    },
    orderInfoTitle: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: '#000000',
        marginBottom: normalize(8),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },
    orderStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    orderStatsText: {
        fontSize: normalize(14),
        color: '#666666',
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },
    description: {
        marginBottom: normalize(24),
    },
    descriptionTitle: {
        fontSize: normalize(18),
        fontWeight: '600',
        color: '#000000',
        marginBottom: normalize(8),
        textAlign: 'center',
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },
    descriptionText: {
        fontSize: normalize(14),
        color: '#666666',
        textAlign: 'center',
        lineHeight: normalize(20),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },
    actions: {
        marginBottom: normalize(24),
    },
    primaryButton: {
        backgroundColor: '#3339B0',
        borderRadius: normalize(12),
        paddingVertical: normalize(16),
        paddingHorizontal: normalize(24),
        marginBottom: normalize(12),
        alignItems: 'center',
    },
    primaryButtonText: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: '#FFFFFF',
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderRadius: normalize(12),
        paddingVertical: normalize(16),
        paddingHorizontal: normalize(24),
        marginBottom: normalize(12),
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#3339B0',
    },
    secondaryButtonText: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: '#3339B0',
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },
    guestButton: {
        backgroundColor: 'transparent',
        borderRadius: normalize(12),
        paddingVertical: normalize(12),
        paddingHorizontal: normalize(24),
        alignItems: 'center',
    },
    guestButtonText: {
        fontSize: normalize(14),
        color: '#999999',
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },
    benefits: {
        backgroundColor: '#F0F8FF',
        borderRadius: normalize(12),
        padding: normalize(16),
    },
    benefitsTitle: {
        fontSize: normalize(14),
        fontWeight: '600',
        color: '#000000',
        marginBottom: normalize(8),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },
    benefitsItem: {
        fontSize: normalize(12),
        color: '#666666',
        marginBottom: normalize(4),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },
}); 