import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { buildAssistantChatNavigatorState } from '../../../lib/assistantNavigation';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ASSISTANT_CHAT_TITLE } from '../../../constants';

/**
 * Секция-вход в чат с ИИ-помощником (на экране Центра помощи).
 */
export const AssistantSection = () => {
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const openAssistantChat = useCallback(() => {
        const assistantParams = { fromScreen: 'HelpCenter' };
        const tabNavigation = navigation.getParent?.();
        if (tabNavigation) {
            tabNavigation.dispatch(
                CommonActions.navigate({
                    name: 'ChatList',
                    params: { state: buildAssistantChatNavigatorState(assistantParams) },
                })
            );
            return;
        }
        navigation.navigate('AssistantChat', assistantParams);
    }, [navigation]);

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>{ASSISTANT_CHAT_TITLE}</Text>
            <TouchableOpacity
                style={styles.card}
                onPress={openAssistantChat}
                activeOpacity={0.8}
            >
                <Icon name="smart-toy" size={normalize(28)} color={colors.primary} />
                <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>Спросить помощника</Text>
                    <Text style={styles.cardSubtitle}>
                        Ответы по остановкам, товарам, складам, доставке и заказам
                    </Text>
                </View>
                <Icon name="chevron-right" size={normalize(24)} color={colors.textTertiary} />
            </TouchableOpacity>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        paddingHorizontal: normalize(20),
        paddingTop: normalize(16),
        paddingBottom: normalize(8),
        backgroundColor: colors.background,
    },
    sectionTitle: {
        fontSize: normalizeFont(22),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(16),
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSecondary,
        borderRadius: normalize(12),
        padding: normalize(16),
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardText: {
        flex: 1,
        marginLeft: normalize(12),
    },
    cardTitle: {
        fontSize: normalizeFont(17),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(4),
    },
    cardSubtitle: {
        fontSize: normalizeFont(14),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        lineHeight: normalizeFont(19),
    },
});
