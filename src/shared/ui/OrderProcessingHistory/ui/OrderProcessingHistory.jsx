import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatDate } from '@shared/lib/orderUtils';
import { useOrderDetailsStyles } from '@shared/ui/OrderDetailsStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ORDER_STATUS_LABELS } from '@entities/order';

const EMPLOYEE_MARK_RE = /\s*\[employee_id:\d+\]\s*/gi;
const NAME_WITH_POSITION_RE = /^(.+?)\s+\(([^)]+)\)\s*$/;

const stripEmployeeMark = (comment) => (comment || '').replace(EMPLOYEE_MARK_RE, '').replace(/\s+/g, ' ').trim();

const parseNameAndPosition = (raw) => {
    const value = (raw || '').trim().replace(/[.,;]+$/, '');
    const match = value.match(NAME_WITH_POSITION_RE);
    if (match) {
        return { name: match[1].trim(), position: match[2].trim() };
    }
    return { name: value, position: '' };
};

const extractEmployee = (comment) => {
    const cleaned = stripEmployeeMark(comment);
    const patterns = [
        /обработано сотрудником\s+(.+?)(?:\.|$)/i,
        /назначен сотруднику\s+(.+?)(?:\.|$)/i,
        /снят с работы сотрудником\s+(.+?)(?:\.|$)/i,
    ];

    for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (match) {
            return parseNameAndPosition(match[1]);
        }
    }

    return { name: '', position: '' };
};

const isCourierPerson = (employee, status) => {
    const position = (employee.position || '').toLowerCase();
    return position.includes('курьер') || position.includes('courier') || status === 'DELIVERED';
};

const isTakeComment = (lower) => (
    /назначен сотруднику/.test(lower)
    || /взял заказ в работу/.test(lower)
);

const isAutoQueueComment = (lower) => (
    lower.includes('автоназначение')
    || lower.includes('передан в сборку')
    || lower.includes('поставлен в очередь')
);

const classifyHistoryItem = (item) => {
    const comment = item.comment || '';
    const lower = comment.toLowerCase();
    const employee = extractEmployee(comment);
    const courier = isCourierPerson(employee, item.status);

    if (lower.includes('заказ создан')) {
        return {
            type: 'created',
            title: 'Заказ создан',
            icon: 'receipt',
            color: '#6c757d',
            employee: { name: '', position: '' },
        };
    }

    if (isAutoQueueComment(lower) && !isTakeComment(lower)) {
        return {
            type: 'queued',
            title: 'Заказ передан в сборку',
            icon: 'inventory',
            color: '#17a2b8',
            employee: { name: '', position: '' },
        };
    }

    if (lower.includes('ошибочное') && (lower.includes('назначен') || lower.includes('снято'))) {
        return {
            type: 'repaired',
            title: 'Ошибочное назначение снято',
            icon: 'undo',
            color: '#FF9800',
            employee: { name: '', position: '' },
        };
    }

    if (lower.includes('снят') && (lower.includes('работ') || lower.includes('назначен'))) {
        return {
            type: 'released',
            title: courier ? 'Курьер снял заказ с работы' : 'Сотрудник снял заказ с работы',
            icon: 'undo',
            color: '#FF9800',
            employee,
        };
    }

    if (isTakeComment(lower)) {
        const autoAssigned = lower.includes('автоматически назначен сотруднику');
        if (courier || item.status === 'IN_DELIVERY') {
            return {
                type: 'courier_taken',
                title: autoAssigned ? 'Курьер назначен автоматически' : 'Курьер взял заказ в работу',
                icon: 'local-shipping',
                color: '#007bff',
                employee,
            };
        }
        return {
            type: 'taken',
            title: autoAssigned ? 'Сотрудник назначен автоматически' : 'Сотрудник взял заказ в работу',
            icon: 'how-to-reg',
            color: '#4CAF50',
            employee,
        };
    }

    if (lower.includes('доставка завершена') || (item.status === 'DELIVERED' && lower.includes('обработано сотрудником'))) {
        return {
            type: 'delivered',
            title: 'Курьер доставил заказ',
            icon: 'done-all',
            color: '#28a745',
            employee,
        };
    }

    if (
        lower.includes('сборка завершена')
        || lower.includes('передан в доставку')
        || lower.includes('передан курьеру')
    ) {
        return {
            type: 'assembled',
            title: 'Сборка завершена, заказ передан курьеру',
            icon: 'inventory',
            color: '#17a2b8',
            employee,
        };
    }

    if (item.status === 'CANCELLED' || lower.includes('отмен')) {
        return {
            type: 'cancelled',
            title: 'Заказ отменён',
            icon: 'cancel',
            color: '#dc3545',
            employee,
        };
    }

    return {
        type: 'status',
        title: `Статус: ${ORDER_STATUS_LABELS[item.status] || item.status}`,
        icon: 'swap-horiz',
        color: '#6f42c1',
        employee,
    };
};

const buildTimeline = (order) => {
    const events = [];
    const history = Array.isArray(order?.statusHistory) ? [...order.statusHistory] : [];
    history.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const hasCreatedInHistory = history.some((item) =>
        (item.comment || '').toLowerCase().includes('заказ создан')
    );

    if (order?.createdAt && !hasCreatedInHistory) {
        events.push({
            key: 'created',
            type: 'created',
            title: 'Заказ создан',
            icon: 'receipt',
            color: '#6c757d',
            employee: { name: '', position: '' },
            createdAt: order.createdAt,
            status: order.status,
        });
    }

    history.forEach((item, index) => {
        const classified = classifyHistoryItem(item);
        events.push({
            key: item.id ? `history-${item.id}` : `history-${index}-${item.createdAt}`,
            ...classified,
            createdAt: item.createdAt,
            status: item.status,
        });
    });

    return events;
};

export const OrderProcessingHistory = ({ order, visible = false }) => {
    const { colors, isDark } = useTheme();
    const cardStyles = useOrderDetailsStyles();
    const events = useMemo(() => buildTimeline(order), [order]);

    if (!visible || !order) {
        return null;
    }

    const localStyles = getLocalStyles(colors, isDark);

    return (
        <View style={cardStyles.modernCard}>
            <View style={cardStyles.cardHeader}>
                <Icon name="history" size={24} color={colors.primary} />
                <Text style={cardStyles.cardTitle}>История обработки</Text>
            </View>

            {events.length === 0 ? (
                <Text style={localStyles.emptyText}>История обработки пока пуста</Text>
            ) : (
                events.map((event, index) => {
                    const isLast = index === events.length - 1;
                    const employeeLine = [event.employee?.name, event.employee?.position]
                        .filter(Boolean)
                        .join(' · ');

                    return (
                        <View key={event.key} style={localStyles.eventRow}>
                            <View style={localStyles.timeline}>
                                <View style={[localStyles.dot, { backgroundColor: event.color }]}>
                                    <Icon name={event.icon} size={14} color="#FFFFFF" />
                                </View>
                                {!isLast && <View style={localStyles.line} />}
                            </View>
                            <View style={[localStyles.eventBody, isLast && localStyles.eventBodyLast]}>
                                <Text style={localStyles.eventTitle}>{event.title}</Text>
                                {employeeLine ? (
                                    <View style={localStyles.employeeRow}>
                                        <Icon name="person" size={14} color={colors.textSecondary} />
                                        <Text style={localStyles.employeeText}>{employeeLine}</Text>
                                    </View>
                                ) : null}
                                {event.createdAt ? (
                                    <Text style={localStyles.eventTime}>{formatDate(event.createdAt)}</Text>
                                ) : null}
                                {event.status && event.type === 'status' ? (
                                    <Text style={localStyles.statusHint}>
                                        {ORDER_STATUS_LABELS[event.status] || event.status}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                    );
                })
            )}
        </View>
    );
};

const getLocalStyles = (colors, isDark) => StyleSheet.create({
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    eventRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    timeline: {
        width: 32,
        alignItems: 'center',
    },
    dot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    line: {
        flex: 1,
        width: 2,
        backgroundColor: isDark ? colors.border : '#E0E0E0',
        marginVertical: 4,
    },
    eventBody: {
        flex: 1,
        paddingLeft: 12,
        paddingBottom: 18,
    },
    eventBodyLast: {
        paddingBottom: 0,
    },
    eventTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    employeeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    employeeText: {
        flex: 1,
        fontSize: 13,
        color: colors.textSecondary,
    },
    eventTime: {
        fontSize: 12,
        color: colors.textTertiary || colors.textSecondary,
    },
    statusHint: {
        marginTop: 4,
        fontSize: 12,
        color: colors.textSecondary,
    },
});
