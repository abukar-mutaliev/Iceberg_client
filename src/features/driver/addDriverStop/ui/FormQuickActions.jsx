import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const FormHint = ({ icon, title, description, onPress, style }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const content = (
        <View style={[styles.hintContainer, style]}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <View style={styles.hintContent}>
                {title && <Text style={styles.hintTitle}>{title}</Text>}
                {description && <Text style={styles.hintDescription}>{description}</Text>}
            </View>
            {onPress && (
                <View style={styles.hintArrow}>
                    <Text style={styles.arrowText}>›</Text>
                </View>
            )}
        </View>
    );

    if (onPress) {
        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={onPress}
                style={styles.hintTouchable}
            >
                {content}
            </TouchableOpacity>
        );
    }

    return content;
};

export const QuickAction = ({ icon, label, onPress, variant = 'default', style }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const variantStyles = {
        default: styles.quickActionDefault,
        primary: styles.quickActionPrimary,
        success: styles.quickActionSuccess,
        warning: styles.quickActionWarning,
    };

    const textVariantStyles = {
        default: styles.quickActionTextDefault,
        primary: styles.quickActionTextPrimary,
        success: styles.quickActionTextSuccess,
        warning: styles.quickActionTextWarning,
    };

    return (
        <TouchableOpacity
            style={[styles.quickAction, variantStyles[variant], style]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {icon && <View style={styles.quickActionIcon}>{icon}</View>}
            <Text style={[styles.quickActionText, textVariantStyles[variant]]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
};

export const QuickActionsGroup = ({ children, title, style }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    return (
        <View style={[styles.quickActionsGroup, style]}>
            {title && <Text style={styles.groupTitle}>{title}</Text>}
            <View style={styles.actionsRow}>
                {children}
            </View>
        </View>
    );
};

export const InfoBanner = ({
    type = 'info',
    title,
    message,
    onClose,
    action,
    style
}) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const typeStyles = {
        info: styles.bannerInfo,
        success: styles.bannerSuccess,
        warning: styles.bannerWarning,
        error: styles.bannerError,
    };

    const iconStyles = {
        info: '💡',
        success: '✓',
        warning: '⚠️',
        error: '✕',
    };

    return (
        <View style={[styles.banner, typeStyles[type], style]}>
            <View style={styles.bannerContent}>
                <Text style={styles.bannerIcon}>{iconStyles[type]}</Text>
                <View style={styles.bannerText}>
                    {title && <Text style={styles.bannerTitle}>{title}</Text>}
                    {message && <Text style={styles.bannerMessage}>{message}</Text>}
                </View>
            </View>

            {(action || onClose) && (
                <View style={styles.bannerActions}>
                    {action && (
                        <TouchableOpacity
                            onPress={action.onPress}
                            style={styles.bannerAction}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.bannerActionText}>{action.label}</Text>
                        </TouchableOpacity>
                    )}
                    {onClose && (
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.bannerClose}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.bannerCloseText}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    hintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? colors.surfaceElevated : '#F8F9FA',
        borderRadius: 12,
        padding: normalize(14),
        marginBottom: normalize(12),
        borderLeftWidth: 3,
        borderLeftColor: isDark ? colors.primary : '#3B43A2',
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    hintTouchable: {
        marginBottom: normalize(12),
    },
    iconContainer: {
        marginRight: normalize(12),
    },
    hintContent: {
        flex: 1,
    },
    hintTitle: {
        fontSize: normalizeFont(15),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(2),
    },
    hintDescription: {
        fontSize: normalizeFont(13),
        color: isDark ? colors.textSecondary : '#666',
        fontFamily: FontFamily.sFProText,
        lineHeight: normalize(18),
    },
    hintArrow: {
        marginLeft: normalize(8),
    },
    arrowText: {
        fontSize: normalizeFont(24),
        color: isDark ? colors.textTertiary : '#999',
        fontWeight: '300',
    },

    quickActionsGroup: {
        marginBottom: normalize(16),
    },
    groupTitle: {
        fontSize: normalizeFont(13),
        fontWeight: '600',
        color: isDark ? colors.textSecondary : '#666',
        fontFamily: FontFamily.sFProText,
        textTransform: 'uppercase',
        marginBottom: normalize(10),
        letterSpacing: 0.5,
    },
    actionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: normalize(8),
    },
    quickAction: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: normalize(10),
        paddingHorizontal: normalize(16),
        borderRadius: 8,
        borderWidth: 1,
    },
    quickActionDefault: {
        backgroundColor: isDark ? colors.surfaceElevated : '#fff',
        borderColor: isDark ? colors.border : '#E5E5EA',
    },
    quickActionPrimary: {
        backgroundColor: isDark ? colors.primary : '#3B43A2',
        borderColor: isDark ? colors.primary : '#3B43A2',
    },
    quickActionSuccess: {
        backgroundColor: isDark ? '#2E8F4A' : '#34C759',
        borderColor: isDark ? '#2E8F4A' : '#34C759',
    },
    quickActionWarning: {
        backgroundColor: isDark ? '#C26F00' : '#FF9500',
        borderColor: isDark ? '#C26F00' : '#FF9500',
    },
    quickActionIcon: {
        marginRight: normalize(8),
    },
    quickActionText: {
        fontSize: normalizeFont(14),
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
    },
    quickActionTextDefault: {
        color: colors.textPrimary,
    },
    quickActionTextPrimary: {
        color: '#fff',
    },
    quickActionTextSuccess: {
        color: '#fff',
    },
    quickActionTextWarning: {
        color: '#fff',
    },

    banner: {
        borderRadius: 12,
        padding: normalize(14),
        marginBottom: normalize(12),
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    bannerInfo: {
        backgroundColor: isDark ? 'rgba(33, 150, 243, 0.15)' : '#E3F2FD',
        borderLeftWidth: 3,
        borderLeftColor: isDark ? '#4EA8E6' : '#2196F3',
    },
    bannerSuccess: {
        backgroundColor: isDark ? 'rgba(76, 175, 80, 0.15)' : '#E8F5E9',
        borderLeftWidth: 3,
        borderLeftColor: isDark ? '#5FC984' : '#4CAF50',
    },
    bannerWarning: {
        backgroundColor: isDark ? 'rgba(255, 152, 0, 0.15)' : '#FFF3E0',
        borderLeftWidth: 3,
        borderLeftColor: isDark ? '#FFB74D' : '#FF9800',
    },
    bannerError: {
        backgroundColor: isDark ? 'rgba(244, 67, 54, 0.15)' : '#FFEBEE',
        borderLeftWidth: 3,
        borderLeftColor: isDark ? '#EF5350' : '#F44336',
    },
    bannerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    bannerIcon: {
        fontSize: normalizeFont(18),
        marginRight: normalize(10),
    },
    bannerText: {
        flex: 1,
    },
    bannerTitle: {
        fontSize: normalizeFont(15),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(2),
    },
    bannerMessage: {
        fontSize: normalizeFont(13),
        color: isDark ? colors.textSecondary : '#666',
        fontFamily: FontFamily.sFProText,
        lineHeight: normalize(18),
    },
    bannerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: normalize(8),
    },
    bannerAction: {
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(6),
        marginRight: normalize(8),
    },
    bannerActionText: {
        fontSize: normalizeFont(13),
        fontWeight: '600',
        color: isDark ? colors.primary : '#3B43A2',
        fontFamily: FontFamily.sFProText,
    },
    bannerClose: {
        padding: normalize(4),
    },
    bannerCloseText: {
        fontSize: normalizeFont(18),
        color: isDark ? colors.textTertiary : '#999',
    },
});
