import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image 
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ChatApi from '@entities/chat/api/chatApi';
import { debounce } from 'lodash';

export const ChatSearchScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state?.auth?.user);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // Дебаунсированный поиск
  const searchUsersDebounced = useCallback(
    debounce(async (query) => {
      if (!query || query.trim().length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        // Поиск пользователей
        const usersResponse = await ChatApi.searchUsers(query);
        const users = usersResponse?.data?.users || [];
        
        // Поиск комнат на сервере
        const roomsResponse = await ChatApi.searchRooms(query);
        const rooms = roomsResponse?.data?.rooms || [];

        // Обогащаем результаты комнат
        const enrichedRooms = rooms.map(room => ({
          ...room,
          type: 'room',
          displayName: room.displayName,
          subtitle: room.subtitle,
          roomType: room.roomType
        }));

        // Создаем Set для отслеживания пользователей, у которых уже есть DIRECT комната
        const usersWithDirectRooms = new Set();
        enrichedRooms.forEach(room => {
          if (room.roomType === 'DIRECT' && room.participants) {
            room.participants.forEach(participant => {
              const participantId = participant.userId || participant.user?.id || participant.id;
              if (participantId && participantId !== currentUser?.id) {
                usersWithDirectRooms.add(participantId);
              }
            });
          }
        });

        // Обогащаем результаты пользователей, исключая тех, у кого уже есть DIRECT комната
        const enrichedUsers = users
          .filter(user => {
            const userId = user.id;
            // Исключаем пользователей, у которых уже есть DIRECT комната в результатах
            return !usersWithDirectRooms.has(userId);
          })
          .map(user => ({
            ...user,
            type: 'user',
            displayName: user.displayName || user.name,
            subtitle: user.subtitle || user.role
          }));

        // Объединяем результаты: сначала комнаты, потом пользователи
        const allResults = [...enrichedRooms, ...enrichedUsers];
        setSearchResults(allResults);
        
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500),
    []
  );

  // Обработчик изменения поискового запроса
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (text.length >= 2) {
      searchUsersDebounced(text);
    } else {
      setSearchResults([]);
    }
  };

  // Открыть или создать чат с пользователем
  const handleUserPress = async (item) => {
    if (item.type === 'room') {
      // Открываем существующую комнату
      navigation.navigate('ChatRoom', {
        roomId: item.id,
        roomTitle: item.displayName,
        fromScreen: 'ChatSearch',
        roomData: {
          id: item.id,
          type: item.roomType,
          title: item.displayName,
          participants: item.participants,
          product: item.product
        },
        currentUserId: currentUser?.id
      });
      return;
    }

    // Обработка пользователей
    setLoading(true);
    try {
      // Создаем FormData для отправки
      const formData = new FormData();
      formData.append('type', 'DIRECT');
      formData.append('title', item.displayName);
      formData.append('members', JSON.stringify([item.id]));
      
      const response = await ChatApi.createRoom(formData);

      const room = response?.data?.room;
      if (room) {
        navigation.navigate('ChatRoom', {
          roomId: room.id,
          roomTitle: item.displayName,
          roomData: {
            ...room,
            participants: [
              { 
                userId: item.id, 
                user: {
                  ...item,
                  name: item.displayName,
                  companyName: item.role === 'SUPPLIER' ? item.displayName : null,
                  lastSeenAt: item.lastSeenAt,
                  isOnline: item.isOnline
                }
              }
            ]
          },
          fromScreen: 'ChatSearch',
          currentUserId: currentUser?.id
        });
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Ошибка', 'Не удалось создать чат');
    } finally {
      setLoading(false);
    }
  };

  // Рендер элемента списка
  const renderUserItem = ({ item }) => {
    if (item.type === 'room') {
      // Рендер комнаты/группы
      return (
        <TouchableOpacity
          style={styles.userItem}
          onPress={() => handleUserPress(item)}
          disabled={loading}
        >
          <View style={styles.avatarContainer}>
            {item.avatar ? (
              <Image 
                source={{ uri: item.avatar }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { 
                backgroundColor: item.roomType === 'GROUP' ? '#4CAF50' : 
                               item.roomType === 'DIRECT' ? '#2196F3' : '#FF9800'
              }]}>
                <Text style={styles.avatarPlaceholderText}>
                  {item.roomType === 'GROUP' ? '👥' : 
                   item.roomType === 'DIRECT' ? '💬' : '📦'}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.displayName}</Text>
            <Text style={styles.userSubtitle}>{item.subtitle}</Text>
          </View>

          <View style={styles.existingChatBadge}>
            <Text style={styles.existingChatText}>
              {item.roomType === 'GROUP' ? 'Группа' : 
               item.roomType === 'DIRECT' ? 'Чат' : 'Товар'}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    // Рендер пользователя
    const avatarUri = item.avatar;

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleUserPress(item)}
        disabled={loading}
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
          <Text style={styles.userSubtitle}>{item.subtitle}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Поисковая строка */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по имени, компании или группе..."
          value={searchQuery}
          onChangeText={handleSearchChange}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && (
          <ActivityIndicator size="small" color="#075E54" style={styles.searchLoader} />
        )}
      </View>

      {/* Кнопка создания группы */}
      <View style={styles.createGroupContainer}>
        <TouchableOpacity
          style={styles.createGroupButton}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Text style={styles.createGroupButtonText}>Создать группу</Text>
        </TouchableOpacity>
      </View>

      {/* Результаты поиска */}
      {searchQuery.length >= 2 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !searching && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery.length < 2 
                    ? 'Введите минимум 2 символа для поиска'
                    : 'Пользователи и группы не найдены'}
                </Text>
              </View>
            )
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Введите имя, название компании или группы для поиска
          </Text>
        </View>
      )}

      {/* Индикатор загрузки при создании чата */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#075E54" />
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    height: 45,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  searchLoader: {
    marginLeft: 12,
  },
  createGroupContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  createGroupButton: {
    backgroundColor: '#075E54',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createGroupButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
  },
  avatar: {
    width: 50,
    height: 50,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
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
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  userSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  existingChatBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  existingChatText: {
    fontSize: 12,
    color: '#4CAF50',
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatSearchScreen;