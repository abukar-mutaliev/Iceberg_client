import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, ScrollView, View, ActivityIndicator, Text, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { ProfileInfo } from "@features/profile";
import { ProfileHeader } from "@widgets/ProfileHeader";
import { fetchProfile, selectProfileLoading, selectProfile, selectProfileError, clearProfile } from '@entities/profile';
import { normalize } from '@shared/lib/normalize';
import { useAuth } from "@entities/auth/hooks/useAuth";
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const ProfileScreen = ({ onProductPress }) => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const { isAuthenticated, currentUser } = useAuth();
    const { colors } = useTheme();

    const isProfileLoading = useSelector(selectProfileLoading);
    const profile = useSelector(selectProfile);
    const profileError = useSelector(selectProfileError);

    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const profileRequestSent = useRef(false);

    const screenKey = `profile-screen-${currentUser?.id || 'no-user'}`;

    const styles = useMemo(() => createStyles(colors), [colors]);

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
        if (!isProfileLoading && (profile || !isAuthenticated || profileError)) {
            setIsInitialLoading(false);
        }
    }, [isProfileLoading, profile, isAuthenticated, profileError]);

    // Настройка навигации
    useEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    // Показываем загрузку только при первой загрузке
    if (isInitialLoading && isProfileLoading) {
        return (
            <SafeAreaView style={styles.loadingContainer} edges={['left', 'right', 'bottom']}>
                <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Загрузка профиля...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} key={screenKey} edges={['left', 'right', 'bottom']}>
            <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + normalize(48) },
                ]}
            >
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


const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        marginTop: normalize(8),
    },
    scrollContent: {
        paddingBottom: normalize(32),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loadingText: {
        marginTop: normalize(10),
        fontSize: normalize(16),
        color: colors.textSecondary,
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
        color: colors.error,
        textAlign: 'center',
        marginBottom: normalize(10),
    },
    errorDetails: {
        fontSize: normalize(14),
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: normalize(20),
    }
});
