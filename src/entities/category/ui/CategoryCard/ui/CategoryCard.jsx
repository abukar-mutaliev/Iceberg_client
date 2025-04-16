import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
    Dimensions,
    PixelRatio
} from 'react-native';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const normalizeFont = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const getCategoryImage = (categoryName) => {
    return require('@assets/images/categories/blueberry.png');
};

export const CategoryCard = ({ category, onPress }) => {
    const displayName = category.description || 'Категория';

    return (
        <Pressable
            style={styles.container}
            onPress={onPress}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.1)' }}
        >
                <View style={styles.textContainer}>
                    <Text style={styles.categoryText}>{displayName}</Text>
                </View>
            {/*<Image*/}
            {/*    source={getCategoryImage(category.name)}*/}
            {/*    style={styles.categoryImage}*/}
            {/*    resizeMode="cover"*/}
            {/*/>*/}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '32.43%',
        aspectRatio: 0.75,
        backgroundColor: "#6b5be6",
        borderRadius: Border.br_3xl,
        overflow: 'hidden',
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: normalize(10),
    },
    textContainer: {
        width: normalize(131),
        height: normalize(33),
        marginTop: normalize(13),
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryText: {
        fontSize: normalizeFont(FontSize.size_3xl),
        lineHeight: normalize(33),
        fontWeight: '700',
        fontFamily: FontFamily.SFProDisplay,
        color: Color.colorLightMode,
        textAlign: 'center',
    },
    categoryImage: {
        width: normalize(118),
        height: normalize(124),
        position: 'absolute',
        bottom: normalize(-20),
    },
});