import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Switch,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import { Color } from "@/styles/GlobalStyles";
import { selectTokens } from '@entities/auth';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { getBaseUrl } from '@/shared/api/api';
import { HeaderWithBackButton } from '@/shared/ui/HeaderWithBackButton';
import { GlobalAlert } from '@shared/ui/CustomAlert';

const RewardSettingsScreen = () => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const tokens = useSelector(selectTokens);
    const token = tokens?.accessToken;
    const { currentUser } = useAuth();
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        orderCompletion: {
            amount: 10,
            isActive: true,
            description: 'Вознаграждение за выполнение заказа (за коробку)'
        },
        bonus: {
            amount: 50,
            isActive: true,
            description: 'Бонусное вознаграждение'
        }
    });

    // Загрузка настроек
    const loadSettings = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${getBaseUrl()}/api/rewards/settings/current`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.settings) {
                    setSettings(data.settings);
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Ошибка загрузки настроек:', response.status, response.statusText, errorData);
                GlobalAlert.showError('Ошибка', errorData.message || 'Не удалось загрузить настройки');
            }
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
            GlobalAlert.showError('Ошибка', 'Не удалось загрузить настройки');
        } finally {
            setLoading(false);
        }
    }, [token]);

    // Сохранение настроек
    const saveSettings = useCallback(async () => {
        setSaving(true);
        try {
            const response = await fetch(`${getBaseUrl()}/api/rewards/settings/current`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ settings })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                GlobalAlert.showSuccess('', 'Настройки успешно сохранены', [
                    { text: 'OK', style: 'primary', onPress: () => navigation.goBack() }
                ]);
            } else {
                console.error('Ошибка сохранения настроек:', response.status, response.statusText, data);
                GlobalAlert.showError('Ошибка', data.message || 'Не удалось сохранить настройки');
            }
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
            GlobalAlert.showError('Ошибка', 'Произошла ошибка при сохранении');
        } finally {
            setSaving(false);
        }
    }, [settings, navigation, token]);

    // Обновление значения настройки
    const updateSetting = useCallback((type, field, value) => {
        setSettings(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: value
            }
        }));
    }, []);

    useEffect(() => {
        // Проверяем права доступа - только супер-администраторы могут изменять настройки вознаграждений
        if (currentUser?.role !== 'ADMIN') {
            GlobalAlert.showError('Ошибка', 'Недостаточно прав для доступа к настройкам вознаграждений', [
                { text: 'OK', style: 'primary', onPress: () => navigation.goBack() }
            ]);
            return;
        }

        if (token) {
            loadSettings();
        }
    }, [loadSettings, token, currentUser?.role, navigation]);

    // Рендер карточки настройки
    const renderSettingCard = useCallback((type, title, data) => (
        <View key={type} style={styles.settingCard}>
            <View style={styles.settingHeader}>
                <Text style={styles.settingTitle}>{title}</Text>
                <Switch
                    value={data.isActive}
                    onValueChange={(value) => updateSetting(type, 'isActive', value)}
                    trackColor={{ false: '#767577', true: Color.primary }}
                    thumbColor={data.isActive ? '#fff' : '#f4f3f4'}
                />
            </View>
            
            <Text style={styles.settingDescription}>{data.description}</Text>
            
            <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>Сумма (₽):</Text>
                <TextInput
                    style={[
                        styles.amountInput,
                        !data.isActive && styles.amountInputDisabled
                    ]}
                    value={data.amount.toString()}
                    onChangeText={(text) => {
                        const numValue = parseFloat(text) || 0;
                        updateSetting(type, 'amount', numValue);
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                    editable={data.isActive}
                />
            </View>
        </View>
    ), [updateSetting]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Color.primary} />
                <Text style={styles.loadingText}>Загрузка настроек...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <HeaderWithBackButton
                title="Настройки вознаграждений"
                onBackPress={() => navigation.goBack()}
                showBackButton={true}
            />
            <ScrollView style={styles.scrollContainer}>
                <View style={styles.header}>
                    <Text style={styles.screenTitle}>Настройки вознаграждений</Text>
                    <Text style={styles.screenSubtitle}>
                        Управление системой вознаграждений для сотрудников
                    </Text>
                </View>

                <View style={styles.settingsContainer}>
                    {renderSettingCard(
                        'orderCompletion',
                        'За выполнение заказа',
                        settings.orderCompletion
                    )}
                    
                    {renderSettingCard(
                        'bonus',
                        'Бонусное вознаграждение',
                        settings.bonus
                    )}
                </View>

                <View style={styles.infoContainer}>
                    <Text style={styles.infoTitle}>💡 Важная информация</Text>
                    <Text style={styles.infoText}>
                        • Вознаграждение за заказ начисляется с каждой коробки в заказе{'\n'}
                        • Изменения вступают в силу для новых заказов{'\n'}
                        • Бонусные вознаграждения назначаются вручную администратором
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.cancelButton, saving && styles.buttonDisabled]}
                        onPress={() => navigation.goBack()}
                        disabled={saving}
                    >
                        <Text style={styles.cancelButtonText}>Отмена</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={saveSettings}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Сохранить настройки</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Color.background,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: Color.textSecondary,
    },
    scrollContainer: {
        flex: 1,
    },
    header: {
        padding: 20,
        backgroundColor: Color.background,
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Color.textPrimary,
        marginBottom: 8,
    },
    screenSubtitle: {
        fontSize: 16,
        color: Color.textSecondary,
        lineHeight: 22,
    },
    settingsContainer: {
        padding: 16,
    },
    settingCard: {
        backgroundColor: Color.background,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: Color.border,
    },
    settingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    settingTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Color.textPrimary,
        flex: 1,
    },
    settingDescription: {
        fontSize: 14,
        color: Color.textSecondary,
        marginBottom: 16,
        lineHeight: 20,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    amountLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: Color.textPrimary,
    },
    amountInput: {
        borderWidth: 1,
        borderColor: Color.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 16,
        color: Color.textPrimary,
        backgroundColor: Color.background,
        minWidth: 80,
        textAlign: 'right',
    },
    amountInputDisabled: {
        backgroundColor: '#F8F9FA',
        color: Color.textSecondary,
    },
    infoContainer: {
        margin: 16,
        padding: 16,
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: Color.primary,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: Color.textSecondary,
        lineHeight: 20,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: Color.border,
        backgroundColor: Color.background,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    saveButton: {
        backgroundColor: Color.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    cancelButton: {
        backgroundColor: Color.background,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Color.border,
        flex: 1,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Color.textPrimary,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});

export default RewardSettingsScreen; 