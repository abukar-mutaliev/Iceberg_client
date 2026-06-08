import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, Border } from '@app/styles/GlobalStyles';
import ValidationMessage from "@shared/ui/Admin/AdminProduct/ui/ValidationMessage/ValidationMessage";
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const InputField = ({
                               label,
                               value,
                               onChangeText,
                               error,
                               placeholder,
                               keyboardType = 'default',
                               multiline = false,
                               numberOfLines = 1,
                               required = false,
                               icon,
                               maxLength,
                               style,
                               editable = true,
                               secureTextEntry = false,
                               minHeight = 44
                           }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    // Состояние для адаптивной высоты (как в модальном окне)
    const [inputHeight, setInputHeight] = useState(multiline ? 60 : minHeight);

    // Обработчик изменения размера контента
    const handleContentSizeChange = (event) => {
        if (multiline && event?.nativeEvent?.contentSize?.height) {
            const { height } = event.nativeEvent.contentSize;
            const newHeight = Math.max(minHeight, height + 20); // +20 для padding
            setInputHeight(newHeight);
        }
    };

    return (
        <View style={[styles.container, style]}>
            {label && (
                <Text style={styles.label}>
                    {label} {required && <Text style={styles.required}>*</Text>}
                </Text>
            )}

            <View style={[
                styles.inputContainer,
                error && styles.inputError,
                { minHeight: normalize(inputHeight) }
            ]}>
                {icon && (
                    <View style={styles.iconContainer}>
                        <Text style={styles.icon}>{icon}</Text>
                    </View>
                )}

                <TextInput
                    style={[
                        styles.input,
                        icon && styles.inputWithIcon,
                        multiline && styles.inputMultiline,
                        !editable && styles.inputDisabled,
                        multiline && { height: inputHeight - 2 } // -2 для border
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    onContentSizeChange={handleContentSizeChange}
                    placeholder={placeholder}
                    keyboardType={keyboardType}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    maxLength={maxLength}
                    editable={editable}
                    secureTextEntry={secureTextEntry}
                    textAlignVertical={multiline ? 'top' : 'center'}
                    placeholderTextColor={isDark ? colors.textTertiary : Color.textSecondary}
                    blurOnSubmit={multiline ? true : false}
                    returnKeyType={multiline ? "done" : "default"}
                />
            </View>

            {error && <ValidationMessage message={error} type="error" />}

            {maxLength && value && (
                <Text style={styles.characterCount}>
                    {value.length}/{maxLength}
                </Text>
            )}
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        marginBottom: normalize(16),
    },
    label: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: isDark ? colors.textSecondary : Color.dark,
        marginBottom: normalize(8),
        fontFamily: FontFamily.sFProText,
    },
    required: {
        color: colors.error,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start', // Изменено для многострочных полей
        borderWidth: 1,
        borderColor: isDark ? colors.border : Color.border,
        borderRadius: Border.radius.small,
        backgroundColor: isDark ? colors.surfaceElevated : Color.colorLightMode,
        minHeight: normalize(44),
    },
    inputError: {
        borderColor: colors.error,
        borderWidth: 1.5,
    },
    iconContainer: {
        paddingLeft: normalize(12),
        paddingRight: normalize(8),
        paddingTop: normalize(12),
    },
    icon: {
        fontSize: normalizeFont(16),
        color: isDark ? colors.primary : Color.blue2,
    },
    input: {
        flex: 1,
        padding: normalize(12),
        fontSize: normalizeFont(16),
        color: isDark ? colors.textPrimary : Color.dark,
        fontFamily: FontFamily.sFProText,
        minHeight: normalize(44),
    },
    inputWithIcon: {
        paddingLeft: normalize(4),
    },
    inputMultiline: {
        paddingTop: normalize(12),
        textAlignVertical: 'top',
    },
    inputDisabled: {
        backgroundColor: isDark ? colors.surfaceSecondary || colors.surfaceElevated : '#F5F5F5',
        color: isDark ? colors.textTertiary : Color.textSecondary,
    },
    characterCount: {
        fontSize: normalizeFont(12),
        color: isDark ? colors.textSecondary : Color.textSecondary,
        textAlign: 'right',
        marginTop: normalize(4),
        fontFamily: FontFamily.sFProText,
    },
});

export default InputField;