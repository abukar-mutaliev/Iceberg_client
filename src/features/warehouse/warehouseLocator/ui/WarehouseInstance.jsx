import * as React from "react";
import {Text, StyleSheet, View, Dimensions} from "react-native";
import {Color, FontFamily} from "@app/styles/GlobalStyles";

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375;

const WarehouseInstance = () => {
    return (
        <View style={styles.view}>
            {/* <Text style={styles.titleText}>Где находится склад?</Text> */}
            <Text style={[styles.titleText, IS_SMALL_SCREEN && styles.titleTextSmall]} numberOfLines={2} ellipsizeMode="tail">Адреса{'\n'}наших складов</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    titleText: {
        fontSize: 12,
        lineHeight: 18,
        fontWeight: "600",
        fontFamily: FontFamily.sFProText,
        color: Color.colorLightMode,
        textAlign: "left",
        flexShrink: 1,
    },
    titleTextSmall: {
        fontSize: 12,
        lineHeight: 16,
    },
    subtitleText: {
        fontSize: 11,
        lineHeight: 14,
        fontWeight: "400",
        fontFamily: FontFamily.sFProText,
        color: Color.colorLightMode,
        textAlign: "left",
        marginTop: 2,
        opacity: 0.9
    },
    view: {
        flex: 1,
        flexShrink: 1,
        minWidth: 0,
    }
});

export default WarehouseInstance;
