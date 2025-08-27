import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet, RefreshControl, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRooms, setActiveRoom, loadRoomsCache, fetchRoom } from '@entities/chat/model/slice';
import { fetchProductById } from '@entities/product/model/slice';
import { selectRoomsList } from '@entities/chat/model/selectors';
import { selectProductsById } from '@entities/product/model/selectors';
import { getBaseUrl } from '@shared/api/api';

export const ChatListScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const rooms = useSelector(selectRoomsList) || [];
  const loading = useSelector((s) => s.chat?.rooms?.loading);
  const currentUserId = useSelector((s) => s.auth?.user?.id);
  const participantsById = useSelector((s) => s.chat?.participants?.byUserId || {});
  const productsById = useSelector(selectProductsById);
  const page = useSelector((s) => s.chat?.rooms?.page);
  const hasMore = useSelector((s) => s.chat?.rooms?.hasMore);
  
  const memoizedRooms = useMemo(() => rooms, [rooms]);
  const loadedProductsRef = useRef(new Set());

  useEffect(() => {
    dispatch(loadRoomsCache());
    dispatch(fetchRooms({ page: 1 }));
  }, [dispatch]);

    useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      dispatch(fetchRooms({ page: 1 }));
    });
    return unsubscribe;
  }, [dispatch, navigation]);
  
  useEffect(() => {
    if (!Array.isArray(memoizedRooms) || memoizedRooms.length === 0) return;
    
    const maxToPrefetch = 5;
    const subset = memoizedRooms.slice(0, maxToPrefetch);
    
    subset.forEach((room) => {
      const hasParticipants = Array.isArray(room?.participants) && room.participants.length > 0;
      if (!hasParticipants && room?.id) {
        dispatch(fetchRoom(room.id));
      }
    });
  }, [memoizedRooms, dispatch]);
  
  useEffect(() => {
    if (!Array.isArray(memoizedRooms) || memoizedRooms.length === 0) return;
    
    const productRooms = memoizedRooms.filter(room => 
      room?.type === 'PRODUCT' && 
      room?.productId && 
      !room?.product
    );
    
    if (productRooms.length === 0) return;
    
    const roomsToLoad = productRooms.filter(room => 
      !productsById[room.productId] && 
      !loadedProductsRef.current.has(room.productId)
    );
    
    if (roomsToLoad.length > 0) {
      roomsToLoad.forEach((room) => {
        loadedProductsRef.current.add(room.productId);
        dispatch(fetchProductById(room.productId));
      });
    }
  }, [memoizedRooms, productsById, dispatch]);
  
    useEffect(() => {
    loadedProductsRef.current.clear();
  }, [memoizedRooms]);
  
  useFocusEffect(
    useCallback(() => {
      dispatch(setActiveRoom(null));
    }, [dispatch])
  );
  
  const getChatTitle = useCallback((room) => {
    if (room?.title) return room.title;
    
    if (room?.product?.name) {
      return `Товар: ${room.product.name}`;
    }
    
    if (room?.participants && Array.isArray(room.participants) && currentUserId) {
      const partner = room.participants.find(p => ((p?.userId ?? p?.user?.id)) !== currentUserId);
      if (partner) {
        const partnerUser = partner.user || partner;
        
        if (partnerUser?.role === 'SUPPLIER') {
          const companyName = 
            partnerUser.supplier?.companyName ||     
            partnerUser.companyName ||              
            partnerUser.profile?.companyName;        
          if (companyName) return companyName;
          
          const contactPerson = 
            partnerUser.supplier?.contactPerson ||  
            partnerUser.contactPerson ||         
            partnerUser.profile?.contactPerson;     
          if (contactPerson) return contactPerson;
        }
        
        const name = partnerUser.name || partnerUser.profile?.name || partnerUser.firstName || partnerUser.profile?.firstName;
        if (name) return name;
        
        if (partnerUser.email) {
          const emailName = partnerUser.email.split('@')[0];
          return emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }
      }
    }
    
    return room?.id ? `Комната ${room.id}` : 'Чат';
  }, [currentUserId]);

  const toAbsoluteUri = useCallback((raw) => {
    if (!raw || typeof raw !== 'string') return null;
    if (raw.startsWith('http')) return raw;
    let path = raw.replace(/^\\+/g, '').replace(/^\/+/, '');
    // убираем ведущий uploads/ если есть
    path = path.replace(/^uploads\/?/, '');
    return `${getBaseUrl()}/uploads/${path}`;
  }, []);

         const getRoomAvatar = useCallback((room) => {
      if (!room?.id) return null;
      
      if (room.type === 'GROUP') {
        if (room.avatar) {
          return toAbsoluteUri(room.avatar);
        }
        return null;
      }
      
      if (room?.product) {
        if (room.product.images && Array.isArray(room.product.images) && room.product.images.length > 0) {
          return toAbsoluteUri(room.product.images[0]);
        }
        
        if (room.product.image) {
          return toAbsoluteUri(room.product.image);
        }
      }
      
      if (room?.type === 'PRODUCT' && room?.productId && !room?.product) {
        const productFromStore = productsById[room.productId];
        
        if (productFromStore) {
          if (productFromStore.images && Array.isArray(productFromStore.images) && productFromStore.images.length > 0) {
            return toAbsoluteUri(productFromStore.images[0]);
          }
          
          if (productFromStore.image) {
            return toAbsoluteUri(productFromStore.image);
          }
        }
      }
      
      const participants = Array.isArray(room?.participants) ? room.participants : [];
      const other = currentUserId
        ? (participants.find(p => ((p?.userId ?? p?.user?.id)) !== currentUserId) || participants[0])
        : participants[0];
      
      const otherUserId = other?.userId ?? other?.user?.id ?? other?.id;
      
      const cachedUser = participantsById[otherUserId];
      const avatarRaw = cachedUser?.avatar 
        || room?.avatar 
        || other?.user?.avatar 
        || other?.avatar 
        || room?.product?.supplier?.user?.avatar
        || room?.product?.supplier?.avatar
        || null;
      
      return toAbsoluteUri(avatarRaw);
    }, [currentUserId, participantsById, productsById, toAbsoluteUri]);

  const onRefresh = useCallback(() => {
    dispatch(fetchRooms({ page: 1 }));
  }, [dispatch]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      dispatch(fetchRooms({ page: (page || 1) + 1 }));
    }
  }, [dispatch, loading, hasMore, page]);

  const openRoom = (room) => {
    const rid = room?.id ?? room?.roomId;
    if (!rid) return;
    dispatch(setActiveRoom(rid));
    const productInfo = room?.product ? { id: room.product?.id, supplier: room.product?.supplier } : undefined;
    navigation.navigate('ChatRoom', { 
      roomId: rid, 
      roomTitle: room?.title, 
      productId: room?.productId || room?.product?.id, 
      productInfo,
      currentUserId,
      fromScreen: 'ChatList'
    });
  };

  const renderItem = useCallback(({ item }) => {
    const title = getChatTitle(item);
    const avatarUri = getRoomAvatar(item);
    const preview = item.lastMessage?.type === 'IMAGE' ? 'Фото' : (item.lastMessage?.content || '');
    const time = item.lastMessage?.createdAt ? new Date(item.lastMessage.createdAt).toLocaleTimeString().slice(0,5) : '';
    
    return (
      <TouchableOpacity style={styles.item} onPress={() => openRoom(item)}>
        <View style={styles.avatarBox}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} resizeMode="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              {item.type === 'GROUP' ? (
                <Text style={styles.groupPlaceholderText}>👥</Text>
              ) : item?.product ? (
                <Text style={styles.productPlaceholderText}>📦</Text>
              ) : (
                <Text style={styles.userPlaceholderText}>👤</Text>
              )}
            </View>
          )}
        </View>
        <View style={styles.textContainer}>
          <View style={styles.rowBetween}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.time}>{time}</Text>
          </View>
          <Text style={styles.preview} numberOfLines={1}>{preview}</Text>
        </View>
        {!!item.unread && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.unread}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [getChatTitle, getRoomAvatar, openRoom]);

  const keyExtractor = useCallback((item) => String(item.id), []);
  
  const getItemLayout = useCallback((data, index) => ({
    length: 72,
    offset: 72 * index,
    index,
  }), []);
  
  const SeparatorComponent = useCallback(() => <View style={styles.separator} />, []);
  
  const EmptyComponent = useCallback(() => (
    !loading ? (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <Text style={{ color: '#8696A0' }}>Чатов пока нет</Text>
      </View>
    ) : null
  ), [loading]);

  return (
    <View style={styles.container}>
      <FlatList
        data={Array.isArray(memoizedRooms) ? memoizedRooms : []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReachedThreshold={0.5}
        onEndReached={loadMore}
        refreshControl={<RefreshControl refreshing={!!loading && (page === 1)} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        initialNumToRender={10}
        windowSize={5}
        maxToRenderPerBatch={5}
        removeClippedSubviews
        getItemLayout={getItemLayout}
        ItemSeparatorComponent={SeparatorComponent}
        ListEmptyComponent={EmptyComponent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContainer: {
    paddingVertical: 0,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginLeft: 68,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 72,
  },
  avatar: {
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#DDD',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#DDD',
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupPlaceholderText: {
    fontSize: 20,
    color: '#666',
  },
  productPlaceholderText: {
    fontSize: 18,
    color: '#666',
  },
  userPlaceholderText: {
    fontSize: 18,
    color: '#666',
  },
  textContainer: {
    flex: 1,
  },
  rowBetween: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: 16, 
    fontWeight: '500', 
    color: '#000000',
    maxWidth: '75%',
    lineHeight: 22,
  },
  preview: {
    fontSize: 14, 
    color: '#8696A0',
    marginTop: 2,
    lineHeight: 20,
  },
  time: {
    fontSize: 12, 
    color: '#8696A0',
    lineHeight: 16,
  },
  badge: {
    backgroundColor: '#25D366',
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 10, 
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF', 
    fontSize: 12, 
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ChatListScreen;

