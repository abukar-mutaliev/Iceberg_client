import React, { useState, memo, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Pressable } from 'react-native';
import { getImageUrl } from '@shared/api/api';
import { MenuDotsIcon } from '@shared/ui/Icon/MenuDotsIcon';
import { useCustomAlert } from '@shared/ui/CustomAlert';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { useChatHeaderData } from './hooks/useChatHeaderData';
import { useChatHeaderActions } from './hooks/useChatHeaderActions';

// ============ MEMOIZED COMPONENTS ============

const BackButton = memo(({ onPress, textColor, styles }) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.backButton}
    activeOpacity={0.6}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  >
    <Text style={[styles.backButtonText, { color: textColor }]}>←</Text>
  </TouchableOpacity>
));

const Avatar = memo(({ uri, isGroup, onPress, styles }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={styles.avatarContainer}
  >
    <View style={styles.avatar}>
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.avatarImage}
          resizeMode="cover"
        />
      ) : (
        <Text style={styles.avatarPlaceholder}>
          {isGroup ? '👥' : '👤'}
        </Text>
      )}
    </View>
  </TouchableOpacity>
));

const ChatInfo = memo(({ name, status, onPress, styles }) => (
  <TouchableOpacity
    style={styles.chatInfoContainer}
    activeOpacity={0.7}
    onPress={onPress}
  >
    <Text style={styles.chatName} numberOfLines={1}>
      {name}
    </Text>
    <Text style={styles.chatStatus} numberOfLines={1}>
      {status}
    </Text>
  </TouchableOpacity>
));

const MenuButton = memo(({ onPress, textColor, styles }) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.menuButton}
    activeOpacity={0.6}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  >
    <MenuDotsIcon size={20} color={textColor} />
  </TouchableOpacity>
));

const MenuOverlay = memo(({
  visible,
  onClose,
  isGroup,
  isBroadcast,
  isOwner,
  hideLeaveActions,
  onDeleteChat,
  onDeleteGroup,
  onLeaveGroup,
  onLeaveGroupWithDeletion,
  styles,
}) => {
  if (!visible) return null;

  return (
    <>
      <Pressable
        style={styles.menuBackdrop}
        onPress={onClose}
      />
      <View style={styles.menuContainer} pointerEvents="box-none">
        {isGroup ? (
          <>
            {/* Удалить группу/канал - только для владельца */}
            {isOwner && (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={onDeleteGroup}
                activeOpacity={0.7}
              >
                <Text style={styles.modalItemTextDestructive}>
                  {isBroadcast ? 'Удалить канал' : 'Удалить группу'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Выход из группы/канала */}
            {!hideLeaveActions && (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={onLeaveGroup}
                activeOpacity={0.7}
              >
                <Text style={styles.modalItemText}>
                  {isBroadcast ? 'Покинуть канал' : 'Покинуть группу'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Выход с удалением - только для не-владельцев */}
            {!hideLeaveActions && !isOwner && (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={onLeaveGroupWithDeletion}
                activeOpacity={0.7}
              >
                <Text style={styles.modalItemTextDestructive}>
                  Покинуть с удалением
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          /* Удалить чат - для личных чатов */
          <TouchableOpacity
            style={styles.modalItem}
            onPress={onDeleteChat}
            activeOpacity={0.7}
          >
            <Text style={styles.modalItemTextDestructive}>
              Удалить чат
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
});

// ============ MAIN COMPONENT ============

export const ChatHeader = memo(({ route, navigation }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const { showError, showAlert } = useCustomAlert();
  const { colors, isDark } = useTheme();

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  
  // ============ DATA ============
  
  const headerData = useChatHeaderData(route);
  const {
    roomId,
    roomData,
    currentUser,
    isOwner,
    chatPartnerInfo,
  } = headerData;
  
  // ============ ACTIONS ============
  
  const actions = useChatHeaderActions({
    navigation,
    roomId,
    roomData,
    chatPartnerInfo,
    params: route?.params || {},
    showAlert,
    showError,
  });
  
  // ============ CALLBACKS ============
  
  const handleMenuPress = useCallback(() => {
    setMenuVisible(true);
  }, []);
  
  const handleMenuClose = useCallback(() => {
    setMenuVisible(false);
  }, []);
  
  const handleDeleteChat = useCallback(() => {
    handleMenuClose();
    actions.handleDeleteChat();
  }, [actions, handleMenuClose]);
  
  const handleDeleteGroup = useCallback(() => {
    handleMenuClose();
    actions.handleDeleteGroup();
  }, [actions, handleMenuClose]);
  
  const handleLeaveGroup = useCallback(() => {
    handleMenuClose();
    actions.handleLeaveGroup(false);
  }, [actions, handleMenuClose]);
  
  const handleLeaveGroupWithDeletion = useCallback(() => {
    handleMenuClose();
    actions.handleLeaveGroup(true);
  }, [actions, handleMenuClose]);
  
  // ============ COMPUTED ============
  
  const avatarUri = chatPartnerInfo.avatar ? getImageUrl(chatPartnerInfo.avatar) : null;
  const textColor = isDark ? colors.textPrimary : '#000000';
  const isGroup = chatPartnerInfo.isGroup;
  const normalizedRoomType = String(
    roomData?.type || roomData?.roomType || route?.params?.roomType || ''
  ).toUpperCase().trim();
  const isBroadcast = normalizedRoomType === 'BROADCAST';
  const isSuperAdmin = currentUser?.role === 'ADMIN' && (
    currentUser?.admin?.isSuperAdmin ||
    currentUser?.profile?.isSuperAdmin ||
    currentUser?.isSuperAdmin
  );
  const shouldHideLeaveActions = isBroadcast && !isSuperAdmin;
  
  // В каналах меню доступно только суперадмину.
  const shouldShowMenu = !isBroadcast || isSuperAdmin;
  
  // ============ RENDER ============
  
  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <BackButton 
          onPress={actions.handleBackPress} 
          textColor={textColor}
          styles={styles}
        />
        
        <Avatar 
          uri={avatarUri} 
          isGroup={isGroup} 
          onPress={actions.handleProfilePress}
          styles={styles}
        />
        
        <ChatInfo 
          name={chatPartnerInfo.name} 
          status={chatPartnerInfo.status} 
          onPress={actions.handleProfilePress}
          styles={styles}
        />
        
        {shouldShowMenu && (
          <MenuButton 
            onPress={handleMenuPress} 
            textColor={textColor}
            styles={styles}
          />
        )}
      </View>

      <MenuOverlay
        visible={menuVisible}
        onClose={handleMenuClose}
        isGroup={isGroup}
        isBroadcast={isBroadcast}
        isOwner={isOwner}
        hideLeaveActions={shouldHideLeaveActions}
        onDeleteChat={handleDeleteChat}
        onDeleteGroup={handleDeleteGroup}
        onLeaveGroup={handleLeaveGroup}
        onLeaveGroupWithDeletion={handleLeaveGroupWithDeletion}
        styles={styles}
      />
    </View>
  );
});

// ============ STYLES ============

const createStyles = (colors, isDark) => StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 1000,
  },
  header: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? colors.surface : '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 8,
    height: 64,
    width: '100%',
  },
  backButton: {
    padding: 12,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  backButtonText: {
    fontSize: 26,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 26,
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: isDark ? colors.surfaceElevated : '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  avatarImage: {
    width: 35,
    height: 35,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    fontSize: 18,
    color: isDark ? colors.textSecondary : '#666666',
  },
  chatInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '500',
    color: isDark ? colors.textPrimary : '#000000',
    marginBottom: 2,
  },
  chatStatus: {
    fontSize: 11,
    color: isDark ? colors.textSecondary : '#666666',
  },
  menuButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBackdrop: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    height: 10000,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  menuContainer: {
    position: 'absolute',
    top: 56,
    right: 8,
    backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.4 : 0.25,
    shadowRadius: 8,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? colors.divider : 'transparent',
    zIndex: 1001,
  },
  modalItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalItemText: {
    fontSize: 16,
    color: isDark ? colors.textPrimary : '#000000',
    fontWeight: '400',
  },
  modalItemTextDestructive: {
    fontSize: 16,
    color: isDark ? '#FF6B6B' : '#D32F2F',
    fontWeight: '400',
  },
});

export default ChatHeader;
