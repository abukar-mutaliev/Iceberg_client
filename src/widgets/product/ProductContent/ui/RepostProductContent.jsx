import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { fetchRooms, sendProduct, fetchRoom, hydrateRooms } from '@entities/chat/model/slice';
import { selectRoomsList } from '@entities/chat/model/selectors';
import { selectProductsById } from '@entities/product/model/selectors';
import ChatApi from '@entities/chat/api/chatApi';
import { getImageUrl } from '@shared/api/api';
import { debounce } from 'lodash';
import { getProductChatShareBlockReason } from '@shared/lib/productChatShare';

export const RepostProductContent = ({ product, currentUser, onClose }) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { isAuthenticated } = useAuth();
  const { width } = useWindowDimensions();
  
  const [activeTab, setActiveTab] = useState('chats'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  
  const rooms = useSelector(selectRoomsList) || [];
  const currentUserId = currentUser?.id;
  const currentUserRole = useSelector((s) => s.auth?.user?.role);
  const productsById = useSelector(selectProductsById);

  const shareBlockReason = useMemo(
    () => getProductChatShareBlockReason(product),
    [product]
  );
  
  // Определяем, является ли экран маленьким
  const isSmallScreen = width < 375;
  
  // Адаптивные стили для мелких экранов
  const adaptiveStyles = useMemo(() => ({
    container: {
      paddingHorizontal: isSmallScreen ? 12 : 20,
    },
    productInfo: {
      paddingVertical: isSmallScreen ? 8 : 12,
    },
    productImage: {
      width: isSmallScreen ? 40 : 50,
      height: isSmallScreen ? 40 : 50,
      marginRight: isSmallScreen ? 8 : 10,
    },
    productName: {
      fontSize: isSmallScreen ? 14 : 16,
    },
    productPrice: {
      fontSize: isSmallScreen ? 12 : 14,
    },
    tab: {
      paddingHorizontal: isSmallScreen ? 4 : 8,
      height: isSmallScreen ? 40 : 44,
    },
    tabText: {
      fontSize: isSmallScreen ? 12 : 14,
      lineHeight: isSmallScreen ? 16 : 20,
    },
    searchInput: {
      fontSize: isSmallScreen ? 14 : 16,
      height: isSmallScreen ? 36 : 40,
      paddingHorizontal: isSmallScreen ? 12 : 16,
    },
    chatTitle: {
      fontSize: isSmallScreen ? 14 : 16,
    },
    chatPreview: {
      fontSize: isSmallScreen ? 12 : 14,
    },
    chatTime: {
      fontSize: isSmallScreen ? 10 : 12,
    },
    avatarContainer: {
      width: isSmallScreen ? 36 : 40,
      height: isSmallScreen ? 36 : 40,
      borderRadius: isSmallScreen ? 18 : 20,
      marginRight: isSmallScreen ? 8 : 10,
    },
    avatar: {
      width: isSmallScreen ? 36 : 40,
      height: isSmallScreen ? 36 : 40,
    },
    avatarPlaceholder: {
      width: isSmallScreen ? 36 : 40,
      height: isSmallScreen ? 36 : 40,
    },
    avatarPlaceholderText: {
      fontSize: isSmallScreen ? 18 : 20,
    },
    userName: {
      fontSize: isSmallScreen ? 14 : 16,
    },
    supplierName: {
      fontSize: isSmallScreen ? 15 : 17,
    },
    userSubtitle: {
      fontSize: isSmallScreen ? 12 : 14,
    },
    supplierSubtitle: {
      fontSize: isSmallScreen ? 11 : 13,
    },
    existingChatText: {
      fontSize: isSmallScreen ? 10 : 12,
    },
    sendButton: {
      width: isSmallScreen ? 32 : 36,
      height: isSmallScreen ? 32 : 36,
      borderRadius: isSmallScreen ? 16 : 18,
    },
    iconContainer: {
      width: isSmallScreen ? 18 : 20,
      height: isSmallScreen ? 18 : 20,
    },
    iconSize: isSmallScreen ? 18 : 20,
    emptyText: {
      fontSize: isSmallScreen ? 14 : 16,
    },
    loadingText: {
      fontSize: isSmallScreen ? 14 : 16,
    },
    chatItem: {
      paddingVertical: isSmallScreen ? 8 : 10,
      paddingRight: isSmallScreen ? 2 : 4,
    },
    userItem: {
      paddingVertical: isSmallScreen ? 10 : 12,
      paddingHorizontal: isSmallScreen ? 6 : 8,
      paddingRight: isSmallScreen ? 8 : 12,
    },
  }), [isSmallScreen]);

  // Загружаем существующие чаты при открытии (только для авторизованных пользователей)
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchRooms({ page: 1 }));
    }
  }, [dispatch, isAuthenticated]);

  // Загружаем список пользователей при открытии вкладки поиска
  useEffect(() => {
    if (isAuthenticated && activeTab === 'search' && !usersLoaded) {
      loadInitialUsers();
    }
  }, [isAuthenticated, activeTab, usersLoaded, loadInitialUsers]);

  // Функция обогащения пользователей информацией о чатах и сортировки
  const enrichAndSortUsers = useCallback((users) => {
    // Исключаем поставщиков из списка пользователей
    const usersWithoutSuppliers = users.filter(user => user.role !== 'SUPPLIER');
    // Обогащаем результаты информацией о существующих чатах
    const enrichedUsers = usersWithoutSuppliers.map(user => {
      const existingRoom = rooms.find(room => {
        const roomData = room.room || room;
        const roomType = roomData.type;
        const roomParticipants = roomData.participants || room.participants;
        
        if (roomType === 'DIRECT') {
          const hasUser = roomParticipants?.some(p => 
            p.userId === user.id || p.id === user.id
          );
          return hasUser;
        }
        return false;
      });

      // Правильная проверка: сравниваем supplierId товара с supplierId пользователя
      const isProductSupplier = product?.supplierId && user.supplierId && product.supplierId === user.supplierId;

      return {
        ...user,
        hasExistingChat: !!existingRoom,
        existingRoomId: existingRoom?.room?.id || existingRoom?.id,
        isProductSupplier: isProductSupplier
      };
    });

    // Сортируем: поставщик товара первым, остальные по алфавиту
    return enrichedUsers.sort((a, b) => {
      if (a.isProductSupplier) return -1;
      if (b.isProductSupplier) return 1;
      return (a.displayName || '').localeCompare(b.displayName || '');
    });
  }, [rooms, product]);

  // Загрузка начального списка пользователей
  const loadInitialUsers = useCallback(async () => {
    setSearching(true);
    try {
      const response = await ChatApi.searchUsers('');
      const users = response?.data?.users || [];
      console.log('📋 Product supplierId:', product?.supplierId);
      console.log('📋 Users loaded:', users.length);
      const sortedUsers = enrichAndSortUsers(users);
      console.log('✅ Sorted users:', sortedUsers.length);
      const supplier = sortedUsers.find(u => u.isProductSupplier);
      if (supplier) {
        console.log('👑 Supplier found:', supplier.displayName, 'supplierId:', supplier.supplierId);
      } else {
        console.log('⚠️ No supplier found for this product');
      }
      setSearchResults(sortedUsers);
      setUsersLoaded(true);
    } catch (error) {
      console.error('Error loading initial users:', error);
      setSearchResults([]);
      setUsersLoaded(true); // Устанавливаем флаг даже при ошибке, чтобы не пытаться загружать снова
    } finally {
      setSearching(false);
    }
  }, [enrichAndSortUsers, product]);

  // Дебаунсированный поиск пользователей
  const searchUsersDebounced = useCallback(
    debounce(async (query) => {
      if (!query || query.trim().length === 0) {
        // Загружаем всех пользователей при пустом запросе
        if (!usersLoaded) {
          loadInitialUsers();
        }
        return;
      }

      setSearching(true);
      try {
        const response = await ChatApi.searchUsers(query);
        const users = response?.data?.users || [];
        const sortedUsers = enrichAndSortUsers(users);
        setSearchResults(sortedUsers);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300), 
    [enrichAndSortUsers, loadInitialUsers, usersLoaded]
  );

  // Обработчик изменения поискового запроса
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    searchUsersDebounced(text);
  };

  const renderAvatarPlaceholder = useCallback((style, content) => (
    <LinearGradient
      colors={['#dfe7ff', '#cdd6ff', '#bfc7ff']}
      style={[styles.avatarPlaceholderBase, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {content}
    </LinearGradient>
  ), []);

  // Отправка товара в существующий чат
  const handleSendToExistingChat = async (room) => {
    if (!product?.id) return;
    if (shareBlockReason) {
      Alert.alert('Недоступно', shareBlockReason);
      return;
    }
    
    setSending(true);
    try {
      await dispatch(sendProduct({
        roomId: room.id,
        productId: product.id
      })).unwrap();

       onClose();
      
      // Переходим в чат
      const rootNavigation =
        navigation?.getParent?.('AppStack') ||
        navigation?.getParent?.()?.getParent?.() ||
        null;

      (rootNavigation || navigation).navigate('ChatRoom', {
        roomId: room.id,
        roomTitle: room.title || 'Чат',
        productId: product.id,
        productInfo: {
          id: product.id,
          supplier: product.supplier
        },
        currentUserId,
        fromScreen: 'ProductDetail'
      });
    } catch (error) {
      console.error('Error sending product to chat:', error);
      const msg = typeof error === 'string' ? error : (error?.message || 'Не удалось отправить товар в чат');
      Alert.alert('Ошибка', msg);
    } finally {
      setSending(false);
    }
  };

  // Отправка товара пользователю (создание чата или отправка в существующий)
  const handleSendToUser = async (user) => {
    if (!product?.id) return;
    if (shareBlockReason) {
      Alert.alert('Недоступно', shareBlockReason);
      return;
    }
    
    setSending(true);
    try {
      let roomId = user.existingRoomId;
      
      // Если чата нет, создаем новый
      if (!roomId) {
        const formData = new FormData();
        formData.append('type', 'DIRECT');
        formData.append('title', user.displayName);
        formData.append('members', JSON.stringify([user.id]));
        
        const response = await ChatApi.createRoom(formData);
        const room = response?.data?.room;
        if (room) {
          roomId = room.id;
          
          // Загружаем полные данные комнаты с участниками
          try {
            const roomResult = await dispatch(fetchRoom(roomId));
            if (roomResult.payload?.room) {
              // Добавляем комнату в Redux store с полными данными участников
              dispatch(hydrateRooms({ rooms: [roomResult.payload.room] }));
            }
          } catch (error) {
            console.warn('Failed to load room details:', error);
            // Продолжаем даже если не удалось загрузить детали
          }
          
          // Обновляем список комнат
          try {
            await dispatch(fetchRooms({ page: 1, forceRefresh: true }));
          } catch (error) {
            console.warn('Failed to refresh rooms list:', error);
          }
        } else {
          throw new Error('Не удалось создать чат');
        }
      }

      await dispatch(sendProduct({
        roomId,
        productId: product.id
      })).unwrap();

       onClose();
      
      // Переходим в чат
      const rootNavigation =
        navigation?.getParent?.('AppStack') ||
        navigation?.getParent?.()?.getParent?.() ||
        null;

      (rootNavigation || navigation).navigate('ChatRoom', {
        roomId,
        roomTitle: user.displayName,
        productId: product.id,
        productInfo: {
          id: product.id,
          supplier: product.supplier
        },
        currentUserId,
        fromScreen: 'ProductDetail'
      });
    } catch (error) {
      console.error('Error sending product to user:', error);
      const msg = typeof error === 'string' ? error : (error?.message || 'Не удалось отправить товар пользователю');
      Alert.alert('Ошибка', msg);
    } finally {
      setSending(false);
    }
  };

  // Фильтруем чаты: исключаем каналы и закрытые группы для обычных пользователей
  const filteredRooms = useMemo(() => {
    if (!rooms || !Array.isArray(rooms)) {
      return [];
    }
    
    return rooms.filter(room => {
      if (!room || !room.id) {
        return false;
      }
      
      // Исключаем все PRODUCT чаты (чаты с поставщиками по товарам)
      if (room.type === 'PRODUCT') {
        return false;
      }

      // Исключаем DIRECT чаты с поставщиками
      if (room?.type === 'DIRECT' && Array.isArray(room?.participants)) {
        const hasSupplier = room.participants.some(p => {
          const user = p?.user || p;
          return user?.role === 'SUPPLIER';
        });
        if (hasSupplier) return false;
      }
      
      // Для каналов (BROADCAST): показываем только админам, водителям и сотрудникам
      if (room?.type === 'BROADCAST') {
        const allowedRoles = ['ADMIN', 'SYSADMIN', 'DRIVER', 'EMPLOYEE'];
        if (currentUserRole && allowedRoles.includes(currentUserRole)) {
          return true;
        }
        return false;
      }
      
      // Проверяем, является ли группа закрытой
      const isLocked = room?.isLocked === true || room?.isLocked === 1 || room?.isLocked === 'true' || String(room?.isLocked).toLowerCase() === 'true';
      
      if (isLocked) {
        // Админы и системные админы могут видеть все закрытые группы
        if (currentUserRole === 'ADMIN' || currentUserRole === 'SYSADMIN') {
          return true;
        }
        
        // Проверяем, является ли пользователь администратором группы
        if (room?.participants && Array.isArray(room.participants) && room.participants.length > 0) {
          const currentParticipant = room.participants.find(p => {
            const participantId = p?.userId ?? p?.user?.id;
            return participantId === currentUserId;
          });
          
          // Показываем только если пользователь является админом или владельцем группы
          if (currentParticipant?.role === 'ADMIN' || currentParticipant?.role === 'OWNER') {
            return true;
          }
        }
        
        // В остальных случаях скрываем закрытую группу
        return false;
      }
      
      return true;
    });
  }, [rooms, currentUserId, currentUserRole, product?.id]);

  // Получение заголовка чата
  const getChatTitle = useCallback((room) => {
    // Для групповых чатов и каналов BROADCAST сразу возвращаем название
    if ((room?.type === 'GROUP' || room?.type === 'BROADCAST') && room?.title) {
      return room.title;
    }

    // Для чатов с товарами показываем название компании поставщика
    if (room?.type === 'PRODUCT') {
      // Ищем поставщика среди участников
      if (room?.participants && Array.isArray(room.participants)) {
        const supplierParticipant = room.participants.find(p => {
          const user = p?.user || p;
          return user?.role === 'SUPPLIER';
        });

        if (supplierParticipant) {
          const supplierUser = supplierParticipant.user || supplierParticipant;
          
          // Сначала проверяем name, который сервер уже установил правильно
          if (supplierUser.name && supplierUser.name !== supplierUser.email) {
            return supplierUser.name;
          }
          
          // Проверяем название компании поставщика
          const companyName =
            supplierUser.supplier?.companyName ||
            supplierUser.companyName ||
            supplierUser.profile?.companyName ||
            null;
          if (companyName) return companyName;

          // Если компании нет, показываем контактное лицо
          const contactPerson =
            supplierUser.supplier?.contactPerson ||
            supplierUser.contactPerson ||
            supplierUser.profile?.contactPerson ||
            null;
          if (contactPerson) return contactPerson;
        }
      }
      
      // Если поставщик не найден, показываем название товара как fallback
      if (room?.product?.name) {
        return `Товар: ${room.product.name}`;
      }
      
      if (room?.productId && productsById[room.productId]?.name) {
        return `Товар: ${productsById[room.productId].name}`;
      }
      
      if (room?.title) {
        return `Товар: ${room.title}`;
      }
      
      // Fallback - показываем что это товар
      return `Товар #${room.productId || room.id}`;
    }

    // Проверяем участников чата (только для DIRECT чатов)
    if (room?.type === 'DIRECT' && room?.participants && Array.isArray(room.participants) && currentUserId) {
      // Ищем участника, который НЕ является текущим пользователем
      const partner = room.participants.find(p => {
        const participantId = p?.userId ?? p?.user?.id;
        return participantId !== currentUserId;
      });

      if (partner) {
        const partnerUser = partner.user || partner;

        // Для поставщиков показываем название компании
        // Сервер уже устанавливает правильное имя в user.name, но проверяем и другие источники
        if (partnerUser?.role === 'SUPPLIER') {
          // Сначала проверяем name, который сервер уже установил правильно
          if (partnerUser.name && partnerUser.name !== partnerUser.email) {
            return partnerUser.name;
          }
          
          // Проверяем все возможные места, где может быть название компании
          const companyName =
            partnerUser.supplier?.companyName ||
            partnerUser.companyName ||
            partnerUser.profile?.companyName ||
            null;
          if (companyName) return companyName;

          // Если компании нет, показываем контактное лицо
          const contactPerson =
            partnerUser.supplier?.contactPerson ||
            partnerUser.contactPerson ||
            partnerUser.profile?.contactPerson ||
            null;
          if (contactPerson) return contactPerson;
        }

        // Для водителей проверяем driver.name в первую очередь
        if (partnerUser?.role === 'DRIVER') {
          // Сначала проверяем name, который сервер уже установил правильно
          if (partnerUser.name && partnerUser.name !== partnerUser.email) {
            return partnerUser.name;
          }
          const driverName = partnerUser.driver?.name || partnerUser.name;
          if (driverName) return driverName;
        }

        // Для сотрудников и админов тоже используем name от сервера
        if (partnerUser?.role === 'EMPLOYEE' || partnerUser?.role === 'ADMIN') {
          if (partnerUser.name && partnerUser.name !== partnerUser.email) {
            return partnerUser.name;
          }
        }

        // Обычное имя пользователя
        // Сначала проверяем name, который сервер уже установил правильно
        if (partnerUser.name && partnerUser.name !== partnerUser.email) {
          return partnerUser.name;
        }
        const name = partnerUser.profile?.name || partnerUser.firstName || partnerUser.profile?.firstName;
        if (name) return name;

        // Fallback на email
        if (partnerUser.email) {
          const emailName = partnerUser.email.split('@')[0];
          return emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }

        // Если ничего не найдено, показываем ID пользователя
        return `Пользователь #${partnerUser.id || partner.id}`;
      }
    }

    // Fallback для групповых чатов и каналов
    if (room?.type === 'GROUP' || room?.type === 'BROADCAST') {
      return room.title || (room?.type === 'BROADCAST' ? 'Канал' : 'Группа');
    }

    return room?.id ? `Комната ${room.id}` : 'Чат';
  }, [currentUserId, productsById]);

  // Функция для преобразования относительных путей в абсолютные URL
  const toAbsoluteUri = useCallback((raw) => {
    if (!raw || typeof raw !== 'string') return null;
    return getImageUrl(raw);
  }, []);

  // Получение аватара чата
  const getChatAvatar = useCallback((room) => {
    if (!room?.id) return null;

    // Для групп и каналов
    if (room.type === 'GROUP' || room.type === 'BROADCAST') {
      if (room.avatar) {
        return toAbsoluteUri(room.avatar);
      }
      return null;
    }

    // Для PRODUCT комнат - изображение товара
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

    // Для личных чатов - аватар собеседника
    if (room?.type === 'DIRECT' && room?.participants && Array.isArray(room.participants) && currentUserId) {
      const partner = room.participants.find(p => {
        const participantId = p?.userId ?? p?.user?.id;
        return participantId !== currentUserId;
      });

      if (partner) {
        const partnerUser = partner.user || partner;
        const avatar = partnerUser?.avatar || 
                      partnerUser?.profile?.avatar || 
                      partnerUser?.image;
        
        if (avatar) {
          return toAbsoluteUri(avatar);
        }
      }
    }

    return null;
  }, [currentUserId, productsById, toAbsoluteUri]);

  // Рендер элемента списка чатов
  const renderChatItem = ({ item }) => {
    const title = getChatTitle(item);
    const avatar = getChatAvatar(item);
    
    // Форматируем последнее сообщение как в ChatListScreen
    let lastMessageText = 'Нет сообщений';
    const lastMessage = item.lastMessage;
    
    if (lastMessage) {
      // Определяем префикс отправителя для групповых чатов
      let senderPrefix = '';
      const isOwnMessage = lastMessage.senderId === currentUserId;
      
      if (item.type === 'GROUP' && lastMessage.sender) {
        const senderName = lastMessage.sender.name ||
          lastMessage.sender.client?.name ||
          lastMessage.sender.admin?.name ||
          lastMessage.sender.employee?.name ||
          lastMessage.sender.supplier?.contactPerson ||
          lastMessage.sender.email?.split('@')[0];

        if (senderName) {
          senderPrefix = isOwnMessage ? 'Вы: ' : `${senderName}: `;
        }
      }
      
      // Форматируем контент сообщения по типу
      let messageContent = '';
      if (lastMessage.type === 'IMAGE') {
        messageContent = 'Фото';
      } else if (lastMessage.type === 'PRODUCT') {
        messageContent = 'Товар';
      } else if (lastMessage.type === 'STOP') {
        messageContent = 'Остановка';
      } else if (lastMessage.type === 'VOICE') {
        messageContent = 'Голосовое сообщение';
      } else if (lastMessage.content && lastMessage.content.trim()) {
        messageContent = lastMessage.content.trim();
      } else {
        messageContent = 'Сообщение';
      }
      
      lastMessageText = senderPrefix + messageContent;
    }
    
    const time = item.lastMessage?.createdAt 
      ? new Date(item.lastMessage.createdAt).toLocaleTimeString().slice(0, 5) 
      : '';

    return (
      <TouchableOpacity
        style={[styles.chatItem, adaptiveStyles.chatItem]}
        onPress={() => handleSendToExistingChat(item)}
        disabled={sending || !!shareBlockReason}
      >
        <View style={[styles.avatarContainer, adaptiveStyles.avatarContainer]}>
          {avatar ? (
            <Image 
              source={{ uri: avatar }} 
              style={[styles.avatar, adaptiveStyles.avatar]}
              resizeMode="cover"
            />
          ) : (
            renderAvatarPlaceholder(
              [styles.avatar, adaptiveStyles.avatar],
              item.type === 'BROADCAST' ? (
                <Icon name="campaign" size={adaptiveStyles.iconSize} color="rgba(255,255,255,0.95)" />
              ) : item.type === 'GROUP' ? (
                <Icon name="group" size={adaptiveStyles.iconSize} color="rgba(255,255,255,0.95)" />
              ) : (
                <Icon name="person" size={adaptiveStyles.iconSize} color="rgba(255,255,255,0.95)" />
              )
            )
          )}
        </View>
        <View style={styles.chatInfo}>
          <Text style={[styles.chatTitle, adaptiveStyles.chatTitle]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.chatPreview, adaptiveStyles.chatPreview]} numberOfLines={1}>{lastMessageText}</Text>
        </View>
        <View style={styles.chatMeta}>
          <Text style={[styles.chatTime, adaptiveStyles.chatTime]}>{time}</Text>
          <TouchableOpacity
            style={[styles.sendButton, adaptiveStyles.sendButton]}
            onPress={() => handleSendToExistingChat(item)}
            disabled={sending || !!shareBlockReason}
          >
            <View style={[styles.iconContainer, adaptiveStyles.iconContainer]}>
              <Icon name="send" size={adaptiveStyles.iconSize} color="#ffffff" />
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Рендер элемента списка пользователей
  const renderUserItem = ({ item }) => {
    const avatarUri = item.avatar;
    
    // Используем subtitle из API (там уже правильно определены должности)
    let subtitle = item.subtitle || 'Пользователь';
    
    // Если это поставщик данного товара, добавляем звёздочку и пометку
    if (item.isProductSupplier) {
      subtitle = '👑 Поставщик этого товара';
    }

    return (
      <TouchableOpacity
        style={[
          styles.userItem, 
          adaptiveStyles.userItem, 
          item.isProductSupplier && styles.supplierItem
        ]}
        onPress={() => handleSendToUser(item)}
        disabled={sending || !!shareBlockReason}
      >
        <View style={[
          styles.avatarContainer, 
          adaptiveStyles.avatarContainer,
          item.isProductSupplier && styles.supplierAvatarContainer
        ]}>
          {avatarUri ? (
            <Image 
              source={{ uri: avatarUri }}
              style={[styles.avatar, adaptiveStyles.avatar]}
              resizeMode="cover"
            />
          ) : (
            renderAvatarPlaceholder(
              [
                styles.avatarPlaceholder,
                adaptiveStyles.avatarPlaceholder,
                item.isProductSupplier && styles.supplierAvatar
              ],
              <Text style={[styles.avatarPlaceholderText, adaptiveStyles.avatarPlaceholderText]}>
                {item.displayName ? item.displayName[0].toUpperCase() : '👤'}
              </Text>
            )
          )}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={[
            styles.userName, 
            adaptiveStyles.userName, 
            item.isProductSupplier && styles.supplierName,
            item.isProductSupplier && adaptiveStyles.supplierName
          ]}>
            {item.displayName}
          </Text>
          <Text style={[
            styles.userSubtitle, 
            adaptiveStyles.userSubtitle, 
            item.isProductSupplier && styles.supplierSubtitle,
            item.isProductSupplier && adaptiveStyles.supplierSubtitle
          ]}>
            {subtitle}
          </Text>
          {item.hasExistingChat && (
            <Text style={[styles.existingChatText, adaptiveStyles.existingChatText]}>Чат существует</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.sendButton, adaptiveStyles.sendButton, item.isProductSupplier && styles.supplierSendButton]}
          onPress={() => handleSendToUser(item)}
          disabled={sending || !!shareBlockReason}
        >
          <View style={[styles.iconContainer, adaptiveStyles.iconContainer]}>
            <Icon name="send" size={adaptiveStyles.iconSize} color="#ffffff" />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, adaptiveStyles.container]}>
      {shareBlockReason ? (
        <View style={styles.shareBlockedBanner}>
          <Text style={styles.shareBlockedText}>{shareBlockReason}</Text>
        </View>
      ) : null}
      {/* Информация о товаре */}
      <View style={[styles.productInfo, adaptiveStyles.productInfo]}>
        {product?.images?.[0] && (
          <Image 
            source={{ uri: getImageUrl(product.images[0]) }}
            style={[styles.productImage, adaptiveStyles.productImage]}
            resizeMode="cover"
          />
        )}
        <View style={styles.productDetails}>
          <Text style={[styles.productName, adaptiveStyles.productName]} numberOfLines={2}>
            {product?.name || 'Название товара'}
          </Text>
          <Text style={[styles.productPrice, adaptiveStyles.productPrice]}>
            {product?.price ? `${product.price} ₽` : 'Цена не указана'}
          </Text>
        </View>
      </View>

      {/* Переключатель вкладок */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, adaptiveStyles.tab, activeTab === 'chats' && styles.activeTab]}
          onPress={() => setActiveTab('chats')}
          activeOpacity={0.7}
        >
          <View style={styles.tabTextContainer}>
            <View style={styles.tabTextWrapper}>
              <Text
                style={[styles.tabText, adaptiveStyles.tabText, activeTab === 'chats' && styles.activeTabText]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {isSmallScreen ? `Чаты (${filteredRooms.length})` : `Мои чаты (${filteredRooms.length})`}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, adaptiveStyles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
          activeOpacity={0.7}
        >
          <View style={styles.tabTextContainer}>
            <View style={styles.tabTextWrapper}>
              <Text
                style={[styles.tabText, adaptiveStyles.tabText, activeTab === 'search' && styles.activeTabText]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {isSmallScreen ? 'Поиск' : 'Поиск пользователей'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Контент вкладок */}
      {activeTab === 'chats' ? (
        <View style={styles.listContainer}>
          <FlatList
            data={filteredRooms}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderChatItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, adaptiveStyles.emptyText]}>У вас пока нет чатов</Text>
              </View>
            }
          />
        </View>
      ) : (
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, adaptiveStyles.searchInput]}
            placeholder="Поиск по имени или компании..."
            placeholderTextColor="#999999"
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching && (
            <ActivityIndicator size="small" color="#075E54" style={styles.searchLoader} />
          )}
          
          <View style={styles.listContainer}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderUserItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                !searching && (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, adaptiveStyles.emptyText]}>
                      {searchQuery.length > 0 
                        ? 'Пользователи не найдены'
                        : 'Нет доступных пользователей'}
                    </Text>
                  </View>
                )
              }
            />
          </View>
        </View>
      )}

      {/* Индикатор загрузки при отправке */}
      {sending && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#075E54" />
          <Text style={[styles.loadingText, adaptiveStyles.loadingText]}>Отправляем товар...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  shareBlockedBanner: {
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFCC80',
  },
  shareBlockedText: {
    fontSize: 14,
    color: '#E65100',
    textAlign: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  productInfo: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 10,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#666666',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
    paddingHorizontal: 8,
  },
  activeTab: {
    backgroundColor: '#075E54',
  },
  tabTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  tabTextWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 20,
    ...Platform.select({
      ios: {
        textAlign: 'center',
      },
      android: {
        textAlignVertical: 'center',
      },
    }),
  },
  activeTabText: {
    color: '#ffffff',
  },
  searchContainer: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  searchInput: {
    marginVertical: 12,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  searchLoader: {
    alignSelf: 'center',
    marginVertical: 8,
  },
  listContent: {
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  chatInfo: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  chatPreview: {
    fontSize: 14,
    color: '#666666',
  },
  chatMeta: {
    alignItems: 'flex-end',
  },
  chatTime: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    position: 'relative',
  },
  supplierItem: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    borderRadius: 8,
    marginVertical: 4,
    elevation: 3,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
    marginRight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
  },
  avatarPlaceholderBase: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderAvatar: {
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supplierAvatarContainer: {
    borderWidth: 0,
    borderColor: '#FF9800',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#075E54',
  },
  supplierAvatar: {
    backgroundColor: '#FF9800',
    borderWidth: 2,
    borderColor: '#F57C00',
  },
  avatarPlaceholderText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  supplierName: {
    color: '#E65100',
    fontWeight: '700',
    fontSize: 17,
  },
  userSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  supplierSubtitle: {
    color: '#FF6F00',
    fontWeight: '600',
    fontSize: 13,
  },
  existingChatText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  sendButton: {
    borderRadius: 18,
    backgroundColor: '#075E54',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplierSendButton: {
    backgroundColor: '#FF9800',
    elevation: 3,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#075E54',
  },
});
