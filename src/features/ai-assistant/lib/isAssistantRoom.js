import { ASSISTANT_CHAT_TITLE } from '../constants';

export const ASSISTANT_BOT_EMAIL = 'ai-assistant@system.local';

const getUserDisplayName = (user) => {
    if (!user) return '';
    return String(
        user.displayName ||
        user.name ||
        user.client?.name ||
        user.admin?.name ||
        user.employee?.name ||
        user.driver?.name ||
        user.supplier?.contactPerson ||
        ''
    ).trim();
};

const getRoomDisplayName = (room) => String(
    room?.displayName ||
    room?.title ||
    room?.name ||
    ''
).trim();

const getRoomType = (room) => {
    if (room?.roomType) {
        return String(room.roomType).toUpperCase();
    }

    const type = String(room?.type || '').toUpperCase();
    if (type && type !== 'ROOM' && type !== 'USER') {
        return type;
    }

    return String(room?.room?.type || '').toUpperCase();
};

/**
 * Определяет, является ли пользователь системным ботом ИИ-помощника.
 */
export const isAssistantUser = (user) => {
    if (!user) return false;

    const email = user.email || user.user?.email;
    if (email === ASSISTANT_BOT_EMAIL) return true;

    return getUserDisplayName(user) === ASSISTANT_CHAT_TITLE;
};

/**
 * Определяет, является ли комната диалогом с ИИ-помощником.
 * Проверяет type/roomType, title/displayName и email бота среди участников.
 */
export const isAssistantRoom = (room) => {
    if (!room) return false;

    if (getRoomType(room) === 'ASSISTANT') return true;

    if (getRoomDisplayName(room) === ASSISTANT_CHAT_TITLE) return true;

    const participants = Array.isArray(room.participants)
        ? room.participants
        : (Array.isArray(room?.room?.participants) ? room.room.participants : []);

    return participants.some((participant) => {
        const participantUser = participant?.user || participant;
        if (isAssistantUser(participantUser)) return true;

        const email = participant?.user?.email || participant?.email;
        return email === ASSISTANT_BOT_EMAIL;
    });
};
