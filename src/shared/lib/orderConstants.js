// Константы для статусов заказов (синхронизировано с entities/order/lib/utils.js)
export {
    ORDER_STATUSES,
    ORDER_STATUS_LABELS,
    ORDER_STATUS_COLORS,
    ORDER_STATUS_ICONS
} from '@entities/order/lib/utils';

// Роли сотрудников (упрощённый флоу: только сборщик и курьер)
export const EMPLOYEE_ROLES = {
    PICKER: 'PICKER',
    COURIER: 'COURIER'
};

export const EMPLOYEE_ROLE_LABELS = {
    PICKER: 'Сборщик',
    COURIER: 'Курьер'
};
