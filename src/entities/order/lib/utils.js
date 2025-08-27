// ===== УТИЛИТЫ ДЛЯ РАБОТЫ С ЗАКАЗАМИ =====

export const ORDER_STATUSES = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    IN_DELIVERY: 'IN_DELIVERY',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
    RETURNED: 'RETURNED'
};

export const ORDER_STATUS_LABELS = {
    [ORDER_STATUSES.PENDING]: 'Ожидает обработки',
    [ORDER_STATUSES.CONFIRMED]: 'Подтвержден',
    [ORDER_STATUSES.IN_DELIVERY]: 'В доставке',
    [ORDER_STATUSES.DELIVERED]: 'Доставлен',
    [ORDER_STATUSES.CANCELLED]: 'Отменен',
    [ORDER_STATUSES.RETURNED]: 'Возвращен'
};

export const ORDER_STATUS_COLORS = {
    [ORDER_STATUSES.PENDING]: '#ffc107',
    [ORDER_STATUSES.CONFIRMED]: '#17a2b8',
    [ORDER_STATUSES.IN_DELIVERY]: '#007bff',
    [ORDER_STATUSES.DELIVERED]: '#28a745',
    [ORDER_STATUSES.CANCELLED]: '#dc3545',
    [ORDER_STATUSES.RETURNED]: '#6c757d'
};

export const getStatusLabel = (status) => ORDER_STATUS_LABELS[status] || status;
export const getStatusColor = (status) => ORDER_STATUS_COLORS[status] || '#6c757d';

/**
 * Форматирует номер заказа для отображения
 * @param {string} orderNumber - Номер заказа
 * @returns {string}
 */
export const formatOrderNumber = (orderNumber) => {
    if (!orderNumber) return '';

    if (orderNumber.startsWith('ORD-')) {
        return orderNumber;
    }

    return `№${orderNumber}`;
};

/**
 * Форматирует сумму в валюте
 * @param {number} amount - Сумма
 * @param {string} currency - Валюта (по умолчанию RUB)
 * @returns {string}
 */
export const formatAmount = (amount, currency = 'RUB') => {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency
    }).format(amount || 0);
};

/**
 * Проверяет, является ли заказ приоритетным
 * @param {Object} order - Заказ
 * @returns {boolean}
 */
export const isPriorityOrder = (order) => {
    if (order.status === ORDER_STATUSES.PENDING) {
        return true;
    }

    if (order.expectedDeliveryDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);

        return new Date(order.expectedDeliveryDate) <= tomorrow;
    }

    return false;
};

/**
 * Проверяет, может ли пользователь отменить заказ
 * @param {string} status - Статус заказа
 * @param {string} userRole - Роль пользователя
 * @returns {boolean}
 */
export const canCancelOrder = (status, userRole = 'CLIENT') => {
    if (userRole === 'CLIENT') {
        return status === ORDER_STATUSES.PENDING;
    }

    return [
        ORDER_STATUSES.PENDING,
        ORDER_STATUSES.CONFIRMED,
        ORDER_STATUSES.IN_DELIVERY
    ].includes(status);
}; 

/**
 * Проверяет, можно ли оставить отзыв на заказ
 * @param {string} status - Статус заказа
 * @returns {boolean}
 */
export const canLeaveReview = (status) => status === ORDER_STATUSES.DELIVERED;

/**
 * Получает доступные статусы для перехода
 * @param {string} currentStatus - Текущий статус заказа
 * @returns {Array<{value:string,label:string,color?:string}>}
 */
export const getAvailableStatuses = (currentStatus) => {
    const transitions = {
        [ORDER_STATUSES.PENDING]: [
            { value: ORDER_STATUSES.CONFIRMED, label: ORDER_STATUS_LABELS[ORDER_STATUSES.CONFIRMED], color: '#28a745' },
            { value: ORDER_STATUSES.CANCELLED, label: ORDER_STATUS_LABELS[ORDER_STATUSES.CANCELLED], color: '#dc3545' }
        ],
        [ORDER_STATUSES.CONFIRMED]: [
            { value: ORDER_STATUSES.IN_DELIVERY, label: ORDER_STATUS_LABELS[ORDER_STATUSES.IN_DELIVERY], color: '#fd7e14' },
            { value: ORDER_STATUSES.CANCELLED, label: ORDER_STATUS_LABELS[ORDER_STATUSES.CANCELLED], color: '#dc3545' }
        ],
        [ORDER_STATUSES.IN_DELIVERY]: [
            { value: ORDER_STATUSES.DELIVERED, label: ORDER_STATUS_LABELS[ORDER_STATUSES.DELIVERED], color: '#28a745' },
            { value: ORDER_STATUSES.CANCELLED, label: ORDER_STATUS_LABELS[ORDER_STATUSES.CANCELLED], color: '#dc3545' }
        ],
        [ORDER_STATUSES.DELIVERED]: [
            { value: ORDER_STATUSES.RETURNED, label: ORDER_STATUS_LABELS[ORDER_STATUSES.RETURNED], color: '#6c757d' }
        ],
        [ORDER_STATUSES.CANCELLED]: [],
        [ORDER_STATUSES.RETURNED]: []
    };

    return transitions[currentStatus] || [];
};

/**
 * Вычисляет примерное время доставки
 * @param {Object} orderData - Данные заказа
 * @returns {Date}
 */
export const calculateEstimatedDelivery = (orderData) => {
    const now = new Date();
    const estimatedDays = 1; // базовое время доставки

    const uniqueSuppliers = new Set(
        (orderData.items || []).map(item => item.product?.supplier?.id)
    ).size;

    const additionalDays = Math.max(0, uniqueSuppliers - 1);

    const deliveryDate = new Date(now);
    deliveryDate.setDate(deliveryDate.getDate() + estimatedDays + additionalDays);

    return deliveryDate;
};