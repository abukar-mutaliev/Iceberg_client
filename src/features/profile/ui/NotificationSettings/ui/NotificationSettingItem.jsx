import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Switch, Platform } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Border } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const NotificationSettingItem = ({
    title,
    description,
    value,
    onValueChange,
    disabled = false
}) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{title}</Text>
                    {description && (
                        <Text style={styles.description}>{description}</Text>
                    )}
                </View>
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    disabled={disabled}
                    trackColor={{
                        false: isDark ? colors.surfaceElevated : '#767577',
                        true: colors.primary
                    }}
                    thumbColor={
                        Platform.OS === 'android'
                            ? (value ? colors.menuItemActiveText : (isDark ? colors.textSecondary : '#f4f3f4'))
                            : undefined
                    }
                    ios_backgroundColor={isDark ? colors.surfaceElevated : '#3e3e3e'}
                />
            </View>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        backgroundColor: colors.cardBackground,
        marginBottom: normalize(8),
        borderRadius: Border.br_3xs,
        borderWidth: isDark ? 1 : 0.1,
        borderColor: isDark ? colors.border : 'transparent',
        overflow: 'hidden'
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: normalize(16),
        paddingHorizontal: normalize(16),
        justifyContent: 'space-between'
    },
    textContainer: {
        flex: 1,
        marginRight: normalize(16)
    },
    title: {
        fontSize: normalizeFont(16),
        fontWeight: '500',
        color: colors.textPrimary,
        marginBottom: normalize(4)
    },
    description: {
        fontSize: normalizeFont(14),
        color: colors.textSecondary,
        lineHeight: normalize(18)
    }
});
