import * as React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import Instance from "@screens/stop/ui/StopDetailsScreen/ui/Instance";
import IceCreamTruckIcon from "@shared/ui/Icon/MainScreen/IceCreamTruckIcon";

const DriverLocator = ({ onPress }) => {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={styles.contentContainer}>
                <Instance />
                <View style={styles.iconContainer}>
                    <IceCreamTruckIcon width={50} height={50} fill="#FFFFFF" />
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#7367F0",
        borderRadius: 12,
        marginHorizontal: 16,
        marginVertical: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    contentContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    iconContainer: {
        marginLeft: 16,
    }
});

export default DriverLocator;