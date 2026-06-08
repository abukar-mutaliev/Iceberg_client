import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const UserStats = ({ total, page, pages }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
                Всего: {total} | Страница: {page} из {pages}
            </Text>
        </View>
    );
};

const createStyles = (colors) => StyleSheet.create({
    statsContainer: {
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(8),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    statsText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: colors.textSecondary,
    },
});

export default UserStats;