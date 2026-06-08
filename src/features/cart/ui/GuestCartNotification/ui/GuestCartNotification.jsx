import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { FontFamily } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');

const normalize = (size) => {
    const scale = screenWidth / 440;
    return Math.round(size * scale);
};

export const GuestCartNotification = ({ 
    onLoginPress,
    onRegisterPress,
    onDismiss,
    visible = true
}) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    if (!visible) return null;

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>👤</Text>
                </View>
                
                <View style={styles.textContainer}>
                    <Text style={styles.title}>
                        Войдите в аккаунт
                    </Text>
                    <Text style={styles.description}>
                        Для быстрого оформления заказов и сохранения истории покупок
                    </Text>
                </View>

                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={onLoginPress}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.loginButtonText}>
                            Войти
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.registerButton}
                        onPress={onRegisterPress}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.registerButtonText}>
                            Регистрация
                        </Text>
                    </TouchableOpacity>

                    {onDismiss && (
                        <TouchableOpacity
                            style={styles.dismissButton}
                            onPress={onDismiss}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.dismissButtonText}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        marginHorizontal: normalize(20),
        marginVertical: normalize(10),
        borderRadius: normalize(12),
        padding: normalize(16),
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: isDark ? 0.25 : 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        marginRight: normalize(12),
    },
    icon: {
        fontSize: normalize(24),
    },
    textContainer: {
        flex: 1,
        marginRight: normalize(12),
    },
    title: {
        fontSize: normalize(14),
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: normalize(4),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },
    description: {
        fontSize: normalize(12),
        color: colors.textSecondary,
        lineHeight: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
    },
    loginButton: {
        backgroundColor: colors.primary,
        borderRadius: normalize(8),
        paddingVertical: normalize(8),
        paddingHorizontal: normalize(16),
        marginRight: normalize(8),
    },
    loginButtonText: {
        fontSize: normalize(12),
        fontWeight: '600',
        color: colors.textInverse,
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },
    registerButton: {
        backgroundColor: 'transparent',
        borderRadius: normalize(8),
        paddingVertical: normalize(8),
        paddingHorizontal: normalize(16),
        borderWidth: 1,
        borderColor: colors.primary,
        marginRight: normalize(8),
    },
    registerButtonText: {
        fontSize: normalize(12),
        fontWeight: '600',
        color: colors.primary,
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },
    dismissButton: {
        width: normalize(24),
        height: normalize(24),
        borderRadius: normalize(12),
        backgroundColor: colors.surfaceSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dismissButtonText: {
        fontSize: normalize(12),
        color: colors.textSecondary,
        fontWeight: '600',
    },
}); 