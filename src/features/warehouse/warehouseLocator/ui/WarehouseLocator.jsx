import * as React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import WarehouseInstance from "./WarehouseInstance";
import { IconWarehouse } from "@shared/ui/Icon/Warehouse";

const WarehouseLocator = ({ onPress }) => {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={styles.contentContainer}>
                <WarehouseInstance />
                <View style={styles.iconContainer}>
                    <IconWarehouse width={36} height={36} color="#FFFFFF" />
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#28C76F",
        borderRadius: 10,
        marginHorizontal: 0,
        marginVertical: 0,
        padding: 12,
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
        minHeight: 36,
    },
    iconContainer: {
        marginLeft: 8,
        flexShrink: 0,
    }
});

export default WarehouseLocator;
