import React, {useMemo} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Dimensions} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Ionicons} from '@expo/vector-icons';
import {IconDelete} from '@shared/ui/Icon/ProductManagement/IconDelete';
import ArrowBackIcon from '@shared/ui/Icon/Common/ArrowBackIcon';

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
  const headerTitle = useMemo(() => {
    const n = typeof selectedCount === 'number' ? selectedCount : 0;
    return `Выбрано сообщений: ${n}`;
  }, [selectedCount]);

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <TouchableOpacity style={styles.backButton} onPress={onCancel} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <ArrowBackIcon width={24} height={24} color="#333" />
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
            <Icon name="reply" size={22} color="#333" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.iconBtn} onPress={onCopy} disabled={selectedCount === 0}>
          <Ionicons name="copy-outline" size={22} color="#333" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={onForward} disabled={selectedCount === 0}>
          <Icon name="share" size={22} color="#333" />
        </TouchableOpacity>

        {canDelete && (
          <TouchableOpacity style={styles.iconBtn} onPress={onDelete} disabled={!canDelete}>
            <IconDelete width={22} height={22} color="#333" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    zIndex: 1000,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    height: BASE_HEADER_HEIGHT,
  },
  left: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButton: {
    padding: 8,
  },
  titleWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  title: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 8,
  },
});


