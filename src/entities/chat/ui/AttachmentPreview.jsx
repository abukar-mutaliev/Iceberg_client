import React, { memo } from 'react';
import { View, Image, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Border } from '@app/styles/GlobalStyles';

export const AttachmentPreview = memo(({ files = [], onRemove }) => {

  // Определяем размеры сетки (максимум 4 изображения)
  const getGridLayout = (count) => {
    if (count === 1) return { rows: 1, cols: 1 };
    if (count === 2) return { rows: 1, cols: 2 };
    if (count === 3) return { rows: 2, cols: 2 };
    if (count >= 4) return { rows: 2, cols: 2 }; // Максимум 4 изображения в сетке
    return { rows: 2, cols: 2 };
  };

  const { rows, cols } = getGridLayout(files.length);
  const containerWidth = 240;
  const gap = 2;
  const imageSize = (containerWidth - (gap * (cols - 1))) / cols;

  const getImageStyle = (index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const isFirstRow = row === 0;
    const isLastRow = row === rows - 1;
    const isFirstCol = col === 0;
    const isLastCol = col === cols - 1;
    
    // Для 3 изображений: первое занимает 2 колонки вверху
    if (files.length === 3 && index === 0) {
      return {
        width: imageSize * 2 + gap,
        height: imageSize,
        marginRight: gap,
        marginBottom: gap,
        borderTopLeftRadius: Border.radius.small,
        borderTopRightRadius: Border.radius.small,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      };
    }
    
    // Для 3 изображений: второе и третье внизу
    if (files.length === 3 && index > 0) {
      const borderRadius = {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: index === 1 ? 0 : Border.radius.small,
        borderBottomRightRadius: index === 2 ? Border.radius.small : 0,
      };
      return {
        width: imageSize,
        height: imageSize,
        marginRight: index === 1 ? gap : 0,
        marginBottom: 0,
        ...borderRadius,
      };
    }
    
    // Для остальных случаев
    const isLastInRow = isLastCol;
    
    // Определяем скругления углов
    let borderRadius = {};
    if (isFirstRow && isFirstCol) {
      borderRadius.borderTopLeftRadius = Border.radius.small;
    }
    if (isFirstRow && isLastCol) {
      borderRadius.borderTopRightRadius = Border.radius.small;
    }
    if (isLastRow && isFirstCol) {
      borderRadius.borderBottomLeftRadius = Border.radius.small;
    }
    if (isLastRow && isLastCol) {
      borderRadius.borderBottomRightRadius = Border.radius.small;
    }
    
    return {
      width: imageSize,
      height: imageSize,
      marginRight: isLastInRow ? 0 : gap,
      marginBottom: isLastRow ? 0 : gap,
      ...borderRadius,
    };
  };

  const remainingCount = files.length > 4 ? files.length - 4 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.gridContainer}>
        <View style={[styles.imageGrid, { width: containerWidth }]}>
          {files.slice(0, 4).map((file, index) => {
            const key = file.uri || file.name || String(index);
            const imageStyle = getImageStyle(index);
            const { borderTopLeftRadius, borderTopRightRadius, borderBottomLeftRadius, borderBottomRightRadius, ...containerStyle } = imageStyle;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => onRemove?.(key)}
                activeOpacity={0.8}
                style={[styles.imageWrapper, containerStyle]}
              >
                <Image 
                  source={{ uri: file.uri }} 
                  style={[
                    styles.thumb, 
                    { 
                      width: imageStyle.width, 
                      height: imageStyle.height,
                      borderTopLeftRadius: borderTopLeftRadius || 0,
                      borderTopRightRadius: borderTopRightRadius || 0,
                      borderBottomLeftRadius: borderBottomLeftRadius || 0,
                      borderBottomRightRadius: borderBottomRightRadius || 0,
                    }
                  ]} 
                />
                {index === 3 && remainingCount > 0 && (
                  <View style={styles.imageOverlay}>
                    <Text style={styles.imageOverlayText}>+{remainingCount}</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    onRemove?.(key);
                  }}
                  style={styles.removeBtn}
                >
                  <Text style={styles.removeText}>×</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  gridContainer: {
    marginBottom: 6,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: Border.radius.small,
    backgroundColor: '#eee',
  },
  thumb: {
    backgroundColor: '#eee',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 10,
  },
  removeText: {
    fontSize: 18,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default AttachmentPreview;

