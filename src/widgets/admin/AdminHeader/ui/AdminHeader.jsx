import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Shadow } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { BackButton } from '@shared/ui/Button/BackButton';

export const AdminHeader = ({ title, icon, onBackPress, showBackButton = true }) => {
    const { colors, isDark } = useTheme();
    const { width } = useWindowDimensions();
    const isSmallScreen = width <= 360;
    const styles = useMemo(() => createStyles(colors, isDark, isSmallScreen), [colors, isDark, isSmallScreen]);

    return (
        <View style={styles.header}>
            {showBackButton && (
                <View style={styles.backButtonContainer}>
                    <BackButton onPress={onBackPress} />
                </View>
            )}
            <View style={styles.headerIconContainer}>
                {icon}
            </View>
            <Text style={styles.headerText}>{title}</Text>
        </View>
    );
};

const createStyles = (colors, isDark, isSmallScreen) => StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: normalize(72),
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(14),
        borderBottomWidth: 1,
        borderBottomColor: isDark ? colors.divider : Color.border,
        backgroundColor: isDark ? colors.surface : Color.colorLightMode,
        ...(isDark ? {} : Shadow.light),
    },
    backButtonContainer: {
        position: 'absolute',
        left: normalize(6),
        zIndex: 1,
    },
    headerIconContainer: {
        marginRight: normalize(12),
    },
    headerText: {
        fontSize: isSmallScreen ? normalizeFont(18) : normalizeFont(FontSize.size_xl),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: isDark ? colors.primary : Color.blue2,
        textAlignVertical: 'center',
    },
});

export default AdminHeader;
