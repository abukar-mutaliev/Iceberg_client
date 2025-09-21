import { getBaseUrl } from '@shared/api/api';

// Вспомогательная функция для форматирования URL изображений
export const getImageBaseUrl = () => {
    const baseUrl = getBaseUrl();
    return baseUrl ? `${baseUrl}/uploads/` : 'http://212.67.11.134:5000/uploads/';
};

export const formatImageUrl = (imagePath) => {
    if (!imagePath) return null;

    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }

    return `${getImageBaseUrl()}${imagePath}`;
};

// Функция для склонения слова "коробка"
export const formatBoxesCount = (count) => {
    const num = parseInt(count);

    if (num % 10 === 1 && num % 100 !== 11) {
        return `${num} коробка`;
    } else if (num % 10 >= 2 && num % 10 <= 4 && (num % 100 < 10 || num % 100 >= 20)) {
        return `${num} коробки`;
    } else {
        return `${num} коробок`;
    }
};

export const formatAmount = (amount, currency = 'RUB') => {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency
    }).format(amount || 0);
};

export const formatOrderNumber = (orderNumber) => {
    if (!orderNumber) return '';
    if (orderNumber.startsWith('ORD-')) {
        return orderNumber;
    }
    return `№${orderNumber}`;
};

export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Проверка прав доступа
export const canCancelOrder = (status, userRole = 'CLIENT') => {
    if (userRole === 'CLIENT') {
        return status === 'PENDING';
    }
    return ['PENDING', 'CONFIRMED', 'IN_DELIVERY'].includes(status);
};

export const canDownloadInvoice = (userRole) => {
    return userRole === 'ADMIN' || userRole === 'EMPLOYEE';
};

export const getOrderProgress = (status) => {
    const progressMap = {
        PENDING: 0,
        CONFIRMED: 33,
        IN_DELIVERY: 66,
        DELIVERED: 100,
        CANCELLED: 0,
        RETURNED: 0
    };
    return progressMap[status] || 0;
};

export const canViewProcessingHistory = (userRole) => {
    return userRole === 'ADMIN' || userRole === 'EMPLOYEE';
};
