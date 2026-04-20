import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { SearchIcon } from '@shared/ui/Icon/SearchIcon';
import { AndroidShadow } from '@shared/ui/Shadow';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const MainSearchBar = ({ customOnPress }) => {
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const handlePress = () => {
        if (customOnPress) {
            customOnPress();
        } else {

            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Search' }],
                })
            );
        }
    };

    const iconColor = isDark ? colors.textSecondary : Color.blue250;

    return (
        <View style={styles.container}>
            <Pressable
                onPress={handlePress}
                style={styles.pressable}
                android_ripple={{
                    color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.1)',
                    borderless: true,
                }}
            >
                {Platform.OS === 'ios' ? (
                    <View style={[styles.searchBar, styles.iosShadow]}>
                        <View style={styles.searchBarContent}>
                            <View style={styles.view}>
                                <Text style={styles.text}>Найти</Text>
                            </View>
                            <SearchIcon color={iconColor} />
                        </View>
                    </View>
                ) : (
                    <AndroidShadow
                        style={styles.searchBar}
                        shadowColor={isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(81, 90, 134, 0.2)'}
                        shadowConfig={{
                            offsetX: 0,
                            offsetY: 1,
                            elevation: isDark ? 2 : 4,
                            radius: 4,
                            opacity: 1,
                        }}
                        borderRadius={Border.br_3xs}
                    >
                        <View style={styles.searchBarContent}>
                            <View style={styles.view}>
                                <Text style={styles.text}>Найти</Text>
                            </View>
                            <SearchIcon color={iconColor} />
                        </View>
                    </AndroidShadow>
                )}
            </Pressable>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        width: '85%',
        alignSelf: 'center',
    },
    pressable: {
        width: '100%',
    },
    searchBar: {
        width: '100%',
        height: 36,
        position: 'relative',
        borderRadius: Border.br_3xs,
        backgroundColor: isDark ? colors.surfaceElevated : '#fff',
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    iosShadow: {
        shadowColor: isDark ? '#000' : 'rgba(81, 90, 134, 0.3)',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: isDark ? 0.35 : 0.6,
        shadowRadius: 4,
    },
    searchBarContent: {
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
    },
    view: {
        justifyContent: 'center',
    },
    text: {
        fontSize: FontSize.size_sm,
        lineHeight: 22,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
        color: isDark ? colors.textSecondary : Color.blue250,
    },
});
