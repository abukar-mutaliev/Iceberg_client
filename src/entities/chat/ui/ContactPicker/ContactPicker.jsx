import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import ChatApi from '@entities/chat/api/chatApi';
import { useSelector } from 'react-redux';
import { getImageUrl } from '@shared/api/api';

export const ContactPicker = ({ visible, onClose, onSelect, initialMode = 'app' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [deviceContacts, setDeviceContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [mode, setMode] = useState(initialMode); // 'app' или 'device'
  const currentUserId = useSelector(state => state.auth?.user?.id);

  // Поиск пользователей приложения
  const searchUsers = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      const response = await ChatApi.searchUsers(query.trim(), 100);
      const userData = response?.data?.data?.users || response?.data?.users || [];
      // Исключаем текущего пользователя из списка
      const filteredUsers = userData.filter(user => user.id !== currentUserId);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Ошибка поиска пользователей:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Загрузка контактов из телефонной книги
  const loadDeviceContacts = useCallback(async () => {
    setLoadingContacts(true);
    
    try {
      // Разрешение уже проверено на уровне выше (в Composer)
      // Если ContactPicker открылся, значит разрешение есть
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });

      // Фильтруем контакты с номерами телефонов
      const contactsWithPhones = data.filter(
        contact => contact.phoneNumbers && contact.phoneNumbers.length > 0
      );

      setDeviceContacts(contactsWithPhones);
    } catch (error) {
      console.error('Ошибка загрузки контактов:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить контакты');
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  // Поиск в контактах устройства
  const searchDeviceContacts = useCallback((query) => {
    if (!query || query.trim().length < 1) {
      return deviceContacts;
    }

    const lowerQuery = query.toLowerCase().trim();
    return deviceContacts.filter(contact => {
      const name = contact.name?.toLowerCase() || '';
      const phones = contact.phoneNumbers?.map(p => p.number?.replace(/[^0-9+]/g, '') || '').join('') || '';
      return name.includes(lowerQuery) || phones.includes(lowerQuery);
    });
  }, [deviceContacts]);

  const showWhatsAppInstallPrompt = useCallback(() => {
    Alert.alert(
      'WhatsApp не установлен',
      'Для отправки приглашения необходимо установить WhatsApp',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Установить',
          onPress: () => {
            const storeUrl = Platform.select({
              ios: 'https://apps.apple.com/app/whatsapp-messenger/id310633997',
              android: 'https://play.google.com/store/apps/details?id=com.whatsapp',
            });
            if (storeUrl) {
              Linking.openURL(storeUrl);
            }
          }
        }
      ]
    );
  }, []);

  // Отправка приглашения через WhatsApp
  const sendWhatsAppInvite = useCallback((contact) => {
    if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) {
      Alert.alert('Ошибка', 'У контакта нет номера телефона');
      return;
    }

    const rawPhoneNumber = contact.phoneNumbers[0].number || '';
    const digitsOnly = rawPhoneNumber.replace(/\D/g, '');
    let phoneNumber = digitsOnly;

    // Приводим номер к формату WhatsApp (международный код без +)
    if (phoneNumber.length === 11 && phoneNumber.startsWith('8')) {
      phoneNumber = `7${phoneNumber.slice(1)}`;
    } else if (phoneNumber.length === 10) {
      phoneNumber = `7${phoneNumber}`;
    }

    if (!phoneNumber) {
      Alert.alert('Ошибка', 'Некорректный номер телефона');
      return;
    }

    // Формируем сообщение приглашения с обеими ссылками
    const appStoreLink = 'https://apps.apple.com/ru/app/iceberg-ingushetia/id6757783124';
    const googlePlayLink = 'https://play.google.com/store/apps/details?id=com.abuingush.iceberg';
    const inviteMessage = `Привет! Присоединяйся к приложению Iceberg.\n\nApp Store: ${appStoreLink}\nGoogle Play: ${googlePlayLink}`;
    
    // Формат URL для WhatsApp
    const encodedMessage = encodeURIComponent(inviteMessage);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    const openWhatsApp = async () => {
      try {
        if (Platform.OS === 'ios') {
          await Linking.openURL(whatsappUrl);
          onClose();
          return;
        }

        const supported = await Linking.canOpenURL(whatsappUrl);
        if (supported) {
          await Linking.openURL(whatsappUrl);
          onClose();
          return;
        }

        showWhatsAppInstallPrompt();
      } catch (error) {
        console.error('Ошибка открытия WhatsApp:', error);
        showWhatsAppInstallPrompt();
      }
    };

    openWhatsApp();
  }, [onClose, showWhatsAppInstallPrompt]);

  // Дебаунс поиска пользователей приложения
  useEffect(() => {
    if (mode === 'app') {
      const timeoutId = setTimeout(() => {
        searchUsers(searchQuery);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, searchUsers, mode]);

  // Загрузка контактов при переключении на режим контактов
  useEffect(() => {
    if (visible && mode === 'device') {
      // Разрешение уже проверено на уровне выше (в Composer)
      // Если ContactPicker открылся, значит разрешение есть
      // Загружаем контакты, если они не загружены
      if (deviceContacts.length === 0 && !loadingContacts) {
        loadDeviceContacts();
      }
    }
  }, [visible, mode, deviceContacts.length, loadingContacts, loadDeviceContacts]);

  // Сброс при закрытии и установка начального режима
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setUsers([]);
      setMode(initialMode);
    } else {
      // При открытии устанавливаем начальный режим
      setMode(initialMode);
    }
  }, [visible, initialMode]);

  // Получение имени пользователя
  const getUserDisplayName = useCallback((user) => {
    // Используем name или displayName из API ответа (приоритет)
    if (user.name) return user.name;
    if (user.displayName) return user.displayName;
    
    // Fallback на данные профиля
    return user.client?.name ||
           user.admin?.name ||
           user.employee?.name ||
           user.supplier?.contactPerson ||
           user.supplier?.companyName ||
           user.driver?.name ||
           user.email?.split('@')[0] ||
           'Пользователь';
  }, []);

  // Получение роли пользователя
  const getUserRole = useCallback((user) => {
    const role = user.role;
    if (role === 'SUPPLIER') return 'Поставщик';
    if (role === 'CLIENT') return 'Клиент';
    if (role === 'EMPLOYEE') return 'Сотрудник';
    if (role === 'ADMIN') return 'Администратор';
    if (role === 'DRIVER') return 'Водитель';
    return role || '';
  }, []);

  // Получение аватара
  const getUserAvatar = useCallback((user) => {
    const avatarRaw = user.avatar || user.profile?.avatar || user.image;
    return avatarRaw ? getImageUrl(avatarRaw) : null;
  }, []);

  // Обработка выбора контакта
  const handleSelectContact = useCallback((user) => {
    // Сначала вызываем onSelect, чтобы инициировать отправку
    // Затем закрываем модальное окно
    if (user && user.id) {
      onSelect(user);
      // Небольшая задержка перед закрытием, чтобы пользователь видел визуальный отклик
      setTimeout(() => {
        onClose();
      }, 100);
    }
  }, [onSelect, onClose]);

  // Рендер элемента списка пользователей приложения
  const renderUserItem = useCallback(({ item }) => {
    const displayName = getUserDisplayName(item);
    const userRole = getUserRole(item);
    const avatarUri = getUserAvatar(item);

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleSelectContact(item)}
        activeOpacity={0.7}
      >
        <View style={styles.userInfo}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>👤</Text>
            </View>
          )}
          <View style={styles.userTextInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            {userRole && (
              <Text style={styles.userRole}>{userRole}</Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8696A0" />
      </TouchableOpacity>
    );
  }, [getUserDisplayName, getUserRole, getUserAvatar, handleSelectContact]);

  // Рендер элемента списка контактов устройства
  const renderDeviceContactItem = useCallback(({ item }) => {
    const contactName = item.name || 'Без имени';
    const phoneNumber = item.phoneNumbers?.[0]?.number || '';

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => sendWhatsAppInvite(item)}
        activeOpacity={0.7}
      >
        <View style={styles.userInfo}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>👤</Text>
          </View>
          <View style={styles.userTextInfo}>
            <Text style={styles.userName}>{contactName}</Text>
            {phoneNumber && (
              <Text style={styles.userRole}>{phoneNumber}</Text>
            )}
          </View>
        </View>
        <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
      </TouchableOpacity>
    );
  }, [sendWhatsAppInvite]);

  // Получаем отфильтрованные контакты устройства
  const filteredDeviceContacts = useMemo(() => {
    return searchDeviceContacts(searchQuery);
  }, [searchQuery, searchDeviceContacts]);

  // Определяем список для отображения
  const listData = mode === 'app' ? users : filteredDeviceContacts;
  const isLoading = mode === 'app' ? loading : loadingContacts;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {mode === 'app' ? 'Отправить контакт' : 'Пригласить друга'}
            </Text>
            <View style={styles.closeButtonPlaceholder} />
          </View>

          {/* Mode Toggle */}
          <View style={styles.modeToggleContainer}>
            <TouchableOpacity
              style={[styles.modeToggle, mode === 'app' && styles.modeToggleActive]}
              onPress={() => setMode('app')}
            >
              <Text style={[styles.modeToggleText, mode === 'app' && styles.modeToggleTextActive]}>
                Пользователи
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeToggle, mode === 'device' && styles.modeToggleActive]}
              onPress={() => setMode('device')}
            >
              <Text style={[styles.modeToggleText, mode === 'device' && styles.modeToggleTextActive]}>
                Контакты
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#8696A0" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={
                mode === 'app' 
                  ? 'Поиск по имени, email или телефону...' 
                  : 'Поиск по имени или номеру...'
              }
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#8696A0"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="default"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#8696A0" />
              </TouchableOpacity>
            )}
          </View>

          {/* List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00A884" />
            </View>
          ) : listData.length > 0 ? (
            <FlatList
              data={listData}
              renderItem={mode === 'app' ? renderUserItem : renderDeviceContactItem}
              keyExtractor={(item) => 
                mode === 'app' 
                  ? String(item.id) 
                  : item.id || `${item.name}-${item.phoneNumbers?.[0]?.number || ''}`
              }
              style={styles.list}
              contentContainerStyle={styles.listContent}
            />
          ) : mode === 'app' && searchQuery.length >= 2 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="person-outline" size={48} color="#8696A0" />
              <Text style={styles.emptyText}>Пользователи не найдены</Text>
            </View>
          ) : mode === 'device' && searchQuery.length >= 1 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="person-outline" size={48} color="#8696A0" />
              <Text style={styles.emptyText}>Контакты не найдены</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#8696A0" />
              <Text style={styles.emptyText}>
                {mode === 'app' 
                  ? 'Введите имя или email для поиска' 
                  : 'Введите имя или номер для поиска'}
              </Text>
            </View>
          )}
          </View>
        </View>
      </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPlaceholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 24,
  },
  userTextInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#8696A0',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#8696A0',
    marginTop: 16,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#F0F2F5',
    borderRadius: 8,
    padding: 4,
  },
  modeToggle: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeToggleActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8696A0',
  },
  modeToggleTextActive: {
    color: '#000',
    fontWeight: '600',
  },
});
