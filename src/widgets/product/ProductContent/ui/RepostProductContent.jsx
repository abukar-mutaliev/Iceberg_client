import React, { useState, useCallback, useEffect } from 'react';
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
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { fetchRooms, sendProduct } from '@entities/chat/model/slice';
import { selectRoomsList } from '@entities/chat/model/selectors';
import ChatApi from '@entities/chat/api/chatApi';
import { getBaseUrl } from '@shared/api/api';
import { debounce } from 'lodash';

export const RepostProductContent = ({ product, currentUser, onClose }) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' или 'search'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  
  const rooms = useSelector(selectRoomsList) || [];
  const currentUserId = currentUser?.id;

  // Загружаем существующие чаты при открытии
  useEffect(() => {
    dispatch(fetchRooms({ page: 1 }));
  }, [dispatch]);

  // Дебаунсированный поиск пользователей
  const searchUsersDebounced = useCallback(
    debounce(async (query) => {
      if (!query || query.trim().length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const response = await ChatApi.searchUsers(query);
        const users = response?.data?.users || [];
        
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

          return {
            ...user,
            hasExistingChat: !!existingRoom,
            existingRoomId: existingRoom?.room?.id || existingRoom?.id
          };
        });

        setSearchResults(enrichedUsers);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300), // Уменьшил задержку для более быстрого поиска
    [rooms]
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

  // Фильтруем чаты (исключаем текущий товар)
  const filteredRooms = rooms.filter(room => {
    if (room.type === 'PRODUCT' && room.productId === product?.id) {
      return false; // Исключаем чат с текущим товаром
    }
    return true;
  });

  // Рендер элемента списка чатов
  const renderChatItem = ({ item }) => {
    const title = item.title || `Чат ${item.id}`;
    const lastMessage = item.lastMessage?.content || 'Нет сообщений';
    const time = item.lastMessage?.createdAt 
      ? new Date(item.lastMessage.createdAt).toLocaleTimeString().slice(0, 5) 
      : '';

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleSendToExistingChat(item)}
        disabled={sending}
      >
        <View style={styles.chatInfo}>
          <Text style={styles.chatTitle}>{title}</Text>
          <Text style={styles.chatPreview}>{lastMessage}</Text>
        </View>
        <View style={styles.chatMeta}>
          <Text style={styles.chatTime}>{time}</Text>
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => handleSendToExistingChat(item)}
            disabled={sending}
          >
            <Text style={styles.sendButtonText}>📤</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Рендер элемента списка пользователей
  const renderUserItem = ({ item }) => {
    const avatarUri = item.avatar;
    const subtitle = item.role === 'SUPPLIER' ? 'Поставщик' : 'Пользователь';

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleSendToUser(item)}
        disabled={sending}
      >
        <View style={styles.avatarContainer}>
          {avatarUri ? (
            <Image 
              source={{ uri: avatarUri }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {item.displayName ? item.displayName[0].toUpperCase() : '👤'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.displayName}</Text>
          <Text style={styles.userSubtitle}>{subtitle}</Text>
          {item.hasExistingChat && (
            <Text style={styles.existingChatText}>Чат существует</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.sendButton}
          onPress={() => handleSendToUser(item)}
          disabled={sending}
        >
          <Text style={styles.sendButtonText}>📤</Text>
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
                      {searchQuery.length < 2 
                        ? 'Введите минимум 2 символа для поиска'
                        : 'Пользователи не найдены'}
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  avatarPlaceholder: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#075E54',
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
  userSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  existingChatText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  sendButton: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: '#075E54',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 18,
    color: '#ffffff',
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
