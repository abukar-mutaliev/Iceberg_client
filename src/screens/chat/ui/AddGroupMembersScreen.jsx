import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { addMembers, fetchRoom } from '@entities/chat/model/slice';
import ChatApi from '@entities/chat/api/chatApi';
import { getBaseUrl } from '@shared/api/api';
import { useCustomAlert } from '@shared/ui/CustomAlert';

// Максимальное количество участников в группе
const MAX_MEMBERS_PER_GROUP = 500;

export const AddGroupMembersScreen = ({ route, navigation }) => {
  const { roomId, currentMembers = [] } = route.params;
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state?.auth?.user);
  const { showError, showSuccess, showInfo } = useCustomAlert();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [hasLoadedAllUsers, setHasLoadedAllUsers] = useState(false);

  // Загружаем всех пользователей при открытии экрана
  const loadAllUsers = async () => {
    if (hasLoadedAllUsers) return; // Не загружаем повторно
    
    setLoading(true);
    try {
      // Попробуем несколько стратегий загрузки пользователей
      let allUsersData = [];
      
      // Стратегия 1: Попробуем загрузить всех пользователей одним запросом
      try {
        const response = await ChatApi.searchUsers('', 2000); // Пустой запрос для получения всех (максимум 2000)
        const userData = response?.data?.data?.users || response?.data?.users || [];
        if (userData.length > 0) {
          allUsersData = userData;
          console.log('Strategy 1: Loaded users with empty query:', userData.length);
        }
      } catch (error) {
        console.log('Strategy 1 failed:', error.message);
      }
      
      // Стратегия 2: Если первая не сработала, попробуем с общими символами
      if (allUsersData.length === 0) {
        const commonQueries = ['а', 'е', 'и', 'о', 'у', 'user', 'admin', 'test', 'client', 'supplier'];
        
        for (const query of commonQueries) {
          try {
            const response = await ChatApi.searchUsers(query, 2000);
            const userData = response?.data?.data?.users || response?.data?.users || [];
            
            if (userData.length > 0) {
              // Добавляем только новых пользователей (избегаем дубликатов)
              const newUsers = userData.filter(newUser => 
                !allUsersData.some(existingUser => existingUser.id === newUser.id)
              );
              allUsersData.push(...newUsers);
              console.log(`Strategy 2: Added ${newUsers.length} users with query "${query}"`);
              
              // Ограничиваем общее количество для производительности
              if (allUsersData.length >= 2000) break;
            }
          } catch (error) {
            console.log(`Strategy 2 failed for query "${query}":`, error.message);
            continue;
          }
        }
      }
      
      // Стратегия 3: Если все еще нет пользователей, попробуем загрузить по частям
      if (allUsersData.length === 0) {
        console.log('Trying strategy 3: loading users in batches');
        let page = 1;
        const limit = 2000;
        
        while (allUsersData.length < 2000 && page <= 10) { // Ограничиваем до 10 страниц
          try {
            // Используем разные запросы для получения пользователей
            const queries = ['user', 'admin', 'client', 'supplier', 'employee'];
            const query = queries[(page - 1) % queries.length];
            
            const response = await ChatApi.searchUsers(query, limit);
            const userData = response?.data?.data?.users || response?.data?.users || [];
            
            if (userData.length === 0) break; // Больше пользователей нет
            
            // Добавляем только новых пользователей
            const newUsers = userData.filter(newUser => 
              !allUsersData.some(existingUser => existingUser.id === newUser.id)
            );
            allUsersData.push(...newUsers);
            
            console.log(`Strategy 3: Page ${page}, query "${query}", added ${newUsers.length} users`);
            page++;
            
          } catch (error) {
            console.log(`Strategy 3 failed for page ${page}:`, error.message);
            break;
          }
        }
      }
      
      console.log('Total users collected:', allUsersData.length);
      
      // Фильтруем пользователей (исключаем текущего и уже добавленных)
      const filteredAllUsers = allUsersData.filter(user => 
        user.id !== currentUser?.id && 
        !currentMembers.includes(user.id)
      );
      
      setAllUsers(filteredAllUsers);
      setFilteredUsers(filteredAllUsers);
      setHasLoadedAllUsers(true);
      
      console.log('All users loaded and filtered:', filteredAllUsers.length);
      
      if (filteredAllUsers.length === 0) {
        showInfo('Информация', 'Не удалось загрузить пользователей. Попробуйте обновить страницу.');
      }
      
    } catch (error) {
      console.error('Ошибка загрузки всех пользователей:', error);
      showError('Ошибка', 'Не удалось загрузить список пользователей');
    } finally {
      setLoading(false);
    }
  };

  // Локальный поиск по загруженным пользователям
  const performLocalSearch = useCallback((query) => {
    if (!query || query.trim().length === 0) {
      setFilteredUsers(allUsers);
      return;
    }
    
    const searchTerm = query.trim().toLowerCase();
    const filtered = allUsers.filter(user => {
      // Поиск по имени
      const name = getUserDisplayName(user).toLowerCase();
      if (name.includes(searchTerm)) return true;
      
      // Поиск по email
      if (user.email && user.email.toLowerCase().includes(searchTerm)) return true;
      
      // Поиск по компании (для поставщиков)
      if (user.companyName && user.companyName.toLowerCase().includes(searchTerm)) return true;
      if (user.supplier?.companyName && user.supplier.companyName.toLowerCase().includes(searchTerm)) return true;
      
      // Поиск по контактному лицу
      if (user.contactPerson && user.contactPerson.toLowerCase().includes(searchTerm)) return true;
      if (user.supplier?.contactPerson && user.supplier.contactPerson.toLowerCase().includes(searchTerm)) return true;
      
      return false;
    });
    
    setFilteredUsers(filtered);
  }, [allUsers]);

  // Загружаем всех пользователей при открытии экрана
  useEffect(() => {
    loadAllUsers();
  }, []);

  // Локальный поиск при изменении поискового запроса
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performLocalSearch(searchQuery);
    }, 100); // Уменьшаем дебаунс для локального поиска

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performLocalSearch]);

  const toAbsoluteUri = useCallback((raw) => {
    if (!raw || typeof raw !== 'string') return null;
    if (raw.startsWith('http')) return raw;
    let path = raw.replace(/^\\+/g, '').replace(/^\/+/, '');
    path = path.replace(/^uploads\/?/, '');
    return `${getBaseUrl()}/uploads/${path}`;
  }, []);

  const getUserDisplayName = useCallback((user) => {
    if (user.role === 'SUPPLIER') {
      return user.companyName || user.supplier?.companyName || user.contactPerson || user.supplier?.contactPerson || user.name || user.firstName || 'Поставщик';
    }
    return user.name || user.firstName || user.email?.split('@')[0] || 'Пользователь';
  }, []);

  const getUserAvatar = useCallback((user) => {
    const avatarPath = user.avatar || user.image;
    return toAbsoluteUri(avatarPath);
  }, [toAbsoluteUri]);

  const toggleUserSelection = useCallback((user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  }, []);

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      showError('Ошибка', 'Выберите участников для добавления');
      return;
    }

    // Проверка лимита участников
    const currentCount = currentMembers.length;
    const totalAfterAdd = currentCount + selectedUsers.length;
    
    if (totalAfterAdd > MAX_MEMBERS_PER_GROUP) {
      const canAdd = MAX_MEMBERS_PER_GROUP - currentCount;
      if (canAdd <= 0) {
        showError(
          'Лимит достигнут',
          `Группа уже достигла максимального количества участников (${MAX_MEMBERS_PER_GROUP}). Невозможно добавить новых участников.`
        );
        return;
      }
      showError(
        'Превышен лимит участников',
        `Максимальное количество участников в группе: ${MAX_MEMBERS_PER_GROUP}. В группе уже ${currentCount} участников. Вы можете добавить не более ${canAdd} участников.`
      );
      return;
    }

    setAdding(true);
    try {
      const memberIds = selectedUsers.map(user => user.id);
      
      const result = await dispatch(addMembers({
        roomId,
        userIds: memberIds
      }));

      if (result.type.endsWith('/fulfilled')) {
        // Обновляем данные группы для немедленного отображения новых участников
        await dispatch(fetchRoom(roomId));
        
        const participantsText = selectedUsers.length === 1 
          ? `${selectedUsers[0]?.name || 'Участник'} добавлен в группу` 
          : `${selectedUsers.length} участник${selectedUsers.length < 5 ? 'а' : 'ов'} добавлено в группу`;
        
        showSuccess(
          'Участники добавлены',
          participantsText,
          [
            {
              text: 'Вернуться к чату',
              style: 'primary',
              icon: 'chat',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        throw new Error(result.payload || 'Ошибка добавления участников');
      }
    } catch (error) {
      console.error('Ошибка добавления участников:', error);
      
      // Обработка специфичных ошибок от сервера
      let errorMessage = 'Не удалось добавить участников';
      if (error.message?.includes('максимального количества') || error.message?.includes('Максимальное количество')) {
        errorMessage = error.message;
      } else if (error.message?.includes('500') || error.message?.includes('максимум')) {
        errorMessage = `Максимальное количество участников в группе: ${MAX_MEMBERS_PER_GROUP}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showError('Ошибка', errorMessage);
    } finally {
      setAdding(false);
    }
  };

  // Мемоизируем отфильтрованных пользователей для производительности
  const memoizedFilteredUsers = useMemo(() => filteredUsers, [filteredUsers]);

  const renderUser = ({ item }) => {
    const isSelected = selectedUsers.some(u => u.id === item.id);
    const displayName = getUserDisplayName(item);
    const avatarUri = getUserAvatar(item);

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => toggleUserSelection(item)}
        activeOpacity={0.7}
      >
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>👤</Text>
              </View>
            )}
          </View>
          <View style={styles.userTextInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userRole}>
              {item.role === 'SUPPLIER' ? 'Поставщик' :
               item.role === 'CLIENT' ? 'Клиент' :
               item.role === 'EMPLOYEE' ? 'Сотрудник' :
               item.role === 'ADMIN' ? 'Администратор' :
               item.role === 'DRIVER' ? 'Водитель' : item.role}
            </Text>
          </View>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Добавить участников</Text>
          {selectedUsers.length > 0 && (
            <Text style={styles.headerSubtitle}>
              {selectedUsers.length} выбрано
            </Text>
          )}
          {currentMembers.length > 0 && (
            <Text style={styles.membersCountText}>
              В группе: {currentMembers.length}/{MAX_MEMBERS_PER_GROUP}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handleAddMembers}
          disabled={adding || selectedUsers.length === 0}
          style={[
            styles.addButton,
            (adding || selectedUsers.length === 0) && styles.addButtonDisabled
          ]}
        >
          {adding ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.addButtonText}>Добавить</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Поиск участников..."
          placeholderTextColor="#8696A0"
        />
        {searchQuery.length > 0 && (
          <Text style={styles.searchResultsCount}>
            Найдено: {filteredUsers.length}
          </Text>
        )}
      </View>

      {/* Users List */}
      <View style={styles.content}>
        {loading && !hasLoadedAllUsers ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Загрузка пользователей...</Text>
          </View>
        ) : (
          <FlatList
            data={memoizedFilteredUsers}
            renderItem={renderUser}
            keyExtractor={(item) => String(item.id)}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 
                    'Пользователи не найдены' : 
                    'Пользователи загружаются...'
                  }
                </Text>
              </View>
            )}
            contentContainerStyle={styles.listContainer}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
            removeClippedSubviews={true}
            getItemLayout={(data, index) => ({
              length: 64, // Высота элемента
              offset: 64 * index,
              index,
            })}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8696A0',
  },
  membersCountText: {
    fontSize: 12,
    color: '#8696A0',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#25D366',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchResultsCount: {
    fontSize: 12,
    color: '#8696A0',
    marginTop: 4,
    textAlign: 'right',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  userItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 16,
    color: '#666666',
  },
  userTextInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#8696A0',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#25D366',
    borderColor: '#25D366',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 68,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#8696A0',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#8696A0',
    textAlign: 'center',
  },
});

export default AddGroupMembersScreen;
