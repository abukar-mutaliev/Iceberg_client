import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { updateRoom, fetchRoom } from '@entities/chat/model/slice';
import { getBaseUrl } from '@shared/api/api';
import ChatApi from '@entities/chat/api/chatApi';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export const EditGroupScreen = ({ route, navigation }) => {
  const { roomId } = route.params;
  const dispatch = useDispatch();
  const roomDataRaw = useSelector(state => state?.chat?.rooms?.byId?.[roomId]);
  const roomData = roomDataRaw?.room ? roomDataRaw.room : roomDataRaw;
  
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupAvatar, setGroupAvatar] = useState(null); // { uri, type, name } или null
  const [currentAvatarUri, setCurrentAvatarUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const [avatarPreloadStatus, setAvatarPreloadStatus] = useState(null); // 'uploading', 'success', 'error'
  const [preloadedAvatarPath, setPreloadedAvatarPath] = useState(null); // Путь к предзагруженному аватару

  // Инициализация данных группы
  useEffect(() => {
    if (roomData) {
      setGroupName(roomData.title || '');
      setGroupDescription(roomData.description || '');
      setCurrentAvatarUri(roomData.avatar ? toAbsoluteUri(roomData.avatar) : null);
    }
  }, [roomData]);

  const toAbsoluteUri = useCallback((raw) => {
    if (!raw || typeof raw !== 'string') return null;
    if (raw.startsWith('http')) return raw;
    let path = raw.replace(/^\\+/g, '').replace(/^\/+/, '');
    path = path.replace(/^uploads\/?/, '');
    return `${getBaseUrl()}/uploads/${path}`;
  }, []);

  // Функции для работы с изображениями
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
      
      console.log('📸 Анализ изображения для редактирования группы:', {
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
        quality: 0.9, // Высокое качество - умное сжатие обработает размер
      });

      if (!result.canceled && result.assets[0]) {
        const processedImage = await processImage(result.assets[0].uri);
        const avatarData = {
          uri: processedImage.uri,
          type: 'image/jpeg',
          name: `group_avatar_${Date.now()}.jpg`
        };
        
        setGroupAvatar(avatarData);
        setCurrentAvatarUri(processedImage.uri);
        
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
        quality: 0.9, // Высокое качество - умное сжатие обработает размер
      });

      if (!result.canceled && result.assets[0]) {
        const processedImage = await processImage(result.assets[0].uri);
        const avatarData = {
          uri: processedImage.uri,
          type: 'image/jpeg',
          name: `group_avatar_${Date.now()}.jpg`
        };
        
        setGroupAvatar(avatarData);
        setCurrentAvatarUri(processedImage.uri);
        
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
      'Изменить фото группы',
      'Выберите способ загрузки нового аватара',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Галерея', onPress: pickImageFromGallery },
        { text: 'Камера', onPress: takePhoto },
        { text: 'Удалить фото', onPress: removeAvatar, style: 'destructive' },
      ]
    );
  };

  const removeAvatar = () => {
    setGroupAvatar({ remove: true }); // Специальный флаг для удаления
    setCurrentAvatarUri(null);
    setAvatarPreloadStatus(null);
    setPreloadedAvatarPath(null);
  };

  // Функция для фоновой предзагрузки аватара с повторными попытками
  const preloadAvatar = async (avatarData) => {
    setAvatarPreloadStatus('uploading');
    
    const uploadWithRetry = async (attempt = 1) => {
      try {
        console.log(`🔄 Предзагрузка аватара группы (попытка ${attempt}/3)...`);
        
        // Создаем FormData только для аватара
        const formData = new FormData();
        formData.append('avatar', {
          uri: avatarData.uri,
          type: avatarData.type,
          name: avatarData.name,
        });
        
        // Используем API предзагрузки
        const response = await ChatApi.preloadAvatar(formData);
        const uploadedPath = response?.data?.data?.avatarPath || response?.data?.avatarPath;
        
        if (uploadedPath) {
          setPreloadedAvatarPath(uploadedPath);
          setAvatarPreloadStatus('success');
          console.log('✅ Аватар группы успешно предзагружен:', uploadedPath);
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
      console.error('❌ Финальная ошибка предзагрузки аватара группы:', error);
      setAvatarPreloadStatus('error');
      
      // Логируем, но не показываем алерт - это фоновый процесс
      console.log('ℹ️ Предзагрузка не удалась, будет использован fallback при сохранении');
    }
  };

  const handleSave = async () => {
    if (!groupName.trim()) {
      Alert.alert('Ошибка', 'Введите название группы');
      return;
    }

    setSaving(true);
    try {
      // Создаем FormData для отправки на сервер
      const formData = new FormData();
      formData.append('title', groupName.trim());
      formData.append('description', groupDescription.trim() || '');
      
      // Добавляем аватар, если он изменился
      if (groupAvatar) {
        if (groupAvatar.remove) {
          formData.append('removeAvatar', 'true');
        } else {
          // Используем предзагруженный аватар если доступен
          if (avatarPreloadStatus === 'success' && preloadedAvatarPath) {
            console.log('✅ Используем предзагруженный аватар для редактирования группы:', preloadedAvatarPath);
            formData.append('preloadedAvatarPath', preloadedAvatarPath);
          } else if (avatarPreloadStatus === 'uploading') {
            // Ждем завершения предзагрузки (до 5 секунд для редактирования)
            console.log('⏳ Ожидание завершения предзагрузки аватара...');
            const maxWaitTime = 5000; // 5 секунд для редактирования
            const checkInterval = 500;
            let waitedTime = 0;
            
            while (avatarPreloadStatus === 'uploading' && waitedTime < maxWaitTime) {
              await new Promise(resolve => setTimeout(resolve, checkInterval));
              waitedTime += checkInterval;
            }
            
            if (avatarPreloadStatus === 'success' && preloadedAvatarPath) {
              console.log('✅ Дождались предзагрузки для редактирования:', preloadedAvatarPath);
              formData.append('preloadedAvatarPath', preloadedAvatarPath);
            } else {
              // Fallback - загружаем напрямую
              console.log('⚠️ Предзагрузка не завершилась, загружаем напрямую');
              formData.append('avatar', {
                uri: groupAvatar.uri,
                type: groupAvatar.type,
                name: groupAvatar.name,
              });
            }
          } else {
            // Fallback - загружаем напрямую
            console.log('📸 Загружаем аватар напрямую при редактировании');
            formData.append('avatar', {
              uri: groupAvatar.uri,
              type: groupAvatar.type,
              name: groupAvatar.name,
            });
          }
        }
      }
      
      const result = await dispatch(updateRoom({
        roomId,
        formData
      }));

      if (result.type.endsWith('/fulfilled')) {
        // Обновляем данные группы
        await dispatch(fetchRoom(roomId));
        
        // Возвращаемся назад без алерта для лучшего UX
        navigation.goBack();
      } else {
        throw new Error(result.payload || 'Ошибка обновления группы');
      }
    } catch (error) {
      console.error('Ошибка обновления группы:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось обновить группу');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Редактировать группу</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !groupName.trim()}
          style={[styles.saveButton, (saving || !groupName.trim()) && styles.saveButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Сохранить</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 50}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={showImagePicker}
              activeOpacity={0.7}
            >
              {currentAvatarUri ? (
                <View style={styles.avatarImageContainer}>
                  <Image source={{ uri: currentAvatarUri }} style={styles.avatarImage} />
                  {/* Индикаторы статуса предзагрузки */}
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
                  <Text style={styles.avatarPlaceholderText}>👥</Text>
                  <Text style={styles.avatarPlaceholderSubtext}>Нажмите для изменения</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Group Info */}
          <View style={styles.formSection}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Название группы</Text>
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
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 100, // Увеличиваем нижний отступ для клавиатуры
  },
  content: {
    flex: 1,
    padding: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 60,
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
    width: 24,
    height: 24,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorOverlay: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    backgroundColor: '#F44336',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
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
    fontSize: 32,
    marginBottom: 8,
  },
  avatarPlaceholderSubtext: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  formSection: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingBottom: 20, // Дополнительный отступ снизу для текста
  },
});

export default EditGroupScreen;
