import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  Image,
  Linking
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import ChatApi from '@entities/chat/api/chatApi';
import { ContactPicker } from '@entities/chat/ui/ContactPicker/ContactPicker';
import { PermissionInfoModal } from '@entities/chat/ui/Composer/components/PermissionInfoModal';
import { selectRoomsList } from '@entities/chat/model/selectors';
import { debounce } from 'lodash';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const ChatSearchScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state?.auth?.user);
  const localRooms = useSelector(selectRoomsList) || [];
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [permissionType, setPermissionType] = useState('contacts');

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

        // Обогащаем результаты комнат, исключая PRODUCT чаты (чаты с поставщиками)
        const enrichedRooms = rooms
          .filter(room => {
            // Скрываем PRODUCT комнаты (чаты с поставщиками по товарам)
            if (room.roomType === 'PRODUCT') return false;
            // Для DIRECT комнат скрываем те, где есть поставщик
            if (room.roomType === 'DIRECT' && room.participants) {
              const hasSupplier = room.participants.some(p => {
                const user = p?.user || p;
                return user?.role === 'SUPPLIER';
              });
              if (hasSupplier) return false;
            }
            return true;
          })
          .map(room => ({
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

        // Обогащаем результаты пользователей, исключая тех, у кого уже есть DIRECT комната и поставщиков
        const enrichedUsers = users
          .filter(user => {
            const userId = user.id;
            // Исключаем поставщиков из результатов поиска
            if (user.role === 'SUPPLIER') return false;
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
    const rootNavigation =
      navigation?.getParent?.('AppStack') ||
      navigation?.getParent?.()?.getParent?.() ||
      null;

    if (item.type === 'room') {
      // Открываем существующую комнату
      (rootNavigation || navigation).navigate('ChatRoom', {
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

    // Обработка пользователей.
    // 1) Если с этим пользователем уже есть локальный DIRECT-чат — сразу открываем его.
    // 2) Иначе открываем «черновой» чат: комната на сервере будет создана
    //    только при отправке первого сообщения, чтобы собеседник не видел пустой чат.
    const currentUserId = currentUser?.id;
    const targetUserId = item?.id;

    const normalizedTargetId = targetUserId != null ? String(targetUserId) : null;
    const normalizedCurrentId = currentUserId != null ? String(currentUserId) : null;
    const existingDirect = normalizedTargetId && Array.isArray(localRooms)
      ? localRooms.find((room) => {
          if (!room) return false;
          const roomType = String(room.type || '').toUpperCase();
          if (roomType !== 'DIRECT') return false;
          const participants = Array.isArray(room.participants) ? room.participants : [];
          if (participants.length === 0) return false;
          const participantIds = participants
            .map((p) => p?.userId ?? p?.user?.id ?? p?.id)
            .filter((id) => id != null)
            .map((id) => String(id));
          return participantIds.includes(normalizedTargetId)
            && (normalizedCurrentId == null || participantIds.includes(normalizedCurrentId));
        })
      : null;

    if (existingDirect) {
      (rootNavigation || navigation).navigate('ChatRoom', {
        roomId: existingDirect.id,
        roomTitle: item.displayName,
        fromScreen: 'ChatSearch',
        roomData: existingDirect,
        currentUserId,
      });
      return;
    }

    // Черновой чат — без обращения к API.
    // DirectChatScreen создаст комнату при первой отправке.
    (rootNavigation || navigation).navigate('ChatRoom', {
      roomId: null,
      roomTitle: item.displayName,
      roomType: 'DIRECT',
      fromScreen: 'ChatSearch',
      currentUserId,
      draftPeerUserId: targetUserId,
      draftPeer: {
        id: targetUserId,
        name: item.displayName,
        role: item.role,
        avatar: item.avatar || null,
        lastSeenAt: item.lastSeenAt,
        isOnline: item.isOnline,
      },
    });
  };

  // Обработчик кнопки "Пригласить друга" с проверкой разрешений
  const handleInvitePress = async () => {
    try {
      // Проверяем разрешение ПЕРЕД открытием ContactPicker
      const { status: currentStatus } = await Contacts.getPermissionsAsync();

      if (currentStatus === 'granted') {
        // Разрешение есть - открываем ContactPicker
        setShowInviteModal(true);
      } else if (currentStatus === 'undetermined') {
        // Первый запрос - запрашиваем разрешение
        const permission = await Contacts.requestPermissionsAsync();
        if (permission.granted) {
          // Разрешение получено - открываем ContactPicker
          setShowInviteModal(true);
        } else {
          // Пользователь отказал - показываем модальное окно настроек
          console.log('🔔 ChatSearchScreen: Пользователь отказал от разрешения контактов');
          setPermissionType('contacts');
          setPermissionModalVisible(true);
        }
      } else {
        // Разрешение denied или restricted - показываем модальное окно настроек
        console.log('🔔 ChatSearchScreen: Разрешение контактов отклонено, показываем настройки');
        setPermissionType('contacts');
        setPermissionModalVisible(true);
      }
    } catch (error) {
      console.error('Ошибка при проверке разрешения контактов:', error);
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
          placeholderTextColor={isDark ? colors.textTertiary : '#999999'}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          value={searchQuery}
          onChangeText={handleSearchChange}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && (
          <ActivityIndicator size="small" color={isDark ? colors.primary : '#075E54'} style={styles.searchLoader} />
        )}
      </View>

      {/* Кнопки действий */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.createGroupButton]}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Text style={styles.createGroupButtonText}>Создать группу</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.inviteButton]}
          onPress={handleInvitePress}
        >
          <Ionicons name="person-add" size={20} color="#FFFFFF" style={styles.inviteIcon} />
          <Text style={styles.inviteButtonText}>Пригласить друга</Text>
        </TouchableOpacity>
      </View>

      {/* Модальное окно выбора контакта для приглашения */}
      <ContactPicker
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSelect={() => {
          // Это не используется, так как мы используем режим приглашения
          setShowInviteModal(false);
        }}
        initialMode="device"
      />

      {/* Результаты поиска */}
      {searchQuery.length >= 2 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => `${item.type}-${item.id}`}
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
          <ActivityIndicator size="large" color={isDark ? colors.primary : '#075E54'} />
        </View>
      )}

      {/* Permission Info Modal */}
      <PermissionInfoModal
        visible={permissionModalVisible}
        onClose={() => setPermissionModalVisible(false)}
        type={permissionType}
      />
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? colors.background : '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: isDark ? colors.surface : '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? colors.divider : '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    height: 45,
    backgroundColor: isDark ? colors.inputBackground : '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 16,
    color: isDark ? colors.textPrimary : '#000000',
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? colors.divider : 'transparent',
  },
  searchLoader: {
    marginLeft: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: isDark ? colors.surface : '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? colors.divider : '#e0e0e0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  createGroupButton: {
    backgroundColor: isDark ? colors.primary : '#075E54',
  },
  createGroupButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  inviteButton: {
    backgroundColor: isDark ? '#1F6F43' : '#25D366',
  },
  inviteIcon: {
    marginRight: 6,
  },
  inviteButtonText: {
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
    borderBottomColor: isDark ? colors.divider : '#f0f0f0',
    backgroundColor: isDark ? colors.background : 'transparent',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: isDark ? colors.surface : '#E0E0E0',
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
    backgroundColor: isDark ? colors.primary : '#075E54',
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
    color: isDark ? colors.textPrimary : '#000000',
  },
  userSubtitle: {
    fontSize: 14,
    color: isDark ? colors.textSecondary : '#666666',
    marginTop: 2,
  },
  existingChatBadge: {
    backgroundColor: isDark ? 'rgba(76, 175, 80, 0.18)' : '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  existingChatText: {
    fontSize: 12,
    color: isDark ? '#7DC97F' : '#4CAF50',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: isDark ? colors.textSecondary : '#999999',
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatSearchScreen;