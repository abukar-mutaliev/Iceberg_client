import React from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import { Color, FontFamily, FontSize, Padding } from '@app/styles/GlobalStyles';
import { AndroidShadow } from '@shared/ui/Shadow';

export const CatalogButton = ({ onPress }) => {
    return (
        <AndroidShadow
            style={styles.buttonShadow}
            shadowColor="rgba(51, 57, 176, 0.05)"
            shadowConfig={{
                offsetX: 0,
                offsetY: 0,
                elevation: 6,
                radius: 6,
                opacity: 1
            }}
            borderRadius={30}
        >
            <Pressable
                style={styles.button}
                onPress={onPress || (() => {})}
            >
                <Text style={styles.buttonText}>Перейти к каталогу</Text>
            </Pressable>
        </AndroidShadow>
    );
};

const styles = StyleSheet.create({
    buttonShadow: {
        width: 250,
        height: 43,
        borderRadius: 30,
    },
    button: {
        borderRadius: 30,
        borderColor: Color.colorLightMode,
        borderWidth: 1,
        borderStyle: 'solid',
        backgroundColor: Color.colorLightMode,
        paddingHorizontal: Padding.p_xl,
        paddingVertical: Padding.p_3xs,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    buttonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: 17,
        lineHeight: 18,
        fontWeight: '500',
        color: Color.blue2,
        textAlign: 'left',
    }
});