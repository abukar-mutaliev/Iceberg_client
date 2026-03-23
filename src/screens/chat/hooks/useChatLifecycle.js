import { useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { AppState, Animated, Keyboard } from 'react-native';
import { 
  fetchMessages, 
  markAsRead, 
  fetchRoom, 
  setActiveRoom,
  fetchProductById,
  sendProduct
} from '@entities/chat/model/slice';
import { useChatSocketActions } from '@entities/chat/hooks/useChatSocketActions';
import { useTypingIndicatorHeight } from '@entities/chat';
import PushNotificationService from '@shared/services/PushNotificationService';
import { useTabBar } from '@widgets/navigation/context';
import { MESSAGES_LOAD_LIMIT } from '../utils/chatConstants';
import { getProductChatShareBlockReason } from '@shared/lib/productChatShare';

/**
 * Хук для управления lifecycle чата
 * Включает: монтирование, уведомления, активную комнату, автоотправку, загрузку сообщений
 */
export const useChatLifecycle = ({
  roomId,
  userId,
  isRoomDeleted,
  isRoomDeletedRef,
  autoSendProduct,
  productInfo,
  messages,
  currentUserId,
  navigation,
  paddingTopAnimRef,
  setAnimatedPaddingTop,
  cursorId,
  hasMore,
  isLoadingMoreRef,
}) => {
  const dispatch = useDispatch();
  const { hideTabBar, showTabBar } = useTabBar();
  const { emitActiveRoom } = useChatSocketActions();
  const appStateRef = useRef(AppState.currentState);
  const typingIndicatorHeight = useTypingIndicatorHeight(roomId);
  
  // Монтирование/размонтирование
  useEffect(() => {
    hideTabBar();
    
    return () => {
      showTabBar();
    };
  }, [hideTabBar, showTabBar]);
  
  // TabBar visibility
  useFocusEffect(
    useCallback(() => {
      hideTabBar();
      return () => {
        showTabBar();
      };
    }, [hideTabBar, showTabBar])
  );
  
  // Активная комната - КРИТИЧНО для подавления уведомлений
  // Устанавливаем СРАЗУ через useLayoutEffect
  useLayoutEffect(() => {
    if (!roomId) return;
    
    // Устанавливаем активную комнату СРАЗУ, даже если userId еще не определен
    PushNotificationService.setActiveChatRoomId(roomId);
    
    // Пытаемся получить userId из route.params или из chatPartner
    const peerUserId = userId || null;
    PushNotificationService.setActiveChatPeerUserId(peerUserId);
    
    if (__DEV__) {
      console.log('[useChatLifecycle] 🔄 [useLayoutEffect] Устанавливаем активную комнату СРАЗУ', { 
        roomId,
        userId: peerUserId,
      });
    }
    
    return () => {
      // Cleanup ТОЛЬКО при размонтировании компонента
      if (__DEV__) {
        console.log('[useChatLifecycle] 🗑️ [useLayoutEffect] Cleanup: сбрасываем активную комнату', { roomId });
      }
      PushNotificationService.setActiveChatRoomId(null);
      PushNotificationService.setActiveChatPeerUserId(null);
    };
  }, [roomId, userId]);
  
  // Полная инициализация комнаты
  useEffect(() => {
    if (isRoomDeletedRef?.current || isRoomDeleted || !roomId) {
      if (__DEV__) {
        console.log('[useChatLifecycle] ⚠️ Пропуск установки активной комнаты', {
          isRoomDeletedRef: isRoomDeletedRef?.current,
          isRoomDeleted,
          roomId
        });
      }
      return;
    }

    // Обновляем активную комнату (на случай, если userId изменился)
    if (PushNotificationService.getActiveChatRoomId() !== String(roomId)) {
      PushNotificationService.setActiveChatRoomId(roomId);
    }
    const currentPeerUserId = PushNotificationService.getActiveChatPeerUserId();
    if (userId && currentPeerUserId !== String(userId)) {
      PushNotificationService.setActiveChatPeerUserId(userId);
    }
    
    dispatch(setActiveRoom(roomId));
    emitActiveRoom?.(roomId);
    
    // КРИТИЧНО: Обрабатываем ошибку 404 при загрузке комнаты
    // Если комната удалена другим участником, она будет удалена из списка через fetchRoom.rejected
    dispatch(fetchRoom(roomId)).then((result) => {
      // Если комната не найдена (404), она уже обработана в fetchRoom.rejected
      // и помечена как удаленная, что вызовет isRoomDeleted и вернет на список чатов
      if (result.type.endsWith('/rejected')) {
        const payload = result.payload;
        if (payload?.isNotFound && payload?.roomId) {
          if (__DEV__) {
            console.log('[useChatLifecycle] ⚠️ Room not found (404), will be removed from list', { roomId });
          }
        }
      }
    }).catch(() => {
      // Игнорируем ошибки - они обрабатываются в fetchRoom.rejected
    });

    let markAsReadTimeout;
    const unsubscribe = navigation.addListener('focus', () => {
      if (!isRoomDeletedRef?.current && !isRoomDeleted) {
        PushNotificationService.setActiveChatRoomId(roomId);
        PushNotificationService.setActiveChatPeerUserId(userId);
        PushNotificationService.clearChatNotifications(roomId);
        PushNotificationService.clearChatNotificationsForPeerUser(userId);
        
        clearTimeout(markAsReadTimeout);
        markAsReadTimeout = setTimeout(() => {
          dispatch(markAsRead({roomId, currentUserId}));
        }, 300);
      }
    });
    
    return () => {
      unsubscribe();
      clearTimeout(markAsReadTimeout);
      // НЕ сбрасываем активную комнату здесь - это делается в useLayoutEffect cleanup
      dispatch(setActiveRoom(null));
      emitActiveRoom?.(null);
    };
  }, [dispatch, roomId, navigation, currentUserId, emitActiveRoom, isRoomDeleted, userId, isRoomDeletedRef]);
  
  // Проверка удаления комнаты
  useEffect(() => {
    if (roomId) {
      isRoomDeletedRef.current = false;
    }
    
    if (isRoomDeleted && roomId) {
      isRoomDeletedRef.current = true;
      dispatch(setActiveRoom(null));
      emitActiveRoom?.(null);
      
      const navigateAway = () => {
        try {
          const parent = navigation.getParent();
          if (parent) {
            parent.navigate('ChatMain');
          } else if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('ChatMain');
          }
        } catch (error) {
          navigation.canGoBack() && navigation.goBack();
        }
      };
      
      navigateAway();
    }
  }, [isRoomDeleted, roomId, dispatch, navigation, emitActiveRoom, isRoomDeletedRef]);
  
  // AppState - синхронизация при возврате из фона
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        Keyboard.dismiss();
      }
      
      if (appStateRef.current.match(/inactive|background/) && 
          nextAppState === 'active' && 
          roomId && 
          !isRoomDeletedRef?.current) {
        dispatch(fetchMessages({ roomId, limit: 100 }));
        Keyboard.dismiss();
      }
      
      appStateRef.current = nextAppState;
    });
    
    return () => subscription?.remove();
  }, [roomId, dispatch, isRoomDeletedRef]);
  
  // Анимация padding для индикатора печати
  useEffect(() => {
    const paddingTopAnim = new Animated.Value(paddingTopAnimRef?.current || 0);
    const targetValue = typingIndicatorHeight > 0 ? 35 : 0;
    
    const listenerId = paddingTopAnim.addListener(({ value }) => {
      if (paddingTopAnimRef) {
        paddingTopAnimRef.current = value;
      }
      setAnimatedPaddingTop(value);
    });
    
    Animated.spring(paddingTopAnim, {
      toValue: targetValue,
      useNativeDriver: false,
      tension: 65,
      friction: 8,
    }).start();
    
    return () => {
      paddingTopAnim.removeListener(listenerId);
    };
  }, [typingIndicatorHeight, setAnimatedPaddingTop, paddingTopAnimRef]);
  
  // Автоотправка товара
  useEffect(() => {
    if (!autoSendProduct || !productInfo) return;

    const hasProductMessage = messages.some(msg =>
      msg.type === 'PRODUCT' &&
      (msg.productId === productInfo.id || msg.product?.id === productInfo.id)
    );

    if (hasProductMessage) return;

    const timeoutId = setTimeout(async () => {
      const hasProductMessageAfterLoad = messages.some(msg =>
        msg.type === 'PRODUCT' &&
        (msg.productId === productInfo.id || msg.product?.id === productInfo.id)
      );

      if (!hasProductMessageAfterLoad) {
        try {
          const fetched = await dispatch(fetchProductById(productInfo.id));
          const loaded = fetched?.payload?.data;
          const blockReason = getProductChatShareBlockReason(loaded || productInfo);
          if (blockReason) {
            if (__DEV__) {
              console.warn('DirectChat: пропуск автоотправки товара (модерация/доступность)', blockReason);
            }
            return;
          }

          await dispatch(sendProduct({ roomId, productId: productInfo.id })).unwrap();

          setTimeout(() => {
            dispatch(fetchMessages({roomId, limit: 100}));
          }, 500);
        } catch (error) {
          console.error('DirectChat: Ошибка при автоматической отправке товара', error);
        }
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [autoSendProduct, productInfo, roomId, dispatch, messages]);
  
  // Отметка непрочитанных
  useEffect(() => {
    if (!messages?.length || !currentUserId) return;

    const unreadMessages = messages.filter(msg =>
      msg.senderId !== currentUserId &&
      (msg.status === 'SENT' || msg.status === 'DELIVERED')
    );

    if (unreadMessages.length > 0) {
      const timeoutId = setTimeout(() => {
        const messageIds = unreadMessages.map(msg => msg.id);
        dispatch(markAsRead({roomId, currentUserId, messageIds}));
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [messages, currentUserId, roomId, dispatch]);
  
  // Функция загрузки дополнительных сообщений
  const loadMoreMessages = useCallback(() => {
    if (isLoadingMoreRef?.current || !hasMore || !roomId || isRoomDeleted) return;
    
    isLoadingMoreRef.current = true;
    dispatch(fetchMessages({ 
      roomId, 
      limit: MESSAGES_LOAD_LIMIT, 
      cursorId, 
      direction: 'backward' 
    }))
      .finally(() => { 
        if (isLoadingMoreRef) {
          isLoadingMoreRef.current = false; 
        }
      });
  }, [hasMore, cursorId, roomId, isRoomDeleted, dispatch, isLoadingMoreRef]);
  
  return {
    loadMoreMessages,
  };
};
