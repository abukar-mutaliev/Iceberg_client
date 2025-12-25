import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Dimensions,
    PixelRatio
} from 'react-native';
import { FontFamily } from '@app/styles/GlobalStyles';

// Адаптивные размеры
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

export const PriceRangeFilter = ({
                                     minPrice,
                                     maxPrice,
                                     onChangeMinPrice,
                                     onChangeMaxPrice
                                 }) => {
    // Обработчик изменения минимальной цены
    const handleMinPriceChange = (text) => {
        const value = text.replace(/[^0-9]/g, '');
        onChangeMinPrice(value ? parseInt(value, 10) : 0);
    };

    // Обработчик изменения максимальной цены
    const handleMaxPriceChange = (text) => {
        const value = text.replace(/[^0-9]/g, '');
        onChangeMaxPrice(value ? parseInt(value, 10) : 0);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Цена</Text>
            <View style={styles.inputsContainer}>
                <TextInput
                    style={styles.input}
                    value={minPrice?.toString() || ''}
                    onChangeText={handleMinPriceChange}
                    keyboardType="numeric"
                    placeholder="45"
                    placeholderTextColor="#ffff"
                />
                <View style={styles.separator} />
                <TextInput
                    style={styles.input}
                    value={maxPrice?.toString() || ''}
                    onChangeText={handleMaxPriceChange}
                    keyboardType="numeric"
                    placeholder="180"
                    placeholderTextColor="white"
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: normalize(20),
        marginBottom: normalize(10),
    },
    title: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(17),
        color: '#000000',
        marginBottom: normalize(12),
        marginLeft: normalize(5),
    },
    inputsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: normalize(10),
    },
    inputWrapper: {
        flex: 1,
        height: normalize(38),
    },
    input: {
        flex: 1,
        paddingHorizontal: normalize(15),
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#000000',
        textAlign: 'center',
        backgroundColor: 'rgba(218, 219, 255, 1)',
        borderRadius: normalize(10),
    },
    separatorContainer: {
        width: normalize(20),
        alignItems: 'center',
        justifyContent: 'center',
    },
    separatorLine: {
        width: normalize(10),
        height: 1,
        backgroundColor: '#000',
    }
});

export default PriceRangeFilter;