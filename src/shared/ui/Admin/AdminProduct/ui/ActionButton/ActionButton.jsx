// @/shared/ui/Button/ActionButton/ActionButton.jsx
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';

const BUTTON_CONFIGS = {
    edit: {
        icon: '✏️',
        backgroundColor: Color.blue2,
        label: 'Редактировать'
    },
    save: {
        icon: '✅',
        backgroundColor: '#4CAF50',
        label: 'Сохранить'
    },
    cancel: {
        icon: '❌',
        backgroundColor: '#f44336',
        label: 'Отмена'
    },
    delete: {
        icon: '🗑️',
        backgroundColor: '#f44336',
        label: 'Удалить'
    }
};

export const ActionButton = ({
                                 type,
                                 onPress,
                                 disabled = false,
                                 loading = false,
                                 style
                             }) => {
    const config = BUTTON_CONFIGS[type] || BUTTON_CONFIGS.edit;

    return (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor: config.backgroundColor },
                disabled && styles.disabled,
                style
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            accessibilityLabel={config.label}
            accessibilityRole="button"
        >
            {loading ? (
                <ActivityIndicator size="small" color={Color.colorLightMode} />
            ) : (
                <Text style={styles.buttonText}>{config.icon}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        padding: normalize(8),
        borderRadius: normalize(20),
        width: normalize(36),
        height: normalize(36),
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabled: {
        opacity: 0.5,
    },
    buttonText: {
        fontSize: normalizeFont(16),
    },
});

// @/shared/ui/Form/InputField/InputField.jsx
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { ValidationMessage } from '@shared/ui/Form/ValidationMessage';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, Border } from '@app/styles/GlobalStyles';

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
                               style
                           }) => {
    return (
        <View style={[styles.container, style]}>
            {label && (
                <Text style={styles.label}>
                    {label} {required && <Text style={styles.required}>*</Text>}
                </Text>
            )}

            <View style={[styles.inputContainer, error && styles.inputError]}>
                {icon && (
                    <View style={styles.iconContainer}>
                        <Text style={styles.icon}>{icon}</Text>
                    </View>
                )}

                <TextInput
                    style={[
                        styles.input,
                        icon && styles.inputWithIcon,
                        multiline && styles.inputMultiline
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    keyboardType={keyboardType}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    maxLength={maxLength}
                    textAlignVertical={multiline ? 'top' : 'center'}
                    placeholderTextColor={Color.textSecondary}
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

const inputStyles = StyleSheet.create({
    container: {
        marginBottom: normalize(16),
    },
    label: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: Color.dark,
        marginBottom: normalize(8),
        fontFamily: FontFamily.sFProText,
    },
    required: {
        color: '#f44336',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Color.border,
        borderRadius: Border.radius.small,
        backgroundColor: Color.colorLightMode,
        minHeight: normalize(44),
    },
    inputError: {
        borderColor: '#f44336',
        borderWidth: 1.5,
    },
    iconContainer: {
        paddingLeft: normalize(12),
        paddingRight: normalize(8),
    },
    icon: {
        fontSize: normalizeFont(16),
        color: Color.blue2,
    },
    input: {
        flex: 1,
        padding: normalize(12),
        fontSize: normalizeFont(16),
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    inputWithIcon: {
        paddingLeft: normalize(4),
    },
    inputMultiline: {
        minHeight: normalize(80),
        paddingTop: normalize(12),
    },
    characterCount: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        textAlign: 'right',
        marginTop: normalize(4),
        fontFamily: FontFamily.sFProText,
    },
});

InputField.styles = inputStyles;

// @/shared/ui/Form/FormSection/FormSection.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';

export const FormSection = ({ title, children, style }) => {
    return (
        <View style={[styles.container, style]}>
            {title && <Text style={styles.title}>{title}</Text>}
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
};

const formSectionStyles = StyleSheet.create({
    container: {
        marginBottom: normalize(24),
    },
    title: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: Color.dark,
        marginBottom: normalize(16),
        fontFamily: FontFamily.sFProDisplay,
    },
    content: {
        // Контент секции
    },
});

FormSection.styles = formSectionStyles;

// @/shared/ui/Layout/InfoCard/InfoCard.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, Border, Shadow } from '@app/styles/GlobalStyles';

export const InfoCard = ({
                             icon,
                             title,
                             value,
                             subtitle,
                             fullWidth = false,
                             style
                         }) => {
    return (
        <View style={[styles.card, fullWidth && styles.fullWidthCard, style]}>
            <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                    <Text style={styles.iconText}>{icon}</Text>
                </View>
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <Text style={styles.cardValue}>{value}</Text>
            {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
        </View>
    );
};

const infoCardStyles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
        borderRadius: Border.radius.medium,
        padding: normalize(16),
        marginHorizontal: normalize(4),
        ...Shadow.light,
    },
    fullWidthCard: {
        marginHorizontal: 0,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(8),
    },
    iconContainer: {
        marginRight: normalize(8),
    },
    iconText: {
        fontSize: normalizeFont(16),
        color: Color.blue2,
    },
    cardTitle: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
    },
    cardValue: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProDisplay,
    },
    cardSubtitle: {
        fontSize: normalizeFont(12),
        color: Color.blue2,
        marginTop: normalize(4),
        fontFamily: FontFamily.sFProText,
    },
});

InfoCard.styles = infoCardStyles;