import { useEffect, useRef } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { loadRoomsCache, fetchRooms, fetchMessages } from '@entities/chat/model/slice';

// Совпадает с лимитом в ChatListScreen, чтобы бейджи считались одинаково.
const BOOTSTRAP_MESSAGES_LIMIT = 50;
// Сколько комнат максимум подгружаем за один проход, чтобы не перегружать сеть.
const MAX_PREFETCH_PER_PASS = 5;

/**
 * Поднимает список комнат и счётчики непрочитанных сразу после входа,
 * чтобы бейдж на таб-баре и данные в store были доступны до первого
 * открытия экрана списка чатов.
 *
 * Дополнительно подгружает последние сообщения для GROUP/BROADCAST комнат
 * с непрочитанными: без bucket селектор `selectRoomsList` не может отфильтровать
 * устаревшие STOP (например, из канала «Маршруты»), и бейдж на таббаре
 * до первого входа в список чатов показывает завышенное число.
 */
export function useChatRoomsBootstrap() {
  const dispatch = useDispatch();
  const store = useStore();
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
  const userId = useSelector((s) => s.auth?.user?.id);
  const role = useSelector((s) => s.auth?.user?.role);
  const roomIds = useSelector((s) => s.chat?.rooms?.ids);
  const unreadByRoomId = useSelector((s) => s.chat?.unreadByRoomId);
  const bootstrappedUserIdRef = useRef(null);
  const prefetchedRoomIdsRef = useRef(new Set());

  // Базовая загрузка списка комнат и счётчиков.
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      bootstrappedUserIdRef.current = null;
      prefetchedRoomIdsRef.current = new Set();
      return;
    }

    if (role === 'SUPPLIER') {
      bootstrappedUserIdRef.current = userId;
      return;
    }

    if (bootstrappedUserIdRef.current === userId) {
      return;
    }

    bootstrappedUserIdRef.current = userId;
    prefetchedRoomIdsRef.current = new Set();
    dispatch(loadRoomsCache());
    dispatch(fetchRooms({ page: 1 }));
  }, [dispatch, isAuthenticated, userId, role]);

  // Подгружаем последние сообщения для GROUP/BROADCAST комнат с непрочитанными,
  // чтобы бейдж в таббаре сразу учитывал фильтрацию (истёкшие/чужие STOP).
  useEffect(() => {
    if (!isAuthenticated || !userId || role === 'SUPPLIER') return;
    if (!Array.isArray(roomIds) || roomIds.length === 0) return;
    if (!unreadByRoomId) return;

    const state = store.getState();
    const roomsById = state.chat?.rooms?.byId || {};
    const messagesByRoom = state.chat?.messages || {};
    const prefetched = prefetchedRoomIdsRef.current;

    let queued = 0;

    for (const rid of roomIds) {
      if (queued >= MAX_PREFETCH_PER_PASS) break;
      if (!rid) continue;
      if (prefetched.has(rid)) continue;

      const unread = Number(unreadByRoomId[rid]) || 0;
      if (unread <= 0) continue;

      const room = roomsById[rid];
      if (!room) continue;
      const type = String(room.type || '').toUpperCase();
      if (type !== 'GROUP' && type !== 'BROADCAST') continue;

      const bucketLen = messagesByRoom?.[rid]?.ids?.length ?? 0;
      if (bucketLen > 0) continue;

      prefetched.add(rid);
      queued += 1;
      dispatch(fetchMessages({ roomId: rid, limit: BOOTSTRAP_MESSAGES_LIMIT }));
    }
  }, [dispatch, isAuthenticated, userId, role, roomIds, unreadByRoomId, store]);
}
