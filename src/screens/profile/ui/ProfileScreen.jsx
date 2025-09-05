import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, ScrollView, View, ActivityIndicator, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { ProfileInfo } from "@features/profile";
import { ProfileHeader } from "@widgets/ProfileHeader";
import { fetchProfile, selectProfileLoading, selectProfile, clearProfile } from '@entities/profile';
import { normalize } from '@shared/lib/normalize';
import { useAuth } from "@entities/auth/hooks/useAuth";

export const ProfileScreen = ({ onProductPress }) => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { isAuthenticated, currentUser } = useAuth();
    const isProfileLoading = useSelector(selectProfileLoading);
    const profile = useSelector(selectProfile);

    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const profileRequestSent = useRef(false);

    const screenKey = `profile-screen-${currentUser?.id || 'no-user'}`;

    useEffect(() => {
        if (isAuthenticated && profile && currentUser && profile.id !== currentUser.id) {

            dispatch(clearProfile());
            profileRequestSent.current = false;
        }
    }, [profile, currentUser, isAuthenticated, dispatch]);

    useEffect(() => {
        const loadProfile = async () => {
            if (isAuthenticated && !profileRequestSent.current && (!profile || (currentUser && profile?.id !== currentUser.id))) {
                profileRequestSent.current = true;

                try {
                    await dispatch(fetchProfile()).unwrap();
                } catch (error) {
                    console.error('Ошибка загрузки профиля:', error);
                    profileRequestSent.current = false;
                }
            }
        };

        loadProfile();

        return () => {
            profileRequestSent.current = false;
        };
    }, [dispatch, isAuthenticated, currentUser, profile]);

    useEffect(() => {
        if (!isProfileLoading && (profile || !isAuthenticated)) {
            setIsInitialLoading(false);
        }
    }, [isProfileLoading, profile, isAuthenticated]);

    useEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);


    if (isInitialLoading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Загрузка профиля...</Text>
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
    }
});