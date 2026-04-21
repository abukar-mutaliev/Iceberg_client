import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { SearchIcon } from '@shared/ui/Icon/SearchIcon';
import { MenuDotsIcon } from '@shared/ui/Icon/MenuDotsIcon';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const ChatListHeader = ({ navigation }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const currentUser = useSelector(state => state?.auth?.user);
  const userRole = currentUser?.role;
  const { colors, isDark } = useTheme();
  
  const headerBg = isDark ? colors.surface : '#FFFFFF';
  const titleColor = isDark ? colors.textPrimary : '#000000';
  const iconColor = isDark ? colors.textPrimary : '#000000';
  const menuBg = isDark ? colors.surfaceElevated : '#FFFFFF';
  const menuTextColor = isDark ? colors.textPrimary : '#000';
  const menuDivider = isDark ? colors.divider : 'transparent';

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
        backgroundColor: headerBg,
      }}>
        {/* Название приложения слева */}
        <Text style={{
          color: titleColor,
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
            <SearchIcon size={22} color={iconColor} />
          </TouchableOpacity>

          {/* Кнопка меню (три точки) */}
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MenuDotsIcon size={22} color={iconColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Выпадающее меню. Не используем нативный Modal, чтобы не ломать цвет системной nav bar на Android. */}
      {menuVisible && (
        <>
          {/* Прозрачный бэкдроп — ловит тапы снаружи меню (растягивается далеко за границы хедера). */}
          <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
            <View
              style={{
                position: 'absolute',
                top: -100,
                left: -Dimensions.get('window').width,
                right: -Dimensions.get('window').width,
                bottom: -Dimensions.get('window').height,
                backgroundColor: 'transparent',
                zIndex: 999,
              }}
            />
          </TouchableWithoutFeedback>

          <View
            style={{
              position: 'absolute',
              top: 52,
              right: 16,
              backgroundColor: menuBg,
              borderRadius: 8,
              paddingVertical: 8,
              minWidth: 200,
              elevation: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.5 : 0.25,
              shadowRadius: 8,
              borderWidth: isDark ? 1 : 0,
              borderColor: isDark ? colors.divider : 'transparent',
              zIndex: 1000,
            }}
          >
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
                color: menuTextColor,
                fontWeight: '400',
              }}>
                Новый чат
              </Text>
            </TouchableOpacity>

            {canCreateGroups && (
              <TouchableOpacity
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderTopWidth: isDark ? 1 : 0,
                  borderTopColor: menuDivider,
                }}
                onPress={handleNewGroup}
                activeOpacity={0.7}
              >
                <Text style={{
                  fontSize: 16,
                  color: menuTextColor,
                  fontWeight: '400',
                }}>
                  Новая группа
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </>
  );
};