import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import CloseIcon from "@shared/ui/Icon/Profile/CloseIcon";
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const EditStopHeader = () => {
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors, isDark, insets.top), [colors, isDark, insets.top]);

    return (
        <View style={styles.header}>
            <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>Редактирование остановки</Text>
                <Text style={styles.headerSubtitle}>Внесите изменения в информацию о стоянке</Text>
            </View>
            <TouchableOpacity
                style={styles.closeButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.6}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <View style={styles.closeIconContainer}>
                    <CloseIcon size={normalize(20)} color={isDark ? colors.textSecondary : '#666'} />
                </View>
            </TouchableOpacity>
        </View>
    );
};

const createStyles = (colors, isDark, topInset = 0) => StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(20),
        paddingTop: topInset + normalize(0),
        paddingBottom: normalize(16),
        backgroundColor: isDark ? colors.surface : '#fff',
        borderBottomWidth: 0.5,
        borderBottomColor: isDark ? colors.divider : '#E5E5EA',
    },
    headerContent: {
        flex: 1,
        paddingRight: normalize(16),
    },
    headerTitle: {
        fontSize: normalizeFont(24),
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(2),
    },
    headerSubtitle: {
        fontSize: normalizeFont(14),
        fontWeight: '400',
        color: isDark ? colors.textSecondary : '#666',
        fontFamily: FontFamily.sFProText,
        opacity: 0.8,
    },
    closeButton: {
        padding: normalize(4),
    },
    closeIconContainer: {
        width: normalize(32),
        height: normalize(32),
        borderRadius: normalize(16),
        backgroundColor: isDark ? colors.surfaceElevated : '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
