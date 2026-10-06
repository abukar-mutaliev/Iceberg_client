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
            <View style={styles.headerShell}>
                <View style={styles.header}>
                    <View style={styles.backButton}>
                        <ArrowBackIcon color={headerForeground} />
                    </View>
                    <View style={styles.headerTitle} />
                    <View style={styles.headerSideSpacer} />
                </View>
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

    return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDark ? colors.background : '#F3F4F8',
    },
    headerShell: {
        backgroundColor: headerBackground,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        marginBottom: 20,
        shadowColor: isDark ? (colors.shadowColor || '#000') : '#1A2140',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.22 : 0.06,
        shadowRadius: 8,
        elevation: isDark ? 4 : 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        backgroundColor: headerBackground,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.16)' : '#FFFFFF',
        borderWidth: isDark ? 0 : 1,
        borderColor: 'rgba(20, 24, 48, 0.12)',
    },
    headerSideSpacer: {
        width: 40,
        height: 40,
    },
    headerTitle: {
        flex: 1,
        height: 22,
        marginHorizontal: 24,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.16)' : (colors.surfaceSecondary || colors.surface),
        borderRadius: 8,
    },
    listContentContainer: {
        paddingHorizontal: 10,
        paddingTop: 0,
    },
    cardSeparator: {
        height: 12,
    },
    skeletonCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: isDark ? colors.border : '#E4E6EE',
        shadowColor: isDark ? (colors.shadowColor || '#000') : '#1A2140',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.25 : 0.06,
        shadowRadius: 6,
        elevation: isDark ? 3 : 2,
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
