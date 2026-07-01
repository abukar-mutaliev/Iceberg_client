import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const SIZE_PRESETS = {
    list: 50,
    compact: 40,
    small: 32,
    card: 44,
};

/**
 * Аватар ИИ-помощника: фирменный круг с иконкой «искры» (понятнее, чем эмодзи робота).
 */
export const AssistantAvatar = ({ size = 'list', style }) => {
    const { colors, isDark } = useTheme();
    const dimension = typeof size === 'number' ? size : (SIZE_PRESETS[size] ?? SIZE_PRESETS.list);
    const styles = useMemo(
        () => createStyles(colors, isDark, dimension),
        [colors, isDark, dimension]
    );

    return (
        <View style={[styles.container, style]} accessibilityLabel="Помощник Iceberg">
            <View style={styles.glowRing} />
            <Icon name="auto-awesome" size={Math.round(dimension * 0.46)} color="#FFFFFF" />
        </View>
    );
};

const createStyles = (colors, isDark, dimension) => StyleSheet.create({
    container: {
        width: dimension,
        height: dimension,
        borderRadius: dimension / 2,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.35 : 0.22,
        shadowRadius: 4,
        elevation: 3,
    },
    glowRing: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: dimension / 2,
        borderWidth: Math.max(1, Math.round(dimension * 0.04)),
        borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.45)',
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)',
    },
});

export default AssistantAvatar;
