import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { SearchIcon } from '@shared/ui/Icon/SearchIcon';
import { AndroidShadow } from '@shared/ui/Shadow';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';

export const MainSearchBar = ({ customOnPress }) => {
    const navigation = useNavigation();

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

    return (
        <View style={styles.container}>
            <Pressable
                onPress={handlePress}
                style={styles.pressable}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.1)', borderless: true }}
            >
                {Platform.OS === 'ios' ? (
                    <View style={[styles.searchBar, styles.iosShadow]}>
                        <View style={styles.searchBarContent}>
                            <View style={styles.view}>
                                <Text style={styles.text}>Найти</Text>
                            </View>
                            <SearchIcon style={styles.iconSearchAndTextGroup} />
                        </View>
                    </View>
                ) : (
                    <AndroidShadow
                        style={styles.searchBar}
                        shadowColor="rgba(81, 90, 134, 0.2)"
                        shadowConfig={{
                            offsetX: 0,
                            offsetY: 1,
                            elevation: 4,
                            radius: 4,
                            opacity: 1
                        }}
                        borderRadius={Border.br_3xs}
                    >
                        <View style={styles.searchBarContent}>
                            <View style={styles.view}>
                                <Text style={styles.text}>Найти</Text>
                            </View>
                            <SearchIcon style={styles.iconSearchAndTextGroup} />
                        </View>
                    </AndroidShadow>
                )}
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '85%',
        alignSelf: 'center',
    },
    pressable: {
        width: '100%',
    },
    searchBar: {
        width: "100%",
        height: 36,
        position: 'relative',
        borderRadius: Border.br_3xs,
        backgroundColor: '#fff',
    },
    iosShadow: {
        shadowColor: 'rgba(81, 90, 134, 0.3)',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.6,
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
        fontWeight: "600",
        fontFamily: FontFamily.sFProText,
        color: Color.blue250,
    },
    iconSearchAndTextGroup: {
        // Позиция задается через flexbox в searchBarContent
    }
});