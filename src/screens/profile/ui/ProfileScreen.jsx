import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, ScrollView, View, ActivityIndicator, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { ProfileInfo } from "@features/profile";
import { ProfileHeader } from "@widgets/ProfileHeader";
import { fetchProfile, selectProfileLoading, selectProfile, selectProfileError, clearProfile } from '@entities/profile';
import { normalize } from '@shared/lib/normalize';
import { useAuth } from "@entities/auth/hooks/useAuth";

export const ProfileScreen = ({ onProductPress }) => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { isAuthenticated, currentUser } = useAuth();
    const isProfileLoading = useSelector(selectProfileLoading);
    const profile = useSelector(selectProfile);
    const profileError = useSelector(selectProfileError);

    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const profileRequestSent = useRef(false);

    const screenKey = `profile-screen-${currentUser?.id || 'no-user'}`;

    // Очистка профиля при смене пользователя
    useEffect(() => {
        if (isAuthenticated && profile && currentUser && profile.id !== currentUser.id) {
            console.log('Очистка профиля из-за смены пользователя');
            dispatch(clearProfile());
            profileRequestSent.current = false;
        }
    }, [profile, currentUser, isAuthenticated, dispatch]);

    // Загрузка профиля только если он не загружен или не соответствует текущему пользователю
    useEffect(() => {
        const loadProfile = async () => {
            if (isAuthenticated && !profileRequestSent.current && (!profile || (currentUser && profile?.id !== currentUser.id))) {
                profileRequestSent.current = true;
                console.log('Загрузка профиля в ProfileScreen');

                try {
                    await dispatch(fetchProfile()).unwrap();
                } catch (error) {
                    console.error('Ошибка загрузки профиля в ProfileScreen:', error);
                    profileRequestSent.current = false;
                }
            }
        };

        loadProfile();

        return () => {
            profileRequestSent.current = false;
        };
    }, [dispatch, isAuthenticated, currentUser]);

    // Управление состоянием загрузки
    useEffect(() => {
        if (!isProfileLoading && (profile || !isAuthenticated)) {
            setIsInitialLoading(false);
        }
    }, [isProfileLoading, profile, isAuthenticated]);

    // Настройка навигации
    useEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    // Показываем загрузку только при первой загрузке
    if (isInitialLoading && isProfileLoading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Загрузка профиля...</Text>
            </SafeAreaView>
        );
    }

    // Обработка ошибок профиля (если ProfileInfo не справился)
    if (profileError && !isProfileLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <ScrollView contentContainerStyle={styles.errorContainer}>
                    <Text style={styles.errorText}>Ошибка загрузки профиля</Text>
                    <Text style={styles.errorDetails}>{profileError}</Text>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} key={screenKey}>
            <ScrollView>
                {isAuthenticated && (
                    <ProfileHeader />
                )}
                <View style={styles.content}>
                    <ProfileInfo
                        onProductPress={onProductPress}
                        key={`profile-info-${screenKey}`}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        marginTop: normalize(8),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: normalize(10),
        fontSize: normalize(16),
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(20),
    },
    errorText: {
        fontSize: normalize(18),
        fontWeight: '600',
        color: '#FF3B30',
        textAlign: 'center',
        marginBottom: normalize(10),
    },
    errorDetails: {
        fontSize: normalize(14),
        color: '#666',
        textAlign: 'center',
        lineHeight: normalize(20),
    }
});