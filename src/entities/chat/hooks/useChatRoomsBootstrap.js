import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadRoomsCache, fetchRooms } from '@entities/chat/model/slice';

/**
 * Поднимает список комнат и счётчики непрочитанных сразу после входа,
 * чтобы бейдж на таб-баре и данные в store были доступны до первого
 * открытия экрана списка чатов.
 */
export function useChatRoomsBootstrap() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
  const userId = useSelector((s) => s.auth?.user?.id);
  const role = useSelector((s) => s.auth?.user?.role);
  const bootstrappedUserIdRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      bootstrappedUserIdRef.current = null;
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
    dispatch(loadRoomsCache());
    dispatch(fetchRooms({ page: 1 }));
  }, [dispatch, isAuthenticated, userId, role]);
}
