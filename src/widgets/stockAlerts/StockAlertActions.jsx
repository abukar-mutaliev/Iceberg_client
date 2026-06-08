import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily } from '@app/styles/GlobalStyles';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const ModernActionButton = ({ icon, title, subtitle, onPress, color, disabled, styles }) => (
    <TouchableOpacity
        style={[
            styles.actionCard,
            disabled && styles.actionCardDisabled
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
    >
        <View style={[styles.actionIconBg, { backgroundColor: color + '15' }]}>
            <Icon name={icon} size={normalize(24)} color={color} />
        </View>
        <Text style={styles.actionTitle}>{String(title)}</Text>
        <Text style={styles.actionSubtitle}>{String(subtitle)}</Text>
    </TouchableOpacity>
);

const ModernStockAlertActions = ({
    onHistoryPress,
    onRefreshPress,
    onCheckAllPress,
    refreshing = false,
    checking = false
}) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const actions = [
        {
            icon: 'refresh',
            title: refreshing ? 'Обновление...' : 'Обновить',
            subtitle: 'Свежие данные',
            onPress: onRefreshPress,
            color: '#007AFF',
            disabled: refreshing
        },
        {
            icon: 'history',
            title: 'История',
            subtitle: 'Уведомлений',
            onPress: onHistoryPress,
            color: '#5856D6',
            disabled: false
        },
        {
            icon: 'analytics',
            title: checking ? 'Анализ...' : 'Проверить',
            subtitle: 'Все остатки',
            onPress: onCheckAllPress,
            color: '#34C759',
            disabled: checking
        }
    ];

    return (
        <View style={styles.container}>
            <View style={styles.actionsGrid}>
                {actions.map((action, index) => (
                    <ModernActionButton key={index} {...action} styles={styles} />
                ))}
            </View>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        backgroundColor: colors.cardBackground,
        borderRadius: normalize(16),
        padding: normalize(12),
        marginBottom: normalize(12),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionCard: {
        flex: 1,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: normalize(12),
        padding: normalize(12),
        alignItems: 'center',
        marginHorizontal: normalize(4),
    },
    actionCardDisabled: {
        opacity: 0.5,
    },
    actionIconBg: {
        width: normalize(48),
        height: normalize(48),
        borderRadius: normalize(24),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: normalize(8),
    },
    actionTitle: {
        fontSize: normalizeFont(12),
        fontFamily: FontFamily.sFProTextBold,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: normalize(2),
    },
    actionSubtitle: {
        fontSize: normalizeFont(10),
        color: colors.textSecondary,
        textAlign: 'center',
    },
});

export default ModernStockAlertActions;