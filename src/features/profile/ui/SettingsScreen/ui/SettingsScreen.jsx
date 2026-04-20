import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { FontFamily, Border } from '@app/styles/GlobalStyles';

import ArrowBackIcon from '@shared/ui/Icon/Common/ArrowBackIcon';
import NotificationIcon from '@shared/ui/Icon/Profile/IconNotification';
import ChangeIcon from '@shared/ui/Icon/Profile/IconChange';
import DeleteIcon from '@shared/ui/Icon/Profile/IconDelete';
import RightArrowIcon from '@shared/ui/Icon/Common/IconRight';
import DeleteAccountModal from './DeleteAccountModal';
import ThemeSettingsSection from './ThemeSettingsSection';
import { clearError, selectIsProfileDeleting, selectProfileError } from "@entities/profile";
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const SettingsScreen = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { colors } = useTheme();

    const [isPasswordPressed, setIsPasswordPressed] = useState(false);
    const [isNotificationPressed, setIsNotificationPressed] = useState(false);
    const [isPushDiagnosticPressed, setIsPushDiagnosticPressed] = useState(false);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

    const isDeleting = useSelector(selectIsProfileDeleting);

    const styles = useMemo(() => createStyles(colors), [colors]);

    useEffect(() => {
        return () => {
            dispatch(clearError());
        };
    }, [dispatch]);

    const handleCloseModal = () => {
        setIsDeleteModalVisible(false);
        dispatch(clearError());
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

    const handlePasswordChange = () => {
        if (isDeleting) return;

        setIsPasswordPressed(true);
        setTimeout(() => {
            setIsPasswordPressed(false);
            navigation.navigate('ChangePassword');
        }, 150);
    };

    const handleNotificationSettings = () => {
        if (isDeleting) return;

        setIsNotificationPressed(true);
        setTimeout(() => {
            setIsNotificationPressed(false);
            navigation.navigate('NotificationSettings');
        }, 150);
    };

    const handlePushDiagnostic = () => {
        if (isDeleting) return;

        setIsPushDiagnosticPressed(true);
        setTimeout(() => {
            setIsPushDiagnosticPressed(false);
            navigation.navigate('PushNotificationDiagnostic');
        }, 150);
    };

    const handleDeleteAccount = () => {
        if (isDeleting) return;

        setIsDeleteModalVisible(true);
    };

    const disabledIconColor = isDeleting
        ? 'rgba(124, 127, 232, 0.5)'
        : colors.primary;

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleGoBack}
                    disabled={isDeleting}
                >
                    <ArrowBackIcon width={24} height={24} color={disabledIconColor} />
                </TouchableOpacity>
                <Text style={styles.title}>Настройки</Text>
            </View>


            <View style={styles.content}>
                {/* Переключатель темы (рендерится только при включённом фичефлаге) */}
                <ThemeSettingsSection />

                {/* Центр уведомлений */}
                <TouchableOpacity
                    style={[
                        styles.menuItem,
                        isNotificationPressed && styles.activeMenuItem,
                        isDeleting && styles.disabledMenuItem
                    ]}
                    onPress={handleNotificationSettings}
                    activeOpacity={isDeleting ? 1 : 0.7}
                    disabled={isDeleting}
                >
                    <View style={styles.iconContainer}>
                        <NotificationIcon
                            width={20}
                            height={20}
                            color={isNotificationPressed ? colors.menuItemActiveText : colors.textPrimary}
                        />
                    </View>
                    <Text style={[
                        styles.menuItemText,
                        isNotificationPressed && styles.activeText
                    ]}>
                        Настройки уведомлений
                    </Text>
                    <RightArrowIcon
                        style={styles.rightIcon}
                        width={8}
                        height={15}
                        color={isNotificationPressed ? colors.menuItemActiveText : colors.textTertiary}
                    />
                </TouchableOpacity>

           

                {/* Мой пароль */}
                <TouchableOpacity
                    style={[
                        styles.menuItem,
                        isPasswordPressed && styles.activeMenuItem,
                        isDeleting && styles.disabledMenuItem
                    ]}
                    onPress={handlePasswordChange}
                    activeOpacity={isDeleting ? 1 : 0.7}
                    disabled={isDeleting}
                >
                    <View style={styles.iconContainer}>
                        <ChangeIcon
                            width={20}
                            height={20}
                            color={isPasswordPressed ? colors.menuItemActiveText : colors.textPrimary}
                        />
                    </View>
                    <Text style={[
                        styles.menuItemText,
                        isPasswordPressed && styles.activeText
                    ]}>
                        Мой пароль
                    </Text>
                    <RightArrowIcon
                        style={styles.rightIcon}
                        width={8}
                        height={15}
                        color={isPasswordPressed ? colors.menuItemActiveText : colors.textTertiary}
                    />
                </TouchableOpacity>

                {/* Удалить аккаунт */}
                <TouchableOpacity
                    style={[
                        styles.menuItem,
                        styles.deleteMenuItem,
                        isDeleting && styles.disabledDeleteMenuItem
                    ]}
                    onPress={handleDeleteAccount}
                    activeOpacity={isDeleting ? 1 : 0.7}
                    disabled={isDeleting}
                >
                    <Text style={[styles.menuItemText, styles.deleteText]}>
                        {isDeleting ? "Удаление..." : "Удалить аккаунт"}
                    </Text>
                    <View style={styles.iconContainer}>
                        <DeleteIcon width={20} height={20} color="#fff" />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Модальное окно подтверждения удаления аккаунта */}
            <DeleteAccountModal
                visible={isDeleteModalVisible}
                onClose={handleCloseModal}
            />
        </SafeAreaView>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
        marginLeft: 24,
        color: colors.textPrimary,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        marginBottom: 16,
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: Border.br_3xs,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
    },
    activeMenuItem: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    deleteMenuItem: {
        backgroundColor: colors.error,
        borderColor: colors.error,
        justifyContent: 'center',
        paddingHorizontal: 75,
    },
    disabledMenuItem: {
        opacity: 0.5,
    },
    disabledDeleteMenuItem: {
        opacity: 0.5,
    },
    iconContainer: {
        width: 30,
        alignItems: 'center',
    },
    menuItemText: {
        flex: 1,
        marginLeft: 16,
        fontSize: 16,
        fontFamily: FontFamily.sFProText,
        color: colors.textPrimary,
    },
    activeText: {
        color: colors.menuItemActiveText,
    },
    deleteText: {
        color: '#fff',
    },
    rightIcon: {
        marginLeft: 8,
    },
});

export default SettingsScreen;
