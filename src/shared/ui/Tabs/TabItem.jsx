import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { FontFamily, FontSize } from '@/app/styles/GlobalStyles';
import {useTheme} from "@app/providers/themeProvider/ThemeProvider";

export const TabItem = ({ title, isActive, onPress }) => {
    const { colors } = useTheme();

    return (
        <Pressable style={styles.tab} onPress={onPress}>
            <Text
                style={[
                    styles.tabText,
                    { color: isActive ? colors.text : colors.border }
                ]}
            >
                {title}
            </Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabText: {
        fontFamily: FontFamily.robotoBold,
        fontSize: FontSize.size_lg,
        fontWeight: '600',
    },
});
