import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import CloseIcon from "@shared/ui/Icon/Profile/CloseIcon";
import { normalize } from '@shared/lib/normalize';

export const EditStopHeader = ({ onClose }) => {
  const handleClose = () => {
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Внести изменения</Text>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleClose}
        activeOpacity={0.7}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <CloseIcon size={12} color="#000" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: normalize(38),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EBEBF0',
  },
  headerTitle: {
    fontWeight: '600',
    fontSize: 16,
    color: Color.dark,
    fontFamily: FontFamily.sFProText,
  },
  closeButton: {
    position: 'absolute',
    right: normalize(16),
    top: normalize(14),
    padding: normalize(5),
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 