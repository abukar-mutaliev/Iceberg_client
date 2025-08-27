import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Shadow } from '@app/styles/GlobalStyles';
import {BackButton} from "@shared/ui/Button/BackButton";

export const AdminHeader = ({ title, icon, onBackPress, showBackButton = false }) => {
    return (
        <View style={styles.header}>
            {showBackButton && (
                <View style={styles.backButtonContainer}>
                    <BackButton onPress={onBackPress} />
                </View>
            )}
            <View style={styles.headerIconContainer}>
                {icon}
            </View>
            <Text style={styles.headerText}>{title}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: Color.border,
        backgroundColor: Color.colorLightMode,
        ...Shadow.light,
    },
    backButtonContainer: {
        marginRight: normalize(8),
    },
    headerIconContainer: {
        marginRight: normalize(12),
    },
    headerText: {
        fontSize: normalizeFont(FontSize.size_xl),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.blue2,
    },
});

export default AdminHeader;