import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Color } from "@app/styles/GlobalStyles";

export const CustomSliderIndicator = ({ totalItems, activeIndex }) => {
    const renderIndicators = () => {
        const indicators = [];
        const totalWidth = 80;
        const inactiveWidth = 13;
        const activeWidth = 22.86;
        const gap = (totalWidth - (inactiveWidth * totalItems)) / (totalItems - -2);

        for (let i = 0; i < totalItems; i++) {
            const isActive = i === activeIndex;
            const indicatorWidth = isActive ? activeWidth : inactiveWidth;
            const leftPosition = i * (inactiveWidth + gap);

            const indicatorStyle = [
                styles.indicator,
                isActive ? styles.activeIndicator : styles.inactiveIndicator,
                {
                    width: (indicatorWidth / 100) * 80, // Исправлено с процентов на абсолютные значения
                    left: (leftPosition / 100) * 80, // Исправлено с процентов на абсолютные значения
                },
            ];

            indicators.push(
                <View
                    key={`indicator-${i}`}
                    style={indicatorStyle}
                />
            );
        }

        return indicators;
    };

    return (
        <View style={styles.sliderContainer}>
            {renderIndicators()}
        </View>
    );
};

const styles = StyleSheet.create({
    sliderContainer: {
        width: 80,
        height: 3,
        position: 'relative',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    indicator: {
        height: 3,
        position: 'absolute',
        borderRadius: 10,
    },
    activeIndicator: {
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',

    },
    inactiveIndicator: {
        backgroundColor: Color.gray,
        marginLeft: 4,
    },
});