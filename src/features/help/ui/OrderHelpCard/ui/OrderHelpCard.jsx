import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { useOrderDetailsScreenBackground } from '@shared/ui/OrderDetailsStyles';
import { navigateToAssistantChat } from '@features/ai-assistant/lib/assistantNavigation';

const { width } = Dimensions.get('window');
const ON_PRIMARY_COLOR = '#FFFFFF';

const normalize = (size) => Math.round(size * (width / 440));

const toSupportOrders = (orders, orderIds) => {
    const fromOrders = (Array.isArray(orders) ? orders : [])
        .filter((order) => Number(order?.id) > 0)
        .map((order) => ({
            id: Number(order.id),
            orderNumber: order.orderNumber || null,
            totalAmount: order.totalAmount ?? null,
            status: order.status || null,
        }));

    if (fromOrders.length > 0) return fromOrders;

    return [...new Set(
        (Array.isArray(orderIds) ? orderIds : [])
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0)
    )].map((id) => ({
        id,
        orderNumber: null,
        totalAmount: null,
        status: null,
    }));
};

export const OrderHelpCard = ({ orderIds, orders, fromScreen = 'OrderDetails' }) => {
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();
    const screenBackground = useOrderDetailsScreenBackground();
    const styles = useMemo(
        () => createStyles(colors, isDark, screenBackground),
        [colors, isDark, screenBackground]
    );
    const supportOrders = useMemo(
        () => toSupportOrders(orders, orderIds),
        [orders, orderIds]
    );

    const openAssistant = useCallback(() => {
        navigateToAssistantChat(navigation, {
            fromScreen,
            orders: supportOrders,
        });
    }, [navigation, fromScreen, supportOrders]);

    return (
        <View style={styles.supportCard}>
            <Icon name="support-agent" size={normalize(40)} color={colors.primary} style={styles.supportIcon} />
            <Text style={styles.supportTitle}>Нужна помощь?</Text>
            <Text style={styles.supportText}>
                Сначала ответит помощник. Если вопрос останется, оператор увидит переписку и этот заказ.
            </Text>
            <TouchableOpacity
                style={styles.supportButton}
                onPress={openAssistant}
                activeOpacity={0.8}
            >
                <Icon name="chat" size={normalize(16)} color={ON_PRIMARY_COLOR} />
                <Text style={styles.supportButtonText}>Связаться с поддержкой</Text>
            </TouchableOpacity>
        </View>
    );
};

const createStyles = (colors, isDark, screenBackground) => StyleSheet.create({
    supportCard: {
        backgroundColor: colors.cardBackground,
        marginHorizontal: normalize(20),
        marginTop: normalize(24),
        padding: normalize(20),
        borderRadius: normalize(16),
        alignItems: 'center',
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.15 : 0.06,
        shadowRadius: 6,
        elevation: 3,
        borderWidth: isDark ? 1 : 0,
        borderColor: colors.border,
    },
    supportIcon: {
        marginBottom: normalize(12),
    },
    supportTitle: {
        fontSize: normalize(18),
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: normalize(8),
    },
    supportText: {
        fontSize: normalize(14),
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: normalize(16),
        lineHeight: normalize(20),
    },
    supportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(10),
        borderRadius: normalize(20),
        backgroundColor: isDark ? screenBackground : (colors.primarySoft || (colors.primary + '1A')),
        gap: normalize(6),
    },
    supportButtonText: {
        fontSize: normalize(14),
        fontWeight: '600',
        color: ON_PRIMARY_COLOR,
    },
});
