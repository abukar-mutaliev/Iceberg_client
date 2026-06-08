import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Switch,
    StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import { selectTokens } from '@entities/auth';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { getBaseUrl } from '@/shared/api/api';
import { HeaderWithBackButton } from '@/shared/ui/HeaderWithBackButton';
import { GlobalAlert } from '@shared/ui/CustomAlert';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const RewardSettingsScreen = () => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const tokens = useSelector(selectTokens);
    const token = tokens?.accessToken;
    const { currentUser } = useAuth();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    
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
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={data.isActive ? '#fff' : colors.surfaceElevated}
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
                    placeholderTextColor={colors.textTertiary}
                    keyboardAppearance={colors.keyboardAppearance}
                    editable={data.isActive}
                />
            </View>
        </View>
    ), [colors, styles, updateSetting]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Загрузка настроек...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
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

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: colors.textSecondary,
    },
    scrollContainer: {
        flex: 1,
    },
    header: {
        padding: 20,
        backgroundColor: colors.background,
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    screenSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    settingsContainer: {
        padding: 16,
    },
    settingCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: isDark ? 0.35 : 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: colors.border,
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
        color: colors.textPrimary,
        flex: 1,
    },
    settingDescription: {
        fontSize: 14,
        color: colors.textSecondary,
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
        color: colors.textPrimary,
    },
    amountInput: {
        borderWidth: 1,
        borderColor: colors.inputBorder,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 16,
        color: colors.textPrimary,
        backgroundColor: colors.inputBackground,
        minWidth: 80,
        textAlign: 'right',
    },
    amountInputDisabled: {
        backgroundColor: colors.surfaceSecondary,
        color: colors.textSecondary,
    },
    infoContainer: {
        margin: 16,
        padding: 16,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingBottom: 30
    },
    saveButton: {
        backgroundColor: colors.primary,
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
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    cancelButton: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        flex: 1,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});

export default RewardSettingsScreen; 