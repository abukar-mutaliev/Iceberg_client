import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';

export const UserStats = ({ total, page, pages }) => {
    return (
        <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
                Всего: {total} | Страница: {page} из {pages}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    statsContainer: {
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(8),
        borderBottomWidth: 1,
        borderBottomColor: Color.border,
    },
    statsText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
    },
});

export default UserStats;