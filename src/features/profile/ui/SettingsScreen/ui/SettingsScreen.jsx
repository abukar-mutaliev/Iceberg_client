import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { FontFamily, Border, Color } from '@app/styles/GlobalStyles';

import ArrowBackIcon from '@shared/ui/Icon/Common/ArrowBackIcon';
import NotificationIcon from '@shared/ui/Icon/Profile/IconNotification';
import ChangeIcon from '@shared/ui/Icon/Profile/IconChange';
import DeleteIcon from '@shared/ui/Icon/Profile/IconDelete';
import RightArrowIcon from '@shared/ui/Icon/Common/IconRight';
import DeleteAccountModal from './DeleteAccountModal';
import {clearError, selectIsProfileDeleting, selectProfileError} from "@entities/profile";
import PushNotificationDiagnostic from '@shared/ui/PushNotificationDiagnostic';

export const SettingsScreen = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();

    const [isPasswordPressed, setIsPasswordPressed] = useState(false);
    const [isNotificationPressed, setIsNotificationPressed] = useState(false);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [showPushDiagnostic, setShowPushDiagnostic] = useState(false);

    const isDeleting = useSelector(selectIsProfileDeleting);

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

    const handleDeleteAccount = () => {
        if (isDeleting) return;

        setIsDeleteModalVisible(true);
    };

    const handlePushDiagnostic = () => {
        setShowPushDiagnostic(!showPushDiagnostic);
    };

    if (showPushDiagnostic) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handlePushDiagnostic}
                    >
                        <ArrowBackIcon width={24} height={24} color="rgba(0, 12, 255, 1)" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Push Диагностика</Text>
                </View>
                <PushNotificationDiagnostic />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleGoBack}
                    disabled={isDeleting}
                >
                    <ArrowBackIcon width={24} height={24} color={isDeleting ? "rgba(0, 12, 255, 0.5)" : "rgba(0, 12, 255, 1)"} />
                </TouchableOpacity>
                <Text style={styles.title}>Настройки</Text>
            </View>


            <View style={styles.content}>
                {/* Центр уведомлений */}
                <TouchableOpacity
                    style={[
                        styles.menuItem,
                        isNotificationPressed && styles.blueMenuItem,
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
                            color={isNotificationPressed ? "#fff" : "#000"}
                        />
                    </View>
                    <Text style={[
                        styles.menuItemText,
                        isNotificationPressed && styles.whiteText
                    ]}>
                        Центр уведомлений
                    </Text>
                    <RightArrowIcon
                        style={styles.rightIcon}
                        width={8}
                        height={15}
                        color={isNotificationPressed ? "#fff" : "#333"}
                    />
                </TouchableOpacity>

                {/* Push Диагностика - всегда доступна */}
                <TouchableOpacity
                    style={[styles.menuItem, styles.diagnosticMenuItem]}
                    onPress={handlePushDiagnostic}
                    activeOpacity={0.7}
                >
                    <View style={styles.iconContainer}>
                        <NotificationIcon
                            width={20}
                            height={20}
                            color="#666"
                        />
                    </View>
                    <Text style={[styles.menuItemText, { color: '#666' }]}>
                        Push Диагностика
                    </Text>
                    <RightArrowIcon
                        style={styles.rightIcon}
                        width={8}
                        height={15}
                        color="#666"
                    />
                </TouchableOpacity>

                {/* Мой пароль */}
                <TouchableOpacity
                    style={[
                        styles.menuItem,
                        isPasswordPressed && styles.blueMenuItem,
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
                            color={isPasswordPressed ? "#fff" : "#333"}
                        />
                    </View>
                    <Text style={[
                        styles.menuItemText,
                        isPasswordPressed && styles.whiteText
                    ]}>
                        Мой пароль
                    </Text>
                    <RightArrowIcon
                        style={styles.rightIcon}
                        width={8}
                        height={15}
                        color={isPasswordPressed ? "#fff" : "#333"}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
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
        color: Color.dark,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginBottom: 16,
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: Border.br_3xs,
        borderWidth: 0.1,
    },
    blueMenuItem: {
        backgroundColor: '#3f51b5',
    },
    deleteMenuItem: {
        backgroundColor: Color.red,
        justifyContent: 'center',
        paddingHorizontal: 75,
    },
    disabledMenuItem: {
        opacity: 0.5,
    },
    disabledDeleteMenuItem: {
        backgroundColor: 'rgba(255, 0, 0, 0.5)',
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
    },
    whiteText: {
        color: '#fff',
    },
    deleteText: {
        color: '#fff',
    },
    rightIcon: {
        marginLeft: 8,
    },
    diagnosticMenuItem: {
        backgroundColor: '#f0f0f0',
    },
});

export default SettingsScreen;