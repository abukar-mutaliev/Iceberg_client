import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useToast } from './useToast';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const DEMOS = [
    {
        key: 'success',
        title: 'Success',
        subtitle: 'Операция выполнена успешно!',
        icon: 'check-circle',
        bg: '#34C759',
        bgDark: '#1F6B46',
    },
    {
        key: 'error',
        title: 'Error',
        subtitle: 'Произошла ошибка при выполнении операции',
        icon: 'error',
        bg: '#FF453A',
        bgDark: '#7A2320',
    },
    {
        key: 'warning',
        title: 'Warning',
        subtitle: 'Внимание! Проверьте введенные данные',
        icon: 'warning-amber',
        bg: '#FFB020',
        bgDark: '#5C4733',
    },
    {
        key: 'info',
        title: 'Info',
        subtitle: 'Информация обновлена',
        icon: 'info',
        bg: '#3339B0',
        bgDark: '#2A2F55',
    },
    {
        key: 'custom',
        title: 'Custom с действием',
        subtitle: 'Кастомное уведомление с кнопкой',
        icon: 'auto-awesome',
        bg: '#7C3AED',
        bgDark: '#4C2189',
    },
    {
        key: 'long',
        title: 'Длинное сообщение',
        subtitle: 'Отображается дольше обычного',
        icon: 'schedule',
        bg: '#0EA5E9',
        bgDark: '#1E4A6B',
    },
];

export const ToastExample = () => {
    const { showSuccess, showError, showWarning, showInfo, showCustom } = useToast();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const handlePress = (key) => {
        switch (key) {
            case 'success':
                showSuccess('Операция выполнена успешно!');
                break;
            case 'error':
                showError('Произошла ошибка при выполнении операции');
                break;
            case 'warning':
                showWarning('Внимание! Проверьте введенные данные');
                break;
            case 'info':
                showInfo('Информация обновлена');
                break;
            case 'custom':
                showCustom({
                    message: 'Кастомное уведомление с действием',
                    type: 'info',
                    duration: 5000,
                    action: true,
                    actionText: 'Открыть',
                    onActionPress: () => showSuccess('Действие выполнено!'),
                });
                break;
            case 'long':
                showInfo(
                    'Это длинное сообщение, которое будет отображаться дольше обычного',
                    { duration: 6000 }
                );
                break;
            default:
                break;
        }
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.title}>Toast Notifications</Text>
            <Text style={styles.subtitle}>
                Тапните по карточке, чтобы увидеть уведомление
            </Text>

            <View style={styles.grid}>
                {DEMOS.map((demo) => (
                    <TouchableOpacity
                        key={demo.key}
                        style={styles.card}
                        activeOpacity={0.85}
                        onPress={() => handlePress(demo.key)}
                    >
                        <View
                            style={[
                                styles.iconCircle,
                                { backgroundColor: isDark ? demo.bgDark : demo.bg },
                            ]}
                        >
                            <Icon
                                name={demo.icon}
                                size={normalizeFont(22)}
                                color="#FFFFFF"
                            />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>{demo.title}</Text>
                            <Text style={styles.cardSubtitle} numberOfLines={2}>
                                {demo.subtitle}
                            </Text>
                        </View>
                        <Icon
                            name="chevron-right"
                            size={normalizeFont(22)}
                            color={colors.textTertiary}
                        />
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.hintBlock}>
                <Icon
                    name="lightbulb-outline"
                    size={normalizeFont(18)}
                    color={colors.textSecondary}
                />
                <Text style={styles.hintText}>
                    Уведомления исчезают автоматически. Можно настроить длительность
                    и добавить действие с кнопкой.
                </Text>
            </View>
        </ScrollView>
    );
};

const createStyles = (colors, isDark) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        content: {
            padding: normalize(20),
            paddingBottom: normalize(40),
        },
        title: {
            fontSize: normalizeFont(28),
            fontFamily: FontFamily.bold,
            fontWeight: '700',
            color: colors.textPrimary,
            marginBottom: normalize(6),
        },
        subtitle: {
            fontSize: normalizeFont(14),
            fontFamily: FontFamily.regular,
            color: colors.textSecondary,
            marginBottom: normalize(24),
        },
        grid: {
            gap: normalize(12),
        },
        card: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: normalize(16),
            paddingVertical: normalize(14),
            paddingHorizontal: normalize(14),
            marginBottom: normalize(12),
            borderWidth: isDark ? 1 : 0,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0 : 0.06,
            shadowRadius: 6,
            elevation: isDark ? 0 : 2,
        },
        iconCircle: {
            width: normalize(44),
            height: normalize(44),
            borderRadius: normalize(22),
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: normalize(14),
        },
        cardContent: {
            flex: 1,
        },
        cardTitle: {
            fontSize: normalizeFont(15),
            fontFamily: FontFamily.medium,
            fontWeight: '700',
            color: colors.textPrimary,
            marginBottom: normalize(2),
        },
        cardSubtitle: {
            fontSize: normalizeFont(13),
            fontFamily: FontFamily.regular,
            color: colors.textSecondary,
            lineHeight: normalizeFont(18),
        },
        hintBlock: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: normalize(10),
            padding: normalize(14),
            marginTop: normalize(20),
            borderRadius: normalize(12),
            backgroundColor: colors.surfaceElevated || colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
        },
        hintText: {
            flex: 1,
            fontSize: normalizeFont(13),
            fontFamily: FontFamily.regular,
            color: colors.textSecondary,
            lineHeight: normalizeFont(18),
            marginLeft: normalize(8),
        },
    });

export default ToastExample;
