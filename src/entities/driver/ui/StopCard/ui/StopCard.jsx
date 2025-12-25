import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import IconRight from "@shared/ui/Icon/Common/IconRight";
import { formatTimeRange } from '@shared/lib/dateFormatters';

export const isStopActive = (stop) => {
    if (!stop.startTime || !stop.endTime) return false;

    const now = new Date();
    const startTime = new Date(stop.startTime);
    const endTime = new Date(stop.endTime);

    return startTime <= now && endTime >= now;
};


export const StopCard = ({ stop, onPress }) => {
    const active = isStopActive(stop);

    return (
        <TouchableOpacity
            style={[
                styles.locationItem,
                active && styles.activeLocationItem
            ]}
            onPress={() => onPress(stop.id)}
        >
            <View style={styles.locationContent}>
                <Text style={styles.addressText}>{stop.address}</Text>
                <Text style={styles.timeText}>
                    {formatTimeRange(stop.startTime, stop.endTime)}
                </Text>
            </View>
            <IconRight style={styles.iconRight} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    locationItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingLeft: 36,
        paddingVertical: 5,
        height: 'auto',
        borderBottomWidth: 0.5,
        borderBottomColor: Color.colorLavender,
        backgroundColor: Color.colorLightMode,
    },
    activeLocationItem: {
        backgroundColor: Color.activeBlue,
    },
    locationContent: {
        flex: 1,
        marginRight: 10,
    },
    addressText: {
        fontSize: FontSize.size_lg,
        fontWeight: '500',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        marginBottom: 4,
        letterSpacing: 0.9,
    },
    timeText: {
        fontSize: FontSize.size_md,
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProDisplay,
        letterSpacing: 0.9,
        marginBottom: 2,
    },
    descriptionText: {
        fontSize: FontSize.size_sm,
        color: '#333',
        fontFamily: FontFamily.sFProDisplay,
        marginBottom: 4,
        fontStyle: 'italic',
        lineHeight: 16,
    },
    truckText: {
        fontSize: FontSize.size_sm,
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProDisplay,
        marginBottom: 2,
    },
    activeLabel: {
        backgroundColor: Color.purpleSoft,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        marginTop: 5,
        alignSelf: 'flex-start'
    },
    activeLabelText: {
        color: Color.colorLightMode,
        fontSize: 10,
        fontWeight: '600'
    },
    iconRight: {
        width: 10,
        height: 15,
        position: "absolute",
        right: 25, // Исправлено с "8%" на числовое значение
        top: 30, // Исправлено с "50%" на числовое значение
    }
});

export default StopCard;