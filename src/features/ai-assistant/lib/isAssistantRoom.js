import { ASSISTANT_CHAT_TITLE } from '../constants';

const ASSISTANT_BOT_EMAIL = 'ai-assistant@system.local';

/**
 * Определяет, является ли комната диалогом с ИИ-помощником.
 * Проверяет type, title и email бота среди участников.
 */
export const isAssistantRoom = (room) => {
    if (!room) return false;

    const roomType = String(room.type || room?.room?.type || '').toUpperCase();
    if (roomType === 'ASSISTANT') return true;

    const title = String(room.title || room?.room?.title || '').trim();
    if (title === ASSISTANT_CHAT_TITLE) return true;

    const participants = Array.isArray(room.participants)
        ? room.participants
        : (Array.isArray(room?.room?.participants) ? room.room.participants : []);

    return participants.some((participant) => {
        const email = participant?.user?.email || participant?.email;
        return email === ASSISTANT_BOT_EMAIL;
    });
};
