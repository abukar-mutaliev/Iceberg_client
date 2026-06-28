/**
 * Комнаты, которые должны оставаться в списке чатов независимо от пагинации:
 * все BROADCAST-каналы и глобально закреплённые каналы (ассортимент и т.п.).
 */
export const isEssentialListRoom = (room) => {
  if (!room?.id) return false;

  const type = String(room.type || '').toUpperCase();
  const isPinned = Boolean(
    room.isPinnedForAll ||
    room.pinnedForAll ||
    room.isGlobalPinned ||
    room.globalPinned ||
    room.pinMeta?.isPinnedForAll ||
    room.pinMeta?.pinnedForAll ||
    room.pinMeta?.isGlobalPinned ||
    room.pinMeta?.globalPinned
  );

  return type === 'BROADCAST' || isPinned;
};

export default isEssentialListRoom;
