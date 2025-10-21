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
import NetInfo from '@react-native-community/netinfo';

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
  const [creatingStep, setCreatingStep] = useState(''); // Текущий шаг создания для UI
  const [groupAvatar, setGroupAvatar] = useState(null); // { uri, type, name }
  const [avatarPreloadStatus, setAvatarPreloadStatus] = useState(null); // 'uploading', 'success', 'error'
  const [preloadedAvatarPath, setPreloadedAvatarPath] = useState(null); // Путь к предзагруженному аватару

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

  // Получение размера файла изображения
  const getImageFileSize = async (imageUri) => {
    try {
      const response = await fetch(imageUri, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength, 10) : 0;
    } catch (error) {
      console.warn('Не удалось определить размер файла:', error);
      return 0;
    }
  };

  const processImage = async (imageUri) => {
    try {
      // Определяем размер исходного файла
      const originalSize = await getImageFileSize(imageUri);
      const maxSizeWithoutCompression = 2 * 1024 * 1024; // 2MB - максимальный размер без сжатия
      
      console.log('📸 Анализ изображения:', {
        originalUri: imageUri,
        fileSizeMB: Math.round(originalSize / (1024 * 1024) * 100) / 100,
        needsCompression: originalSize > maxSizeWithoutCompression
      });
      
      // Если файл ≤ 2MB - оставляем как есть (сохраняем качество)
      if (originalSize <= maxSizeWithoutCompression && originalSize > 0) {
        console.log('✅ Файл ≤ 2MB, оставляем оригинальное качество');
        return { uri: imageUri };
      }
      
      // Если файл > 2MB - сжимаем до ~2MB с максимальным качеством
      console.log('📉 Файл > 2MB, сжимаем до 2MB с сохранением качества');
      
      // Итеративное сжатие для достижения целевого размера ~2MB
      let currentUri = imageUri;
      let currentSize = originalSize;
      let quality = 0.9; // Начинаем с высокого качества
      let dimensions = 800; // Начинаем с больших размеров
      
      // Максимум 3 итерации сжатия
      for (let iteration = 1; iteration <= 3; iteration++) {
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          currentUri,
          [{ resize: { width: dimensions, height: dimensions } }],
          { 
            compress: quality,
            format: ImageManipulator.SaveFormat.JPEG 
          }
        );
        
        const newSize = await getImageFileSize(manipulatedImage.uri);
        
        console.log(`📸 Итерация ${iteration}:`, {
          dimensions: `${dimensions}x${dimensions}`,
          quality,
          resultSizeMB: Math.round(newSize / (1024 * 1024) * 100) / 100
        });
        
        // Если достигли целевого размера или это последняя итерация
        if (newSize <= maxSizeWithoutCompression || iteration === 3) {
          console.log('✅ Сжатие завершено:', {
            originalSizeMB: Math.round(originalSize / (1024 * 1024) * 100) / 100,
            finalSizeMB: Math.round(newSize / (1024 * 1024) * 100) / 100,
            compressionRatio: originalSize > 0 ? Math.round((1 - newSize / originalSize) * 100) : 0,
            iterations: iteration
          });
          return manipulatedImage;
        }
        
        // Корректируем параметры для следующей итерации
        if (newSize > maxSizeWithoutCompression * 1.5) {
          // Если все еще слишком большой - уменьшаем размеры
          dimensions = Math.max(400, dimensions - 200);
        } else {
          // Если близко к цели - только снижаем качество
          quality = Math.max(0.6, quality - 0.15);
        }
        
        currentUri = manipulatedImage.uri;
        currentSize = newSize;
      }
      
      return { uri: currentUri };
    } catch (error) {
      console.error('Ошибка обработки изображения:', error);
      throw new Error('Не удалось обработать изображение. Попробуйте выбрать другое фото.');
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
        quality: 0.9, // Высокое качество - сжатие будет умным
        allowsMultipleSelection: false, // Убираем множественный выбор для стабильности
      });

      if (!result.canceled && result.assets[0]) {
        // Показываем информацию о процессе обработки
        const originalSize = await getImageFileSize(result.assets[0].uri);
        if (originalSize > 2 * 1024 * 1024) {
          Alert.alert(
            'Обработка изображения',
            `Изображение большое (${Math.round(originalSize / (1024 * 1024) * 100) / 100}MB), выполняется оптимизация...`,
            [{ text: 'OK' }]
          );
        }
        
        const processedImage = await processImage(result.assets[0].uri);
        const avatarData = {
          uri: processedImage.uri,
          type: 'image/jpeg',
          name: `group_avatar_${Date.now()}.jpg`
        };
        
        setGroupAvatar(avatarData);
        
        // Запускаем фоновую предзагрузку
        preloadAvatar(avatarData);
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
        quality: 0.9, // Высокое качество - сжатие будет умным
      });

      if (!result.canceled && result.assets[0]) {
        // Показываем информацию о процессе обработки
        const originalSize = await getImageFileSize(result.assets[0].uri);
        if (originalSize > 2 * 1024 * 1024) {
          Alert.alert(
            'Обработка фото',
            `Фотография большая (${Math.round(originalSize / (1024 * 1024) * 100) / 100}MB), выполняется оптимизация...`,
            [{ text: 'OK' }]
          );
        }
        
        const processedImage = await processImage(result.assets[0].uri);
        const avatarData = {
          uri: processedImage.uri,
          type: 'image/jpeg',
          name: `group_avatar_${Date.now()}.jpg`
        };
        
        setGroupAvatar(avatarData);
        
        // Запускаем фоновую предзагрузку
        preloadAvatar(avatarData);
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
    setAvatarPreloadStatus(null);
    setPreloadedAvatarPath(null);
  };

  // Функция для фоновой предзагрузки аватара с повторными попытками
  const preloadAvatar = async (avatarData) => {
    setAvatarPreloadStatus('uploading');
    
    const uploadWithRetry = async (attempt = 1) => {
      try {
        console.log(`🔄 Предзагрузка аватара (попытка ${attempt}/3)...`);
        
        // Создаем FormData только для аватара
        const formData = new FormData();
        formData.append('avatar', {
          uri: avatarData.uri,
          type: avatarData.type,
          name: avatarData.name,
        });
        
        // Используем специальный API endpoint для предзагрузки аватаров с таймаутом
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Превышено время ожидания загрузки')), 30000); // 30 секунд
        });
        
        const response = await Promise.race([
          ChatApi.preloadAvatar(formData),
          timeoutPromise
        ]);
        const uploadedPath = response?.data?.data?.avatarPath || response?.data?.avatarPath;
        
        if (uploadedPath) {
          setPreloadedAvatarPath(uploadedPath);
          setAvatarPreloadStatus('success');
          console.log('✅ Аватар успешно предзагружен:', uploadedPath);
          return;
        } else {
          throw new Error('Сервер не вернул путь к загруженному файлу');
        }
      } catch (error) {
        console.log(`❌ Попытка ${attempt} неудачна:`, error.message);
        
        if (attempt < 3) {
          // Экспоненциальная задержка: 1с, 2с, 4с
          const delay = 1000 * Math.pow(2, attempt - 1);
          console.log(`⏳ Ожидание ${delay}мс перед попыткой ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return uploadWithRetry(attempt + 1);
        } else {
          throw error; // Последняя попытка - выбрасываем ошибку
        }
      }
    };
    
    try {
      await uploadWithRetry();
    } catch (error) {
      console.error('❌ Финальная ошибка предзагрузки аватара:', error);
      setAvatarPreloadStatus('error');
      
      // Логируем, но не показываем алерт - это фоновый процесс
      // Пользователь может продолжить создание группы
      // Аватар будет загружен при создании группы как fallback
      console.log('ℹ️ Предзагрузка не удалась, будет использован fallback при создании группы');
    }
  };

  // Функция повторных попыток с экспоненциальной задержкой
  const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(attempt); // Передаем номер попытки в функцию
      } catch (error) {
        console.log(`Попытка ${attempt}/${maxRetries} неудачна:`, error.message);
        
        if (attempt === maxRetries) {
          throw error; // Последняя попытка - выбрасываем ошибку
        }
        
        // Экспоненциальная задержка: 2с, 4с, 8с
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Ожидание ${delay}мс перед следующей попыткой...`);
        setCreatingStep(`Повторная попытка через ${delay/1000}с...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
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
      Alert.alert('Нет соединения', netError.message || 'Проверьте подключение к интернету');
      return;
    }

    setCreatingStep('Подготовка данных...');
    
    try {
      const memberIds = selectedUsers.map(user => user.id);
      
      console.log('🏗️ Создание группы началось:', {
        groupName: groupName.trim(),
        membersCount: memberIds.length,
        hasAvatar: !!groupAvatar
      });
      
      setCreatingStep('Формирование запроса...');
      
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
      if (groupAvatar && groupAvatar.uri) {
        if (avatarPreloadStatus === 'success' && preloadedAvatarPath) {
          // Используем предзагруженный аватар
          setCreatingStep('Использование загруженного аватара...');
          formData.append('preloadedAvatarPath', preloadedAvatarPath);
          console.log('✅ Используем предзагруженный аватар:', preloadedAvatarPath);
        } else if (avatarPreloadStatus === 'uploading') {
          // Ждем завершения предзагрузки
          setCreatingStep('Ожидание загрузки аватара...');
          
          // Ждем до 10 секунд завершения предзагрузки
          const maxWaitTime = 10000; // 10 секунд
          const checkInterval = 500; // Проверяем каждые 500мс
          let waitedTime = 0;
          
          while (avatarPreloadStatus === 'uploading' && waitedTime < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waitedTime += checkInterval;
          }
          
          if (avatarPreloadStatus === 'success' && preloadedAvatarPath) {
            formData.append('preloadedAvatarPath', preloadedAvatarPath);
            console.log('✅ Дождались предзагрузки аватара:', preloadedAvatarPath);
          } else {
            // Fallback - загружаем аватар напрямую
            setCreatingStep('Загрузка аватара...');
            formData.append('avatar', {
              uri: groupAvatar.uri,
              type: groupAvatar.type,
              name: groupAvatar.name,
            });
            console.log('⚠️ Предзагрузка не завершилась, загружаем напрямую');
          }
        } else {
          // Fallback - загружаем аватар напрямую
          setCreatingStep('Загрузка аватара...');
          formData.append('avatar', {
            uri: groupAvatar.uri,
            type: groupAvatar.type,
            name: groupAvatar.name,
          });
          console.log('📸 Загружаем аватар напрямую (предзагрузка недоступна)');
        }
      }
      
      setCreatingStep('Создание группы...');
      
      // Используем систему повторных попыток с обновлением статуса
      const result = await retryWithBackoff(async (attempt) => {
        if (attempt > 1) {
          setCreatingStep(`Повторная попытка ${attempt}/3...`);
        }
        console.log(`📡 Отправка запроса на создание группы (попытка ${attempt})...`);
        return await dispatch(createRoom(formData));
      }, 3, 2000); // 3 попытки с задержкой 2с, 4с, 8с

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
        { text: 'Попробовать ещё раз', onPress: createGroup }
      ];
      
      // Добавляем опцию создания без аватара если есть проблемы с загрузкой
      if (showRetryWithoutAvatar) {
        alertButtons.unshift({
          text: 'Создать без фото',
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
      
      Alert.alert(errorTitle, errorMessage, alertButtons);
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
                  <View style={styles.avatarImageContainer}>
                    <Image source={{ uri: groupAvatar.uri }} style={styles.avatarImage} />
                    {/* Индикатор статуса предзагрузки */}
                    {avatarPreloadStatus === 'uploading' && (
                      <View style={styles.uploadingOverlay}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.uploadingText}>Загрузка...</Text>
                      </View>
                    )}
                    {avatarPreloadStatus === 'success' && (
                      <View style={styles.successOverlay}>
                        <Text style={styles.successText}>✓</Text>
                      </View>
                    )}
                    {avatarPreloadStatus === 'error' && (
                      <View style={styles.errorOverlay}>
                        <Text style={styles.errorText}>⚠</Text>
                      </View>
                    )}
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
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
  successOverlay: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorOverlay: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    backgroundColor: '#F44336',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
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
