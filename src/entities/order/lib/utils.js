// ===== УТИЛИТЫ ДЛЯ РАБОТЫ С ЗАКАЗАМИ =====

import { CONSTANTS } from './constants';

export const ORDER_STATUSES = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    PICKING: 'PICKING',
    WAITING_STOCK: 'WAITING_STOCK',
    IN_DELIVERY: 'IN_DELIVERY',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
    RETURNED: 'RETURNED'
};

export const ORDER_STATUS_LABELS = {
    PENDING: 'Ожидает обработки',
    PENDING_PAYMENT: 'Ожидает оплату',
    CONFIRMED: 'Подтвержден',
    PICKING: 'Сборка',
    WAITING_STOCK: 'Ожидает поступления',
    IN_DELIVERY: 'В доставке',
    DELIVERED: 'Доставлен',
    CANCELLED: 'Отменен',
    RETURNED: 'Возвращен',
    // Исторические статусы (старые заказы)
    PACKING: 'Упаковка',
    PACKING_COMPLETED: 'Упакован',
    QUALITY_CHECK: 'Проверка качества',
    READY_FOR_DELIVERY: 'Готов к доставке'
};

export const ORDER_STATUS_COLORS = {
    [ORDER_STATUSES.PENDING]: '#ffc107',
    [ORDER_STATUSES.CONFIRMED]: '#17a2b8',
    [ORDER_STATUSES.PICKING]: '#ffc107',
    [ORDER_STATUSES.WAITING_STOCK]: '#fd7e14',
    [ORDER_STATUSES.IN_DELIVERY]: '#007bff',
    [ORDER_STATUSES.DELIVERED]: '#28a745',
    [ORDER_STATUSES.CANCELLED]: '#dc3545',
    [ORDER_STATUSES.RETURNED]: '#6c757d'
};

export const ORDER_STATUS_ICONS = {
    [ORDER_STATUSES.PENDING]: 'schedule',
    [ORDER_STATUSES.CONFIRMED]: 'check-circle',
    [ORDER_STATUSES.PICKING]: 'inventory-2',
    [ORDER_STATUSES.WAITING_STOCK]: 'inventory',
    [ORDER_STATUSES.IN_DELIVERY]: 'local-shipping',
    [ORDER_STATUSES.DELIVERED]: 'done-all',
    [ORDER_STATUSES.CANCELLED]: 'cancel',
    [ORDER_STATUSES.RETURNED]: 'undo',
    PENDING_PAYMENT: 'payment',
    // Исторические статусы (старые заказы)
    PACKING: 'package',
    PACKING_COMPLETED: 'done-all'
};

export const getStatusLabel = (status) => {
    if (!status) return '';
    const normalized = String(status).trim().toUpperCase();
    return ORDER_STATUS_LABELS[normalized] || ORDER_STATUS_LABELS[status] || status;
};

export const getStatusColor = (status) => {
    if (!status) return '#6c757d';
    const normalized = String(status).trim().toUpperCase();
    return ORDER_STATUS_COLORS[normalized] || ORDER_STATUS_COLORS[status] || '#6c757d';
};

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
        return [ORDER_STATUSES.PENDING, ORDER_STATUSES.WAITING_STOCK].includes(status);
    }

    return [
        ORDER_STATUSES.PENDING,
        ORDER_STATUSES.CONFIRMED,
        ORDER_STATUSES.PICKING,
        ORDER_STATUSES.WAITING_STOCK,
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
            { value: ORDER_STATUSES.WAITING_STOCK, label: ORDER_STATUS_LABELS[ORDER_STATUSES.WAITING_STOCK], color: '#fd7e14' },
            { value: ORDER_STATUSES.CANCELLED, label: ORDER_STATUS_LABELS[ORDER_STATUSES.CANCELLED], color: '#dc3545' }
        ],
        [ORDER_STATUSES.CONFIRMED]: [
            { value: ORDER_STATUSES.PICKING, label: ORDER_STATUS_LABELS[ORDER_STATUSES.PICKING], color: '#ffc107' },
            { value: ORDER_STATUSES.IN_DELIVERY, label: ORDER_STATUS_LABELS[ORDER_STATUSES.IN_DELIVERY], color: '#007bff' },
            { value: ORDER_STATUSES.CANCELLED, label: ORDER_STATUS_LABELS[ORDER_STATUSES.CANCELLED], color: '#dc3545' }
        ],
        [ORDER_STATUSES.PICKING]: [
            { value: ORDER_STATUSES.IN_DELIVERY, label: ORDER_STATUS_LABELS[ORDER_STATUSES.IN_DELIVERY], color: '#007bff' },
            { value: ORDER_STATUSES.CANCELLED, label: ORDER_STATUS_LABELS[ORDER_STATUSES.CANCELLED], color: '#dc3545' }
        ],
        [ORDER_STATUSES.WAITING_STOCK]: [
            { value: ORDER_STATUSES.CONFIRMED, label: ORDER_STATUS_LABELS[ORDER_STATUSES.CONFIRMED], color: '#28a745' },
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
 * Подсказка для сотрудника при завершении этапа (упрощённый флоу).
 */
export const getStageCompletionHint = (processingRole, orderStatus) => {
    if (processingRole === 'PICKER') {
        return 'После завершения заказ перейдёт в «В доставке» и станет доступен курьеру.';
    }

    if (processingRole === 'COURIER') {
        if (orderStatus === 'PICKING') {
            return 'После завершения заказ перейдёт в «В доставке».';
        }
        return 'После завершения заказ будет отмечен как «Доставлен».';
    }

    return 'Заказ перейдёт к следующему этапу обработки.';
};

/**
 * Может ли сотрудник взять заказ в работу (в т.ч. повторно после снятия).
 * Использует те же статусы, что и ROLE_STATUS_MAPPING.
 */
export const canEmployeeTakeOrderByRole = (processingRole, status) => {
    return isOrderStatusMatchingRole(processingRole, status);
};

/**
 * Соответствует ли статус заказа роли сотрудника.
 */
export const isOrderStatusMatchingRole = (processingRole, status) => {
    const allowed = CONSTANTS.ROLE_STATUS_MAPPING[processingRole];
    return Array.isArray(allowed) ? allowed.includes(status) : false;
};

/**
 * Статус заказа после завершения этапа сотрудником (для оптимистичного UI).
 */
export const getNextStatusAfterComplete = (processingRole, currentStatus) => {
    if (processingRole === 'PICKER') {
        return ORDER_STATUSES.IN_DELIVERY;
    }
    if (processingRole === 'COURIER') {
        return currentStatus === ORDER_STATUSES.PICKING
            ? ORDER_STATUSES.IN_DELIVERY
            : ORDER_STATUSES.DELIVERED;
    }
    return currentStatus;
};

/**
 * Прогресс заказа для progress-bar (упрощённый флоу).
 */
export const getOrderStatusProgress = (status) => {
    const progressMap = {
        [ORDER_STATUSES.PENDING]: 20,
        [ORDER_STATUSES.CONFIRMED]: 35,
        [ORDER_STATUSES.PICKING]: 50,
        [ORDER_STATUSES.WAITING_STOCK]: 25,
        [ORDER_STATUSES.IN_DELIVERY]: 75,
        [ORDER_STATUSES.DELIVERED]: 100,
        [ORDER_STATUSES.CANCELLED]: 0,
        [ORDER_STATUSES.RETURNED]: 0,
        PENDING_PAYMENT: 10
    };
    return progressMap[status] ?? 0;
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