import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { PaymentApi } from '@entities/payment';
import { formatAmount, formatDate } from '@shared/lib/orderUtils';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const STATUS_LABELS = {
    PENDING: 'Ожидает оплату',
    COMPLETED: 'Оплачен',
    FAILED: 'Отклонён',
    REFUNDED: 'Возврат'
};

const receiptFromPayment = (payment) => {
    if (!payment) return null;
    return {
        amount: payment.amount,
        orderAmount: payment.orderAmount,
        status: payment.status,
        paymentMethodType: payment.paymentMethodType,
        paymentMethodLabel: payment.paymentMethodType === 'sbp'
            ? 'СБП'
            : payment.paymentMethodType === 'card'
                ? 'Банковская карта'
                : 'Онлайн-оплата (Т-Банк)',
        cardMask: payment.cardMask,
        paidAt: payment.paidAt || payment.completedAt,
        bankPaymentId: payment.yookassaPaymentId,
        receiptUrl: payment.receiptUrl,
        clientName: payment.clientName,
        terminalName: payment.terminalName
    };
};

const unwrapReceiptResponse = (response) => {
    const payload = response?.data?.receipt
        ? response.data
        : response?.data?.data
            ? response.data.data
            : response;
    return {
        receipt: payload?.receipt || null,
        isPaid: !!payload?.isPaid
    };
};

export const PaymentInfoCard = ({ order }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [receipt, setReceipt] = useState(() => receiptFromPayment(order?.payment));
    const [isPaid, setIsPaid] = useState(
        order?.payment?.status === 'COMPLETED' || Boolean(order?.payment?.paidAt)
    );
    const [visible, setVisible] = useState(false);

    const loadReceipt = useCallback(async () => {
        if (!order?.id) return;
        try {
            const response = await PaymentApi.getOrderReceipt(order.id);
            const { receipt: nextReceipt, isPaid: nextIsPaid } = unwrapReceiptResponse(response);
            if (nextReceipt) {
                setReceipt(nextReceipt);
            } else {
                setReceipt(receiptFromPayment(order.payment));
            }
            setIsPaid(nextIsPaid || order?.payment?.status === 'COMPLETED' || Boolean(order?.payment?.paidAt));
        } catch (error) {
            setReceipt(receiptFromPayment(order.payment));
            setIsPaid(order?.payment?.status === 'COMPLETED' || Boolean(order?.payment?.paidAt));
        }
    }, [order?.id, order?.payment]);

    useEffect(() => {
        loadReceipt();
    }, [loadReceipt]);

    if (!order) return null;

    const awaitingPayment = order.status === 'PENDING_PAYMENT' && !isPaid;
    const showCard = awaitingPayment || isPaid || receipt || order.payment;
    if (!showCard) return null;

    const openReceiptUrl = () => {
        if (receipt?.receiptUrl) {
            Linking.openURL(receipt.receiptUrl).catch(() => {});
        }
    };

    return (
        <>
            <TouchableOpacity
                style={styles.card}
                onPress={() => setVisible(true)}
                activeOpacity={0.75}
            >
                <View style={styles.header}>
                    <Icon name="receipt" size={22} color={colors.primary} />
                    <Text style={styles.title}>Чек оплаты</Text>
                    <Icon name="chevron-right" size={22} color={colors.textSecondary} />
                </View>

                {awaitingPayment ? (
                    <Text style={styles.pending}>Ожидаем оплату клиента</Text>
                ) : isPaid ? (
                    <Text style={styles.paid}>Оплачен · нажмите, чтобы открыть</Text>
                ) : (
                    <Text style={styles.hint}>Нажмите, чтобы открыть данные платежа</Text>
                )}
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
                    <Pressable style={styles.modal} onPress={() => {}}>
                        <View style={styles.modalHeader}>
                            <View style={styles.header}>
                                <Icon name="receipt" size={22} color={colors.primary} />
                                <Text style={styles.title}>Чек оплаты</Text>
                            </View>
                            <TouchableOpacity onPress={() => setVisible(false)} hitSlop={12}>
                                <Icon name="close" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            {order.orderNumber ? (
                                <Row label="Заказ" value={order.orderNumber} colors={colors} />
                            ) : null}
                            {receipt?.clientName ? (
                                <Row label="Клиент" value={receipt.clientName} colors={colors} />
                            ) : null}
                            <Row
                                label="Статус"
                                value={STATUS_LABELS[receipt?.status] || receipt?.status || (awaitingPayment ? 'Ожидает оплату' : '—')}
                                colors={colors}
                            />
                            <Row
                                label="Сумма"
                                value={formatAmount(receipt?.amount || order.totalAmount)}
                                colors={colors}
                            />
                            {receipt?.paidAt ? (
                                <Row label="Оплачено" value={formatDate(receipt.paidAt)} colors={colors} />
                            ) : null}
                            <Row
                                label="Способ"
                                value={receipt?.paymentMethodLabel || receipt?.paymentMethodType || 'Онлайн'}
                                colors={colors}
                            />
                            {receipt?.cardMask ? (
                                <Row label="Карта" value={receipt.cardMask} colors={colors} />
                            ) : null}
                            {receipt?.bankPaymentId ? (
                                <Row label="ID платежа" value={String(receipt.bankPaymentId)} colors={colors} />
                            ) : null}
                            {receipt?.terminalName ? (
                                <Row label="Терминал" value={receipt.terminalName} colors={colors} />
                            ) : null}
                        </ScrollView>

                        {receipt?.receiptUrl ? (
                            <TouchableOpacity style={styles.linkBtn} onPress={openReceiptUrl}>
                                <Icon name="open-in-new" size={16} color={colors.primary} />
                                <Text style={styles.linkText}>Открыть чек банка</Text>
                            </TouchableOpacity>
                        ) : null}
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
};

const Row = ({ label, value, colors }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600', maxWidth: '62%', textAlign: 'right' }}>
            {value}
        </Text>
    </View>
);

const createStyles = (colors) => StyleSheet.create({
    card: {
        backgroundColor: colors.surface || colors.cardBackground,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    title: {
        marginLeft: 8,
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary
    },
    pending: {
        color: '#FF9800',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8
    },
    paid: {
        color: colors.success || '#2E7D32',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 8
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 13,
        marginTop: 6
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        padding: 24
    },
    modal: {
        backgroundColor: colors.surface || colors.cardBackground || '#fff',
        borderRadius: 18,
        padding: 20,
        maxHeight: '80%'
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    linkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16
    },
    linkText: {
        marginLeft: 6,
        color: colors.primary,
        fontWeight: '600'
    }
});
