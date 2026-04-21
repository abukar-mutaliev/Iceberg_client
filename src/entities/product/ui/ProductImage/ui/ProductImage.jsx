import React, {useRef, useState, useCallback, useEffect, useMemo} from "react";
import {Dimensions, StyleSheet, View, Text, TouchableOpacity} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PagerView from "react-native-pager-view";
import {CustomSliderIndicator} from "@shared/ui/CustomSliderIndicator";
import { ReliableImage } from '@shared/ui/ReliableImage';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ProductImage = ({ images, style, onImagePress }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const [loadingError, setLoadingError] = useState({});
    const [activeIndex, setActiveIndex] = useState(0);
    const pagerRef = useRef(null);
    const prevImagesKeyRef = useRef(null);

    let imageArray = [];

    if (Array.isArray(images)) {
        imageArray = images.filter(item => item && (typeof item === 'string' || item.uri) && (typeof item === 'string' ? item.trim() !== '' : true));
    } else if (images) {
        if (typeof images === 'string' && images.trim() !== '') {
            imageArray = [images];
        } else if (images.uri) {
            imageArray = [images];
        }
    }

    const imagesKey = imageArray.map(i => (typeof i === 'string' ? i : i?.uri || '')).join('|');
    useEffect(() => {
        if (prevImagesKeyRef.current !== null && prevImagesKeyRef.current !== imagesKey) {
            setLoadingError({});
            setActiveIndex(0);
        }
        prevImagesKeyRef.current = imagesKey;
    }, [imagesKey]);

    const handlePageSelected = useCallback((event) => {
        const newIndex = event.nativeEvent.position;
        setActiveIndex(newIndex);
    }, []);

    const goToPrevious = useCallback(() => {
        if (pagerRef.current && activeIndex > 0) {
            const targetIndex = activeIndex - 1;
            pagerRef.current.setPage(targetIndex);
            setActiveIndex(targetIndex);
        }
    }, [activeIndex]);

    const goToNext = useCallback(() => {
        if (pagerRef.current && activeIndex < imageArray.length - 1) {
            const targetIndex = activeIndex + 1;
            pagerRef.current.setPage(targetIndex);
            setActiveIndex(targetIndex);
        }
    }, [activeIndex, imageArray.length]);

    const handleImageError = useCallback((index) => {
        setLoadingError(prev => ({...prev, [index]: true}));
    }, []);

    const handleImagePress = useCallback((index) => {
        if (onImagePress && imageArray.length > 0) {
            onImagePress(imageArray, index);
        }
    }, [onImagePress, imageArray]);

    const PlaceholderComponent = useCallback(({ style: placeholderStyle }) => (
        <View style={[styles.placeholderContainer, placeholderStyle]}>
            <LinearGradient
                colors={['#dfe7ff', '#cdd6ff', '#bfc7ff']}
                style={styles.placeholderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <Icon name="image" size={64} color="rgba(255,255,255,0.95)" />
                <Text style={styles.placeholderText}>Нет фото</Text>
            </LinearGradient>
        </View>
    ), []);

    const renderImages = () => {
        return imageArray.map((item, index) => {
            return (
                <View key={`image-${index}`} style={styles.slide}>
                    <TouchableOpacity
                        style={styles.imageTouchable}
                        activeOpacity={0.9}
                        onPress={() => handleImagePress(index)}
                    >
                        {loadingError[index] ? (
                            <PlaceholderComponent />
                        ) : (
                            <View style={styles.blurWrapper}>
                                <ReliableImage
                                    source={item}
                                    style={styles.blurBackground}
                                    resizeMode="cover"
                                    blurRadius={20}
                                    showPlaceholder={false}
                                    fadeDuration={0}
                                />
                                {isDark && <View style={styles.blurDarkOverlay} pointerEvents="none" />}
                                <ReliableImage
                                    source={item}
                                    style={styles.fullImage}
                                    resizeMode="contain"
                                    showPlaceholder={false}
                                    fadeDuration={0}
                                    onError={() => handleImageError(index)}
                                />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            );
        });
    };

    if (imageArray.length === 0) {
        return (
            <View style={[styles.container, style]}>
                <PlaceholderComponent style={styles.slide} />
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            <PagerView
                ref={pagerRef}
                style={styles.pagerView}
                initialPage={0}
                onPageSelected={handlePageSelected}
            >
                {renderImages()}
            </PagerView>

            {imageArray.length > 1 && (
                <View style={styles.indicatorContainer} pointerEvents="none">
                    <CustomSliderIndicator
                        totalItems={imageArray.length}
                        activeIndex={activeIndex}
                    />
                </View>
            )}

            {imageArray.length > 1 && activeIndex > 0 && (
                <TouchableOpacity
                    style={[styles.navArrow, styles.navArrowLeft]}
                    onPress={goToPrevious}
                    activeOpacity={0.8}
                >
                    <Icon name="chevron-left" size={28} color="#fff" />
                </TouchableOpacity>
            )}
            {imageArray.length > 1 && activeIndex < imageArray.length - 1 && (
                <TouchableOpacity
                    style={[styles.navArrow, styles.navArrowRight]}
                    onPress={goToNext}
                    activeOpacity={0.8}
                >
                    <Icon name="chevron-right" size={28} color="#fff" />
                </TouchableOpacity>
            )}
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        width: SCREEN_WIDTH,
        height: 350,
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        backgroundColor: isDark ? colors.surface : '#F2F2F2',
    },
    pagerView: {
        flex: 1,
        width: SCREEN_WIDTH,
        height: 350,
    },
    slide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: SCREEN_WIDTH,
        height: 350,
        margin: 0,
        padding: 0,
    },
    imageTouchable: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    blurWrapper: {
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: isDark ? colors.surface : '#F2F2F2',
    },
    blurBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        opacity: isDark ? 0.55 : 0.9,
    },
    blurDarkOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    fullImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: SCREEN_WIDTH * 0.7,
        height: SCREEN_WIDTH * 0.7,
        opacity: 0.7,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        marginTop: 8,
        fontSize: 14,
        color: 'rgba(255,255,255,0.95)',
        fontWeight: '600',
    },
    indicatorContainer: {
        position: 'absolute',
        bottom: 60,
        width: '100%',
        alignItems: 'center',
        zIndex: 100,
    },
    navArrow: {
        position: 'absolute',
        top: '50%',
        marginTop: -22,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 101,
    },
    navArrowLeft: {
        left: 12,
    },
    navArrowRight: {
        right: 12,
    },
    navArrowText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '600',
        lineHeight: 28,
        textAlign: 'center',
    },
});