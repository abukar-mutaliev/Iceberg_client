import React, {useRef, useState} from "react";
import {Dimensions, Image, StyleSheet, Text, View} from "react-native";
import PagerView from "react-native-pager-view";
import {CustomSliderIndicator} from "@shared/ui/CustomSliderIndicator";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ProductImage = ({ images, style }) => {

    let imageArray = [];

    if (Array.isArray(images)) {
        imageArray = images.filter(item => item && typeof item === 'string' && item.trim() !== '');
    } else if (images) {
        imageArray = [images];
    }


    const [activeIndex, setActiveIndex] = useState(0);
    const pagerRef = useRef(null);


    const handlePageSelected = (event) => {
        const newIndex = event.nativeEvent.position;
        setActiveIndex(newIndex);
    };

    const renderImages = () => {
        return imageArray.map((item, index) => {
            const imageSource = typeof item === 'string'
                ? { uri: item }
                : item;
            return (
                <View key={`image-${index}`} style={styles.imageContainer}>
                    <Image
                        source={imageSource}
                        style={styles.image}
                        resizeMode="cover"
                        onError={(error) => console.error(`Error loading image at index ${index}:`, error.nativeEvent.error)}
                    />
                </View>
            );
        });
    };

    if (imageArray.length === 0) {
        return (
            <View style={[styles.container, style]}>
                <View style={[styles.background, { backgroundColor: '#E4F6FC' }]} />
                <View style={styles.debugContainer}>
                    <Text style={styles.debugText}>Нет изображений для отображения</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            <View style={[styles.background, { backgroundColor: '#E4F6FC' }]} />

            <PagerView
                ref={pagerRef}
                style={styles.pagerView}
                initialPage={0}
                onPageSelected={handlePageSelected}
            >
                {renderImages()}
            </PagerView>

            {imageArray.length > 1 && (
                <View >
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
        marginTop: 0,
    },
    background: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
    },
    pagerView: {
        width: SCREEN_WIDTH,
        height: '100%',
    },
    imageContainer: {
        width: SCREEN_WIDTH,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    }
});