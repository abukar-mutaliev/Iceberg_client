import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ThemeMode, isDarkThemeEnabled } from '@app/styles/themeConfig';
import { FontFamily, Border } from '@app/styles/GlobalStyles';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import IconTheme from '@shared/ui/Icon/Profile/IconTheme';

const OPTIONS = [
    { id: ThemeMode.SYSTEM, label: 'Системная' },
    { id: ThemeMode.LIGHT, label: 'Светлая' },
    { id: ThemeMode.DARK, label: 'Тёмная' },
];

/**
 * Секция выбора режима темы.
 * Рендерится только если фичефлаг isDarkThemeEnabled === true.
 */
export const ThemeSettingsSection = () => {
    if (!isDarkThemeEnabled) return null;

    const { mode, colors, setThemeMode } = useTheme();

    const styles = useMemo(
        () =>
            StyleSheet.create({
                wrapper: {
                    backgroundColor: colors.surface,
                    borderRadius: Border.br_3xs,
                    paddingVertical: normalize(14),
                    paddingHorizontal: normalize(16),
                    marginBottom: normalize(16),
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.border,
                },
                header: {
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: normalize(12),
                },
                iconContainer: {
                    width: normalize(30),
                    alignItems: 'center',
                },
                title: {
                    flex: 1,
                    marginLeft: normalize(16),
                    fontSize: normalizeFont(16),
                    fontFamily: FontFamily.sFProText,
                    color: colors.textPrimary,
                },
                optionsRow: {
                    flexDirection: 'row',
                    gap: normalize(8),
                },
                option: {
                    flex: 1,
                    paddingVertical: normalize(10),
                    borderRadius: Border.br_3xs,
                    backgroundColor: colors.surfaceSecondary,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.border,
                    alignItems: 'center',
                },
                optionActive: {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                },
                optionText: {
                    fontSize: normalizeFont(13),
                    fontFamily: FontFamily.sFProText,
                    color: colors.textPrimary,
                },
                optionTextActive: {
                    color: colors.menuItemActiveText,
                    fontWeight: '600',
                },
            }),
        [colors],
    );

    return (
        <View style={styles.wrapper}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <IconTheme width={20} height={20} color={colors.textPrimary} />
                </View>
                <Text style={styles.title}>Тема оформления</Text>
            </View>

            <View style={styles.optionsRow}>
                {OPTIONS.map((opt) => {
                    const isActive = mode === opt.id;
                    return (
                        <Pressable
                            key={opt.id}
                            onPress={() => setThemeMode(opt.id)}
                            style={[styles.option, isActive && styles.optionActive]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isActive }}
                            accessibilityLabel={`Режим темы: ${opt.label}`}
                        >
                            <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                                {opt.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
};

export default ThemeSettingsSection;
