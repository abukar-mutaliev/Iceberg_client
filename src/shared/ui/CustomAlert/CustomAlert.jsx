import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Animated,
    useWindowDimensions,
    Platform,
    ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, FontFamily, FontSize, Shadow, Border } from '@app/styles/GlobalStyles';

const ALERT_TYPES = {
    success: {
        icon: 'check-circle',
        color: Color.success,
        gradient: ['#d4edda', '#c3e6cb'],
    },
    error: {
        icon: 'error',
        color: Color.error,
        gradient: ['#f8d7da', '#f5c6cb'],
    },
    warning: {
        icon: 'warning',
        color: Color.warning,
        gradient: ['#fff3cd', '#ffeaa7'],
    },
    info: {
        icon: 'info',
        color: Color.purpleSoft,
        gradient: ['#e3f2fd', '#bbdefb'],
    },
    confirm: {
        icon: 'help-outline',
        color: Color.orange,
        gradient: ['#fff3e0', '#ffe0b2'],
    },
};

export const CustomAlert = ({
    visible = false,
    type = 'info',
    title = '',
    message = '',
    buttons = [],
    onClose = () => {},
    autoClose = false,
    autoCloseDuration = 3000,
    showCloseButton = true,
    customIcon = null,
}) => {
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    const alertConfig = ALERT_TYPES[type] || ALERT_TYPES.info;

    useEffect(() => {
        if (visible) {
            // Анимация появления
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            // Авто-закрытие
            if (autoClose) {
                const timer = setTimeout(() => {
                    handleClose();
                }, autoCloseDuration);
                return () => clearTimeout(timer);
            }
        } else {
            // Анимация исчезновения
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.8,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, autoClose, autoCloseDuration]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.8,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const handleButtonPress = (button) => {
        if (button.onPress) {
            button.onPress();
        }
        if (button.closeOnPress !== false) {
            handleClose();
        }
    };

    // Дефолтные кнопки если не переданы
    const defaultButtons = buttons.length > 0 ? buttons : [
        {
            text: 'OK',
            style: 'primary',
            onPress: handleClose,
        },
    ];

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={handleClose}
            statusBarTranslucent={false}
            presentationStyle="overFullScreen"
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={handleClose}
                />
                
                <Animated.View
                    style={[
                        styles.alertContainer,
                        {
                            width: SCREEN_WIDTH - 48,
                            maxWidth: 400,
                            opacity: fadeAnim,
                            transform: [
                                { scale: scaleAnim },
                                { translateY: slideAnim },
                            ],
                        },
                    ]}
                >
                    {/* Закрывающая кнопка */}
                    {showCloseButton && (
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Icon name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    )}

                    {/* Иконка */}
                    <View style={[styles.iconContainer, { backgroundColor: alertConfig.gradient[0] }]}>
                        <View style={[styles.iconCircle, { backgroundColor: alertConfig.color }]}>
                            <Icon
                                name={customIcon || alertConfig.icon}
                                size={48}
                                color="#fff"
                            />
                        </View>
                    </View>

                    {/* Заголовок */}
                    {title ? (
                        <Text style={styles.title}>{title}</Text>
                    ) : null}

                    {/* Сообщение */}
                    {message ? (
                        <ScrollView 
                            style={styles.messageScrollContainer}
                            contentContainerStyle={styles.messageScrollContent}
                            showsVerticalScrollIndicator={true}
                            bounces={false}
                        >
                            <Text style={styles.message}>{message}</Text>
                        </ScrollView>
                    ) : null}

                    {/* Кнопки */}
                    <View style={[
                        styles.buttonsContainer,
                        defaultButtons.length > 2 && styles.buttonsContainerVertical
                    ]}>
                        {defaultButtons.map((button, index) => {
                            const isCancel = button.style === 'cancel';
                            const isDestructive = button.style === 'destructive';
                            const isPrimary = button.style === 'primary' || (!isCancel && !isDestructive && defaultButtons.length === 1);

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.button,
                                        defaultButtons.length === 1 && styles.buttonFull,
                                        defaultButtons.length > 2 && styles.buttonFullWidth,
                                        isPrimary && styles.buttonPrimary,
                                        isCancel && styles.buttonCancel,
                                        isDestructive && styles.buttonDestructive,
                                    ]}
                                    onPress={() => handleButtonPress(button)}
                                    activeOpacity={0.8}
                                >
                                    {button.icon && (
                                        <Icon
                                            name={button.icon}
                                            size={20}
                                            color={
                                                isPrimary ? '#fff' :
                                                isDestructive ? Color.error :
                                                Color.purpleSoft
                                            }
                                            style={styles.buttonIcon}
                                        />
                                    )}
                                    <Text
                                        style={[
                                            styles.buttonText,
                                            isPrimary && styles.buttonTextPrimary,
                                            isCancel && styles.buttonTextCancel,
                                            isDestructive && styles.buttonTextDestructive,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {button.text}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    alertContainer: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        alignSelf: 'center',
        ...Shadow.heavy,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        alignSelf: 'center',
        marginBottom: 20,
        borderRadius: 60,
        padding: 16,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a1a1a',
        textAlign: 'center',
        marginBottom: 12,
        fontFamily: FontFamily.sFProDisplay,
    },
    messageScrollContainer: {
        maxHeight: 200,
        marginBottom: 24,
    },
    messageScrollContent: {
        flexGrow: 0,
    },
    message: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        fontFamily: FontFamily.sFProText,
    },
    buttonsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    buttonsContainerVertical: {
        flexDirection: 'column',
        gap: 10,
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        minHeight: 50,
    },
    buttonFull: {
        flex: 1,
    },
    buttonFullWidth: {
        width: '100%',
        flex: 0,
    },
    buttonPrimary: {
        backgroundColor: Color.purpleSoft,
        borderColor: Color.purpleSoft,
        ...Shadow.button,
    },
    buttonCancel: {
        backgroundColor: '#f8f9fa',
        borderColor: '#e9ecef',
    },
    buttonDestructive: {
        backgroundColor: '#fff',
        borderColor: Color.error,
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
    },
    buttonTextPrimary: {
        color: '#fff',
    },
    buttonTextCancel: {
        color: '#666',
    },
    buttonTextDestructive: {
        color: Color.error,
    },
});

