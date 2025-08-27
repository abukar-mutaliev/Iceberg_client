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
        setCurrentAvatarUri(processedImage.uri);
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
        setCurrentAvatarUri(processedImage.uri);
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
          formData.append('avatar', {
            uri: groupAvatar.uri,
            type: groupAvatar.type,
            name: groupAvatar.name,
          });
        }
      }
      
      const result = await dispatch(updateRoom({
        roomId,
        formData
      }));

      if (result.type.endsWith('/fulfilled')) {
        // Обновляем данные группы
        await dispatch(fetchRoom(roomId));
        
        Alert.alert(
          'Успех', 
          'Информация о группе обновлена!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
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
                <Image source={{ uri: currentAvatarUri }} style={styles.avatarImage} />
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
  avatarImage: {
    width: '100%',
    height: '100%',
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
