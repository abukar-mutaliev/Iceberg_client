import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  Modal,
  Platform,
  ActivityIndicator,
  Pressable,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSelector, useDispatch } from 'react-redux';
import { addMembers, fetchRoom, updateRoom, removeMembers } from '@entities/chat/model/slice';
import ChatApi from '@entities/chat/api/chatApi';
import { getImageUrl } from '@shared/api/api';
import { AddUserIcon } from '@shared/ui/Icon/AddUserIcon';
import { IconEdit } from '@shared/ui/Icon/Profile/IconEdit';
import { ImageViewerModal } from '@shared/ui/ImageViewerModal/ui/ImageViewerModal';
import { useCustomAlert } from '@shared/ui/CustomAlert';

// Анимированный переключатель в стиле WhatsApp
const AnimatedSwitch = ({ value, disabled }) => {
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 60,
    }).start();
  }, [value, animatedValue]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E0E0E0', '#00A884'],
  });

  return (
    <Animated.View style={[switchStyles.track, { backgroundColor }, disabled && switchStyles.trackDisabled]}>
      <Animated.View style={[switchStyles.thumb, { transform: [{ translateX }] }]} />
    </Animated.View>
  );
};

const switchStyles = StyleSheet.create({
  track: {
    width: 52,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    padding: 2,
  },
  trackDisabled: {
    opacity: 0.5,
  },
  thumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
    elevation: 4,
  },
});

export const GroupInfoScreen = ({ route, navigation }) => {
  const { roomId, fromScreen } = route.params || {};
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state?.auth?.user);
  const roomDataRaw = useSelector(state => state?.chat?.rooms?.byId?.[roomId]);
  const roomData = roomDataRaw?.room ? roomDataRaw.room : roomDataRaw;
  const { showError, showAlert, showConfirm } = useCustomAlert();
  
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [adminMenuVisible, setAdminMenuVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Загружаем участников группы
  useEffect(() => {
    if (roomData?.participants) {
      // Для каналов BROADCAST и клиентов - показываем сотрудников и водителей своего района
      if (roomData?.type === 'BROADCAST' && currentUser?.role === 'CLIENT') {
        const clientDistrictId = currentUser?.client?.districtId;
        
        // Если у клиента нет района - не показываем никого
        if (!clientDistrictId) {
          setParticipants([]);
          return;
        }
        
        const filteredParticipants = roomData.participants.filter(p => {
          const user = p.user || p;
          const userRole = user?.role;
          
          // Скрываем суперадминов от клиентов
          if (userRole === 'ADMIN') {
            const isSuperAdmin = user?.admin?.isSuperAdmin;
            if (isSuperAdmin) return false;
            // Обычные админы показываются (можно добавить фильтрацию по району если нужно)
            return true;
          }
          
          // Сотрудники - все кроме сборщиков и курьеров, только из района клиента
          if (userRole === 'EMPLOYEE') {
            const processingRole = user?.employee?.processingRole;
            // Скрываем только сборщиков и курьеров
            if (processingRole === 'PICKER' || processingRole === 'COURIER') {
              return false;
            }
            
            // Проверяем, что сотрудник работает в районе клиента
            // Вариант 1: через склад сотрудника
            const employeeWarehouseDistrictId = user?.employee?.warehouse?.districtId;
            if (employeeWarehouseDistrictId === clientDistrictId) {
              return true;
            }
            
            // Вариант 2: через районы, закрепленные за сотрудником
            const employeeDistricts = user?.employee?.districts || [];
            if (employeeDistricts.some(d => d.id === clientDistrictId)) {
              return true;
            }
            
            // Если у сотрудника нет склада и нет закрепленных районов - не показываем
            return false;
          }
          
          // Поставщиков не показываем
          if (userRole === 'SUPPLIER') {
            return false;
          }
          
          // Водители - только из района клиента
          if (userRole === 'DRIVER') {
            // Проверяем, что склад водителя находится в районе клиента
            const driverWarehouseDistrictId = user?.driver?.warehouse?.districtId;
            if (driverWarehouseDistrictId === clientDistrictId) {
              return true;
            }
            
            // Проверяем районы обслуживания водителя
            const driverDistricts = user?.driver?.districts || [];
            if (driverDistricts.some(d => d.id === clientDistrictId)) {
              return true;
            }
            
            return false;
          }
          
          return false;
        });
        setParticipants(filteredParticipants);
      } else {
        setParticipants(roomData.participants);
      }
    }
  }, [roomData, currentUser?.role, currentUser?.client?.districtId]);

  // Обновляем данные группы при возврате на экран
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      dispatch(fetchRoom(roomId));
    });
    return unsubscribe;
  }, [dispatch, navigation, roomId]);

  // beforeRemove больше не нужен - используем стандартную навигацию
  // Все промежуточные экраны будут проходиться последовательно

  const toAbsoluteUri = useCallback((raw) => {
    if (!raw || typeof raw !== 'string') return null;
    if (raw.startsWith('http')) return raw;
    let path = raw.replace(/^\\+/g, '').replace(/^\/+/, '');
    path = path.replace(/^uploads\/?/, '');
    return getImageUrl(path);
  }, []);

  const getGroupAvatar = () => {
    if (roomData?.avatar) {
      return toAbsoluteUri(roomData.avatar);
    }
    return null;
  };

  const getUserDisplayName = useCallback((participant) => {
    const user = participant.user || participant;
    if (!user) return 'Пользователь';
    
    // Для поставщиков - название компании
    if (user.role === 'SUPPLIER') {
      const companyName = 
        user.supplier?.companyName ||           
        user.companyName ||                     
        user.profile?.companyName;              
      if (companyName) return companyName;
      
      const contactPerson = 
        user.supplier?.contactPerson ||         
        user.contactPerson ||                   
        user.profile?.contactPerson;            
      if (contactPerson) return contactPerson;
    }
    
    // Обычное имя пользователя
    const name = user.name || user.profile?.name || user.firstName || user.profile?.firstName;
    if (name) return name;
    
    // Fallback на email
    if (user.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    
    return 'Пользователь';
  }, []);

  const getUserAvatar = useCallback((participant) => {
    const user = participant.user || participant;
    const avatarPath = user?.avatar || user?.image;
    return toAbsoluteUri(avatarPath);
  }, [toAbsoluteUri]);

  const getRoleLabel = (participant) => {
    switch (participant.role) {
      case 'OWNER':
        return 'Владелец';
      case 'ADMIN':
        return 'Администратор';
      default:
        return '';
    }
  };

  // Функция для получения должности/роли и склада участника
  const getEmployeePosition = (participant) => {
    const user = participant.user || participant;
    if (!user) return null;
    
    // Для сотрудников - должность, склад и район
    if (user.role === 'EMPLOYEE') {
      const position = user.employee?.position || '';
      const warehouse = user.employee?.warehouse?.name || '';
      const warehouseDistrict = user.employee?.warehouse?.district?.name || '';
      const employeeDistricts = user.employee?.districts || [];
      const districtNames = employeeDistricts.map(d => d.name).join(', ');
      
      // Формируем строку с информацией
      const parts = [];
      if (position) parts.push(position);
      if (warehouse) parts.push(warehouse);
      if (warehouseDistrict) parts.push(warehouseDistrict);
      else if (districtNames) parts.push(districtNames);
      
      return parts.length > 0 ? parts.join(' • ') : null;
    }
    
    // Для водителей - роль, склад и районы
    if (user.role === 'DRIVER') {
      const warehouse = user.driver?.warehouse?.name || '';
      const warehouseDistrict = user.driver?.warehouse?.district?.name || '';
      const districts = user.driver?.districts || [];
      const districtNames = districts.map(d => d.name).join(', ');
      
      const parts = ['Водитель'];
      if (warehouse) parts.push(warehouse);
      if (warehouseDistrict) parts.push(warehouseDistrict);
      else if (districtNames) parts.push(districtNames);
      
      return parts.join(' • ');
    }
    
    // Для поставщиков - контактное лицо если есть
    if (user.role === 'SUPPLIER') {
      const contactPerson = user.supplier?.contactPerson || '';
      if (contactPerson) {
        return `Поставщик • ${contactPerson}`;
      }
      return 'Поставщик';
    }
    
    // Для админов приложения
    if (user.role === 'ADMIN') {
      return 'Администратор';
    }
    
    return null;
  };

  // Функция для обработки длинного описания
  const getDescriptionText = (description) => {
    if (!description) return null;
    
    const maxLength = 100; // Максимальная длина для показа
    if (description.length <= maxLength) {
      return description;
    }
    
    if (showFullDescription) {
      return description;
    }
    
    return description.substring(0, maxLength) + '...';
  };

  const toggleDescription = () => {
    setShowFullDescription(!showFullDescription);
  };

  const handleAddMembers = () => {
    navigation.navigate('AddGroupMembers', { 
      roomId,
      currentMembers: participants.map(p => p.userId || p.user?.id).filter(Boolean)
    });
  };

  // Проверяем права доступа текущего пользователя
  const currentUserParticipant = participants.find(p => 
    (p.userId || p.user?.id) === currentUser?.id
  );
  const canEditGroup = currentUserParticipant?.role === 'OWNER' || currentUserParticipant?.role === 'ADMIN';
  
  // Права на управление админами группы: только владелец группы или админ приложения
  const canManageGroupAdmins = currentUserParticipant?.role === 'OWNER' || currentUser?.role === 'ADMIN';

  const handleBackPress = () => {
    console.log('===== GroupInfoScreen handleBackPress (BUTTON) =====');
    console.log('fromScreen:', fromScreen);
    console.log('roomId:', roomId);
    
    // Стандартный возврат для всех случаев
    console.log('Action: navigation.goBack() (fromScreen:', fromScreen, ')');
    navigation.goBack();
  };

  const handleEditGroup = () => {
    setMenuVisible(false);
    navigation.navigate('EditGroup', { roomId });
  };

  const handleMenuPress = () => {
    setMenuVisible(true);
  };

  const handleToggleLock = async () => {
    if (loading) return;
    
    const newLockStatus = !roomData?.isLocked;
    const actionText = newLockStatus ? 'закрыть' : 'открыть';
    
    showConfirm(
      newLockStatus ? 'Закрыть группу' : 'Открыть группу',
      `Вы уверены, что хотите ${actionText} группу? ${newLockStatus ? 'Только администраторы смогут отправлять сообщения.' : 'Все участники смогут отправлять сообщения.'}`,
      async () => {
        setLoading(true);
        try {
          const result = await ChatApi.toggleRoomLock(roomId, newLockStatus);
          const updatedRoom = result?.data?.data?.room || result?.data?.room || result?.data?.data || result?.data;
          
          if (updatedRoom) {
            // Обновляем данные группы
            await dispatch(fetchRoom(roomId));
          } else {
            throw new Error('Не удалось обновить статус группы');
          }
        } catch (error) {
          console.error('Ошибка изменения статуса группы:', error);
          showError('Ошибка', error.message || 'Не удалось изменить статус группы');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  // Функции для работы с аватаром группы
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError('Ошибка', 'Для загрузки изображений необходимо разрешение на доступ к галерее');
        return false;
      }
    }
    return true;
  };

  const processImage = async (imageUri) => {
    try {
      console.log('Начинаем обработку изображения:', imageUri);
      
      // Сначала получаем информацию об изображении
      const imageInfo = await ImageManipulator.manipulateAsync(
        imageUri,
        [], // Без изменений
        { format: ImageManipulator.SaveFormat.JPEG }
      );
      
      console.log('Информация об изображении:', {
        width: imageInfo.width,
        height: imageInfo.height,
        uri: imageInfo.uri
      });
      
      // Определяем оптимальный размер для аватара
      let targetWidth = 300;
      let targetHeight = 300;
      
      // Если изображение очень большое, увеличиваем размер для лучшего качества
      if (imageInfo.width > 1000 || imageInfo.height > 1000) {
        targetWidth = 400;
        targetHeight = 400;
      }
      
      // Обрабатываем изображение
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: targetWidth, height: targetHeight } }],
        { 
          compress: 0.85, // Немного увеличиваем качество
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );
      
      console.log('Изображение обработано:', {
        width: manipulatedImage.width,
        height: manipulatedImage.height,
        uri: manipulatedImage.uri
      });
      
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
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const processedImage = await processImage(result.assets[0].uri);
        await updateGroupAvatar({
          uri: processedImage.uri,
          type: 'image/jpeg',
          name: `group_avatar_${Date.now()}.jpg`
        });
      }
    } catch (error) {
      console.error('Ошибка при выборе изображения:', error);
      showError('Ошибка', 'Не удалось загрузить изображение');
    }
  };

  const takePhoto = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showError('Ошибка', 'Для съемки фото необходимо разрешение на доступ к камере');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const processedImage = await processImage(result.assets[0].uri);
        await updateGroupAvatar({
          uri: processedImage.uri,
          type: 'image/jpeg',
          name: `group_avatar_${Date.now()}.jpg`
        });
      }
    } catch (error) {
      console.error('Ошибка при съемке фото:', error);
      showError('Ошибка', 'Не удалось сделать фото');
    }
  };

  const updateGroupAvatar = async (avatarData, retryCount = 0) => {
    setLoading(true);
    try {
      const formData = new FormData();
      if (avatarData.remove) {
        formData.append('removeAvatar', 'true');
      } else {
        // Улучшенная обработка файла
        const fileInfo = {
          uri: avatarData.uri,
          type: avatarData.type || 'image/jpeg',
          name: avatarData.name || `avatar_${Date.now()}.jpg`,
        };
        
        // Проверяем, что URI существует
        if (!fileInfo.uri) {
          throw new Error('URI изображения не найден');
        }
        
        formData.append('avatar', fileInfo);
      }
      
      const result = await dispatch(updateRoom({
        roomId,
        formData
      }));

      if (result.type.endsWith('/fulfilled')) {
        // Обновляем данные группы
        await dispatch(fetchRoom(roomId));
        // Аватар успешно обновлен - убираем алерт
      } else {
        throw new Error(result.payload || 'Ошибка обновления аватара');
      }
    } catch (error) {
      console.error('Ошибка обновления аватара:', error);
      
      // Retry логика для сетевых ошибок
      if (error.message?.includes('Network Error') && retryCount < 2) {
        console.log(`Повторная попытка ${retryCount + 1}/2...`);
        setTimeout(() => {
          updateGroupAvatar(avatarData, retryCount + 1);
        }, 1000 * (retryCount + 1)); // Увеличиваем задержку с каждой попыткой
        return;
      }
      
      // Показываем понятное сообщение об ошибке
      let errorMessage = 'Не удалось обновить аватар';
      if (error.message?.includes('Network Error')) {
        errorMessage = 'Проблема с сетевым подключением. Проверьте интернет и попробуйте снова.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Превышено время ожидания. Попробуйте снова.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showError('Ошибка', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const removeGroupAvatar = async () => {
    await updateGroupAvatar({ remove: true });
  };

  const handleMemberLongPress = (member) => {
    if (!canEditGroup) return;
    if ((member.userId || member.user?.id) === currentUser?.id) return;
    
    setSelectedMember(member);
    setAdminMenuVisible(true);
  };

  const assignAdmin = async (userId) => {
    try {
      setLoading(true);
      await ChatApi.assignAdmin(roomId, userId);
      await dispatch(fetchRoom(roomId));
      setAdminMenuVisible(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Ошибка назначения админа:', error);
      showError('Ошибка', 'Не удалось назначить администратора');
    } finally {
      setLoading(false);
    }
  };

  const revokeAdmin = async (userId) => {
    try {
      setLoading(true);
      await ChatApi.revokeAdmin(roomId, userId);
      await dispatch(fetchRoom(roomId));
      setAdminMenuVisible(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Ошибка отзыва админа:', error);
      showError('Ошибка', 'Не удалось отозвать права администратора');
    } finally {
      setLoading(false);
    }
  };

  const confirmRemoveMember = async (member) => {
    const displayName = getUserDisplayName(member);
    
    showAlert({
      type: 'warning',
      title: 'Удалить участника',
      message: `Вы уверены, что хотите удалить ${displayName} из ${roomData?.type === 'BROADCAST' ? 'канала' : 'группы'}?`,
      buttons: [
        { 
          text: 'Отмена', 
          style: 'cancel' 
        },
        {
          text: 'Удалить',
          style: 'destructive',
          icon: 'person-remove',
          onPress: async () => {
            try {
              setLoading(true);
              const userId = member.userId || member.user?.id;
              
              await dispatch(removeMembers({ roomId, userIds: [userId] })).unwrap();
              await dispatch(fetchRoom(roomId));
              setAdminMenuVisible(false);
              setSelectedMember(null);
            } catch (error) {
              console.error('Ошибка удаления участника:', error);
              showError('Ошибка', 'Не удалось удалить участника');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    });
  };


  const confirmAdminAction = (action, member) => {
    const displayName = getUserDisplayName(member);
    const isAssign = action === 'assign';
    const title = isAssign ? 'Назначить администратором' : 'Отозвать права администратора';
    const message = isAssign 
      ? `Назначить ${displayName} администратором ${roomData?.type === 'BROADCAST' ? 'канала' : 'группы'}?`
      : `Отозвать у ${displayName} права администратора?`;
    
    showAlert({
      type: isAssign ? 'confirm' : 'warning',
      title,
      message,
      buttons: [
        { 
          text: 'Отмена', 
          style: 'cancel' 
        },
        {
          text: isAssign ? 'Назначить' : 'Отозвать',
          style: isAssign ? 'primary' : 'destructive',
          icon: isAssign ? 'admin-panel-settings' : 'person-remove',
          onPress: () => {
            const userId = member.userId || member.user?.id;
            if (isAssign) {
              assignAdmin(userId);
            } else {
              revokeAdmin(userId);
            }
          }
        }
      ]
    });
  };



  const handleAvatarPress = () => {
    setAvatarModalVisible(true);
  };

  const showAvatarOptions = () => {
    if (!canEditGroup) return;

    const buttons = [
      { 
        text: 'Галерея', 
        style: 'primary',
        icon: 'photo-library',
        onPress: pickImageFromGallery 
      },
      { 
        text: 'Камера', 
        style: 'primary',
        icon: 'photo-camera',
        onPress: takePhoto 
      },
    ];
    
    if (roomData?.avatar) {
      buttons.push({ 
        text: 'Удалить фото', 
        style: 'destructive',
        icon: 'delete',
        onPress: removeGroupAvatar 
      });
    }

    buttons.push({ 
      text: 'Отмена', 
      style: 'cancel' 
    });
    
    showAlert({
      type: 'info',
      title: roomData?.type === 'BROADCAST' ? 'Изменить фото канала' : 'Изменить фото группы',
      message: 'Выберите действие',
      buttons,
      showCloseButton: false
    });
  };

  const handleParticipantPress = (participant) => {
    const userId = participant.userId || participant.user?.id;
    if (!userId || userId === currentUser?.id) return;

    const navParams = {
      userId: userId,
      fromScreen: 'GroupInfo',
      roomId: roomId
    };
    console.log('===== GroupInfoScreen: Navigate to UserPublicProfile =====');
    console.log('UserPublicProfile params:', JSON.stringify(navParams, null, 2));
    navigation.navigate('UserPublicProfile', navParams);
  };

  const renderParticipant = ({ item }) => {
    const displayName = getUserDisplayName(item);
    const avatarUri = getUserAvatar(item);
    const roleLabel = getRoleLabel(item);
    const employeePosition = getEmployeePosition(item);
    const isCurrentUser = (item.userId || item.user?.id) === currentUser?.id;
    const canManageThis = canEditGroup && !isCurrentUser && item.role !== 'OWNER';

    return (
      <Pressable
        style={styles.participantItem}
        onPress={() => handleParticipantPress(item)}
        onLongPress={() => canManageThis && handleMemberLongPress(item)}
        android_ripple={{ color: '#f0f0f0' }}
      >
        <View style={styles.participantAvatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>👤</Text>
            </View>
          )}
        </View>
        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>
            {displayName}{isCurrentUser ? ' (Вы)' : ''}
          </Text>
          {roleLabel && (
            <Text style={[
              styles.participantRole,
              item.role === 'OWNER' && styles.ownerRole,
              item.role === 'ADMIN' && styles.adminRole
            ]}>
              {roleLabel}
            </Text>
          )}
          {employeePosition && (
            <Text style={styles.participantPosition}>
              {employeePosition}
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  const groupAvatarUri = getGroupAvatar();
  const participantsCount = participants.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.groupHeader}>
          <View style={styles.navigationButtons}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            
            {/* Кнопка меню только для владельца и админов */}
            {canEditGroup && (
              <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
                <Text style={styles.menuButtonText}>⋮</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity 
            style={styles.groupAvatarContainer}
            onPress={handleAvatarPress}
            activeOpacity={0.7}
          >
            {groupAvatarUri ? (
              <Image source={{ uri: groupAvatarUri }} style={styles.groupAvatar} />
            ) : (
              <View style={styles.groupAvatarPlaceholder}>
                <Text style={styles.groupAvatarPlaceholderText}>👥</Text>
              </View>
            )}
          </TouchableOpacity>
                     <Text style={styles.groupName}>{roomData?.title || (roomData?.type === 'BROADCAST' ? 'Канал' : 'Группа')}</Text>
           {roomData?.description && (
             <View style={styles.descriptionContainer}>
               <View style={styles.descriptionRow}>
                 <Text style={styles.groupDescription}>
                   {getDescriptionText(roomData.description)}
                 </Text>
                 {roomData.description.length > 100 && (
                   <TouchableOpacity
                     style={styles.showMoreButton}
                     onPress={toggleDescription}
                     activeOpacity={0.7}
                   >
                     <Text style={styles.showMoreButtonText}>
                       {showFullDescription ? 'Скрыть' : 'Далее'}
                     </Text>
                   </TouchableOpacity>
                 )}
               </View>
             </View>
           )}
          <Text style={styles.groupSubtitle}>
            {roomData?.type === 'BROADCAST' ? '📢 Канал' : 'Группа'} · {participantsCount} {
              roomData?.type === 'BROADCAST' && currentUser?.role === 'CLIENT' 
                ? (participantsCount === 1 ? 'контакт' : participantsCount < 5 ? 'контакта' : 'контактов')
                : roomData?.type === 'BROADCAST' 
                  ? (participantsCount === 1 ? 'подписчик' : participantsCount < 5 ? 'подписчика' : 'подписчиков')
                  : (participantsCount === 1 ? 'участник' : participantsCount < 5 ? 'участника' : 'участников')
            }
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {roomData?.type === 'BROADCAST' && currentUser?.role === 'CLIENT' 
                  ? `Контакты (${participantsCount})`
                  : `${participantsCount} ${roomData?.type === 'BROADCAST' ? 'подписчик' : 'участник'}${participantsCount === 1 ? '' : participantsCount < 5 ? 'а' : 'ов'}`
                }
              </Text>
            </View>
            {roomData?.type === 'BROADCAST' && currentUser?.role === 'CLIENT' && (
              <Text style={styles.contactsHelpText}>
                Нажмите на контакт, чтобы начать чат и задать вопрос
              </Text>
            )}
          </View>

          {/* Add Members Button - только для владельца и админов */}
          {canEditGroup && (
            <TouchableOpacity 
              style={styles.addMembersButton} 
              onPress={handleAddMembers}
              activeOpacity={0.7}
              disabled={loading}
            >
              <View style={styles.addMembersIcon}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <AddUserIcon width={18} height={18} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.addMembersText}>Добавить участников</Text>
            </TouchableOpacity>
          )}

          {/* Переключатель закрытия группы - только для обычных групп, не для каналов */}
          {canEditGroup && roomData?.type !== 'BROADCAST' && (
            <TouchableOpacity 
              style={styles.lockGroupContainer}
              onPress={handleToggleLock}
              activeOpacity={0.7}
              disabled={loading}
            >
              <View style={styles.lockGroupIcon}>
                <Text style={styles.lockGroupIconText}>
                  {roomData?.isLocked ? '🔒' : '💬'}
                </Text>
              </View>
              <View style={styles.lockGroupInfo}>
                <Text style={styles.lockGroupTitle}>
                  Отправлять сообщения
                </Text>
                <Text style={styles.lockGroupDescription}>
                  {roomData?.isLocked 
                    ? 'Только администраторы'
                    : 'Все участники'}
                </Text>
              </View>
              <AnimatedSwitch 
                value={!roomData?.isLocked} 
                disabled={loading}
              />
            </TouchableOpacity>
          )}

           

          <FlatList
            data={participants}
            renderItem={renderParticipant}
            keyExtractor={(item) => String(item.userId || item.user?.id || item.id)}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </ScrollView>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuModal}>
            {canEditGroup && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleEditGroup}
                activeOpacity={0.7}
              >
               
                 <Text style={styles.menuItemText}>{roomData?.type === 'BROADCAST' ? 'Редактировать канал' : 'Редактировать группу'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Avatar Modal */}
      <ImageViewerModal
        visible={avatarModalVisible}
        imageUri={groupAvatarUri}
        onClose={() => setAvatarModalVisible(false)}
        title={roomData?.type === 'BROADCAST' ? 'Картинка канала' : 'Картинка группы'}
        headerRight={
          canEditGroup && groupAvatarUri ? (
            <TouchableOpacity
              style={styles.avatarModalEditButton}
              onPress={() => {
                setAvatarModalVisible(false);
                setTimeout(() => showAvatarOptions(), 300);
              }}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <IconEdit width={20} height={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Admin Management Modal */}
      <Modal
        visible={adminMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAdminMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAdminMenuVisible(false)}
        >
          <View style={[styles.menuModal, styles.adminMenuModal]}>
            {selectedMember && (
              <>
                <View style={styles.adminMenuHeader}>
                  <Text style={styles.adminMenuTitle}>
                    {getUserDisplayName(selectedMember)}
                  </Text>
                </View>
                {selectedMember.role === 'ADMIN' ? (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setAdminMenuVisible(false);
                      setTimeout(() => confirmAdminAction('revoke', selectedMember), 300);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.menuItemText, styles.revokeAdminText]}>
                      Отозвать права администратора
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setAdminMenuVisible(false);
                      setTimeout(() => confirmAdminAction('assign', selectedMember), 300);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.menuItemText}>
                      Назначить администратором
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* Кнопка удаления участника - не показываем для владельца группы */}
                {selectedMember.role !== 'OWNER' && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setAdminMenuVisible(false);
                      setTimeout(() => confirmRemoveMember(selectedMember), 300);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.menuItemText, styles.removeMemberText]}>
                      Удалить участника
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navigationButtons: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 1,
  },
  backButton: {
    borderRadius: 20,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#000000',
    fontWeight: '600',
  },
  menuButton: {
    borderRadius: 20,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 18,
    color: '#8696A0',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  groupHeader: {
    alignItems: 'center',
    paddingTop: 30, 
    paddingBottom: 40,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  groupAvatarContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  groupAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  groupAvatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarPlaceholderText: {
    fontSize: 40,
    color: '#666666',
  },
  groupName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  descriptionContainer: {
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  groupDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'left',
    lineHeight: 22,
    marginBottom: 4,
  },
  showMoreButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    borderRadius: 12,
    marginTop: 0,
  },
  showMoreButtonText: {
    fontSize: 14,
    color: '#25D366',
    fontWeight: '500',
  },
  groupSubtitle: {
    fontSize: 16,
    color: '#8696A0',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8696A0',
  },
  addMembersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  addMembersIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  addMembersText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },

  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  participantAvatar: {
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
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  participantRole: {
    fontSize: 14,
    color: '#8696A0',
  },
  participantPosition: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  ownerRole: {
    color: '#FF8C00',
    fontWeight: '600',
  },
  adminRole: {
    color: '#25D366',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 68,
  },
  // Modal Menu Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  menuModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '400',
  },
  // Avatar Modal Styles
  avatarModalOverlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  avatarModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#000000',
  },
  avatarModalBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarModalBackText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  avatarModalTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  avatarModalEditButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  avatarModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  avatarModalImage: {
    width: '100%',
    height: '100%',
    maxHeight: '80%',
    marginHorizontal: 0,
  },
  avatarModalPlaceholder: {
    width: '100%',
    height: '100%',
    maxHeight: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0,
    marginHorizontal: 0,
  },
  avatarModalPlaceholderText: {
    fontSize: 120,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  // Admin Management Styles
  adminMenuModal: {
    minWidth: 250,
  },
  adminMenuHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  adminMenuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  revokeAdminText: {
    color: '#FF3B30',
  },
  removeMemberText: {
    color: '#FF3B30',
  },
  lockGroupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginBottom: 8,
  },
  lockGroupIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  lockGroupIconText: {
    fontSize: 20,
  },
  lockGroupInfo: {
    flex: 1,
    marginRight: 12,
  },
  lockGroupTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  lockGroupDescription: {
    fontSize: 14,
    color: '#8696A0',
    lineHeight: 18,
  },
  lockToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  lockToggleActive: {
    backgroundColor: '#007AFF',
  },
  lockToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  lockToggleTextActive: {
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactsHelpText: {
    fontSize: 13,
    color: '#8696A0',
    marginTop: 8,
    lineHeight: 18,
  },
});

export default GroupInfoScreen;
