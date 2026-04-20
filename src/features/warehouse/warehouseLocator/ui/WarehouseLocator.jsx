import * as React from "react";
import { useMemo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import WarehouseInstance from "./WarehouseInstance";
import { IconWarehouse } from "@shared/ui/Icon/Warehouse";
import { useTheme } from "@app/providers/themeProvider/ThemeProvider";

const WarehouseLocator = ({ onPress }) => {
    const { isDark } = useTheme();
    const styles = useMemo(() => createStyles(isDark), [isDark]);

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

const createStyles = (isDark) => StyleSheet.create({
    container: {
        backgroundColor: isDark ? "#1F6B46" : "#28C76F",
        borderRadius: 10,
        marginHorizontal: 0,
        marginVertical: 0,
        padding: 12,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? "rgba(40, 199, 111, 0.3)" : "transparent",
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
