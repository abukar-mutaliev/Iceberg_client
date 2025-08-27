import { createSelector } from '@reduxjs/toolkit';

const EMPTY_ARRAY = [];

export const selectChat = (state) => state.chat;

export const selectRoomsList = createSelector(
  [
    (state) => state.chat?.rooms?.ids,
    (state) => state.chat?.rooms?.byId,
    (state) => state.chat?.unreadByRoomId, // Добавляем зависимость от счетчиков непрочитанных
  ],
  (roomIds, roomsById, unreadByRoomId) => {
    if (!roomIds || !roomsById) return EMPTY_ARRAY;
    return roomIds.map((id) => {
      const room = roomsById[id];
      if (!room) return null;
      
      const unreadFromState = unreadByRoomId?.[id] || 0;
      const unreadFromRoom = room.unread || 0;
      const actualUnread = Math.max(unreadFromState, unreadFromRoom);

      return {
        ...room,
        unread: actualUnread
      };
    }).filter(Boolean);
  }
);


export const makeSelectRoomMessages = () => createSelector(
    [
        (state, roomId) => state.chat?.messages?.[roomId],
        (state, roomId) => state.chat?.rooms?.byId?.[roomId],
        (state) => state.chat?.participants?.byUserId,
        (state) => state.auth?.user?.id,
    ],
    (bucket, room, participantsById, currentUserId) => {
        if (!bucket) return EMPTY_ARRAY;
        const participants = room?.participants || EMPTY_ARRAY;

        return bucket.ids
            .map((id) => bucket.byId[id])
            .filter(Boolean)
            .filter((msg) => {

                if (msg.isDeletedForAll) return false;


                if (currentUserId && msg.hiddenForUserIds &&
                    Array.isArray(msg.hiddenForUserIds) &&
                    msg.hiddenForUserIds.includes(currentUserId)) {
                    return false;
                }

                return true;
            })
            .map((msg) => {
                if (msg.sender && (msg.sender.avatar || msg.sender.name)) return msg;
                const senderId = msg?.senderId;


                const cachedUser = participantsById?.[senderId];
                if (cachedUser) {
                    return {
                        ...msg,
                        sender: {
                            id: senderId,
                            name: cachedUser.name || cachedUser.firstName || cachedUser.companyName,
                            avatar: cachedUser.avatar || cachedUser.image || null,
                        },
                    };
                }


                const p = participants.find((x) => ((x?.userId ?? x?.user?.id)) === senderId);
                if (!p) return msg;
                const enriched = {
                    ...msg,
                    sender: {
                        id: senderId,
                        name: p.companyName || p.name || p.firstName || p.user?.companyName || p.user?.name || p.user?.firstName,
                        avatar: p.user?.avatar || p.user?.profile?.avatar || p.user?.image || p.avatar || p.image || null,
                    },
                };
                return enriched;
            });
    }
);

export const selectUnreadCountByRoomId = (state, roomId) => state.chat?.unreadByRoomId?.[roomId] || 0;

export const selectTypingUserIds = (state, roomId) => state.chat?.typingByRoomId?.[roomId] || EMPTY_ARRAY;

export const selectActiveRoomId = (state) => state.chat?.activeRoomId || null;

