import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { SearchIcon } from '@shared/ui/Icon/SearchIcon';
import { MenuDotsIcon } from '@shared/ui/Icon/MenuDotsIcon';

export const ChatListHeader = ({ navigation }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const currentUser = useSelector(state => state?.auth?.user);
  const userRole = currentUser?.role;

  const handleSearch = () => {
    navigation.navigate('ChatSearch');
  };

  const handleNewGroup = () => {
    setMenuVisible(false);
    navigation.navigate('CreateGroup');
  };

  const handleNewChat = () => {
    setMenuVisible(false);
    navigation.navigate('ChatSearch');
  };

  // Проверяем, может ли пользователь создавать группы
  // Разрешаем всем ролям кроме обычных клиентов
  const canCreateGroups = userRole && userRole !== 'CLIENT';

  return (
    <>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        height: '100%',
        width: '100%',
        backgroundColor: '#FFFFFF', // Явно устанавливаем белый фон
      }}>
        {/* Название приложения слева */}
        <Text style={{
          color: '#000000', // Черный цвет текста
          fontSize: 23,
          fontWeight: '600',
          letterSpacing: 0.3,
        }}>
          Чаты
        </Text>
        
        {/* Кнопки справа */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center',
          gap: 20,
        }}>
          {/* Кнопка поиска */}
          <TouchableOpacity
            onPress={handleSearch}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <SearchIcon size={22} color="#000000" />
          </TouchableOpacity>

          {/* Кнопка меню (три точки) */}
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MenuDotsIcon size={22} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Модальное меню */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-start',
            alignItems: 'flex-end',
            paddingTop: 60,
            paddingRight: 16,
          }}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            paddingVertical: 8,
            minWidth: 200,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
          }}>
            {/* Новый чат - доступен всем */}
            <TouchableOpacity
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
              onPress={handleNewChat}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: 16, 
                color: '#000',
                fontWeight: '400'
              }}>
                Новый чат
              </Text>
            </TouchableOpacity>

            {/* Новая группа - только для админов и сотрудников */}
            {canCreateGroups && (
              <TouchableOpacity
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                onPress={handleNewGroup}
                activeOpacity={0.7}
              >
                <Text style={{
                  fontSize: 16, 
                  color: '#000',
                  fontWeight: '400'
                }}>
                  Новая группа
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};