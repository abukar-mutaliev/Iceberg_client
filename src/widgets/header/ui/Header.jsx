import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LogoSvg from '@/assets/logo/Logo';
import { MainSearchBar } from "@features/search";

export const Header = () => {
    const navigation = useNavigation();

    const handleSearchPress = () => {
        navigation.navigate('Search');
    };

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <LogoSvg width={32} height={32}/>
            </View>
            <MainSearchBar customOnPress={handleSearchPress} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 60,
        paddingHorizontal: 13,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginBottom: 25,
    },
    menuButton: {
        position: 'absolute',
        left: 19,
    }
});