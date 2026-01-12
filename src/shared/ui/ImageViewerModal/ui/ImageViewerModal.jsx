import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Text,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  Modal,
  FlatList,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, State, FlatList as GestureFlatList } from 'react-native-gesture-handler';
import { MoreVertical, Download } from 'lucide-react-native';

import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getImageUrl } from '@shared/api/api';
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/* ───────────────────────────── Overlay ───────────────────────────── */

const ViewerOverlay = ({ 
  images, 
  title, 
  onClose, 
  headerRight, 
  currentIndex,
}) => {
  const insets = useSafeAreaInsets();
  const { showError, showSuccess, showAlert } = useCustomAlert();

  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const uri = images[currentIndex];

  useEffect(() => {
    setMenuVisible(false);
  }, [currentIndex]);

  const saveImage = async () => {
    try {
      setLoading(true);
      setMenuVisible(false);

      let localUri = uri;

      if (!uri.startsWith('file://')) {
        const file = FileSystem.cacheDirectory + `img_${Date.now()}.jpg`;
        const { uri: downloaded } = await FileSystem.downloadAsync(uri, file);
        localUri = downloaded;
      }

      if (await Sharing.isAvailableAsync()) {
        showAlert({
          type: 'info',
          title: 'Изображение',
          message: 'Выберите действие',
          buttons: [
            { 
              text: 'Поделиться', 
              onPress: async () => {
                try {
                  await Sharing.shareAsync(localUri, {
                    mimeType: 'image/jpeg',
                    dialogTitle: 'Сохранить изображение'
                  });
                } catch (shareError) {
                  console.error('Ошибка шаринга:', shareError);
                  showError('Ошибка', 'Не удалось поделиться изображением');
                }
              }
            },
            {
              text: 'Сохранить',
              onPress: async () => {
                await saveToGallery(localUri);
              },
            },
            { text: 'Отмена', style: 'cancel' },
          ]
        });
      } else {
        await saveToGallery(localUri);
      }
    } catch (error) {
      console.error('Ошибка обработки изображения:', error);
      showError('Ошибка', 'Не удалось обработать изображение');
    } finally {
      setLoading(false);
    }
  };

  const saveToGallery = async (fileUri) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== 'granted') {
        showError(
          'Разрешение не предоставлено',
          'Для сохранения изображения необходимо разрешение на доступ к галерее'
        );
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('Временный файл не найден');
      }

      let asset;
      try {
        asset = await MediaLibrary.createAssetAsync(fileUri);
      } catch (error1) {
        try {
          asset = await MediaLibrary.createAssetAsync(fileUri, {
            mediaType: 'photo',
            album: 'Iceberg App'
          });
        } catch (error2) {
          try {
            asset = await MediaLibrary.saveToLibraryAsync(fileUri);
          } catch (error3) {
            throw new Error('Все методы сохранения недоступны');
          }
        }
      }

      showSuccess('Успешно', 'Изображение сохранено в галерею');

      try {
        await FileSystem.deleteAsync(fileUri);
      } catch (cleanupError) {
        console.log('Ошибка очистки временного файла:', cleanupError);
      }
    } catch (error) {
      console.error('Ошибка сохранения в галерею:', error);

      let errorMessage = 'Не удалось сохранить изображение в галерею';

      if (error.message?.includes('permission')) {
        errorMessage = 'Нет разрешения на доступ к галерее';
      } else if (error.message?.includes('Invalid argument')) {
        errorMessage = 'Ошибка обработки файла';
      } else if (error.message?.includes('API недоступен')) {
        errorMessage = 'Функция сохранения временно недоступна';
      } else if (error.message?.includes('Все методы')) {
        errorMessage = 'Функция сохранения недоступна на этом устройстве';
      } else if (error.message) {
        errorMessage = error.message;
      }

      showError('Ошибка', errorMessage);

      try {
        await FileSystem.deleteAsync(fileUri);
      } catch (cleanupError) {
        console.log('Ошибка очистки временного файла:', cleanupError);
      }
    }
  };

  return (
    <>
      {/* Header */}
      <View style={[styles.header, { 
        top: Platform.OS === 'ios' ? 0 : insets.top,
        paddingTop: Platform.OS === 'ios' ? insets.top + 12 : 12,
        height: Platform.OS === 'ios' ? insets.top + 56 : 56,
      }]}>
        <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>

        {title && <Text style={styles.title}>{title}</Text>}

        {images.length > 1 && (
          <Text style={styles.counter}>
            {currentIndex + 1} / {images.length}
          </Text>
        )}

        <TouchableOpacity
          onPress={() => setMenuVisible(v => !v)}
          style={styles.iconBtn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <MoreVertical color="#fff" size={20} />
          )}
        </TouchableOpacity>
      </View>

      {headerRight && (
        <View style={[styles.headerRight, { 
          top: Platform.OS === 'ios' ? insets.top + 12 : insets.top + 12 
        }]}>
          {headerRight}
        </View>
      )}

      {/* Menu */}
      {menuVisible && (
        <View style={[styles.menu, { 
          top: Platform.OS === 'ios' ? insets.top + 64 : insets.top + 64 
        }]}>
          <TouchableOpacity onPress={saveImage} style={styles.menuItem}>
            <Download size={18} color="#fff" />
            <Text style={styles.menuText}>Сохранить</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

/* ───────────────────────── Image Viewer ───────────────────────── */

/**
 * Универсальное модальное окно для просмотра изображений с возможностью сохранения
 * @param {boolean} visible - видимость модального окна
 * @param {string} imageUri - URI изображения для отображения (для обратной совместимости)
 * @param {array} imageList - массив URI изображений для просмотра
 * @param {number} initialIndex - начальный индекс изображения
 * @param {function} onClose - функция закрытия модального окна
 * @param {function} onIndexChange - функция изменения индекса изображения
 * @param {string} title - заголовок модального окна (опционально)
 * @param {React.ReactNode} headerRight - дополнительная кнопка в заголовке (опционально)
 */
export const ImageViewerModal = ({
  visible,
  imageUri,
  imageList = [],
  initialIndex = 0,
  onClose,
  onIndexChange,
  title,
  headerRight
}) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [statusBarHidden, setStatusBarHidden] = useState(false);
  const flatListRef = useRef(null);
  const panGestureRef = useRef(null);
  const isScrolling = useRef(false);

  // Анимация для вертикального свайпа (закрытие)
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Нормализуем список изображений
  const normalized = useMemo(() => {
    const images = imageList && imageList.length > 0 ? imageList : (imageUri ? [imageUri] : []);
    return images.map(img =>
      img.startsWith('http') || img.startsWith('file://')
        ? img
        : getImageUrl(img),
    );
  }, [imageList, imageUri]);

  // Синхронизируем currentIndex с initialIndex
  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < normalized.length) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, normalized.length]);

  // При изменении видимости модального окна
  useEffect(() => {
    if (visible) {
      // Сбрасываем анимацию при открытии
      translateY.setValue(0);
      opacity.setValue(1);
      
      // Сбрасываем индекс
      const safeIndex = Math.max(0, Math.min(initialIndex, normalized.length - 1));
      setCurrentIndex(safeIndex);

      // Прокручиваем к начальному индексу
      if (normalized.length > 1 && flatListRef.current) {
        // Увеличиваем задержку для iOS
        const delay = Platform.OS === 'ios' ? 200 : 100;
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: safeIndex,
            animated: false,
          });
        }, delay);
      }

      // Скрываем статус-бар на iOS для полноэкранного режима
      if (Platform.OS === 'ios') {
        setStatusBarHidden(true);
      }
    } else {
      // Возвращаем статус-бар при закрытии
      if (Platform.OS === 'ios') {
        setStatusBarHidden(false);
      }
      // При закрытии сбрасываем все значения
      translateY.setValue(0);
      opacity.setValue(1);
    }
  }, [visible, initialIndex, normalized.length, translateY, opacity]);

  // Обработчик изменения видимого фото при прокрутке
  const handleScroll = useCallback((event) => {
    if (normalized.length <= 1) return;
    
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);

    if (index !== currentIndex && index >= 0 && index < normalized.length) {
      setCurrentIndex(index);
      if (onIndexChange) {
        onIndexChange(index);
      }
    }
  }, [normalized.length, currentIndex, onIndexChange]);

  // Отслеживаем начало прокрутки
  const handleScrollBeginDrag = useCallback(() => {
    isScrolling.current = true;
  }, []);

  // Отслеживаем окончание прокрутки
  const handleScrollEndDrag = useCallback(() => {
    setTimeout(() => {
      isScrolling.current = false;
    }, 100);
  }, []);

  // Обработка ошибки при прокрутке к индексу
  const handleScrollToIndexFailed = useCallback((info) => {
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({
          offset: info.index * SCREEN_WIDTH,
          animated: false,
        });
      }
    }, 100);
  }, []);

  // Обработчик свайпа вниз
  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const handleGestureStateChange = useCallback((event) => {
    const { translationY, state, velocityY, translationX } = event.nativeEvent;

    // В начале жеста сбрасываем флаг прокрутки
    if (state === State.BEGAN) {
      isScrolling.current = false;
    }

    // Игнорируем жест если идет горизонтальная прокрутка
    if (isScrolling.current && (state === State.ACTIVE || state === State.BEGAN)) {
      return;
    }

    // На Android проверяем направление жеста только в активном состоянии
    if (Platform.OS === 'android' && state === State.ACTIVE) {
      // Если горизонтальное движение больше вертикального, это горизонтальный жест
      if (Math.abs(translationX) > Math.abs(translationY) + 10) {
        // Это горизонтальный жест, игнорируем
        return;
      }
    }

    if (state === State.ACTIVE) {
      // Обновляем непрозрачность в зависимости от расстояния свайпа
      const opacityValue = Math.max(0, 1 - Math.abs(translationY) / 400);
      opacity.setValue(opacityValue);
    } else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      // Если был горизонтальный скролл, возвращаем на место
      if (isScrolling.current) {
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }),
          Animated.spring(opacity, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }),
        ]).start();
        return;
      }

      // Для Android используем более низкие пороги
      const threshold = Platform.OS === 'android' ? 80 : 100;
      const velocityThreshold = Platform.OS === 'android' ? 300 : 500;
      const shouldClose = Math.abs(translationY) > threshold || Math.abs(velocityY) > velocityThreshold;

      if (shouldClose && translationY > 0) {
        // Закрываем модалку свайпом вниз
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onClose();
        });
      } else {
        // Возвращаем на место
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }),
          Animated.spring(opacity, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }),
        ]).start();
      }
    }
  }, [onClose, opacity, translateY]);

  if (!visible || !normalized.length) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <StatusBar hidden={statusBarHidden} />

      <View style={styles.container}>
        <PanGestureHandler
          ref={panGestureRef}
          onGestureEvent={handleGestureEvent}
          onHandlerStateChange={handleGestureStateChange}
          activeOffsetY={Platform.OS === 'android' ? [-10, 10] : [-10, 10]}
          failOffsetX={Platform.OS === 'android' ? [-20, 20] : [-50, 50]}
          failOffsetY={Platform.OS === 'android' ? undefined : undefined}
          minPointers={1}
          maxPointers={1}
          enabled={true}
          shouldCancelWhenOutside={false}
          avgTouches={Platform.OS === 'android'}
        >
          <Animated.View
            style={[
              styles.animatedContainer,
              {
                transform: [{ translateY }],
                opacity,
              },
            ]}
          >
            {/* Overlay с кнопками */}
            <ViewerOverlay
              images={normalized}
              title={title}
              onClose={onClose}
              headerRight={headerRight}
              currentIndex={currentIndex}
            />

            {/* Галерея фотографий */}
            {normalized.length > 1 ? (
              Platform.OS === 'android' ? (
                <GestureFlatList
                  ref={flatListRef}
                  data={normalized}
                  horizontal
                  pagingEnabled
                  bounces={false}
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleScroll}
                  onScrollBeginDrag={handleScrollBeginDrag}
                  onScrollEndDrag={handleScrollEndDrag}
                  onMomentumScrollEnd={handleScrollEndDrag}
                  scrollEventThrottle={16}
                  onScrollToIndexFailed={handleScrollToIndexFailed}
                  keyExtractor={(item, index) => `image-viewer-${index}`}
                  renderItem={({ item, index }) => (
                    <View style={styles.slide}>
                      <Image
                        key={`android-img-${index}-${item}`}
                        source={{ uri: item }}
                        style={styles.image}
                        resizeMode="contain"
                        onError={(error) => {
                          console.error('Image load error:', error);
                        }}
                      />
                    </View>
                  )}
                  getItemLayout={(data, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                  })}
                  scrollEnabled={true}
                  nestedScrollEnabled={false}
                  removeClippedSubviews={false}
                />
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={normalized}
                  horizontal
                  pagingEnabled
                  bounces={false}
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleScroll}
                  onScrollBeginDrag={handleScrollBeginDrag}
                  onScrollEndDrag={handleScrollEndDrag}
                  onMomentumScrollEnd={handleScrollEndDrag}
                  scrollEventThrottle={16}
                  onScrollToIndexFailed={handleScrollToIndexFailed}
                  keyExtractor={(item, index) => `image-viewer-${index}`}
                  renderItem={({ item, index }) => (
                    <View style={styles.slide}>
                      <Image
                        key={`ios-img-${index}-${item}`}
                        source={{ uri: item }}
                        style={styles.image}
                        resizeMode="contain"
                        onError={(error) => {
                          console.error('Image load error:', error);
                        }}
                      />
                    </View>
                  )}
                  getItemLayout={(data, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                  })}
                  scrollEnabled={true}
                  nestedScrollEnabled={false}
                  removeClippedSubviews={false}
                />
              )
            ) : (
              /* Одно изображение */
              <View style={styles.slide}>
                <Image
                  key={`single-${normalized[0]}-${visible}`}
                  source={{ uri: normalized[0] }}
                  style={styles.image}
                  resizeMode="contain"
                  onError={(error) => {
                    console.error('Image load error:', error);
                  }}
                />
              </View>
            )}
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Modal>
  );
};

/* ───────────────────────────── Styles ───────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  animatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.65)',
    minHeight: 56,
  },
  back: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  counter: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 8,
  },
  headerRight: {
    position: 'absolute',
    right: 16,
    zIndex: 11,
  },
  menu: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 8,
    zIndex: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  menuText: {
    color: '#fff',
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
  },
});
