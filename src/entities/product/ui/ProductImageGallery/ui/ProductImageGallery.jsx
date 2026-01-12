import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Image, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, PanResponder } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';

const { width: screenWidth } = Dimensions.get('window');

export const ProductImageGallery = ({ images = [] }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [preloadedImages, setPreloadedImages] = useState(new Set());
    const opacity = useRef(new Animated.Value(1)).current;

    // Фильтруем валидные изображения
    const validImages = images.filter(Boolean);
    const previousImagesLengthRef = useRef(validImages.length);

    // Сброс индекса при изменении списка изображений
    useEffect(() => {
        if (activeIndex >= validImages.length) {
            setActiveIndex(0);
        }
        
        // Если список изображений полностью изменился (изменилась длина), сбрасываем кэш
        if (previousImagesLengthRef.current !== validImages.length) {
            previousImagesLengthRef.current = validImages.length;
            // Не сбрасываем кэш полностью, так как некоторые изображения могут повторяться
        }
    }, [validImages.length, activeIndex]);
    
    // Убеждаемся, что изображение видимо при первой загрузке и при изменении индекса
    useEffect(() => {
        if (validImages.length > 0 && activeIndex < validImages.length) {
            // Сбрасываем opacity в 1 при изменении изображения
            opacity.setValue(1);
        }
    }, [validImages.length, activeIndex, opacity]);

    // Предзагрузка изображений
    useEffect(() => {
        const preloadImage = async (uri) => {
            if (!uri) return;
            
            try {
                await Image.prefetch(uri);
                setPreloadedImages(prev => {
                    if (prev.has(uri)) return prev;
                    return new Set([...prev, uri]);
                });
            } catch (error) {
                console.warn('[ProductImageGallery] Ошибка предзагрузки изображения:', uri, error);
            }
        };

        // Предзагружаем текущее изображение
        if (validImages[activeIndex]) {
            preloadImage(validImages[activeIndex]);
        }

        // Предзагружаем следующее изображение
        if (activeIndex < validImages.length - 1 && validImages[activeIndex + 1]) {
            preloadImage(validImages[activeIndex + 1]);
        }

        // Предзагружаем предыдущее изображение
        if (activeIndex > 0 && validImages[activeIndex - 1]) {
            preloadImage(validImages[activeIndex - 1]);
        }
    }, [activeIndex, validImages]);

    const goToNext = useCallback(() => {
        if (activeIndex < validImages.length - 1) {
            const nextIndex = activeIndex + 1;
            console.log('[ProductImageGallery] Переход к следующему изображению:', nextIndex);
            
            // Сначала обновляем индекс
            setActiveIndex(nextIndex);
            
            // Плавная анимация fade-in
            opacity.setValue(0.5);
            Animated.timing(opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [activeIndex, validImages.length, opacity]);

    const goToPrevious = useCallback(() => {
        if (activeIndex > 0) {
            const prevIndex = activeIndex - 1;
            console.log('[ProductImageGallery] Переход к предыдущему изображению:', prevIndex);
            
            // Сначала обновляем индекс
            setActiveIndex(prevIndex);
            
            // Плавная анимация fade-in
            opacity.setValue(0.5);
            Animated.timing(opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [activeIndex, opacity]);

    // PanResponder для обработки свайпов
    const panResponder = useMemo(() => {
        return PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Активируем только при явном горизонтальном движении
                const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
                const hasEnoughMovement = Math.abs(gestureState.dx) > 15;
                return isHorizontal && hasEnoughMovement;
            },
            onPanResponderTerminationRequest: () => false, // Не позволяем ScrollView перехватывать жест
            onPanResponderRelease: (_, gestureState) => {
                const { dx, vx } = gestureState;
                const swipeThreshold = 50; // Порог для определения свайпа
                const velocityThreshold = 0.5; // Порог скорости для быстрого свайпа

                try {
                    // Определяем направление свайпа
                    if (dx < -swipeThreshold || vx < -velocityThreshold) {
                        // Свайп влево - следующее изображение
                        goToNext();
                    } else if (dx > swipeThreshold || vx > velocityThreshold) {
                        // Свайп вправо - предыдущее изображение
                        goToPrevious();
                    }
                } catch (error) {
                    console.warn('[ProductImageGallery] Ошибка обработки жеста:', error);
                }
            },
        });
    }, [goToNext, goToPrevious]);
    
    // console.log('[ProductImageGallery] Получены изображения:', {
    //     images,
    //     validImages,
    //     count: validImages.length,
    //     activeIndex
    // });

    if (!validImages || validImages.length === 0) {
        return (
            <View style={styles.noImageContainer}>
                <View style={styles.placeholderIcon}>
                    <Text style={styles.placeholderIconText}>📷</Text>
                </View>
                <Text style={styles.noImageText}>Нет изображений</Text>
                <Text style={styles.noImageSubtext}>
                    Добавьте изображения для лучшего представления товара
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container} {...panResponder.panHandlers}>
                {/* Отображаем только активное изображение */}
                <Animated.View 
                    style={[
                        styles.imageContainer,
                        {
                            opacity: opacity,
                        },
                    ]}
                >
                    {validImages[activeIndex] ? (
                        <Image
                            source={{ uri: validImages[activeIndex] }}
                            style={styles.productImage}
                            resizeMode="cover"
                            onLoad={() => {
                                console.log(`[ProductImageGallery] Изображение ${activeIndex} загружено:`, validImages[activeIndex]);
                                // Убеждаемся, что изображение видимо после загрузки
                                opacity.setValue(1);
                            }}
                            onLoadStart={() => {
                                console.log(`[ProductImageGallery] Начало загрузки изображения ${activeIndex}`);
                            }}
                            onError={(error) => {
                                console.warn(`[ProductImageGallery] Ошибка загрузки изображения ${activeIndex}:`, error, validImages[activeIndex]);
                                opacity.setValue(1);
                            }}
                        />
                    ) : (
                        <View style={styles.productImage} />
                    )}
                </Animated.View>

            {/* Кнопки навигации */}
            {validImages.length > 1 && (
                <>
                    {activeIndex > 0 && (
                        <TouchableOpacity 
                            style={[styles.navButton, styles.navButtonLeft]} 
                            onPress={goToPrevious}
                        >
                            <Text style={styles.navButtonText}>‹</Text>
                        </TouchableOpacity>
                    )}
                    {activeIndex < validImages.length - 1 && (
                        <TouchableOpacity 
                            style={[styles.navButton, styles.navButtonRight]} 
                            onPress={goToNext}
                        >
                            <Text style={styles.navButtonText}>›</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}

            {/* Индикатор количества изображений */}
            <View style={styles.imageCounter}>
                <Text style={styles.imageCounterText}>
                    {activeIndex + 1} / {validImages.length}
                </Text>
            </View>

            {/* Точки пагинации (показываем только если изображений больше 1) */}
            {validImages.length > 1 && (
                <View style={styles.paginationContainer}>
                    {validImages.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.paginationDot,
                                index === activeIndex && styles.paginationDotActive
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: normalize(250),
        backgroundColor: Color.lightGray,
        position: 'relative',
    },

    imageContainer: {
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
    },
    noImageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Color.lightGray,
        padding: normalize(20),
    },
    placeholderIcon: {
        width: normalize(60),
        height: normalize(60),
        borderRadius: normalize(30),
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: normalize(16),
    },
    placeholderIconText: {
        fontSize: normalizeFont(24),
    },
    noImageText: {
        fontSize: normalizeFont(16),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        marginBottom: normalize(8),
    },
    noImageSubtext: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        opacity: 0.7,
    },
    imageCounter: {
        position: 'absolute',
        top: normalize(16),
        right: normalize(16),
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(4),
        borderRadius: normalize(12),
    },
    imageCounterText: {
        color: Color.colorLightMode,
        fontSize: normalizeFont(12),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    paginationContainer: {
        position: 'absolute',
        bottom: normalize(16),
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    paginationDot: {
        width: normalize(8),
        height: normalize(8),
        borderRadius: normalize(4),
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        marginHorizontal: normalize(4),
    },
    paginationDotActive: {
        backgroundColor: Color.colorLightMode,
        width: normalize(12),
        borderRadius: normalize(6),
    },
    navButton: {
        position: 'absolute',
        top: 105, // Исправлено с '50%' на числовое значение (50% от высоты 250px минус половина кнопки)
        transform: [{ translateY: -normalize(20) }],
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    navButtonLeft: {
        left: normalize(16),
    },
    navButtonRight: {
        right: normalize(16),
    },
    navButtonText: {
        color: Color.colorLightMode,
        fontSize: normalizeFont(24),
        fontWeight: 'bold',
        lineHeight: normalizeFont(24),
    },
});