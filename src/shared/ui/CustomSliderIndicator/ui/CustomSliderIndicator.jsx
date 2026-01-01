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
        paddingVertical: 4,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        marginHorizontal: 3,
    },
    activeDot: {
        backgroundColor: '#fff',
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    inactiveDot: {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
});