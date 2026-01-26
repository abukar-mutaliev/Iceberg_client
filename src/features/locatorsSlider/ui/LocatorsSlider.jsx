import * as React from "react";
import { View, StyleSheet } from "react-native";
import DriverLocator from "@features/driver/driverLocator/ui/DriverLocator";
import { WarehouseLocator } from "@features/warehouse/warehouseLocator";

const LocatorsSlider = ({ onDriverPress, onWarehousePress }) => {
    return (
        <View style={styles.container}>
            <View style={styles.bannersRow}>
                <View style={styles.bannerWrapper}>
                    <DriverLocator onPress={onDriverPress} />
                </View>
                <View style={styles.bannerWrapper}>
                    <WarehouseLocator onPress={onWarehousePress} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    bannersRow: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        paddingVertical: 8,
        gap: 8,
    },
    bannerWrapper: {
        flex: 1,
    },
});

export default LocatorsSlider;
