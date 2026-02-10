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
  ActionSheetIOS,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  PanGestureHandler,
  State,
  FlatList as GestureFlatList,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { MoreVertical, Download, ChevronLeft, ChevronRight } from 'lucide-react-native';
import Constants from 'expo-constants';

import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
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
        if (Platform.OS === 'ios') {
          ActionSheetIOS.showActionSheetWithOptions(
            {
              title: 'Изображение',
              message: 'Выберите действие',
              options: ['Поделиться', 'Сохранить', 'Отмена'],
              cancelButtonIndex: 2,
            },
            async (buttonIndex) => {
              if (buttonIndex === 0) {
                try {
                  await Sharing.shareAsync(localUri, {
                    mimeType: 'image/jpeg',
                    dialogTitle: 'Сохранить изображение',
                  });
                } catch (shareError) {
                  console.error('Ошибка шаринга:', shareError);
                  showError('Ошибка', 'Не удалось поделиться изображением');
                }
              }
              if (buttonIndex === 1) {
                await saveToGallery(localUri);
              }
            }
          );
        } else {
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
        }
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

  const safeTop = Platform.OS === 'ios' ? insets.top : 0;
  const headerHeight = 56 + safeTop;
  const menuTop = headerHeight;

  const saveToGallery = async (fileUri) => {
    try {
      if (Constants.appOwnership === 'expo') {
        showError(
          'Недоступно в Expo Go',
          'Сохранение в галерею требует development build. Соберите dev-клиент и запустите его.'
        );
        return;
      }

      const { status } = await MediaLibrary.requestPermissionsAsync(true, ['photo']);

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
        top: 0,
        paddingTop: safeTop,
        paddingBottom: 0,
        height: headerHeight,
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
          top: safeTop 
        }]}>
          {headerRight}
        </View>
      )}

      {/* Menu */}
      {menuVisible && (
        <View style={[styles.menu, { 
          top: menuTop 
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
  const gestureModeRef = useRef('undetermined');
  const lastTranslationYRef = useRef(0);
  const lastVelocityYRef = useRef(0);
  const didInitialScrollRef = useRef(false);
  const GalleryList = Platform.OS === 'android' ? GestureFlatList : FlatList;
  const [isVerticalDragging, setIsVerticalDragging] = useState(false);

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
      
      const safeIndex = Math.max(0, Math.min(initialIndex, normalized.length - 1));
      setCurrentIndex(safeIndex);

      // Прокручиваем к начальному индексу только при первом открытии (не при смене слайда кнопкой), чтобы избежать бесконечного переключения
      if (
        normalized.length > 1 &&
        flatListRef.current &&
        !didInitialScrollRef.current
      ) {
        didInitialScrollRef.current = true;
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
      didInitialScrollRef.current = false;
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

  const scrollToIndex = useCallback((index) => {
    if (!flatListRef.current || normalized.length <= 1) return;
    const safeIndex = Math.max(0, Math.min(index, normalized.length - 1));
    flatListRef.current.scrollToIndex({ index: safeIndex, animated: true });
    setCurrentIndex(safeIndex);
    if (onIndexChange) {
      onIndexChange(safeIndex);
    }
  }, [normalized.length, onIndexChange]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    }
  }, [currentIndex, scrollToIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < normalized.length - 1) {
      scrollToIndex(currentIndex + 1);
    }
  }, [currentIndex, normalized.length, scrollToIndex]);

  // Отслеживаем начало прокрутки
  const handleScrollBeginDrag = useCallback(() => {
    isScrolling.current = true;
  }, []);

  // Отслеживаем окончание прокрутки
  const handleScrollEndDrag = useCallback(() => {
    setTimeout(() => {
      isScrolling.current = false;
    }, 150); // Увеличиваем задержку для Android
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
  const handleGestureEvent = useCallback((event) => {
    const { translationY, translationX, velocityY } = event.nativeEvent;

    if (isScrolling.current) {
      return;
    }

    if (gestureModeRef.current === 'horizontal') {
      return;
    }

    if (gestureModeRef.current === 'undetermined') {
      const absX = Math.abs(translationX);
      const absY = Math.abs(translationY);

      if (absY > absX + 8) {
        gestureModeRef.current = 'vertical';
        setIsVerticalDragging(true);
      } else if (absX > absY + 8) {
        gestureModeRef.current = 'horizontal';
        return;
      }
    }

    if (gestureModeRef.current === 'vertical') {
      lastTranslationYRef.current = translationY;
      lastVelocityYRef.current = velocityY || 0;
      translateY.setValue(translationY);

      const opacityValue = Math.max(0, 1 - Math.abs(translationY) / 400);
      opacity.setValue(opacityValue);
    }
  }, [translateY, opacity]);

  const handleGestureStateChange = useCallback((event) => {
    const { translationY, state, velocityY, translationX } = event.nativeEvent;

    // В начале жеста сбрасываем флаг прокрутки
    if (state === State.BEGAN) {
      isScrolling.current = false;
      gestureModeRef.current = 'undetermined';
      lastTranslationYRef.current = 0;
      lastVelocityYRef.current = 0;
      setIsVerticalDragging(false);
    }

    // Игнорируем жест если идет горизонтальная прокрутка
    if (isScrolling.current && (state === State.ACTIVE || state === State.BEGAN)) {
      return;
    }

    // Улучшенная логика определения направления жеста
    if (state === State.ACTIVE) {
      // Если горизонтальное движение значительно больше вертикального,
      // и при этом есть несколько изображений (горизонтальный скролл возможен),
      // считаем это горизонтальным жестом
      if (normalized.length > 1 && Math.abs(translationX) > Math.abs(translationY) * 2) {
        gestureModeRef.current = 'horizontal';
        // Это горизонтальный жест для переключения изображений
        return;
      }

      // Если вертикальное движение больше горизонтального, это вертикальный свайп
      if (Math.abs(translationY) > Math.abs(translationX) + 20) {
        gestureModeRef.current = 'vertical';
        setIsVerticalDragging(true);
        // Обновляем непрозрачность в зависимости от расстояния свайпа
        const opacityValue = Math.max(0, 1 - Math.abs(translationY) / 400);
        opacity.setValue(opacityValue);
      }
    } else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      setIsVerticalDragging(false);
      // Если был горизонтальный скролл, возвращаем на место
      if (isScrolling.current || gestureModeRef.current === 'horizontal') {
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
      const threshold = Platform.OS === 'android' ? 40 : 100;
      const velocityThreshold = Platform.OS === 'android' ? 150 : 500;
      const effectiveTranslationY = translationY || lastTranslationYRef.current;
      const effectiveVelocityY = velocityY || lastVelocityYRef.current;
      const shouldClose =
        Math.abs(effectiveTranslationY) > threshold ||
        Math.abs(effectiveVelocityY) > velocityThreshold;

      if (shouldClose && effectiveTranslationY > 0) {
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
  }, [onClose, opacity, translateY, normalized.length]);

  if (!visible || !normalized.length) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <StatusBar hidden={statusBarHidden} />

      <GestureHandlerRootView style={styles.container}>
        <PanGestureHandler
          ref={panGestureRef}
          onGestureEvent={handleGestureEvent}
          onHandlerStateChange={handleGestureStateChange}
          activeOffsetY={Platform.OS === 'android' ? [-6, 6] : [-10, 10]}
          minPointers={1}
          maxPointers={1}
          enabled={true}
          shouldCancelWhenOutside={false}
          avgTouches={false}
          simultaneousHandlers={flatListRef}
        >
          <View style={styles.gestureContainer}>
            <Animated.View
              style={[
                styles.animatedContainer,
                {
                  transform: [{ translateY }],
                  opacity,
                },
              ]}
            >
              {/* Галерея фотографий */}
              {normalized.length > 1 ? (
                <GalleryList
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
                  simultaneousHandlers={panGestureRef}
                  scrollEnabled={!isVerticalDragging}
                  renderItem={({ item, index }) => (
                    <View style={styles.slide}>
                      <View style={styles.imageWrapper}>
                        <Image
                          key={`img-bg-${index}-${item}`}
                          source={{ uri: item }}
                          style={styles.imageBackground}
                          resizeMode="cover"
                          blurRadius={20}
                          onError={(error) => {
                            console.error('Image load error:', error);
                          }}
                        />
                        <Image
                          key={`img-${index}-${item}`}
                          source={{ uri: item }}
                          style={styles.imageForeground}
                          resizeMode="contain"
                          onError={(error) => {
                            console.error('Image load error:', error);
                          }}
                        />
                      </View>
                    </View>
                  )}
                  getItemLayout={(data, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                  })}
                  nestedScrollEnabled={false}
                  removeClippedSubviews={false}
                />
              ) : (
                /* Одно изображение */
                <View style={styles.slide}>
                  <View style={styles.imageWrapper}>
                    <Image
                      key={`single-bg-${normalized[0]}-${visible}`}
                      source={{ uri: normalized[0] }}
                      style={styles.imageBackground}
                      resizeMode="cover"
                      blurRadius={20}
                      onError={(error) => {
                        console.error('Image load error:', error);
                      }}
                    />
                    <Image
                      key={`single-${normalized[0]}-${visible}`}
                      source={{ uri: normalized[0] }}
                      style={styles.imageForeground}
                      resizeMode="contain"
                      onError={(error) => {
                        console.error('Image load error:', error);
                      }}
                    />
                  </View>
                </View>
              )}
            </Animated.View>

            {/* Overlay с кнопками - остается на месте */}
            <ViewerOverlay
              images={normalized}
              title={title}
              onClose={onClose}
              headerRight={headerRight}
              currentIndex={currentIndex}
            />

            {/* Стрелки навигации */}
            {normalized.length > 1 && (
              <>
                {currentIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.navArrow, styles.navArrowLeft]}
                    onPress={handlePrev}
                    activeOpacity={0.8}
                  >
                    <ChevronLeft size={28} color="#fff" />
                  </TouchableOpacity>
                )}
                {currentIndex < normalized.length - 1 && (
                  <TouchableOpacity
                    style={[styles.navArrow, styles.navArrowRight]}
                    onPress={handleNext}
                    activeOpacity={0.8}
                  >
                    <ChevronRight size={28} color="#fff" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </PanGestureHandler>
      </GestureHandlerRootView>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gestureContainer: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#0B0B0B',
  },
  imageBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  imageForeground: {
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.65)',
    height: 56,
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
    zIndex: 101,
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 120,
  },
  navArrowLeft: {
    left: 12,
  },
  navArrowRight: {
    right: 12,
  },
  menu: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 8,
    zIndex: 102,
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
