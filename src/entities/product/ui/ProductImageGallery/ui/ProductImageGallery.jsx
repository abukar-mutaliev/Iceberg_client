import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';

const { width: screenWidth } = Dimensions.get('window');

export const ProductImageGallery = ({ images = [] }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    // Фильтруем валидные изображения
    const validImages = images.filter(Boolean);

    const goToNext = () => {
        if (activeIndex < validImages.length - 1) {
            console.log('[ProductImageGallery] Переход к следующему изображению:', activeIndex + 1);
            setActiveIndex(activeIndex + 1);
        }
    };

    const goToPrevious = () => {
        if (activeIndex > 0) {
            console.log('[ProductImageGallery] Переход к предыдущему изображению:', activeIndex - 1);
            setActiveIndex(activeIndex - 1);
        }
    };
    
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
        <View style={styles.container}>
            {/* Отображаем только активное изображение */}
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: validImages[activeIndex] }}
                    style={styles.productImage}
                    resizeMode="cover"
                    onError={(error) => {
                        console.warn(`Ошибка загрузки изображения ${activeIndex}:`, error);
                    }}
                />
                {/* Наложение для затемнения при загрузке */}
                <View style={styles.imageOverlay} />
            </View>

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