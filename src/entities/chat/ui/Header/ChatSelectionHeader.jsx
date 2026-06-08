import React, {useMemo} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Dimensions} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Ionicons} from '@expo/vector-icons';
import {IconDelete} from '@shared/ui/Icon/ProductManagement/IconDelete';
import ArrowBackIcon from '@shared/ui/Icon/Common/ArrowBackIcon';
import {useTheme} from '@app/providers/themeProvider/ThemeProvider';

const {width: screenWidth} = Dimensions.get('window');

const BASE_HEADER_HEIGHT = 64;

export const ChatSelectionHeader = ({
  selectedCount = 0,
  canReply = false,
  canDelete = false,
  onCancel,
  onReply,
  onCopy,
  onForward,
  onDelete,
}) => {
  const {colors, isDark} = useTheme();

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const iconColor = isDark ? colors.textPrimary : '#333';

  const headerTitle = useMemo(() => {
    const n = typeof selectedCount === 'number' ? selectedCount : 0;
    return `Выбрано сообщений: ${n}`;
  }, [selectedCount]);

  if (__DEV__) {
    console.log('[ChatSelectionHeader] Render', {
      selectedCount,
      canReply,
      canDelete,
      hasOnDelete: !!onDelete,
      willShowDelete: canDelete && !!onDelete,
    });
  }

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <TouchableOpacity style={styles.backButton} onPress={onCancel} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <ArrowBackIcon width={24} height={24} color={iconColor} />
        </TouchableOpacity>
      </View>

      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {headerTitle}
        </Text>
      </View>

      <View style={styles.right}>
        {canReply && (
          <TouchableOpacity style={styles.iconBtn} onPress={onReply} disabled={!canReply}>
            <Icon name="reply" size={22} color={iconColor} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.iconBtn} onPress={onCopy} disabled={selectedCount === 0}>
          <Ionicons name="copy-outline" size={22} color={iconColor} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={onForward} disabled={selectedCount === 0}>
          <Icon name="share" size={22} color={iconColor} />
        </TouchableOpacity>

        {canDelete && onDelete ? (
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={() => {
              if (__DEV__) {
                console.log('[ChatSelectionHeader] Delete button pressed', {
                  canDelete,
                  hasOnDelete: !!onDelete,
                });
              }
              onDelete();
            }}
            disabled={false}
            activeOpacity={0.6}
          >
            <IconDelete width={22} height={22} color={iconColor} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const createStyles = (colors, isDark) => StyleSheet.create({
  header: {
    position: 'relative',
    width: '100%',
    backgroundColor: isDark ? colors.surface : '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    zIndex: 1000,
    borderBottomWidth: 0.5,
    borderBottomColor: isDark ? colors.divider : '#E0E0E0',
    height: BASE_HEADER_HEIGHT,
  },
  left: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButton: {
    padding: 8,
    marginTop: -3,
  },
  titleWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  title: {
    fontSize: 14,
    color: isDark ? colors.textPrimary : '#000',
    fontWeight: '500',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 8,
    marginTop: -3,
  },
});
