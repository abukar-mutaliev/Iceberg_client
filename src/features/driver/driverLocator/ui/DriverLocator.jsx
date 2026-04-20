import * as React from "react";
import { useMemo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import Instance from "@screens/stop/ui/StopDetailsScreen/ui/Instance";
import IceCreamTruckIcon from "@shared/ui/Icon/MainScreen/IceCreamTruckIcon";
import { useTheme } from "@app/providers/themeProvider/ThemeProvider";

const DriverLocator = ({ onPress }) => {
    const { isDark } = useTheme();
    const styles = useMemo(() => createStyles(isDark), [isDark]);

    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={styles.contentContainer}>
                <Instance />
                <View style={styles.iconContainer}>
                    <IceCreamTruckIcon width={36} height={36} fill="#FFFFFF" />
                </View>
            </View>
        </TouchableOpacity>
    );
};

const createStyles = (isDark) => StyleSheet.create({
    container: {
        backgroundColor: isDark ? "#3E3A73" : "#7367F0",
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
        borderColor: isDark ? "rgba(115, 103, 240, 0.3)" : "transparent",
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

export default DriverLocator;
