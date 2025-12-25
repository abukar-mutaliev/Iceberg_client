import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { BackButton } from "@shared/ui/Button/BackButton";

export const ProductManagementHeader = ({ title, onBack }) => {
    return (
        <View style={styles.header}>
            <BackButton onPress={onBack} />

            <Text style={styles.title}>{title}</Text>

            <View style={styles.placeholderRight} />
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        paddingHorizontal: 16,
        backgroundColor: Color.colorWhite,
        borderBottomWidth: 1,
        borderBottomColor: Color.border,
    },
    title: {
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
    },
    placeholderRight: {
        width: 32,
    }
});