import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const TabsContainer = ({ tabs, activeTab, onTabChange }) => {
    const { colors, isDark } = useTheme();

    const activeColor = colors.textPrimary;
    const inactiveColor = colors.textTertiary || colors.textSecondary;
    const indicatorBgColor = isDark ? (colors.divider || '#444') : '#ddd';

    return (
        <View style={styles.container}>
            {tabs.map((tab) => (
                <Pressable
                    key={tab.id}
                    style={styles.tab}
                    onPress={() => onTabChange(tab.id)}
                >
                    <Text
                        style={[
                            styles.tabText,
                            { color: activeTab === tab.id ? activeColor : inactiveColor }
                        ]}
                    >
                        {tab.title}
                    </Text>
                </Pressable>
            ))}
            <View style={styles.indicatorContainer}>
                <View style={[styles.indicatorBackground, { backgroundColor: indicatorBgColor }]} />
                <View
                    style={[
                        styles.indicator,
                        { backgroundColor: colors.primary },
                        activeTab === tabs[0].id ? styles.indicatorLeft : styles.indicatorRight
                    ]}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginTop: 20,
        marginBottom: 0,
        height: 33,
        position: 'relative',
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabText: {
        fontFamily: FontFamily.robotoMedium,
        fontSize: FontSize.size_lg,
        fontWeight: '600',

    },
    indicatorContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
    },
    indicatorBackground: {
        position: 'absolute',
        top: 1,
        left: 0,
        right: 0,
        height: 0.5,
    },
    indicator: {
        position: 'absolute',
        bottom: 0,
        height: 2,
        width: '50%',

    },
    indicatorLeft: {
        left: 0,
    },
    indicatorRight: {
        right: 0,
    },
});