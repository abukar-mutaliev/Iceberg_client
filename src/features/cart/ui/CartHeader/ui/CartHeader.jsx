import React from 'react';
import {
    View,
    Text,
    StyleSheet
} from 'react-native';
import {
    Color,
    FontFamily
} from '@app/styles/GlobalStyles';

const normalize = (size) => {
    const scale = 440 / 440;
    return Math.round(size * scale);
};

export const CartHeader = () => {

    return (
        <View style={headerStyles.container}>
            <View style={headerStyles.titleContainer}>
                <Text style={headerStyles.title}>Корзина</Text>
            </View>
        </View>
    );
};

const headerStyles = StyleSheet.create({
    container: {
        backgroundColor: Color.background || '#FFFFFF',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(15),
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(193, 199, 222, 0.30)',
    },
    titleContainer: {
        alignItems: 'flex-start',
    },
    title: {
        fontSize: normalize(24),
        fontWeight: '700',
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        color: '#000000',
        marginBottom: normalize(2),
    }
});