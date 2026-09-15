import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import Text from '@shared/ui/Text/Text';
import CloseIcon from '@shared/ui/Icon/Profile/CloseIcon';
import { SafeFonts } from '@shared/lib/fontUtils';
import { getRegistrationBenefits } from './benefits';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SHOW_DURATION = 320;
const HIDE_DURATION = 240;

/**
 * Рекомендация пройти регистрацию с перечислением того, что она открывает.
 * Компонент презентационный: логика первого показа — в useRegistrationPromptTrigger.
 */
export const RegistrationPromptDialog = ({ visible, onRegister, onLogin, onDismiss }) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const benefits = useMemo(() => getRegistrationBenefits(), []);

    const animation = useRef(new Animated.Value(0)).current;
    const [isMounted, setIsMounted] = useState(visible);

    useEffect(() => {
        if (visible) {
            setIsMounted(true);
            Animated.timing(animation, {
                toValue: 1,
                duration: SHOW_DURATION,
                useNativeDriver: true,
            }).start();
            return;
        }

        Animated.timing(animation, {
            toValue: 0,
            duration: HIDE_DURATION,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) setIsMounted(false);
        });
    }, [visible, animation]);

    const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [SCREEN_HEIGHT, 0],
    });

    if (!isMounted) return null;

    return (
        <Modal
            transparent
            visible
            animationType="none"
            statusBarTranslucent
            onRequestClose={onDismiss}
        >
            <View style={styles.container}>
                <Animated.View style={[styles.overlay, { opacity: animation }]}>
                    <TouchableWithoutFeedback onPress={onDismiss} accessibilityLabel="Закрыть">
                        <View style={styles.overlayTouchable} />
                    </TouchableWithoutFeedback>
                </Animated.View>

                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            paddingBottom: 20 + insets.bottom,
                            transform: [{ translateY }],
                        },
                    ]}
                >
                    <View style={styles.handle} />

                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onDismiss}
                        accessibilityRole="button"
                        accessibilityLabel="Закрыть"
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <CloseIcon width={14} height={14} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <Text style={styles.title}>Добро пожаловать в Айсберг!</Text>
                    <Text style={styles.subtitle}>
                        Войдите по номеру телефона. Если аккаунта ещё нет, он создастся сам — это займёт меньше минуты.
                    </Text>

                    <ScrollView
                        style={styles.benefits}
                        contentContainerStyle={styles.benefitsContent}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        {benefits.map(({ id, Icon, title, description, isComingSoon }) => (
                            <View key={id} style={styles.benefitRow}>
                                <View style={styles.benefitIcon}>
                                    <Icon color={colors.primary} size={22} />
                                </View>

                                <View style={styles.benefitText}>
                                    <View style={styles.benefitTitleRow}>
                                        <Text style={styles.benefitTitle}>{title}</Text>
                                        {isComingSoon && (
                                            <View style={styles.badge}>
                                                <Text style={styles.badgeText}>скоро</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.benefitDescription}>{description}</Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={onLogin}
                        accessibilityRole="button"
                    >
                        <Text style={styles.primaryButtonText}>Войти по номеру</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={onDismiss}
                        accessibilityRole="button"
                    >
                        <Text style={styles.skipButtonText}>Позже</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.modalOverlay,
    },
    overlayTouchable: {
        flex: 1,
    },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 10,
        maxHeight: SCREEN_HEIGHT * 0.9,
    },
    handle: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.border,
        marginBottom: 14,
    },
    closeButton: {
        position: 'absolute',
        top: 14,
        right: 16,
        padding: 6,
    },
    title: {
        fontFamily: SafeFonts.BezierSans,
        fontSize: 20,
        lineHeight: 26,
        fontWeight: '600',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: SafeFonts.SFProText,
        fontSize: 14,
        lineHeight: 20,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    benefits: {
        flexGrow: 0,
        // Без flexShrink список не сжимается и вылезает за пределы шторки
        // на маленьких экранах вместо того, чтобы стать прокручиваемым.
        flexShrink: 1,
        marginBottom: 20,
    },
    benefitsContent: {
        gap: 14,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    benefitIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    benefitText: {
        flex: 1,
    },
    benefitTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    benefitTitle: {
        fontFamily: SafeFonts.SFProText,
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
        textAlign: 'left',
    },
    badge: {
        marginLeft: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    badgeText: {
        fontFamily: SafeFonts.SFProText,
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        color: colors.primary,
    },
    benefitDescription: {
        fontFamily: SafeFonts.SFProText,
        fontSize: 13,
        lineHeight: 18,
        color: colors.textSecondary,
        textAlign: 'left',
    },
    primaryButton: {
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        fontFamily: SafeFonts.SFProText,
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    secondaryButton: {
        height: 52,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    secondaryButtonText: {
        fontFamily: SafeFonts.SFProText,
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
    },
    skipButton: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    skipButtonText: {
        fontFamily: SafeFonts.SFProText,
        fontSize: 14,
        color: colors.textTertiary,
    },
});
