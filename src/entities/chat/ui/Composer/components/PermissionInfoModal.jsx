import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Модальное окно для информирования пользователя о необходимости разрешения
 * Соответствует требованиям Apple: только информация и кнопка "Открыть настройки"
 */
export const PermissionInfoModal = ({ visible, onClose, type = 'photos' }) => {
  const handleOpenSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        // Для iOS используем openSettings из expo-linking
        await Linking.openSettings();
      } else {
        // Для Android также используем openSettings
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Ошибка при открытии настроек:', error);
    }
  };

  const getText = () => {
    if (type === 'photos') {
      return 'Чтобы отправлять фотографии в чате, разрешите доступ к Фото в настройках устройства.';
    }
    if (type === 'camera') {
      return 'Чтобы делать фотографии в чате, разрешите доступ к Камере в настройках устройства.';
    }
    if (type === 'contacts') {
      return 'Чтобы приглашать друзей и делиться контактами, разрешите доступ к Контактам в настройках устройства.';
    }
    if (type === 'microphone') {
      return 'Чтобы записывать голосовые сообщения, разрешите доступ к Микрофону в настройках устройства.';
    }
    return 'Чтобы использовать эту функцию, разрешите доступ в настройках устройства.';
  };

  const getTitle = () => {
    if (type === 'photos') return 'Доступ к Фото';
    if (type === 'camera') return 'Доступ к Камере';
    if (type === 'contacts') return 'Доступ к Контактам';
    if (type === 'microphone') return 'Доступ к Микрофону';
    return 'Требуется доступ';
  };

  const getIcon = () => {
    if (type === 'photos') return 'images-outline';
    if (type === 'camera') return 'camera-outline';
    if (type === 'contacts') return 'people-outline';
    if (type === 'microphone') return 'mic-outline';
    return 'alert-circle-outline';
  };

  if (!visible) {
    return null;
  }
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name={getIcon()} 
                size={48} 
                color="#007AFF" 
              />
            </View>
            
            <Text style={styles.title}>
              {getTitle()}
            </Text>
            
            <Text style={styles.message}>
              {getText()}
            </Text>
            
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={handleOpenSettings}
                activeOpacity={0.7}
              >
                <Text style={styles.settingsButtonText}>Открыть настройки</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    width: '85%',
    maxWidth: 400,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  settingsButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
