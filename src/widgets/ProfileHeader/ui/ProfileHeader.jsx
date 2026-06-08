import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ProfileAvatar } from '@entities/profile';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { useAuth } from "@entities/auth/hooks/useAuth";
import { useLogout } from '@entities/auth/hooks/useLogout';
import {BackButton} from "@shared/ui/Button/BackButton";
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const ProfileHeader = () => {
    const navigation = useNavigation();
    const { currentUser } = useAuth();
    const { handleLogout } = useLogout();
    const { colors } = useTheme();
    const profile = useSelector(state => state.profile.data);

    const componentKey = `profile-header-${currentUser?.id || 'no-user'}`;
    const styles = useMemo(() => createStyles(colors), [colors]);

    const getUserFullName = () => {
        if (!profile || !currentUser) return 'Пользователь';

        // Проверяем соответствие ID профиля и пользователя
        if (profile.id && currentUser.id && profile.id !== currentUser.id) {
            console.warn('Несоответствие ID профиля и пользователя!', {
                profileId: profile.id,
                userId: currentUser.id
            });
        }

        const { role } = currentUser;

        switch (role) {
            case 'ADMIN':
                return profile?.admin?.name || profile?.name || currentUser?.name || 'Администратор';
            case 'EMPLOYEE':
                return profile?.employee?.name || profile?.name || currentUser?.name || 'Сотрудник';
            case 'SUPPLIER':
                return profile?.companyName ||
                    (profile?.supplier && profile.supplier.companyName) ||
                    currentUser?.name || 'Поставщик';
            case 'DRIVER':
                return profile?.driver?.name || profile?.name || currentUser?.name || 'Водитель';
            case 'CLIENT':
                return profile?.client?.name || profile?.name || currentUser?.name || 'Пользователь';
            default:
                return 'Пользователь';
        }
    };

    // Определяем роль или должность сотрудника для отображения
    const getUserRoleOrPosition = () => {
        if (!currentUser?.role) return '';

        switch (currentUser.role) {
            case 'EMPLOYEE':
                // Для сотрудников показываем должность, если она есть
                const position = profile?.employee?.position;
                return position || 'сотрудник';
            case 'ADMIN': return 'администратор';
            case 'SUPPLIER': return 'поставщик';
            case 'DRIVER': return 'водитель';
            case 'CLIENT': return '';
            default: return '';
        }
    };

    const fullName = getUserFullName();
    const userRoleOrPosition = getUserRoleOrPosition();
    const showRole = currentUser?.role && currentUser.role !== 'CLIENT';

    const handleBackToMain = () => {
        const parent = navigation.getParent?.();
        if (parent) {
            parent.navigate('MainTab', { screen: 'Main' });
        } else {
            navigation.navigate('MainTab', { screen: 'Main' });
        }
    };

    return (
        <View style={styles.container} key={componentKey}>
            <View style={styles.topBar}>
                <BackButton onPress={handleBackToMain} />

                <Pressable
                    style={styles.logoutButton}
                    onPress={handleLogout}
                    accessibilityRole="button"
                    accessibilityLabel="Выйти из аккаунта"
                    android_ripple={{ color: 'rgba(0, 0, 0, 0.1)', borderless: true }}
                >
                    <Icon name="logout" size={22} color={colors.textSecondary} />
                    <Text style={styles.logoutText}>Выйти</Text>
                </Pressable>
            </View>

            <View style={styles.avatarContainer}>
                <ProfileAvatar
                    profile={profile}
                    size={188}
                    centered={true}
                    editable={true}
                    key={componentKey + '-avatar'} // Ключ для перерисовки аватара
                />

                <Text style={styles.nameText}>{fullName}</Text>

                {showRole && (
                    <Text style={styles.roleText}>{userRoleOrPosition}</Text>
                )}
            </View>
        </View>
    );
};


const createStyles = (colors) => StyleSheet.create({
    container: {
        backgroundColor: colors.background,
        alignItems: 'center',
    },
    topBar: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(16),
        paddingTop: normalize(30),
        height: normalize(50) + normalize(30),
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        height: normalize(50),
        paddingHorizontal: normalize(8),
    },
    logoutText: {
        fontSize: normalizeFont(14),
        color: colors.textSecondary,
        marginLeft: normalize(4),
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: normalize(1),
    },
    nameText: {
        fontSize: normalize(18),
        fontWeight: '600',
        color: colors.textPrimary,
        marginTop: normalize(16),
        textAlign: 'center',
    },
    roleText: {
        fontSize: normalize(14),
        color: colors.textSecondary,
        marginTop: normalize(2),
        textAlign: 'center',
    }
});
