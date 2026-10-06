export const CANCEL_ORDER_REASONS = [
    { id: 'changed_mind', label: 'Передумал, заказ больше не нужен' },
    { id: 'wrong_items', label: 'Ошибся в составе или количестве' },
    { id: 'payment_issue', label: 'Проблемы с оплатой' }
];

export const buildCancelReasonText = (selectedId, customText = '') => {
    const preset = CANCEL_ORDER_REASONS.find((item) => item.id === selectedId);
    const extra = String(customText || '').trim();
    if (preset && extra) {
        return `${preset.label}. ${extra}`;
    }
    return (preset?.label || extra || '').slice(0, 500);
};
