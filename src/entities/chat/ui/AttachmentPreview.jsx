import React, { memo } from 'react';
import { View, Image, TextInput, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Border, Padding, Color, FontSize } from '@app/styles/GlobalStyles';

export const AttachmentPreview = memo(({ files = [], captions = {}, onChangeCaption, onRemove }) => {
  return (
    <View style={styles.container}>
      {files.map((file, idx) => {
        const key = file.uri || file.name || String(idx);
        return (
          <View key={key} style={styles.item}>
            <Image source={{ uri: file.uri }} style={styles.thumb} />
            <TextInput
              style={styles.caption}
              placeholder="Подпись"
              value={captions[key] || ''}
              onChangeText={(text) => onChangeCaption?.(key, text)}
              maxLength={140}
            />
            <TouchableOpacity onPress={() => onRemove?.(key)} style={styles.removeBtn}>
              <Text style={styles.removeText}>×</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Padding.small,
    backgroundColor: Color.colorLightMode,
    borderRadius: Border.radius.medium,
    borderWidth: 1,
    borderColor: Color.border,
    marginBottom: 8,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: Border.radius.small,
    backgroundColor: '#eee',
    marginRight: 8,
  },
  caption: {
    flex: 1,
    fontSize: FontSize.size_sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f7f7f7',
    borderRadius: Border.radius.small,
  },
  removeBtn: {
    marginLeft: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eee',
  },
  removeText: {
    fontSize: 18,
    lineHeight: 20,
  },
});

export default AttachmentPreview;

