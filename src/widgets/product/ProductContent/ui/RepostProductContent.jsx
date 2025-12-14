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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { fetchRooms, sendProduct } from '@entities/chat/model/slice';
import { selectRoomsList } from '@entities/chat/model/selectors';
import ChatApi from '@entities/chat/api/chatApi';
import { getBaseUrl } from '@shared/api/api';
import { debounce } from 'lodash';

export const RepostProductContent = ({ product, currentUser, onClose }) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { isAuthenticated } = useAuth();
  
  const [activeTab, setActiveTab] = useState('chats'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  
  const rooms = useSelector(selectRoomsList) || [];
  const currentUserId = currentUser?.id;
  const currentUserRole = useSelector((s) => s.auth?.user?.role);

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
    // Обогащаем результаты информацией о существующих чатах
    const enrichedUsers = users.map(user => {
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

  // Отправка товара в существующий чат
  const handleSendToExistingChat = async (room) => {
    if (!product?.id) return;
    
    setSending(true);
    try {
      const result = await dispatch(sendProduct({
        roomId: room.id,
        productId: product.id
      }));

             if (result.error) {
         throw new Error(result.error);
       }

       onClose();
      
      // Переходим в чат
      navigation.navigate('ChatRoom', {
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
      Alert.alert('Ошибка', 'Не удалось отправить товар в чат');
    } finally {
      setSending(false);
    }
  };

  // Отправка товара пользователю (создание чата или отправка в существующий)
  const handleSendToUser = async (user) => {
    if (!product?.id) return;
    
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
        } else {
          throw new Error('Не удалось создать чат');
        }
      }

      // Отправляем товар
      const result = await dispatch(sendProduct({
        roomId,
        productId: product.id
      }));

             if (result.error) {
         throw new Error(result.error);
       }

       onClose();
      
      // Переходим в чат
      navigation.navigate('ChatRoom', {
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
      Alert.alert('Ошибка', 'Не удалось отправить товар пользователю');
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
      
      // Исключаем чат с текущим товаром
      if (room.type === 'PRODUCT' && room.productId === product?.id) {
        return false;
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
    if ((room?.type === 'GROUP' || room?.type === 'BROADCAST') && room?.title) {
      return room.title;
    }

    if (room?.type === 'DIRECT' && room?.participants && Array.isArray(room.participants) && currentUserId) {
      const partner = room.participants.find(p => {
        const participantId = p?.userId ?? p?.user?.id;
        return participantId !== currentUserId;
      });

      if (partner) {
        const partnerUser = partner.user || partner;

        if (partnerUser?.role === 'SUPPLIER') {
          const companyName =
            partnerUser.supplier?.companyName ||
            partnerUser.companyName ||
            partnerUser.profile?.companyName;
          if (companyName) return companyName;
        }

        const name = partnerUser.name || partnerUser.profile?.name || partnerUser.firstName;
        if (name) return name;

        if (partnerUser.email) {
          const emailName = partnerUser.email.split('@')[0];
          return emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }

        return `Пользователь #${partnerUser.id || partner.id}`;
      }
    }

    if (room?.type === 'GROUP' || room?.type === 'BROADCAST') {
      return room.title || (room?.type === 'BROADCAST' ? 'Канал' : 'Группа');
    }

    return room?.id ? `Комната ${room.id}` : 'Чат';
  }, [currentUserId]);

  // Получение аватара чата
  const getChatAvatar = useCallback((room) => {
    // Для групп и каналов
    if (room?.type === 'GROUP' || room?.type === 'BROADCAST') {
      if (room?.avatar) {
        const avatar = room.avatar;
        if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
          return avatar;
        }
        return `${getBaseUrl()}${avatar}`;
      }
      return null;
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
          if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
            return avatar;
          }
          return `${getBaseUrl()}${avatar}`;
        }
      }
    }

    return null;
  }, [currentUserId]);

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
        style={styles.chatItem}
        onPress={() => handleSendToExistingChat(item)}
        disabled={sending}
      >
        <View style={styles.avatarContainer}>
          {avatar ? (
            <Image 
              source={{ uri: avatar }} 
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatar, styles.placeholderAvatar]}>
              {item.type === 'BROADCAST' ? (
                <Icon name="campaign" size={20} color="#8696A0" />
              ) : item.type === 'GROUP' ? (
                <Icon name="group" size={20} color="#8696A0" />
              ) : (
                <Icon name="person" size={20} color="#8696A0" />
              )}
            </View>
          )}
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.chatTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.chatPreview} numberOfLines={1}>{lastMessageText}</Text>
        </View>
        <View style={styles.chatMeta}>
          <Text style={styles.chatTime}>{time}</Text>
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => handleSendToExistingChat(item)}
            disabled={sending}
          >
            <View style={styles.iconContainer}>
              <Icon name="send" size={20} color="#ffffff" />
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
        style={[styles.userItem, item.isProductSupplier && styles.supplierItem]}
        onPress={() => handleSendToUser(item)}
        disabled={sending}
      >
        <View style={styles.avatarContainer}>
          {avatarUri ? (
            <Image 
              source={{ uri: avatarUri }}
              style={[styles.avatar, item.isProductSupplier && styles.supplierAvatarBorder]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatarPlaceholder, item.isProductSupplier && styles.supplierAvatar]}>
              <Text style={styles.avatarPlaceholderText}>
                {item.displayName ? item.displayName[0].toUpperCase() : '👤'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={[styles.userName, item.isProductSupplier && styles.supplierName]}>
            {item.displayName}
          </Text>
          <Text style={[styles.userSubtitle, item.isProductSupplier && styles.supplierSubtitle]}>
            {subtitle}
          </Text>
          {item.hasExistingChat && (
            <Text style={styles.existingChatText}>Чат существует</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.sendButton, item.isProductSupplier && styles.supplierSendButton]}
          onPress={() => handleSendToUser(item)}
          disabled={sending}
        >
          <View style={styles.iconContainer}>
            <Icon name="send" size={20} color="#ffffff" />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Информация о товаре */}
      <View style={styles.productInfo}>
        {product?.images?.[0] && (
          <Image 
            source={{ uri: product.images[0].startsWith('http') ? product.images[0] : `${getBaseUrl()}/uploads/${product.images[0]}` }}
            style={styles.productImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.productDetails}>
          <Text style={styles.productName} numberOfLines={2}>
            {product?.name || 'Название товара'}
          </Text>
          <Text style={styles.productPrice}>
            {product?.price ? `${product.price} ₽` : 'Цена не указана'}
          </Text>
        </View>
      </View>

      {/* Переключатель вкладок */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chats' && styles.activeTab]}
          onPress={() => setActiveTab('chats')}
        >
          <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]}>
            Мои чаты ({filteredRooms.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Поиск пользователей
          </Text>
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
                <Text style={styles.emptyText}>У вас пока нет чатов</Text>
              </View>
            }
          />
        </View>
      ) : (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по имени или компании..."
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
                    <Text style={styles.emptyText}>
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
          <Text style={styles.loadingText}>Отправляем товар...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#075E54',
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
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
  placeholderAvatar: {
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supplierAvatarBorder: {
    borderWidth: 3,
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
