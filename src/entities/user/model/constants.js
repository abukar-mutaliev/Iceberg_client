// Константы для ролей пользователей
export const USER_ROLES = {
    ADMIN: 'ADMIN',
    CLIENT: 'CLIENT',
    EMPLOYEE: 'EMPLOYEE',
    SUPPLIER: 'SUPPLIER',
    DRIVER: 'DRIVER'
};

// Константы для отображения названий ролей
export const USER_ROLES_DISPLAY = {
    [USER_ROLES.ADMIN]: 'Администратор',
    [USER_ROLES.CLIENT]: 'Клиент',
    [USER_ROLES.EMPLOYEE]: 'Сотрудник',
    [USER_ROLES.SUPPLIER]: 'Поставщик',
    [USER_ROLES.DRIVER]: 'Водитель'
};

// Константы для цветов карточек пользователей
export const USER_CARD_COLORS = {
    [USER_ROLES.ADMIN]: '#e3f2fd',    // Светло-голубой
    [USER_ROLES.CLIENT]: '#f1f8e9',   // Светло-зеленый
    [USER_ROLES.EMPLOYEE]: '#fff3e0', // Светло-оранжевый
    [USER_ROLES.SUPPLIER]: '#e8eaf6', // Светло-индиго
    [USER_ROLES.DRIVER]: '#fce4ec',   // Светло-розовый
};

// Константы для пагинации
export const PAGINATION_DEFAULTS = {
    LIMIT: 10,
    PAGE: 1
};