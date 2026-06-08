// Должности обработки заказов.
//
// После упрощения системы рабочими ролями остаются PICKER и COURIER.
// SUPERVISOR/MANAGER — административные роли (просмотр и управление).
// PACKER и QUALITY_CHECKER оставлены как deprecated-значения только
// для отображения исторических данных в случае, если в БД ещё остались
// сотрудники с такой ролью.

export const PROCESSING_ROLES = {
    PICKER: 'PICKER',
    COURIER: 'COURIER',
    SUPERVISOR: 'SUPERVISOR',
    MANAGER: 'MANAGER',
    // Deprecated
    PACKER: 'PACKER',
    QUALITY_CHECKER: 'QUALITY_CHECKER'
};

export const PROCESSING_ROLE_LABELS = {
    [PROCESSING_ROLES.PICKER]: 'Сборщик',
    [PROCESSING_ROLES.COURIER]: 'Курьер',
    [PROCESSING_ROLES.SUPERVISOR]: 'Начальник смены',
    [PROCESSING_ROLES.MANAGER]: 'Менеджер',
    [PROCESSING_ROLES.PACKER]: 'Упаковщик (устарело)',
    [PROCESSING_ROLES.QUALITY_CHECKER]: 'Контролер качества (устарело)'
};

export const PROCESSING_ROLE_COLORS = {
    [PROCESSING_ROLES.PICKER]: '#ffc107',
    [PROCESSING_ROLES.COURIER]: '#fd7e14',
    [PROCESSING_ROLES.SUPERVISOR]: '#6f42c1',
    [PROCESSING_ROLES.MANAGER]: '#007bff',
    [PROCESSING_ROLES.PACKER]: '#28a745',
    [PROCESSING_ROLES.QUALITY_CHECKER]: '#dc3545'
};

export const PROCESSING_ROLE_ICONS = {
    [PROCESSING_ROLES.PICKER]: '📦',
    [PROCESSING_ROLES.COURIER]: '🚚',
    [PROCESSING_ROLES.SUPERVISOR]: '👨‍💼',
    [PROCESSING_ROLES.MANAGER]: '💼',
    [PROCESSING_ROLES.PACKER]: '📋',
    [PROCESSING_ROLES.QUALITY_CHECKER]: '✅'
};

export const PROCESSING_ROLE_DESCRIPTIONS = {
    [PROCESSING_ROLES.PICKER]: 'Собирает товары и передаёт курьеру',
    [PROCESSING_ROLES.COURIER]: 'Доставляет заказы клиентам',
    [PROCESSING_ROLES.SUPERVISOR]: 'Управляет процессом обработки заказов',
    [PROCESSING_ROLES.MANAGER]: 'Управляет складом',
    [PROCESSING_ROLES.PACKER]: 'Этап упаковки удалён, роль больше не используется',
    [PROCESSING_ROLES.QUALITY_CHECKER]: 'Этап контроля качества удалён, роль больше не используется'
};
