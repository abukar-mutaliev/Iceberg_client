import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useDispatch, useSelector } from 'react-redux';
import { createRoom } from '@entities/chat/model/slice';
import ChatApi from '@entities/chat/api/chatApi';
import { getBaseUrl } from '@shared/api/api';

export const CreateGroupScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state?.auth?.user);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creating, setCreating] = useState(false);
  const [groupAvatar, setGroupAvatar] = useState(null); // { uri, type, name }

  // Поиск пользователей
  const searchUsers = async (query) => {
    if (!query || query.trim().length < 2) {
      setUsers([]);
      return;
    }

    setLoadingUsers(true);
    try {
      const response = await ChatApi.searchUsers(query.trim());
      const userData = response?.data?.data?.users || response?.data?.users || [];
      // Исключаем текущего пользователя из списка
      const filteredUsers = userData.filter(user => user.id !== currentUser?.id);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Ошибка поиска пользователей:', error);
      Alert.alert('Ошибка', 'Не удалось найти пользователей');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Поиск пользователей при изменении поискового запроса
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300); // Дебаунс 300мс

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Используем users напрямую, так как фильтрация происходит на сервере
  const filteredUsers = users;

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

  const removeSelectedUser = useCallback((userId) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  }, []);

  const getUserDisplayName = useCallback((user) => {
    if (user.role === 'SUPPLIER') {
      return user.companyName || user.supplier?.companyName || user.contactPerson || user.supplier?.contactPerson || user.name || user.firstName || 'Поставщик';
    }
    return user.name || user.firstName || user.email?.split('@')[0] || 'Пользователь';
  }, []);

  const getUserAvatar = useCallback((user) => {
    const avatarPath = user.avatar || user.image;
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http')) return avatarPath;
    let path = avatarPath.replace(/^\\+/g, '').replace(/^\/+/, '');
    path = path.replace(/^uploads\/?/, '');
    return `${getBaseUrl()}/uploads/${path}`;
  }, []);

  // Функции для работы с аватаром группы
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Для загрузки изображений необходимо разрешение на доступ к галерее');
        return false;
      }
    }
    return true;
  };

  const processImage = async (imageUri) => {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 300, height: 300 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      return manipulatedImage;
    } catch (error) {
      console.error('Ошибка обработки изображения:', error);
      throw error;
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const processedImage = await processImage(result.assets[0].uri);
        setGroupAvatar({
          uri: processedImage.uri,
          type: 'image/jpeg',
          name: `group_avatar_${Date.now()}.jpg`
        });
      }
    } catch (error) {
      console.error('Ошибка при выборе изображения:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить изображение');
    }
  };

  const takePhoto = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Для съемки фото необходимо разрешение на доступ к камере');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const processedImage = await processImage(result.assets[0].uri);
        setGroupAvatar({
          uri: processedImage.uri,
          type: 'image/jpeg',
          name: `group_avatar_${Date.now()}.jpg`
        });
      }
    } catch (error) {
      console.error('Ошибка при съемке фото:', error);
      Alert.alert('Ошибка', 'Не удалось сделать фото');
    }
  };

  const showImagePicker = () => {
    Alert.alert(
      'Выбрать изображение',
      'Выберите способ загрузки аватара группы',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Галерея', onPress: pickImageFromGallery },
        { text: 'Камера', onPress: takePhoto },
      ]
    );
  };

  const removeAvatar = () => {
    setGroupAvatar(null);
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Ошибка', 'Введите название группы');
      return;
    }

    if (selectedUsers.length === 0) {
      Alert.alert('Ошибка', 'Выберите хотя бы одного участника');
      return;
    }

    setCreating(true);
    try {
      const memberIds = selectedUsers.map(user => user.id);
      
      // Создаем FormData для отправки на сервер
      const formData = new FormData();
      formData.append('type', 'GROUP');
      formData.append('title', groupName.trim());
      if (groupDescription.trim()) {
        formData.append('description', groupDescription.trim());
      }
      formData.append('members', JSON.stringify(memberIds));
      formData.append('admins', JSON.stringify([])); // Создатель автоматически становится владельцем
      
      // Добавляем аватар, если он выбран
      if (groupAvatar) {
        formData.append('avatar', {
          uri: groupAvatar.uri,
          type: groupAvatar.type,
          name: groupAvatar.name,
        });
      }
      
      const result = await dispatch(createRoom(formData));

      if (result.type.endsWith('/fulfilled')) {
        Alert.alert(
          'Успех', 
          'Группа создана успешно!',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        throw new Error(result.payload || 'Ошибка создания группы');
      }
    } catch (error) {
      console.error('Ошибка создания группы:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось создать группу');
    } finally {
      setCreating(false);
    }
  };

  const renderSelectedUser = ({ item }) => (
    <View style={styles.selectedUserChip}>
      <View style={styles.selectedUserInfo}>
        {getUserAvatar(item) ? (
          <Image source={{ uri: getUserAvatar(item) }} style={styles.selectedUserAvatar} />
        ) : (
          <View style={styles.selectedUserAvatarPlaceholder} />
        )}
        <Text style={styles.selectedUserName} numberOfLines={1}>
          {getUserDisplayName(item)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeUserButton}
        onPress={() => removeSelectedUser(item.id)}
      >
        <Text style={styles.removeUserText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  const renderUser = ({ item }) => {
    const isSelected = selectedUsers.some(u => u.id === item.id);
    const displayName = getUserDisplayName(item);
    const avatarUri = getUserAvatar(item);

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => toggleUserSelection(item)}
      >
        <View style={styles.userInfo}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.userAvatar} />
          ) : (
            <View style={styles.userAvatarPlaceholder} />
          )}
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
        <Text style={styles.headerTitle}>Новая группа</Text>
        <TouchableOpacity
          onPress={createGroup}
          disabled={creating || !groupName.trim() || selectedUsers.length === 0}
          style={[styles.createButton, (creating || !groupName.trim() || selectedUsers.length === 0) && styles.createButtonDisabled]}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.createButtonText}>Создать</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Group Info Section */}
        <View style={styles.groupInfoSection}>
          <Text style={styles.sectionTitle}>Информация о группе</Text>
          
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <Text style={styles.inputLabel}>Аватар группы (необязательно)</Text>
            <View style={styles.avatarContainer}>
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={showImagePicker}
                activeOpacity={0.7}
              >
                {groupAvatar ? (
                  <Image source={{ uri: groupAvatar.uri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarPlaceholderText}>📷</Text>
                    <Text style={styles.avatarPlaceholderSubtext}>Добавить фото</Text>
                  </View>
                )}
              </TouchableOpacity>
              {groupAvatar && (
                <TouchableOpacity
                  style={styles.removeAvatarButton}
                  onPress={removeAvatar}
                  activeOpacity={0.7}
                >
                  <Text style={styles.removeAvatarText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Название группы *</Text>
            <TextInput
              style={styles.textInput}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Введите название группы"
              maxLength={100}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Описание (необязательно)</Text>
            <TextInput
              style={[styles.textInput, styles.descriptionInput]}
              value={groupDescription}
              onChangeText={setGroupDescription}
              placeholder="Введите описание группы"
              multiline
              maxLength={500}
            />
          </View>
        </View>

        {/* Selected Users Section */}
        {selectedUsers.length > 0 && (
          <View style={styles.selectedUsersSection}>
            <Text style={styles.sectionTitle}>
              Участники ({selectedUsers.length})
            </Text>
            <FlatList
              horizontal
              data={selectedUsers}
              renderItem={renderSelectedUser}
              keyExtractor={(item) => String(item.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectedUsersList}
            />
          </View>
        )}

        {/* Users List Section */}
        <View style={styles.usersSection}>
          <Text style={styles.sectionTitle}>Добавить участников</Text>
          
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Введите имя пользователя для поиска (мин. 2 символа)..."
          />

          {loadingUsers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Загрузка пользователей...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              renderItem={renderUser}
              keyExtractor={(item) => String(item.id)}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchQuery ? 
                      (searchQuery.length < 2 ? 
                        'Введите минимум 2 символа для поиска' : 
                        'Пользователи не найдены'
                      ) : 
                      'Введите имя пользователя в поле поиска'
                    }
                  </Text>
                </View>
              )}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  groupInfoSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  avatarSection: {
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  avatarButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  avatarPlaceholderText: {
    fontSize: 24,
    marginBottom: 4,
  },
  avatarPlaceholderSubtext: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  removeAvatarButton: {
    position: 'absolute',
    top: -5,
    right: '35%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  removeAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  selectedUsersSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedUsersList: {
    paddingVertical: 8,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 4,
    marginRight: 8,
    maxWidth: 150,
  },
  selectedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedUserAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  selectedUserAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#C7C7CC',
    marginRight: 6,
  },
  selectedUserName: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
    flex: 1,
  },
  removeUserButton: {
    marginLeft: 4,
    padding: 2,
  },
  removeUserText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: 'bold',
  },
  usersSection: {
    padding: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#F8F8F8',
    marginBottom: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
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
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C7C7CC',
    marginRight: 12,
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
    color: '#666666',
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
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 52,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
  },
});

export default CreateGroupScreen;
