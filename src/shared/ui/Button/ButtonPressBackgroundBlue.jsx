import * as React from "react";
import { StyleSheet, View, Dimensions, PixelRatio } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const ButtonPressBackgroundBlue = () => {
    return (
        <View style={styles.buttonCategory}>
            <View style={styles.buttonCategoryChild} />
        </View>
    );
};

const styles = StyleSheet.create({
    buttonCategoryChild: {
        position: "absolute",
        height: "100%",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: "#3339B0",
        width: "100%"
    },
    buttonCategory: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: normalize(70),
        width: "100%",
        zIndex: -1
    }
});

export default ButtonPressBackgroundBlue;