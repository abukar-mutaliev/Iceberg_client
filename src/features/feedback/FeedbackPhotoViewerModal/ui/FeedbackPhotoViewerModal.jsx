// Альтернативное решение с использованием SVG иконок для лучшего выравнивания
import React, { useState, useRef } from 'react';
import {
    View,
    Modal,
    TouchableOpacity,
    Image,
    StyleSheet,
    Dimensions,
    Text,
    FlatList,
    StatusBar,
    Platform,
    Animated,
} from 'react-native';
import { PanGestureHandler, State, GestureHandlerRootView, FlatList as GestureFlatList } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

const LeftArrow = () => (
    <Svg width="30" height="30" viewBox="0 0 24 24" fill="none">
        <Path
            d="M15 6L9 12L15 18"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

const RightArrow = () => (
    <Svg width="30" height="30" viewBox="0 0 24 24" fill="none">
        <Path
            d="M9 6L15 12L9 18"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

export const FeedbackPhotoViewerModal = ({
                                             photos = [],
                                             initialIndex = 0,
                                             visible = false,
                                             onClose,
                                         }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [statusBarHidden, setStatusBarHidden] = useState(false);

    // FlatList ref для прокрутки к начальному индексу
    const flatListRef = React.useRef(null);
    
    // Ref для PanGestureHandler для координации жестов
    const panGestureRef = React.useRef(null);

    // Анимация для свайпа вниз
    const translateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;
    const lastGestureY = useRef(0);
    const isScrolling = useRef(false);

    // При изменении видимости модального окна
    React.useEffect(() => {
        if (visible) {
            // Сбрасываем анимацию при открытии
            translateY.setValue(0);
            opacity.setValue(1);
            lastGestureY.current = 0;

            // Прокручиваем к начальному индексу при открытии
            setTimeout(() => {
                if (flatListRef.current) {
                    flatListRef.current.scrollToIndex({
                        index: initialIndex,
                        animated: false,
                    });
                }
            }, 100);

            // Скрываем статус-бар на iOS для полноэкранного режима
            if (Platform.OS === 'ios') {
                setStatusBarHidden(true);
            }
        } else {
            // Возвращаем статус-бар при закрытии
            if (Platform.OS === 'ios') {
                setStatusBarHidden(false);
            }
        }
    }, [visible, initialIndex, translateY, opacity]);

    // Обработчик изменения видимого фото при прокрутке
    const handleScroll = (event) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
        const roundIndex = Math.round(event.nativeEvent.contentOffset.x / slideSize);

        setCurrentIndex(roundIndex);
    };

    // Отслеживаем начало прокрутки
    const handleScrollBeginDrag = () => {
        isScrolling.current = true;
    };

    // Отслеживаем окончание прокрутки
    const handleScrollEndDrag = () => {
        setTimeout(() => {
            isScrolling.current = false;
        }, 100);
    };

    // Обработка ошибки при прокрутке к индексу, если он выходит за границы
    const handleScrollToIndexFailed = (info) => {
        console.warn('Scroll to index failed:', info);
        // Пытаемся прокрутить с небольшой задержкой
        setTimeout(() => {
            if (flatListRef.current) {
                flatListRef.current.scrollToOffset({
                    offset: info.index * WINDOW_WIDTH,
                    animated: false,
                });
            }
        }, 100);
    };

    // Переход к следующему фото
    const nextPhoto = () => {
        if (currentIndex < photos.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true,
            });
        }
    };

    // Переход к предыдущему фото
    const prevPhoto = () => {
        if (currentIndex > 0) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex - 1,
                animated: true,
            });
        }
    };

    // Обработчик свайпа вниз
    const handleGestureEvent = Animated.event(
        [{ nativeEvent: { translationY: translateY } }],
        { useNativeDriver: true }
    );

    const handleGestureStateChange = (event) => {
        const { translationY, state, velocityY, translationX } = event.nativeEvent;

        // Игнорируем жест если идет горизонтальная прокрутка (на Android это важно)
        if (isScrolling.current && state === State.BEGAN) {
            return;
        }

        // На Android проверяем, не горизонтальный ли это жест
        if (Platform.OS === 'android' && state === State.BEGAN) {
            if (Math.abs(translationX) > Math.abs(translationY)) {
                // Это горизонтальный жест, игнорируем
                return;
            }
        }

        if (state === State.ACTIVE) {
            // Обновляем непрозрачность в зависимости от расстояния свайпа
            const opacityValue = Math.max(0, 1 - Math.abs(translationY) / 400);
            opacity.setValue(opacityValue);
            lastGestureY.current = translationY;
        } else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
            // Для Android также проверяем CANCELLED и FAILED
            const shouldClose = Math.abs(translationY) > 100 || Math.abs(velocityY) > 500;

            if (shouldClose && translationY > 0) {
                // Закрываем модалку свайпом вниз
                Animated.parallel([
                    Animated.timing(translateY, {
                        toValue: WINDOW_HEIGHT,
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
    };

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
                    activeOffsetY={Platform.OS === 'android' ? 3 : 10}
                    failOffsetX={Platform.OS === 'android' ? [-15, 15] : [-50, 50]}
                    failOffsetY={Platform.OS === 'android' ? [-3, 3] : undefined}
                    minPointers={1}
                    maxPointers={1}
                    enabled={true}
                    shouldCancelWhenOutside={false}
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
                {/* Кнопка закрытия */}
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                    activeOpacity={0.7}
                >
                    <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>

                {/* Счетчик фотографий */}
                <View style={styles.counterContainer}>
                    <Text style={styles.counterText}>
                        {currentIndex + 1} / {photos.length}
                    </Text>
                </View>

                {/* Галерея фотографий */}
                {Platform.OS === 'android' ? (
                    <GestureFlatList
                        ref={flatListRef}
                        data={photos}
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
                        keyExtractor={(item, index) => `photo-viewer-${index}`}
                        renderItem={({ item }) => (
                            <View style={styles.slide}>
                                <Image
                                    source={{ uri: item }}
                                    style={styles.image}
                                    resizeMode="contain"
                                />
                            </View>
                        )}
                        getItemLayout={(data, index) => ({
                            length: WINDOW_WIDTH,
                            offset: WINDOW_WIDTH * index,
                            index,
                        })}
                        scrollEnabled={true}
                        nestedScrollEnabled={false}
                        removeClippedSubviews={false}
                    />
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={photos}
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
                        keyExtractor={(item, index) => `photo-viewer-${index}`}
                        renderItem={({ item }) => (
                            <View style={styles.slide}>
                                <Image
                                    source={{ uri: item }}
                                    style={styles.image}
                                    resizeMode="contain"
                                />
                            </View>
                        )}
                        getItemLayout={(data, index) => ({
                            length: WINDOW_WIDTH,
                            offset: WINDOW_WIDTH * index,
                            index,
                        })}
                        scrollEnabled={true}
                        nestedScrollEnabled={false}
                        removeClippedSubviews={false}
                    />
                )}

                {/* Кнопки навигации (только если фотографий больше одной) */}
                {photos.length > 1 && (
                    <>
                        {/* Кнопка "Назад" с SVG иконкой */}
                        {currentIndex > 0 && (
                            <TouchableOpacity
                                style={[styles.navButton, styles.prevButton]}
                                onPress={prevPhoto}
                                activeOpacity={0.7}
                            >
                                <LeftArrow />
                            </TouchableOpacity>
                        )}

                        {/* Кнопка "Вперед" с SVG иконкой */}
                        {currentIndex < photos.length - 1 && (
                            <TouchableOpacity
                                style={[styles.navButton, styles.nextButton]}
                                onPress={nextPhoto}
                                activeOpacity={0.7}
                            >
                                <RightArrow />
                            </TouchableOpacity>
                        )}
                    </> 
                )}
                    </Animated.View>
                </PanGestureHandler>
            </View>
        </Modal>
    );
};

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
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 40 : 20,
        right: 20,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    closeButtonText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    counterContainer: {
        position: 'absolute',
        bottom: 30,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 10,
    },
    counterText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    slide: {
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT * 0.8,
    },
    navButton: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    prevButton: {
        left: 20,
        top: 400, // Исправлено с '50%' на числовое значение
        transform: [{ translateY: -25 }],
    },
    nextButton: {
        right: 20,
        top: 400, // Исправлено с '50%' на числовое значение
        transform: [{ translateY: -25 }],
    },
});