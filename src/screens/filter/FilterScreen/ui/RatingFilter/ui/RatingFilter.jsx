import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    PixelRatio
} from 'react-native';
import Slider from '@react-native-community/slider';
import { FontFamily } from '@app/styles/GlobalStyles';
import {IconRight} from "@shared/ui/Icon/Profile";

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

export const RatingFilter = ({ minRating = 4.5, onChange }) => {
    const [expanded, setExpanded] = useState(false);
    const [localRating, setLocalRating] = useState(minRating);
    // Добавим отдельное состояние для отображения во время перетаскивания
    const [displayRating, setDisplayRating] = useState(minRating);

    // Обработчик изменения положения слайдера (во время перетаскивания)
    const handleSliding = useCallback((value) => {
        const roundedValue = Math.round(value * 10) / 10;
        setDisplayRating(roundedValue);
    }, []);

    // Обработчик окончания движения слайдера
    const handleSlidingComplete = useCallback((value) => {
        const roundedValue = Math.round(value * 10) / 10;
        setLocalRating(roundedValue);
        setDisplayRating(roundedValue);
        onChange(roundedValue);
    }, [onChange]);

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.selector}
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.7}
            >
                <Text style={styles.selectorText}>Рейтинг от {localRating}</Text>
                <IconRight
                    color="#000000"
                    size={normalize(24)}
                    style={[
                        styles.chevron,
                        expanded && styles.chevronExpanded
                    ]}
                />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.expandedContent}>
                    <View style={styles.sliderContainer}>
                        <Text style={styles.minLabel}>0</Text>
                        <Slider
                            style={styles.slider}
                            minimumValue={0}
                            maximumValue={5}
                            step={0.1}
                            value={localRating}
                            onValueChange={handleSliding}
                            onSlidingComplete={handleSlidingComplete}
                            minimumTrackTintColor="#5500FF"
                            maximumTrackTintColor="#CCCCCC"
                            thumbTintColor="#5500FF"
                        />
                        <Text style={styles.maxLabel}>5</Text>
                    </View>
                    <Text style={styles.currentValue}>Минимальный рейтинг: {displayRating}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: normalize(8),
    },
    selector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(14),
    },
    selectorText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(17),
        color: '#000000',
    },
    chevron: {
        transform: [{ rotate: '0deg' }],
    },
    chevronExpanded: {
        transform: [{ rotate: '90deg' }],
    },
    expandedContent: {
        paddingBottom: normalize(16),
    },
    sliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: normalize(10),
    },
    slider: {
        flex: 1,
        height: normalize(40),
    },
    minLabel: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(14),
        color: '#000000',
        width: normalize(20),
        textAlign: 'center',
    },
    maxLabel: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(14),
        color: '#000000',
        width: normalize(20),
        textAlign: 'center',
    },
    currentValue: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(14),
        color: '#000000',
        textAlign: 'center',
        marginTop: normalize(5),
    }
});

export default RatingFilter;