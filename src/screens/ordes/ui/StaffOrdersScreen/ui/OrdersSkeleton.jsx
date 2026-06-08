import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import ArrowBackIcon from '@shared/ui/Icon/Common/ArrowBackIcon';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ORDER_DETAILS_CLIENT_DARK_BACKGROUND } from '@shared/ui/OrderDetailsStyles';
import { ThemedStatusBar } from '@shared/ui/ThemedStatusBar/ThemedStatusBar';

const ON_PRIMARY_COLOR = '#FFFFFF';

export const OrdersSkeleton = ({ onGoBack }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const headerForeground = isDark ? ON_PRIMARY_COLOR : colors.textPrimary;

    return (
        <View style={styles.container}>
            <ThemedStatusBar />
            <View style={styles.header}>
                <View style={styles.backButton}>
                    <ArrowBackIcon color={headerForeground} />
                </View>
                <View style={styles.headerTitle} />
            </View>

            <FlatList
                data={[1,2,3,4,5,6,7,8]}
                keyExtractor={(i) => i.toString()}
                renderItem={() => (
                    <View style={styles.skeletonCard}>
                        <View style={styles.skeletonHeader} />
                        <View style={styles.skeletonLineWide} />
                        <View style={styles.skeletonLine} />
                        <View style={styles.skeletonFooter} />
                    </View>
                )}
                contentContainerStyle={styles.listContentContainer}
                ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
            />
        </View>
    );
};

const createStyles = (colors, isDark) => {
    const headerBackground = isDark ? ORDER_DETAILS_CLIENT_DARK_BACKGROUND : colors.cardBackground;
    const headerBorderColor = isDark ? 'rgba(255, 255, 255, 0.15)' : colors.border;

    return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: headerBackground,
        borderBottomWidth: 1,
        borderBottomColor: headerBorderColor,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        height: 24,
        width: 200,
        backgroundColor: colors.surfaceSecondary || colors.surface,
        borderRadius: 6,
        marginHorizontal: 16,
    },
    listContentContainer: {
        paddingHorizontal: 10,
        paddingTop: 24,
    },
    cardSeparator: {
        height: 20,
    },
    skeletonCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 10,
        marginVertical: 6,
        borderWidth: 1,
        borderColor: colors.border,
    },
    skeletonHeader: {
        height: 16,
        width: '40%',
        backgroundColor: colors.surfaceSecondary || colors.surface,
        borderRadius: 6,
        marginBottom: 12,
    },
    skeletonLineWide: {
        height: 14,
        width: '85%',
        backgroundColor: colors.surfaceSecondary || colors.surface,
        borderRadius: 6,
        marginBottom: 8,
    },
    skeletonLine: {
        height: 14,
        width: '60%',
        backgroundColor: colors.surfaceSecondary || colors.surface,
        borderRadius: 6,
        marginBottom: 12,
    },
    skeletonFooter: {
        height: 24,
        width: '30%',
        backgroundColor: colors.surfaceSecondary || colors.surface,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
});
};
