import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LogoSvg from '@assets/logo/Logo';
import { MainSearchBar } from "@features/search";

export const Header = ({ navigation: propNavigation }) => {
    const hookNavigation = useNavigation();
    const navigation = propNavigation || hookNavigation;

    return (
        <View style={styles.container}>
            <View style={styles.logoContainer}>
                <LogoSvg width={120} height={40} />
            </View>
            
            <View style={styles.searchContainer}>
                <MainSearchBar />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 60,
        paddingHorizontal: 13,
        position: 'relative',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 25,
    },
    searchContainer: {
        alignItems: 'center',
        marginBottom: 10,
    },
    menuButton: {
        position: 'absolute',
        left: 19,
    }
});