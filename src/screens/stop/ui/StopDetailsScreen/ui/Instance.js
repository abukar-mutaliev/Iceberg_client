import * as React from "react";
import {Text, StyleSheet, View} from "react-native";
import {Color, FontFamily} from "@app/styles/GlobalStyles";

const Instance = () => {
    return (
        <View style={styles.view}>
            <Text style={styles.titleText}>Где будет мороженое?</Text>
            <Text style={styles.subtitleText}>Остановки в твоем городе</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    titleText: {
        fontSize: 19,
        lineHeight: 22,
        fontWeight: "600",
        fontFamily: FontFamily.sFProText,
        color: Color.colorLightMode,
        textAlign: "left",
        width: "100%"
    },
    subtitleText: {
        fontSize: 14,
        lineHeight: 18,
        fontWeight: "400",
        fontFamily: FontFamily.sFProText,
        color: Color.colorLightMode,
        textAlign: "left",
        marginTop: 4,
        opacity: 0.9
    },
    view: {
        flex: 1,
        height: 44,
        width: "100%",
        justifyContent: "center"
    }
});

export default Instance;