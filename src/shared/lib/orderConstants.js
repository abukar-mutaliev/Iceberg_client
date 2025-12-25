// Константы для статусов заказов
export const ORDER_STATUS_LABELS = {
    PENDING: 'Ожидает обработки',
    PICKING: 'Взял в работу',
    CONFIRMED: 'Сборка завершена',
    PACKING: 'Взял в работу',
    PACKING_COMPLETED: 'Упаковка завершена',
    IN_DELIVERY: 'В доставке',
    DELIVERED: 'Доставлен',
    CANCELLED: 'Отменен',
    RETURNED: 'Возвращен'
};

export const ORDER_STATUS_COLORS = {
    PENDING: '#FFA726',
    PICKING: '#FF7043',
    CONFIRMED: '#42A5F5',
    PACKING: '#AB47BC',
    PACKING_COMPLETED: '#7E57C2',
    IN_DELIVERY: '#5C6BC0',
    DELIVERED: '#66BB6A',
    CANCELLED: '#EF5350',
    RETURNED: '#78909C'
};

export const ORDER_STATUS_ICONS = {
    PENDING: 'schedule',
    PICKING: 'inventory',
    CONFIRMED: 'check-circle',
    PACKING: 'package',
    PACKING_COMPLETED: 'done-all',
    IN_DELIVERY: 'local-shipping',
    DELIVERED: 'done-all',
    CANCELLED: 'cancel',
    RETURNED: 'undo'
};

// Роли сотрудников
export const EMPLOYEE_ROLES = {
    PICKER: 'PICKER',
    PACKER: 'PACKER',
    COURIER: 'COURIER'
};

export const EMPLOYEE_ROLE_LABELS = {
    PICKER: 'Сборщик',
    PACKER: 'Упаковщик',
    COURIER: 'Курьер'
};


