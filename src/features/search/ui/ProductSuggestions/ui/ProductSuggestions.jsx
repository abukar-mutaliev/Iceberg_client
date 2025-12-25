import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, PixelRatio } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const normalizeFont = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const ProductSuggestions = ({ products, searchQuery, onProductPress }) => {
    if (products.length === 0) {
        return (
            <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>
                    По запросу "{searchQuery}" ничего не найдено
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
        >
            {products.map((product, index) => (
                <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => {
                        console.log('ProductSuggestions: Нажатие на продукт:', product);
                        onProductPress(product);
                    }}
                >
                    <Text style={styles.suggestionText}>{product.name}</Text>
                    <ChevronRight size={normalize(25)} color={Color.blue2} />
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginTop: normalize(1),
        paddingHorizontal: normalize(35),
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: normalize(15),
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    suggestionText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(FontSize.size_md),
        color: Color.dark,
        flex: 1,
    },
    noResultsContainer: {
        marginTop: normalize(40),
        alignItems: 'center',
    },
    noResultsText: {
        textAlign: 'center',
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(FontSize.size_md),
        color: Color.blue2,
    },
});