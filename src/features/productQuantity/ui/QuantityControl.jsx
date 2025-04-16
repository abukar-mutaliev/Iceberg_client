import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { AndroidShadow } from '@/shared/ui/Shadow';
import { MinusIcon, PlusIcon } from '@/shared/ui/Icon/DetailScreenIcons';
import { FontFamily, FontSize, Border } from '@/app/styles/GlobalStyles';
import {useTheme} from "@app/providers/themeProvider/ThemeProvider";

export const QuantityControl = ({ quantity, onQuantityChange, style }) => {
    const { colors } = useTheme();

    const handleChange = (value) => {
        onQuantityChange(Math.max(1, quantity + value));
    };

    return (
        <View style={[styles.container, style]}>
            <AndroidShadow
                style={styles.control}
                shadowColor="rgba(51, 57, 176, 0.05)"
                borderRadius={Border.br_3xs}
            >
                <View style={[styles.controlInner, {
                    borderColor: colors.primary,
                    backgroundColor: colors.card
                }]}>
                    <Pressable
                        style={styles.button}
                        onPress={() => handleChange(-1)}
                    >
                        <MinusIcon color={colors.primary} />
                    </Pressable>
                    <Text style={[styles.quantityText, { color: colors.primary }]}>
                        {quantity}
                    </Text>
                    <Pressable
                        style={styles.button}
                        onPress={() => handleChange(1)}
                    >
                        <PlusIcon color={colors.primary} />
                    </Pressable>
                </View>
            </AndroidShadow>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {},
    control: {
        width: 112,
        height: 52,
    },
    controlInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        borderWidth: 1,
        borderRadius: Border.br_3xs,
    },
    button: {
        width: 30,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityText: {
        fontFamily: FontFamily.montserratMedium,
        fontSize: FontSize.size_md,
        fontWeight: 'bold',
    },
});
