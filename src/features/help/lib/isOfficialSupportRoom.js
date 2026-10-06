export const SUPPORT_ROOM_TITLE = 'Поддержка Iceberg';

export const isOfficialSupportRoom = (room) => {
    if (!room) return false;
    const title = String(room.title || room.roomTitle || room.displayName || '').trim();
    return title === SUPPORT_ROOM_TITLE;
};
