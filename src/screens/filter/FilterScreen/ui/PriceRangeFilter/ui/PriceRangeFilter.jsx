import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Dimensions,
    PixelRatio
} from 'react-native';
import { FontFamily } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

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
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const [localMinPrice, setLocalMinPrice] = useState(minPrice ? String(minPrice) : '');
    const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice ? String(maxPrice) : '');

    useEffect(() => {
        setLocalMinPrice(minPrice ? String(minPrice) : '');
    }, [minPrice]);

    useEffect(() => {
        setLocalMaxPrice(maxPrice ? String(maxPrice) : '');
    }, [maxPrice]);

    const commitMinPrice = (text) => {
        const value = text.replace(/[^0-9]/g, '');
        onChangeMinPrice(value ? parseInt(value, 10) : 0);
    };

    const commitMaxPrice = (text) => {
        const value = text.replace(/[^0-9]/g, '');
        onChangeMaxPrice(value ? parseInt(value, 10) : 0);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Цена</Text>
            <View style={styles.inputsContainer}>
                <TextInput
                    style={styles.input}
                    value={localMinPrice}
                    onChangeText={setLocalMinPrice}
                    onBlur={() => commitMinPrice(localMinPrice)}
                    keyboardType="numeric"
                    keyboardAppearance={colors.keyboardAppearance}
                    placeholder="45"
                    placeholderTextColor={colors.textTertiary}
                />
                <View style={styles.separator} />
                <TextInput
                    style={styles.input}
                    value={localMaxPrice}
                    onChangeText={setLocalMaxPrice}
                    onBlur={() => commitMaxPrice(localMaxPrice)}
                    keyboardType="numeric"
                    keyboardAppearance={colors.keyboardAppearance}
                    placeholder="180"
                    placeholderTextColor={colors.textTertiary}
                />
            </View>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        marginTop: normalize(20),
        marginBottom: normalize(10),
    },
    title: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(17),
        color: colors.textPrimary,
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
        paddingVertical: normalize(10),
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: colors.textPrimary,
        textAlign: 'center',
        backgroundColor: isDark ? colors.surfaceElevated : 'rgba(218, 219, 255, 1)',
        borderRadius: normalize(10),
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    separatorContainer: {
        width: normalize(20),
        alignItems: 'center',
        justifyContent: 'center',
    },
    separatorLine: {
        width: normalize(10),
        height: 1,
        backgroundColor: colors.textPrimary,
    }
});

export default PriceRangeFilter;
