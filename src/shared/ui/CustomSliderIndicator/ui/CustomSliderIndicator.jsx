import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Color } from "@app/styles/GlobalStyles";

export const CustomSliderIndicator = ({ totalItems, activeIndex }) => {
    const renderIndicators = () => {
        const indicators = [];

        for (let i = 0; i < totalItems; i++) {
            const isActive = i === activeIndex;

            indicators.push(
                <View
                    key={`indicator-${i}`}
                    style={[
                        styles.dot,
                        isActive ? styles.activeDot : styles.inactiveDot,
                    ]}
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
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    activeDot: {
        backgroundColor: '#fff',
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    inactiveDot: {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
});