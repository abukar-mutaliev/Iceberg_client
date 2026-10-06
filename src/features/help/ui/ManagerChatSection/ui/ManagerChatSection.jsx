import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import CustomButton from '@shared/ui/Button/CustomButton';
import { useOpenManagerChat } from '@features/help/hooks/useOpenManagerChat';

export const ManagerChatSection = () => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { openManagerChat, reportOffAppPayment, loading } = useOpenManagerChat('HelpCenter');

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Официальная поддержка</Text>
            <Text style={styles.hint}>
                Оплата только в приложении. Сотрудник не имеет права просить перевод на карту.
            </Text>
            <CustomButton
                title={loading ? 'Открытие...' : 'Написать в поддержку'}
                onPress={openManagerChat}
                disabled={loading}
            />
            <View style={styles.reportWrap}>
                <CustomButton
                    title="Нас просят оплатить мимо приложения"
                    onPress={reportOffAppPayment}
                    outlined
                    disabled={loading}
                />
            </View>
        </View>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: {
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
    },
    sectionTitle: {
        fontSize: normalizeFont(20),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(8),
    },
    hint: {
        fontSize: normalizeFont(13),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(12),
        lineHeight: normalize(18),
    },
    reportWrap: {
        marginTop: normalize(10),
    },
});
