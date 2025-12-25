import React, {useRef, useState, useEffect} from "react";
import {Dimensions, Image, StyleSheet, View, Text} from "react-native";
import PagerView from "react-native-pager-view";
import {CustomSliderIndicator} from "@shared/ui/CustomSliderIndicator";

// Заменяем изображение на простой серый блок
const placeholderImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ProductImage = ({ images, style }) => {
    // Улучшена обработка изображений
    const [loadingError, setLoadingError] = useState({});
    const [activeIndex, setActiveIndex] = useState(0);
    const pagerRef = useRef(null);

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


    const handlePageSelected = (event) => {
        const newIndex = event.nativeEvent.position;
        setActiveIndex(newIndex);
    };

    const handleImageError = (index) => {
        console.error(`Error loading image at index ${index}`);
        setLoadingError(prev => ({...prev, [index]: true}));
    };

    const renderImages = () => {
        return imageArray.map((item, index) => {
            const imageSource = typeof item === 'string'
                ? { uri: item }
                : item;
                
            return (
                <View key={`image-${index}`} style={styles.slide}>
                    {loadingError[index] ? (
                        <View style={styles.errorContainer}>
                            <Image
                                source={placeholderImage}
                                style={styles.placeholderImage}
                                resizeMode="contain"
                            />
                        </View>
                    ) : (
                        <Image
                            source={imageSource}
                            style={styles.fullImage}
                            resizeMode="cover"
                            defaultSource={placeholderImage}
                            onError={() => handleImageError(index)}
                        />
                    )}
                </View>
            );
        });
    };

    if (imageArray.length === 0) {
        return (
            <View style={[styles.container, style]}>
                <View style={styles.slide}>
                    <Image
                        source={placeholderImage}
                        style={styles.placeholderImage}
                        resizeMode="contain"
                    />
                </View>
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
                <View style={styles.indicatorContainer}>
                    <CustomSliderIndicator
                        totalItems={imageArray.length}
                        activeIndex={activeIndex}
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: SCREEN_WIDTH,
        height: 350,
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        backgroundColor: '#F9F9F9',
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
    fullImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: SCREEN_WIDTH,
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
    indicatorContainer: {
        position: 'absolute',
        bottom: 60,
        width: '100%',
        alignItems: 'center',
        zIndex: 100,
    }
});