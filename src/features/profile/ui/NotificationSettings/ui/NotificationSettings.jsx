import React, { useState, useEffect, useCallback } from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
    selectNotificationSettings,
    selectNotificationLoading,
    selectNotificationError,
    fetchNotificationSettings,
    updateNotificationSettings,
    resetNotificationSettings,
    updateSettingLocally,
    clearError
} from '@entities/notification/model/slice';
import { NotificationSettingItem } from './NotificationSettingItem';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily, Border, Color } from '@app/styles/GlobalStyles';
import ArrowBackIcon from '@shared/ui/Icon/Common/ArrowBackIcon';
import { useToast } from '@shared/ui/Toast';

export const NotificationSettings = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { showSuccess, showError } = useToast();

    const settings = useSelector(selectNotificationSettings);
    const isLoading = useSelector(selectNotificationLoading);
    const error = useSelector(selectNotificationError);

    const [localSettings, setLocalSettings] = useState({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Загружаем настройки при монтировании компонента
    useEffect(() => {
        if (fetchNotificationSettings) {
            dispatch(fetchNotificationSettings());
        } else {
            console.warn('⚠️ fetchNotificationSettings is not available yet');
            // Повторяем попытку через 500ms
            const retryTimer = setTimeout(() => {
                if (fetchNotificationSettings) {
                    console.log('🔄 Retrying fetchNotificationSettings');
                    dispatch(fetchNotificationSettings());
                }
            }, 500);
            return () => clearTimeout(retryTimer);
        }
    }, [dispatch]);

    // Обновляем локальные настройки при первой загрузке данных
    useEffect(() => {
        if (Object.keys(settings).length > 0 && !isInitialized) {
            console.log('🔄 NotificationSettings: Initializing local settings from Redux', settings);
            setLocalSettings(settings);
            setHasUnsavedChanges(false);
            setIsInitialized(true);
        }
    }, [settings, isInitialized]);

    // Отслеживаем изменения localSettings
    useEffect(() => {
        console.log('📊 NotificationSettings: localSettings changed', {
            localSettings,
            localSettingsKeys: Object.keys(localSettings),
            localSettingsLength: Object.keys(localSettings).length
        });
    }, [localSettings]);

    // Этот useEffect больше не нужен, так как мы устанавливаем hasUnsavedChanges напрямую в handleSettingChange

    // Синхронизируем локальные настройки после загрузки или сброса
    useEffect(() => {
        if (!isLoading && !error && Object.keys(settings).length > 0 && Object.keys(localSettings).length === 0) {
            console.log('🔄 NotificationSettings: Initial sync after load', { settings });
            setLocalSettings(settings);
        }
    }, [settings, isLoading, error, localSettings]);

    // Обработка изменения настройки
    const handleSettingChange = useCallback((key, value) => {
        const newLocalSettings = {
            ...localSettings,
            [key]: value
        };

        setLocalSettings(newLocalSettings);
        dispatch(updateSettingLocally({ key, value }));
        setHasUnsavedChanges(true);
    }, [localSettings, dispatch]);

    // Сохранение настроек
    const handleSave = async () => {
        console.log('💾 NotificationSettings: handleSave called', {
            localSettings,
            settings,
            hasUnsavedChanges
        });

        try {
            if (updateNotificationSettings) {
                await dispatch(updateNotificationSettings(localSettings)).unwrap();
            } else {
                throw new Error('updateNotificationSettings function not available');
            }
            console.log('✅ NotificationSettings: Settings saved successfully');

            // Синхронизируем локальные настройки с глобальными после сохранения
            console.log('🔄 NotificationSettings: Syncing local settings after save');
            setHasUnsavedChanges(false);

            showSuccess('Настройки уведомлений сохранены');

        } catch (error) {
            console.error('❌ NotificationSettings: Save failed', error);
            showError('Не удалось сохранить настройки');
        }
    };

    // Сброс к дефолтным настройкам
    const handleReset = () => {
        Alert.alert(
            'Сброс настроек',
            'Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Сбросить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (resetNotificationSettings) {
                                await dispatch(resetNotificationSettings()).unwrap();
                            } else {
                                throw new Error('resetNotificationSettings function not available');
                            }
                            showSuccess('Настройки сброшены к значениям по умолчанию');
                        } catch (error) {
                            showError('Не удалось сбросить настройки');
                        }
                    }
                }
            ]
        );
    };

    const handleGoBack = () => {
        if (hasUnsavedChanges) {
            Alert.alert(
                'Несохраненные изменения',
                'У вас есть несохраненные изменения. Сохранить перед выходом?',
                [
                    { text: 'Не сохранять', style: 'destructive', onPress: () => navigation.goBack() },
                    { text: 'Отмена', style: 'cancel' },
                    { text: 'Сохранить', onPress: handleSave }
                ]
            );
        } else {
            navigation.goBack();
        }
    };

    // Очистка ошибки при размонтировании
    useEffect(() => {
        return () => {
            dispatch(clearError());
        };
    }, [dispatch]);

    const settingItems = [
        {
            key: 'chatMessages',
            title: 'Сообщения в чате',
            description: 'Получать уведомления о новых сообщениях в чате'
        },
        {
            key: 'orderUpdates',
            title: 'Обновления заказов',
            description: 'Уведомления о статусе заказов, назначении и изменениях'
        },
        {
            key: 'stopNotifications',
            title: 'Уведомления об остановках',
            description: 'Информация о добавленных и обновленных остановках'
        },
        {
            key: 'promotions',
            title: 'Промо-акции',
            description: 'Новости, скидки и специальные предложения'
        },
        {
            key: 'systemAlerts',
            title: 'Системные уведомления',
            description: 'Важные системные сообщения и предупреждения безопасности'
        }
    ];

    return (
        <View style={styles.container}>
            {/* Заголовок */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleGoBack}
                >
                    <ArrowBackIcon width={24} height={24} color="rgba(0, 12, 255, 1)" />
                </TouchableOpacity>
                <Text style={styles.title}>Центр уведомлений</Text>
            </View>

            {/* Содержимое */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Описание */}
                <View style={styles.descriptionContainer}>
                    <Text style={styles.description}>
                        Настройте получение push-уведомлений для различных типов событий.
                        Вы можете отключить нежелательные уведомления в любое время.
                    </Text>
                </View>

                {/* Настройки */}
                <View style={styles.settingsContainer}>
                    {settingItems.map((item) => (
                        <NotificationSettingItem
                            key={item.key}
                            title={item.title}
                            description={item.description}
                            value={localSettings[item.key]}
                            onValueChange={(value) => handleSettingChange(item.key, value)}
                            disabled={isLoading}
                        />
                    ))}
                </View>

                {/* Кнопки действий */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={[styles.button, styles.saveButton, (!hasUnsavedChanges || isLoading) && styles.disabledButton]}
                        onPress={handleSave}
                        disabled={!hasUnsavedChanges || isLoading}
                    >
                        <Text style={[styles.buttonText, styles.saveButtonText]}>
                            {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.resetButton]}
                        onPress={handleReset}
                        disabled={isLoading}
                    >
                        <Text style={[styles.buttonText, styles.resetButtonText]}>
                            Сбросить к умолчанию
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Сообщение об ошибке */}
                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}
            </ScrollView>
        </View>
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
        paddingVertical: normalize(16),
        paddingHorizontal: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: normalize(8),
    },
    title: {
        fontSize: normalizeFont(18),
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
        marginLeft: normalize(24),
        color: Color.dark,
    },
    content: {
        flex: 1,
        paddingHorizontal: normalize(16),
    },
    descriptionContainer: {
        paddingVertical: normalize(16),
        paddingBottom: normalize(24),
    },
    description: {
        fontSize: normalizeFont(14),
        color: '#666',
        lineHeight: normalize(20),
        textAlign: 'center',
    },
    settingsContainer: {
        marginBottom: normalize(32),
    },
    actionsContainer: {
        gap: normalize(12),
        marginBottom: normalize(32),
    },
    button: {
        paddingVertical: normalize(16),
        paddingHorizontal: normalize(24),
        borderRadius: Border.br_3xs,
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: Color.blue2,
    },
    resetButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Color.red,
    },
    disabledButton: {
        opacity: 0.5,
    },
    buttonText: {
        fontSize: normalizeFont(16),
        fontWeight: '500',
    },
    saveButtonText: {
        color: '#fff',
    },
    resetButtonText: {
        color: Color.red,
    },
    errorContainer: {
        padding: normalize(16),
        backgroundColor: '#ffebee',
        borderRadius: Border.br_3xs,
        marginBottom: normalize(16),
    },
    errorText: {
        color: Color.red,
        fontSize: normalizeFont(14),
        textAlign: 'center',
    },
});

export default NotificationSettings;
