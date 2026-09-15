export const PLACEHOLDER_CLIENT_NAME = 'Новый клиент';
export const INCOMPLETE_PROFILE_DISPLAY_NAME = 'Профиль не заполнен';

/**
 * Имя клиента для админки и чужих профилей.
 *
 * Пока `profileCompletedAt` пустой, в схеме лежит заглушка «Новый клиент» —
 * её нельзя показывать как ФИО, иначе в списке копятся одинаковые имена.
 * В сохранённые данные это не пишется: смена роли должна видеть пустое имя,
 * а не подпись экрана.
 */
export const getClientDisplayName = (name, profileCompletedAt) => {
    if (!profileCompletedAt && name === PLACEHOLDER_CLIENT_NAME) {
        return INCOMPLETE_PROFILE_DISPLAY_NAME;
    }

    return name || '';
};

export const isIncompleteClientName = (name) => (
    name === PLACEHOLDER_CLIENT_NAME
    || name === INCOMPLETE_PROFILE_DISPLAY_NAME
);
