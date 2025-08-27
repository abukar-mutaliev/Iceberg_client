import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { ProfileAvatar } from '@entities/profile';
import { normalize } from '@shared/lib/normalize';
import { useAuth } from "@entities/auth/hooks/useAuth";
import {BackButton} from "@shared/ui/Button/BackButton";

export const ProfileHeader = () => {
    const { currentUser } = useAuth();
    const profile = useSelector(state => state.profile.data);

    const componentKey = `profile-header-${currentUser?.id || 'no-user'}`;




    const getUserFullName = () => {
        if (!profile || !currentUser) return 'Пользователь';

        // Проверяем соответствие ID профиля и пользователя
        if (profile.id !== currentUser.id) {
            console.warn('Несоответствие ID профиля и пользователя!');
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
                return profile?.client?.name || profile?.name || currentUser?.name || 'Клиент';
            default:
                return 'Пользователь';
        }
    };

    // Определяем роль для отображения
    const getUserRole = () => {
        if (!currentUser?.role) return '';

        switch (currentUser.role) {
            case 'ADMIN': return 'администратор';
            case 'EMPLOYEE': return 'сотрудник';
            case 'SUPPLIER': return 'поставщик';
            case 'DRIVER': return 'водитель';
            case 'CLIENT': return '';
            default: return '';
        }
    };

    const fullName = getUserFullName();
    const userRole = getUserRole();
    const showRole = currentUser?.role && currentUser.role !== 'CLIENT';

    return (
        <View style={styles.container} key={componentKey}>
            <TouchableOpacity
                style={styles.backButton}
            >
                <BackButton />
            </TouchableOpacity>


            <View style={styles.placeholder} />

            <View style={styles.avatarContainer}>
                <ProfileAvatar
                    profile={profile}
                    size={118}
                    centered={true}
                    editable={true}
                    key={componentKey + '-avatar'} // Ключ для перерисовки аватара
                />

                <Text style={styles.nameText}>{fullName}</Text>

                {showRole && (
                    <Text style={styles.roleText}>{userRole}</Text>
                )}
            </View>
        </View>
    );
};


const styles = StyleSheet.create({
    // Стили без изменений
    container: {
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        paddingTop: normalize(30),
    },
    backButton: {
        position: 'absolute',
        left: normalize(16),
        top: normalize(30),
        zIndex: 1,
    },
    title: {
        fontSize: normalize(18),
        fontWeight: '500',
        color: '#000000',
        marginBottom: normalize(20),
    },
    placeholder: {
        width: normalize(32),
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: normalize(16),
    },
    nameText: {
        fontSize: normalize(18),
        fontWeight: '600',
        color: '#212121',
        marginTop: normalize(16),
        textAlign: 'center',
    },
    roleText: {
        fontSize: normalize(14),
        color: '#666666',
        marginTop: normalize(2),
        textAlign: 'center',
    }
});
