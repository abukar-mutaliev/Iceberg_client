import React, { useState, useImperativeHandle, forwardRef } from 'react';
import {
    View,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Animated,
    Dimensions
} from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import Text from '@shared/ui/Text/Text';
import CloseIcon from "@shared/ui/Icon/Profile/CloseIcon";

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const AuthDialog = forwardRef(({ onLogin, onRegister, onClose }, ref) => {
    const { colors } = useTheme();
    const [visible, setVisible] = useState(false);
    const [animatedValue] = useState(new Animated.Value(0));

    // Экспортируем методы через ref для внешнего вызова
    useImperativeHandle(ref, () => ({
        show: () => {
            setVisible(true);
            Animated.timing(animatedValue, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        },
        hide: () => {
            Animated.timing(animatedValue, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setVisible(false);
                if (onClose) onClose();
            });
        }
    }));

    const handleClose = () => {
        Animated.timing(animatedValue, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setVisible(false);
            if (onClose) onClose();
        });
    };

    const translateY = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [SCREEN_HEIGHT, 0],
    });

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
    });

    const handleLoginPress = () => {
        handleClose();
        if (onLogin) onLogin();
    };

    const handleRegisterPress = () => {
        handleClose();
        if (onRegister) onRegister();
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={handleClose}
        >
            <View style={styles.container}>
                <Animated.View
                    style={[
                        styles.overlay,
                        {
                            backgroundColor: 'black',
                            opacity: opacity,
                        },
                    ]}
                >
                    <TouchableWithoutFeedback onPress={handleClose}>
                        <View style={styles.overlayTouchable} />
                    </TouchableWithoutFeedback>
                </Animated.View>

                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            backgroundColor: colors.card,
                            transform: [{ translateY: translateY }],
                        },
                    ]}
                >
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>
                            Требуется авторизация
                        </Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                        >
                            <CloseIcon name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <Text style={[styles.description, { color: colors.text }]}>
                            Для доступа к этой функции необходимо войти в аккаунт или зарегистрироваться
                        </Text>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: colors.primary }]}
                            onPress={handleLoginPress}
                        >
                            <Text style={[styles.buttonText, { color: colors.white }]}>
                                Войти
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: 'transparent', borderColor: colors.primary, borderWidth: 1 }]}
                            onPress={handleRegisterPress}
                        >
                            <Text style={[styles.buttonText, { color: colors.primary }]}>
                                Зарегистрироваться
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.skipButton}
                            onPress={handleClose}
                        >
                            <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
                                Продолжить без авторизации
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    overlayTouchable: {
        flex: 1,
    },
    modalContent: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 20,
        paddingBottom: 32,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        alignItems: 'center',
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    button: {
        width: '100%',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    skipButton: {
        paddingVertical: 12,
        marginTop: 8,
    },
    skipButtonText: {
        fontSize: 14,
    },
});