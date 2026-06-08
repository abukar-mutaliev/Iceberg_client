import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { BackButton } from "@shared/ui/Button/BackButton";
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const ProductManagementHeader = ({ title, onBack }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    return (
        <View style={styles.header}>
            <BackButton onPress={onBack} />

            <Text style={styles.title}>{title}</Text>

            <View style={styles.placeholderRight} />
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        paddingHorizontal: 16,
        backgroundColor: isDark ? colors.surface : Color.colorWhite,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    placeholderRight: {
        width: 32,
    }
});
