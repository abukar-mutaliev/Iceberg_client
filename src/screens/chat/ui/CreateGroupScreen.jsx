import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useDispatch, useSelector } from 'react-redux';
import { createRoom } from '@entities/chat/model/slice';
import ChatApi from '@entities/chat/api/chatApi';
import { getImageUrl } from '@shared/api/api';
import NetInfo from '@react-native-community/netinfo';
import { useGlobalAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';

export const CreateGroupScreen = ({ navigation, route }) => {
  // Получаем тип из параметров навигации (по умолчанию GROUP)
  const initialType = route?.params?.type || 'GROUP';
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state?.auth?.user);
  const { showError, showInfo, showWarning, showAlert } = useGlobalAlert();
  // Проверяем isSuperAdmin в разных возможных местах структуры пользователя
  const isSuperAdmin = currentUser?.role === 'ADMIN' && (
    currentUser?.admin?.isSuperAdmin || 
    currentUser?.profile?.isSuperAdmin || 
    currentUser?.isSuperAdmin
  );
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupType, setGroupType] = useState(initialType); // 'GROUP' или 'BROADCAST'
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedAdmins, setSelectedAdmins] = useState([]); // Для BROADCAST групп - выбранные админы
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingStep, setCreatingStep] = useState(''); // Текущий шаг создания для UI
  const [groupAvatar, setGroupAvatar] = useState(null); // { uri, type, name }

  // Поиск пользователей
  const searchUsers = async (query) => {
    if (!query || query.trim().length < 2) {
      setUsers([]);
      return;
    }

    setLoadingUsers(true);
    try {
      const response = await ChatApi.searchUsers(query.trim(), 2000); // Увеличен лимит до 2000
      const userData = response?.data?.data?.users || response?.data?.users || [];
      // Исключаем текущего пользователя из списка
      const filteredUsers = userData.filter(user => user.id !== currentUser?.id);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Ошибка поиска пользователей:', error);
      showError('Ошибка', 'Не удалось найти пользователей');
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
    return getImageUrl(path);
  }, []);

  // Функции для работы с аватаром группы
  const requestPermissions = async () => {
    if (Platform.OS === 'web') {
      return true;
    }
    
    try {
      // Сначала проверяем текущий статус разрешений
      const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      if (currentStatus === 'granted') {
        return true;
      }
      
      // Если разрешения нет, запрашиваем
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError('Ошибка', 'Для загрузки изображений необходимо разрешение на доступ к галерее');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка при запросе разрешений:', error);
      showError('Ошибка', 'Не удалось запросить разрешение на доступ к галерее');
      return false;
    }
  };



  const pickImageFromGallery = async () => {
    try {
      console.log('📸 Запрос разрешений для галереи...');
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        console.log('❌ Разрешения не получены');
        return;
      }

      console.log('📸 Открываем галерею...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 1.0, // Максимальное качество, без сжатия
        allowsMultipleSelection: false,
      });

      console.log('📸 Результат выбора:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedAsset = result.assets[0];
        console.log('✅ Изображение выбрано:', selectedAsset.uri);
        
        const avatarData = {
          uri: selectedAsset.uri,
          type: selectedAsset.type || 'image/jpeg',
          name: selectedAsset.fileName || `group_avatar_${Date.now()}.jpg`
        };
        
        // Прямое обновление без задержек
        setGroupAvatar(avatarData);
        console.log('✅ Состояние обновлено');
      } else {
        console.log('ℹ️ Выбор изображения отменен');
      }
    } catch (error) {
      console.error('❌ Ошибка при выборе изображения:', error);
      showError('Ошибка', 'Не удалось загрузить изображение');
    }
  };

  const takePhoto = async () => {
    try {
      console.log('📸 Запрос разрешений для камеры...');
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        console.log('❌ Разрешения галереи не получены');
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Разрешения камеры не получены');
        showError('Ошибка', 'Для съемки фото необходимо разрешение на доступ к камере');
        return;
      }

      console.log('📸 Открываем камеру...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 1.0, // Максимальное качество, без сжатия
      });

      console.log('📸 Результат съемки:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedAsset = result.assets[0];
        console.log('✅ Фото сделано:', selectedAsset.uri);
        
        const avatarData = {
          uri: selectedAsset.uri,
          type: selectedAsset.type || 'image/jpeg',
          name: selectedAsset.fileName || `group_avatar_${Date.now()}.jpg`
        };
        
        // Прямое обновление без задержек
        setGroupAvatar(avatarData);
        console.log('✅ Состояние обновлено');
      } else {
        console.log('ℹ️ Съемка отменена');
      }
    } catch (error) {
      console.error('❌ Ошибка при съемке фото:', error);
      showError('Ошибка', 'Не удалось сделать фото');
    }
  };

  const showImagePicker = () => {
    console.log('📸 Показываем выбор способа загрузки изображения');
    
    if (Platform.OS === 'ios') {
      // Используем нативный ActionSheet для iOS
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Отмена', 'Галерея', 'Камера'],
          cancelButtonIndex: 0,
          title: 'Выбрать изображение',
          message: 'Выберите способ загрузки аватара группы',
        },
        (buttonIndex) => {
          console.log('📸 Выбран вариант:', buttonIndex);
          if (buttonIndex === 1) {
            // Галерея - откладываем вызов, чтобы ActionSheet успел закрыться
            setTimeout(() => pickImageFromGallery(), 500);
          } else if (buttonIndex === 2) {
            // Камера
            setTimeout(() => takePhoto(), 500);
          }
        }
      );
    } else {
      // Для Android используем Alert
      Alert.alert(
        'Выбрать изображение',
        'Выберите способ загрузки аватара группы',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Галерея', onPress: () => pickImageFromGallery() },
          { text: 'Камера', onPress: () => takePhoto() },
        ]
      );
    }
  };

  const removeAvatar = () => {
    setGroupAvatar(null);
  };

  // Функция обработки изображения (вызывается только при создании группы)
  const processImage = async (imageUri) => {
    try {
      console.log('📸 Начало обработки изображения:', imageUri);
      
      // Упрощенная обработка - одна итерация сжатия
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1024 } }], // Оптимальный размер для аватара группы
        { 
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );
      
      console.log('✅ Изображение обработано:', manipulatedImage.uri);
      return manipulatedImage;
    } catch (error) {
      console.error('❌ Ошибка обработки изображения:', error);
      // Возвращаем оригинал в случае ошибки
      return { uri: imageUri };
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      showError('Ошибка', 'Введите название группы');
      return;
    }

    // Для BROADCAST групп участники не обязательны (клиенты добавляются автоматически)
    if (groupType !== 'BROADCAST') {
      if (selectedUsers.length === 0) {
        showError('Ошибка', 'Выберите хотя бы одного участника');
        return;
      }
    }

    // Проверяем сетевое соединение перед началом
    setCreating(true);
    setCreatingStep('Проверка соединения...');
    
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected || !netInfo.isInternetReachable) {
        throw new Error('Отсутствует интернет-соединение. Проверьте подключение к сети.');
      }
      
      if (netInfo.type === 'cellular' && netInfo.details?.strength < 2) {
        console.warn('⚠️ Слабый сигнал сотовой сети, создание может занять больше времени');
        setCreatingStep('Слабый сигнал сети...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (netError) {
      setCreating(false);
      setCreatingStep('');
      showError('Нет соединения', netError.message || 'Проверьте подключение к интернету');
      return;
    }

    setCreatingStep('Подготовка данных...');
    
    try {
      const memberIds = selectedUsers.map(user => user.id);
      
      console.log('🏗️ Создание группы началось:', {
        groupName: groupName.trim(),
        groupType: groupType,
        membersCount: memberIds.length,
        adminsCount: groupType === 'BROADCAST' ? selectedAdmins.length : 0,
        hasAvatar: !!groupAvatar
      });
      
      setCreatingStep('Формирование запроса...');
      
      // Создаем FormData для отправки на сервер
      const formData = new FormData();
      formData.append('type', groupType);
      formData.append('title', groupName.trim());
      if (groupDescription.trim()) {
        formData.append('description', groupDescription.trim());
      }
      
      // Для BROADCAST групп members не обязательны, но можно указать админов
      if (groupType === 'BROADCAST') {
        const adminIds = selectedAdmins.map(user => user.id);
        formData.append('admins', JSON.stringify(adminIds));
        // members не отправляем для BROADCAST - клиенты добавляются автоматически
      } else {
        formData.append('members', JSON.stringify(memberIds));
        formData.append('admins', JSON.stringify([])); // Создатель автоматически становится владельцем
      }
      
      // Добавляем аватар, если он выбран
      if (groupAvatar && groupAvatar.uri) {
        try {
          setCreatingStep('Обработка изображения...');
          // Обрабатываем изображение перед отправкой
          const processedImage = await processImage(groupAvatar.uri);
          
          setCreatingStep('Загрузка аватара...');
          formData.append('avatar', {
            uri: processedImage.uri,
            type: 'image/jpeg',
            name: `group_avatar_${Date.now()}.jpg`
          });
          console.log('✅ Загружаем обработанный аватар');
        } catch (processError) {
          console.warn('⚠️ Ошибка обработки, используем оригинал:', processError);
          // Fallback - используем оригинал
          setCreatingStep('Загрузка аватара...');
          formData.append('avatar', {
            uri: groupAvatar.uri,
            type: groupAvatar.type,
            name: groupAvatar.name,
          });
        }
      }
      
      setCreatingStep('Создание группы...');
      console.log('📡 Отправка запроса на создание группы...');
      
      // Отправляем запрос на создание группы
      const result = await dispatch(createRoom(formData));

      if (result.type.endsWith('/fulfilled')) {
        const createdRoom = result.payload;
        
        console.log('✅ Группа создана успешно:', {
          roomId: createdRoom.id,
          title: createdRoom.title
        });
                // Правильная навигация через Main Tab Navigator
        navigation.navigate('Main', {
          screen: 'ChatList',
          params: {
            screen: 'ChatMain' // Переходим к списку чатов в ChatStack
          }
        });
        
        // Небольшая задержка для корректной навигации к созданной группе
        setTimeout(() => {
          navigation.navigate('Main', {
            screen: 'ChatList',
            params: {
              screen: 'ChatRoom',
              params: {
                roomId: createdRoom.id,
                roomTitle: createdRoom.title,
                fromScreen: 'ChatList'
              }
            }
          });
        }, 200);
      } else {
        throw new Error(result.payload || 'Ошибка создания группы');
      }
    } catch (error) {
      console.error('❌ Финальная ошибка создания группы:', error);
      
      // Детальная обработка различных типов ошибок
      let errorMessage = 'Не удалось создать группу';
      let errorTitle = 'Ошибка сети';
      let showRetryWithoutAvatar = false;
      
      if (error.message?.includes('Network')) {
        errorMessage = 'Проблема с интернет-соединением. Проверьте подключение и попробуйте снова.';
        errorTitle = 'Нет соединения';
        showRetryWithoutAvatar = !!groupAvatar;
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Запрос выполняется слишком долго. Проверьте скорость интернета и повторите попытку.';
        errorTitle = 'Превышено время ожидания';
        showRetryWithoutAvatar = !!groupAvatar;
      } else if (error.message?.includes('400')) {
        errorMessage = 'Неверные данные для создания группы. Проверьте название и участников.';
        errorTitle = 'Ошибка данных';
      } else if (error.message?.includes('413') || error.message?.includes('Payload Too Large')) {
        errorMessage = 'Изображение слишком большое. Попробуйте выбрать фото меньшего размера.';
        errorTitle = 'Файл слишком большой';
        showRetryWithoutAvatar = true;
      } else if (error.message) {
        errorMessage = error.message;
        showRetryWithoutAvatar = !!groupAvatar;
      }
      
      const alertButtons = [
        { text: 'Попробовать ещё раз', style: 'primary', onPress: createGroup }
      ];
      
      // Добавляем опцию создания без аватара если есть проблемы с загрузкой
      if (showRetryWithoutAvatar) {
        alertButtons.unshift({
          text: 'Создать без фото',
          style: 'primary',
          onPress: async () => {
            const originalAvatar = groupAvatar;
            setGroupAvatar(null); // Временно убираем аватар
            try {
              await createGroup();
            } catch (retryError) {
              setGroupAvatar(originalAvatar); // Возвращаем аватар если не удалось
              throw retryError;
            }
          }
        });
      }
      
      alertButtons.push({ text: 'Отмена', style: 'cancel' });
      
      showError(errorTitle, errorMessage, alertButtons);
    } finally {
      setCreating(false);
      setCreatingStep(''); // Очищаем статус
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

  const toggleAdminSelection = useCallback((user) => {
    setSelectedAdmins(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  }, []);

  const renderUser = ({ item }) => {
    // Для BROADCAST групп выбираем админов, для обычных - участников
    const isSelected = groupType === 'BROADCAST' 
      ? selectedAdmins.some(u => u.id === item.id)
      : selectedUsers.some(u => u.id === item.id);
    const displayName = getUserDisplayName(item);
    const avatarUri = getUserAvatar(item);

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => {
          if (groupType === 'BROADCAST') {
            toggleAdminSelection(item);
          } else {
            toggleUserSelection(item);
          }
        }}
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
        <Text style={styles.headerTitle}>
          {groupType === 'BROADCAST' ? 'Новый канал' : 'Новая группа'}
        </Text>
        <View style={styles.headerActions}>
          {/* Кнопка создания */}
          <TouchableOpacity
            onPress={createGroup}
            disabled={creating || !groupName.trim() || (groupType !== 'BROADCAST' && selectedUsers.length === 0)}
            style={[styles.createButton, (creating || !groupName.trim() || (groupType !== 'BROADCAST' && selectedUsers.length === 0)) && styles.createButtonDisabled]}
          >
            {creating ? (
              <View style={styles.creatingContainer}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                {creatingStep && (
                  <Text style={styles.creatingStepText} numberOfLines={1}>
                    {creatingStep}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.createButtonText}>Создать</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Переключатель типа - только для суперадминов */}
      {isSuperAdmin && (
        <View style={styles.typeTabsContainer}>
          <TouchableOpacity
            style={[styles.typeTab, groupType === 'GROUP' && styles.typeTabActive]}
            onPress={() => {
              setGroupType('GROUP');
              setSelectedAdmins([]);
            }}
          >
            <Text style={[styles.typeTabText, groupType === 'GROUP' && styles.typeTabTextActive]}>
              👥 Группа
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeTab, groupType === 'BROADCAST' && styles.typeTabActive]}
            onPress={() => {
              setGroupType('BROADCAST');
              setSelectedUsers([]);
            }}
          >
            <Text style={[styles.typeTabText, groupType === 'BROADCAST' && styles.typeTabTextActive]}>
              📢 Канал
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Group Info Section */}
        <View style={styles.groupInfoSection}>
          <Text style={styles.sectionTitle}>
            {groupType === 'BROADCAST' ? 'Информация о канале' : 'Информация о группе'}
          </Text>
          
          {/* Информация о канале - только для BROADCAST */}
          {groupType === 'BROADCAST' && (
            <View style={styles.broadcastInfo}>
              <Text style={styles.broadcastInfoText}>
                ℹ️ Все клиенты будут автоматически добавлены в этот канал при регистрации. Канал закрыт - только администраторы могут отправлять сообщения.
              </Text>
            </View>
          )}
          
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <Text style={styles.inputLabel}>
              {groupType === 'BROADCAST' ? 'Аватар канала (необязательно)' : 'Аватар группы (необязательно)'}
            </Text>
            <View style={styles.avatarContainer}>
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={showImagePicker}
                activeOpacity={0.7}
              >
                {groupAvatar ? (
                  <View style={styles.avatarImageContainer}>
                    <Image 
                      source={{ uri: groupAvatar.uri }} 
                      style={styles.avatarImage}
                      resizeMode="cover"
                      progressiveRenderingEnabled={true}
                      fadeDuration={100}
                      onLoadStart={() => console.log('📸 Начало загрузки аватара')}
                      onLoadEnd={() => console.log('✅ Аватар загружен')}
                      onError={(error) => console.error('❌ Ошибка загрузки аватара:', error)}
                    />
                  </View>
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
            <Text style={styles.inputLabel}>
              {groupType === 'BROADCAST' ? 'Название канала *' : 'Название группы *'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={groupName}
              onChangeText={setGroupName}
              placeholder={groupType === 'BROADCAST' ? 'Введите название канала' : 'Введите название группы'}
              maxLength={100}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Описание (необязательно)</Text>
            <TextInput
              style={[styles.textInput, styles.descriptionInput]}
              value={groupDescription}
              onChangeText={setGroupDescription}
              placeholder={groupType === 'BROADCAST' ? 'Введите описание канала' : 'Введите описание группы'}
              multiline
              maxLength={500}
            />
          </View>
        </View>

        {/* Selected Admins Section - только для BROADCAST */}
        {groupType === 'BROADCAST' && selectedAdmins.length > 0 && (
          <View style={styles.selectedUsersSection}>
            <View style={styles.selectedUsersHeader}>
              <Text style={styles.sectionTitle}>
                Администраторы ({selectedAdmins.length})
              </Text>
            </View>
            <FlatList
              horizontal
              data={selectedAdmins}
              renderItem={({ item }) => (
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
                    onPress={() => setSelectedAdmins(prev => prev.filter(u => u.id !== item.id))}
                  >
                    <Text style={styles.removeUserText}>×</Text>
                  </TouchableOpacity>
                </View>
              )}
              keyExtractor={(item) => String(item.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectedUsersList}
            />
          </View>
        )}

        {/* Selected Users Section - только для обычных групп */}
        {groupType !== 'BROADCAST' && selectedUsers.length > 0 && (
          <View style={styles.selectedUsersSection}>
            <View style={styles.selectedUsersHeader}>
              <Text style={styles.sectionTitle}>
                Участники ({selectedUsers.length})
              </Text>
            </View>
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
          <Text style={styles.sectionTitle}>
            {groupType === 'BROADCAST' ? 'Добавить администраторов' : 'Добавить участников'}
          </Text>
          
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
      </KeyboardAvoidingView>
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
    borderBottomWidth: 0,
    borderBottomColor: '#E5E5E5',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#F8F8F8',
  },
  typeTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  typeTabActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  typeTabTextActive: {
    color: '#FFFFFF',
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
    minWidth: 120, // Увеличено для отображения прогресса
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  creatingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
  },
  creatingStepText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 100,
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
  avatarImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
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
  selectedUsersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  broadcastInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  broadcastInfoText: {
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
});

export default CreateGroupScreen;
