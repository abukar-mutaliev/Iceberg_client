import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';

export const BackArrowIcon = ({ width = 15, height = 16, color = "#000CFF" }) => {
    return (
        <View style={styles.container}>
            <Svg width={width} height={height} viewBox="0 0 15 16" fill="none">
                <G id="icon Arrow">
                    <Path
                        id="Arrow 7"
                        d="M14 9C14.5523 9 15 8.55228 15 8C15 7.44772 14.5523 7 14 7V9ZM0.292893 7.29289C-0.0976311 7.68342 -0.0976311 8.31658 0.292893 8.70711L6.65685 15.0711C7.04738 15.4616 7.68054 15.4616 8.07107 15.0711C8.46159 14.6805 8.46159 14.0474 8.07107 13.6569L2.41421 8L8.07107 2.34315C8.46159 1.95262 8.46159 1.31946 8.07107 0.928932C7.68054 0.538408 7.04738 0.538408 6.65685 0.928932L0.292893 7.29289ZM14 7L1 7V9L14 9V7Z"
                        fill={color}
                    />
                </G>
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default BackArrowIcon;