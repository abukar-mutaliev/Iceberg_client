import { useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/**
 * Хук для работы с медиа (изображения, камера, голосовые сообщения)
 * Обрабатывает выбор изображений из галереи, съемку фото
 * Соответствует требованиям Apple: запрашивает разрешение по действию пользователя,
 * а экран настроек показывается только после отказа
 */
export const useComposerMedia = ({
  disabled,
  setFiles,
  setShowAttachmentMenu,
  setPendingAction,
  setShowPollModal,
  onShowPermissionModal,
}) => {
  // ============ PICK IMAGES ============
  
  const pickImages = useCallback(async () => {
    if (disabled) return;
    
    try {
      if (Platform.OS === 'android') {
        // На Android: автоматический запрос разрешения (как раньше)
        const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
        
        if (currentStatus !== 'granted') {
          const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
          
          if (permissionResult.status !== 'granted') {
            return;
          }
        }
      } else {
        // iOS: сначала запрашиваем разрешение, и только после отказа показываем экран настроек
        const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (currentStatus !== 'granted') {
          const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (permissionResult.status !== 'granted') {
            if (onShowPermissionModal) {
              onShowPermissionModal('photos');
            }
            return;
          }
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selected = result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
          size: asset.fileSize,
        }));
        setFiles((prev) => [...prev, ...selected]);
      }
    } catch (e) {
      console.error('❌ Ошибка при выборе изображений:', e);
    }
  }, [disabled, setFiles, onShowPermissionModal]);

  // ============ TAKE PHOTO ============
  
  const takePhoto = useCallback(async () => {
    if (disabled) return;
    
    try {
      if (Platform.OS === 'android') {
        // На Android: автоматический запрос разрешения (как раньше)
        const { status: currentStatus } = await ImagePicker.getCameraPermissionsAsync();
        
        if (currentStatus !== 'granted') {
          const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
          
          if (permissionResult.status !== 'granted') {
            return;
          }
        }
      } else {
        // iOS: сначала запрашиваем разрешение, и только после отказа показываем экран настроек
        const { status: currentStatus } = await ImagePicker.getCameraPermissionsAsync();
        if (currentStatus !== 'granted') {
          const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
          if (permissionResult.status !== 'granted') {
            if (onShowPermissionModal) {
              onShowPermissionModal('camera');
            }
            return;
          }
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selected = result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
          size: asset.fileSize,
        }));
        setFiles((prev) => [...prev, ...selected]);
      }
    } catch (e) {
      console.error('❌ Ошибка при съемке фото:', e);
    }
  }, [disabled, setFiles, onShowPermissionModal]);

  // ============ HANDLE ATTACHMENT MENU ============
  
  const handleAttachmentMenuClose = useCallback(() => {
    setShowAttachmentMenu(false);
    
    // iOS: используем onDismiss callback через pendingAction
    if (Platform.OS === 'ios') {
      // pendingAction обрабатывается в компоненте через onDismiss
      return;
    }
    
    // Android: можем выполнить действие сразу
    // pendingAction обрабатывается в компоненте
  }, [setShowAttachmentMenu]);

  const handleGalleryPress = useCallback(() => {
    if (Platform.OS === 'ios') {
      setPendingAction('gallery');
      setShowAttachmentMenu(false);
    } else {
      setShowAttachmentMenu(false);
      setTimeout(() => pickImages(), 50);
    }
  }, [setPendingAction, setShowAttachmentMenu, pickImages]);

  const handleCameraPress = useCallback(() => {
    if (Platform.OS === 'ios') {
      setPendingAction('camera');
      setShowAttachmentMenu(false);
    } else {
      setShowAttachmentMenu(false);
      setTimeout(() => takePhoto(), 50);
    }
  }, [setPendingAction, setShowAttachmentMenu, takePhoto]);

  const handlePollPress = useCallback(() => {
    if (Platform.OS === 'ios') {
      setPendingAction('poll');
      setShowAttachmentMenu(false);
    } else {
      setShowAttachmentMenu(false);
      setShowPollModal(true);
    }
  }, [setPendingAction, setShowAttachmentMenu, setShowPollModal]);

  return {
    pickImages,
    takePhoto,
    handleAttachmentMenuClose,
    handleGalleryPress,
    handleCameraPress,
    handlePollPress,
  };
};

