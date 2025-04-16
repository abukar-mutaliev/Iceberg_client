import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AndroidShadow } from '@/shared/ui/Shadow';
import { BackArrowIcon } from '@shared/ui/Icon/BackArrowIcon/BackArrowIcon';
import {useTheme} from "@app/providers/themeProvider/ThemeProvider";

export const BackButton = ({ onPress, style }) => {
    const { colors } = useTheme();

    return (
        <Pressable style={[styles.button, style]} onPress={onPress}>
                <BackArrowIcon color={colors.primary} />
        </Pressable>
    );
};

const styles = StyleSheet.create({
    button: {
        position: 'absolute',
        top: 50,
        left: 16,
        zIndex: 10,
    },
    buttonShadow: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
});

