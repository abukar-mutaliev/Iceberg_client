import { createSelector } from '@reduxjs/toolkit';

const EMPTY_ARRAY = [];

export const selectChat = (state) => state.chat;

export const selectRoomsList = createSelector(
  [
    (state) => state.chat?.rooms?.ids,
    (state) => state.chat?.rooms?.byId,
    (state) => state.chat?.unreadByRoomId,
    (state) => state.chat?.participants?.byUserId,
    (state) => state.chat?.messages, // Добавляем сообщения для отслеживания статуса
    (state) => state.auth?.user?.id,
  ],
  (roomIds, roomsById, unreadByRoomId, participantsById, messages, currentUserId) => {
    if (!roomIds || !roomsById) return EMPTY_ARRAY;

    return roomIds.map((id) => {
      // Защита от undefined/null ID
      if (!id) return null;
      const room = roomsById[id];
      if (!room) return null;
      
      // Используем только unreadByRoomId как единственный источник истины
      // Если комната не в unreadByRoomId, считаем что unread = 0
      const actualUnread = unreadByRoomId?.[id] ?? 0;

      if (__DEV__ && actualUnread > 0) {
        console.log(`🎯 Selector: Room ${id} unread count: ${actualUnread} (from unreadByRoomId)`);
      }

            // Получаем последнее сообщение с актуальным статусом
      let lastMessage = null;

      // Сначала проверяем сообщения в store (они содержат актуальный статус)
      if (messages?.[id]?.ids && messages[id].ids.length > 0) {
        const allMessages = messages[id].ids.map(msgId => messages[id].byId[msgId]).filter(Boolean);
        if (allMessages.length > 0) {
          // Сортируем по времени создания (новые в конце) и берем последнее
          const sortedMessages = allMessages.sort((a, b) =>
            new Date(a.createdAt) - new Date(b.createdAt)
          );
          const lastMessageFromStore = sortedMessages[sortedMessages.length - 1];

          // Используем сообщение из store как основу
          lastMessage = lastMessageFromStore;
        }
      }

      // Если в store нет сообщений, используем room.lastMessage
      if (!lastMessage && room.lastMessage) {
        lastMessage = room.lastMessage;
      }

      // Всегда пытаемся объединить данные из room.lastMessage если они есть
      // Это нужно для получения правильной информации об отправителе
      if (lastMessage && room.lastMessage) {
        if (room.lastMessage.id === lastMessage.id) {
          // То же сообщение - объединяем данные
          lastMessage = {
            ...room.lastMessage, // База с правильными данными об отправителе
            // Перезаписываем статус и временные метки из store (более актуальные)
            status: lastMessage.status || room.lastMessage.status || 'SENT',
            deliveredAt: lastMessage.deliveredAt || room.lastMessage.deliveredAt,
            readAt: lastMessage.readAt || room.lastMessage.readAt
          };
        } else {
          // Разные сообщения - используем более новое, но добавляем информацию об отправителе
          const storeTime = new Date(lastMessage.createdAt);
          const roomTime = new Date(room.lastMessage.createdAt);

          if (storeTime >= roomTime) {
            // Сообщение из store новее или равно по времени
            lastMessage = {
              ...lastMessage,
              // Добавляем информацию об отправителе из room.lastMessage если ее нет
              senderId: lastMessage.senderId || room.lastMessage.senderId,
              sender: lastMessage.sender || room.lastMessage.sender
            };
          } else {
            // room.lastMessage новее - используем его
            lastMessage = room.lastMessage;
          }
        }
      }
      
      // Если lastMessage все еще undefined, используем room.lastMessage как fallback
      if (!lastMessage && room.lastMessage) {
        lastMessage = room.lastMessage;
      }

      // Для групповых чатов добавляем информацию об отправителе
      if (room.type === 'GROUP' && lastMessage && lastMessage.senderId && lastMessage.senderId !== currentUserId) {
        const senderId = lastMessage.senderId;

        // Ищем отправителя среди участников
        const sender = participantsById?.[senderId] ||
                       room.participants?.find(p => (p?.userId ?? p?.user?.id) === senderId);

        if (sender) {
          const senderUser = sender.user || sender;
          const senderName = senderUser.name ||
                           senderUser.firstName ||
                           senderUser.companyName ||
                           `Пользователь ${senderId}`;

          lastMessage.senderName = senderName;
          if (!lastMessage.sender) {
            lastMessage.sender = {
              id: senderId,
              name: senderName,
              avatar: senderUser.avatar || senderUser.image
            };
          }
        }
      }
      
      // Отладочная информация для диагностики
      if (__DEV__) {
        console.log(`📋 selectRoomsList debug for room ${id} (${room.title || 'No title'}):`, {
          roomId: id,
          roomType: room.type,
          hasMessages: !!messages?.[id],
          messagesCount: messages?.[id]?.ids?.length || 0,
          lastMessage,
          finalLastMessage: lastMessage,
          lastMessageStatus: lastMessage?.status?.toUpperCase() || lastMessage?.status,
          lastMessageDeliveredAt: lastMessage?.deliveredAt,
          lastMessageReadAt: lastMessage?.readAt,
          lastMessageSenderId: lastMessage?.senderId,
          currentUserId: currentUserId,
          isOwnMessage: lastMessage?.senderId === currentUserId,
          roomLastMessage: room.lastMessage,
          roomLastMessageStatus: room.lastMessage?.status,
          messagesStructure: messages?.[id] ? {
            hasIds: !!messages[id].ids,
            hasById: !!messages[id].byId,
            idsLength: messages[id].ids?.length,
            byIdKeys: messages[id].byId ? Object.keys(messages[id].byId) : null,
            sampleMessage: messages[id].byId && messages[id].ids?.length > 0 ?
              messages[id].byId[messages[id].ids[messages[id].ids.length - 1]] : null
          } : null
        });
      }

      // Обрабатываем участников чата
      let processedRoom = {
        ...room,
        unread: actualUnread,
        lastMessage, // Добавляем обновленное последнее сообщение
        // Убираем создание массива messages - он не нужен для списка чатов
      };

      // Если есть участники, обогащаем их данными
      if (room.participants && Array.isArray(room.participants)) {
        processedRoom.participants = room.participants.map(participant => {
          const participantId = participant?.userId ?? participant?.user?.id;
          const cachedUser = participantsById?.[participantId];
          
          if (cachedUser) {
            return {
              ...participant,
              user: {
                ...participant.user,
                ...cachedUser,
                name: cachedUser.name || cachedUser.firstName || cachedUser.companyName || participant.user?.name,
                avatar: cachedUser.avatar || cachedUser.image || participant.user?.avatar,
                role: cachedUser.role || participant.user?.role,
              }
            };
          }
          
          return participant;
        });
      }

      return processedRoom;
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


