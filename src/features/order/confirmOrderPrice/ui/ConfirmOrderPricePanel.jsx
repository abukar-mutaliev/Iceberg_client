import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { OrderApi } from '@entities/order';
import { formatAmount } from '@shared/lib/orderUtils';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { GlobalAlert } from '@shared/ui/CustomAlert';

const parseNumber = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const normalized = String(value).replace(',', '.');
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
};

export const ConfirmOrderPricePanel = ({ order, onConfirmed }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const items = order?.items || order?.orderItems || [];
    const weightItems = items.filter((item) => item.isWeightBased);
    const regularItems = items.filter((item) => !item.isWeightBased);

    const [rows, setRows] = useState(() =>
        weightItems.reduce((acc, item) => {
            acc[item.id] = {
                actualWeightKg: item.estimatedWeightKg != null ? String(item.estimatedWeightKg) : '',
                pricePerKg: item.pricePerKg != null ? String(item.pricePerKg) : '',
                remove: false
            };
            return acc;
        }, {})
    );
    const [deliveryFee, setDeliveryFee] = useState(String(order?.deliveryFee ?? 0));
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [locked, setLocked] = useState(false);

    const isLocked = locked
        || Boolean(order?.priceConfirmedAt)
        || (order?.status && order.status !== 'AWAITING_CONFIRMATION');

    const updateRow = (id, patch) => {
        setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    };

    const previewTotal = useMemo(() => {
        let goods = 0;
        for (const item of regularItems) {
            goods += (item.price || 0) * (item.quantity || 0);
        }
        for (const item of weightItems) {
            const row = rows[item.id];
            if (row?.remove) continue;
            const weight = parseNumber(row?.actualWeightKg);
            const perKg = parseNumber(row?.pricePerKg) ?? item.pricePerKg;
            if (weight > 0 && perKg > 0) {
                goods += Math.round(weight * perKg * 100) / 100;
            }
        }
        const fee = parseNumber(deliveryFee) || 0;
        return Math.round((goods + fee) * 100) / 100;
    }, [rows, regularItems, weightItems, deliveryFee]);

    const handleConfirm = async () => {
        const payloadItems = weightItems.map((item) => {
            const row = rows[item.id] || {};
            if (row.remove) {
                return { orderItemId: item.id, remove: true };
            }
            const actualWeightKg = parseNumber(row.actualWeightKg);
            const pricePerKg = parseNumber(row.pricePerKg);
            return {
                orderItemId: item.id,
                actualWeightKg,
                ...(pricePerKg ? { pricePerKg } : {})
            };
        });

        const missing = payloadItems.filter((item) => !item.remove && !(item.actualWeightKg > 0));
        if (missing.length > 0) {
            GlobalAlert.showError('Ошибка', 'Укажите фактический вес для всех весовых позиций или уберите позицию');
            return;
        }

        try {
            setSubmitting(true);
            const response = await OrderApi.confirmOrderPrice(order.id, {
                items: payloadItems,
                deliveryFee: parseNumber(deliveryFee) ?? 0,
                comment: comment || undefined
            });
            setLocked(true);
            GlobalAlert.showSuccess('Готово', 'Цена подтверждена, заказ отправлен клиенту на оплату');
            onConfirmed?.(response?.data?.order || response?.order);
        } catch (error) {
            GlobalAlert.showError('Ошибка', error.message || 'Не удалось подтвердить цену');
        } finally {
            setSubmitting(false);
        }
    };

    if (!order) return null;
    if (!isLocked && order.status !== 'AWAITING_CONFIRMATION') return null;
    if (isLocked && !['AWAITING_CONFIRMATION', 'PENDING_PAYMENT'].includes(order.status) && !locked) {
        return null;
    }

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Icon name="scale" size={22} color={colors.primary} />
                <Text style={styles.title}>Взвешивание и итоговая цена</Text>
            </View>
            <Text style={styles.hint}>
                {isLocked
                    ? 'Цена подтверждена и отправлена клиенту. Изменить значения нельзя.'
                    : `Приблизительно ${formatAmount(order.estimatedAmount || order.totalAmount)}. Укажите фактический вес.`}
            </Text>

            {regularItems.map((item) => (
                <View key={item.id} style={styles.row}>
                    <Text style={styles.name}>{item.product?.name || 'Товар'}</Text>
                    <Text style={styles.meta}>
                        {item.quantity} × {formatAmount(item.price)} = {formatAmount(item.price * item.quantity)}
                    </Text>
                </View>
            ))}

            {weightItems.map((item) => {
                const row = rows[item.id] || {};
                const weight = parseNumber(row.actualWeightKg);
                const perKg = parseNumber(row.pricePerKg) ?? item.pricePerKg;
                const lineTotal = !row.remove && weight > 0 && perKg > 0
                    ? Math.round(weight * perKg * 100) / 100
                    : 0;

                return (
                    <View key={item.id} style={styles.row}>
                        <Text style={styles.name}>{item.product?.name || 'Товар'}</Text>
                        <Text style={styles.meta}>
                            ≈ {item.estimatedWeightKg || '—'} кг · {formatAmount(item.pricePerKg)}/кг
                        </Text>
                        {!isLocked ? (
                            <View style={styles.switchRow}>
                                <Text style={styles.label}>Убрать позицию</Text>
                                <Switch
                                    value={!!row.remove}
                                    onValueChange={(remove) => updateRow(item.id, { remove })}
                                />
                            </View>
                        ) : null}
                        {!row.remove ? (
                            <>
                                <Text style={styles.label}>Факт. вес, кг</Text>
                                <TextInput
                                    style={[styles.input, isLocked && styles.inputLocked]}
                                    keyboardType="decimal-pad"
                                    value={row.actualWeightKg || (item.actualWeightKg != null ? String(item.actualWeightKg) : '')}
                                    onChangeText={(actualWeightKg) => updateRow(item.id, { actualWeightKg })}
                                    placeholder="0.000"
                                    placeholderTextColor={colors.textTertiary}
                                    editable={!isLocked}
                                />
                                <Text style={styles.label}>Цена за кг, ₽</Text>
                                <TextInput
                                    style={[styles.input, isLocked && styles.inputLocked]}
                                    keyboardType="decimal-pad"
                                    value={row.pricePerKg || (item.pricePerKg != null ? String(item.pricePerKg) : '')}
                                    onChangeText={(pricePerKg) => updateRow(item.id, { pricePerKg })}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textTertiary}
                                    editable={!isLocked}
                                />
                                <Text style={styles.lineTotal}>Строка: {formatAmount(lineTotal)}</Text>
                            </>
                        ) : (
                            <Text style={styles.meta}>Позиция убрана</Text>
                        )}
                    </View>
                );
            })}

            <Text style={styles.label}>Доставка, ₽</Text>
            <TextInput
                style={[styles.input, isLocked && styles.inputLocked]}
                keyboardType="decimal-pad"
                value={deliveryFee}
                onChangeText={setDeliveryFee}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                editable={!isLocked}
            />
            {!isLocked || comment ? (
                <>
                    <Text style={styles.label}>Комментарий</Text>
                    <TextInput
                        style={[styles.input, styles.comment, isLocked && styles.inputLocked]}
                        value={comment}
                        onChangeText={setComment}
                        placeholder="Необязательно"
                        placeholderTextColor={colors.textTertiary}
                        multiline
                        editable={!isLocked}
                    />
                </>
            ) : null}

            <Text style={styles.total}>Итого: {formatAmount(order.totalAmount && isLocked ? order.totalAmount : previewTotal)}</Text>
            {!isLocked ? (
                <TouchableOpacity
                    style={[styles.button, submitting && styles.buttonDisabled]}
                    onPress={handleConfirm}
                    disabled={submitting}
                >
                    <Text style={styles.buttonText}>
                        {submitting ? 'Сохранение…' : 'Подтвердить и отправить клиенту'}
                    </Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
};

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
        marginBottom: 8
    },
    title: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary
    },
    hint: {
        color: colors.textSecondary,
        fontSize: 13,
        marginBottom: 12
    },
    row: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border || '#ddd',
        paddingVertical: 12
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary
    },
    meta: {
        marginTop: 4,
        fontSize: 12,
        color: colors.textSecondary
    },
    label: {
        marginTop: 8,
        fontSize: 12,
        color: colors.textSecondary
    },
    input: {
        marginTop: 4,
        borderWidth: 1,
        borderColor: colors.border || '#ddd',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        color: colors.textPrimary,
        fontSize: 15
    },
    inputLocked: {
        opacity: 0.7,
        backgroundColor: colors.backgroundSecondary || colors.background || 'transparent'
    },
    comment: {
        minHeight: 64,
        textAlignVertical: 'top'
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8
    },
    lineTotal: {
        marginTop: 8,
        fontWeight: '700',
        color: colors.textPrimary
    },
    total: {
        marginTop: 12,
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary
    },
    button: {
        marginTop: 16,
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center'
    },
    buttonDisabled: {
        opacity: 0.6
    },
    buttonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15
    }
});
