import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, PixelRatio } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import CloseIcon from "@shared/ui/Icon/Profile/CloseIcon";
import { normalize, normalizeFont } from '@shared/lib/normalize';

export const AddStopHeader = () => {
    const navigation = useNavigation();

    return (
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Добавить остановку</Text>
            <TouchableOpacity
                style={styles.closeButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
            >
                <CloseIcon size={normalize(24)} color="#000" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: normalize(70),
        paddingHorizontal: normalize(16),
        borderBottomWidth: 0.5,
        borderBottomColor: '#ebebf0',
    },
    closeButton: {
        position: 'absolute',
        right: normalize(26),
        zIndex: 1,
    },
    headerTitle: {
        fontSize: normalizeFont(FontSize.size_md),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        flex: 1,
    },
});