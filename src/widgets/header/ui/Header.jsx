import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import LogoSvg from '@assets/logo/Logo';
import { MainSearchBar } from "@features/search";
import { useAuth } from "@entities/auth/hooks/useAuth";
import { HeaderNotificationBadge } from "@features/notification";
import PushNotificationService from "@shared/services/PushNotificationService";

export const Header = ({ navigation: propNavigation }) => {
    const hookNavigation = useNavigation();
    const navigation = propNavigation || hookNavigation;
    const { user } = useAuth();

    const authUser = useSelector(state => state.auth?.user);
    const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);

    const currentUser = user || authUser;

    // УБРАНО: Дублирующая инициализация push-уведомлений
    // Инициализация теперь происходит централизованно в AppContainer

    const handleSearchPress = () => {
        navigation.navigate('Search');
    };

    return (
        <View style={styles.container}>
            <View style={styles.logoContainer}>
                <LogoSvg width={120} height={40} />
            </View>
            
            <View style={styles.searchContainer}>
                <MainSearchBar />
            </View>
            
            <View style={styles.notificationContainer}>
                <HeaderNotificationBadge navigation={navigation} />
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
    notificationContainer: {
        position: 'absolute',
        top: 60,
        right: 13,
        zIndex: 1,
    },
    menuButton: {
        position: 'absolute',
        left: 19,
    }
});