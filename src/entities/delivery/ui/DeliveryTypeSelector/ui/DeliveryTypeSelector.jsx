import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

/**
 * Компонент выбора типа доставки
 * @param {Object} props
 * @param {string} props.selectedType - Текущий выбранный тип ('DELIVERY' или 'PICKUP')
 * @param {Function} props.onTypeChange - Колбэк при изменении типа
 * @param {boolean} props.disabled - Заблокирован ли выбор
 */
export const DeliveryTypeSelector = ({ 
    selectedType = 'DELIVERY', 
    onTypeChange, 
    disabled = false 
}) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const deliveryOptions = [
        {
            type: 'DELIVERY',
            label: 'Доставка курьером',
            icon: 'local-shipping',
            description: 'Доставим по вашему адресу',
            gradient: ['#667eea', '#764ba2'],
        },
        {
            type: 'PICKUP',
            label: 'Самовывоз',
            icon: 'store',
            description: 'Заберу со склада',
            gradient: ['#f093fb', '#f5576c'],
        },
    ];

    const handlePress = (type) => {
        if (!disabled && onTypeChange) {
            onTypeChange(type);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Icon name="local-shipping" size={24} color={colors.primary} />
                <Text style={styles.title}>Способ получения</Text>
            </View>
            
            <View style={styles.optionsContainer}>
                {deliveryOptions.map((option) => {
                    const isSelected = selectedType === option.type;
                    
                    return (
                        <TouchableOpacity
                            key={option.type}
                            style={[
                                styles.optionCard,
                                isSelected && styles.optionCardSelected,
                                disabled && styles.optionCardDisabled,
                            ]}
                            onPress={() => handlePress(option.type)}
                            disabled={disabled}
                            activeOpacity={0.7}
                        >
                            {/* Иконка в круге */}
                            <View style={[
                                styles.iconContainer,
                                isSelected && styles.iconContainerSelected
                            ]}>
                                <Icon 
                                    name={option.icon} 
                                    size={28} 
                                    color={colors.primary}
                                />
                            </View>
                            
                            {/* Текстовый контент */}
                            <View style={styles.textContent}>
                                <Text style={[
                                    styles.optionLabel,
                                    isSelected && styles.optionLabelSelected,
                                ]}>
                                    {option.label}
                                </Text>
                                <Text style={[
                                    styles.optionDescription,
                                    isSelected && styles.optionDescriptionSelected,
                                ]}>
                                    {option.description}
                                </Text>
                            </View>
                            
                            {/* Индикатор выбора - чекмарка */}
                            {isSelected && (
                                <View style={styles.checkmarkContainer}>
                                    <Icon name="check-circle" size={24} color={colors.primary} />
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    title: {
        fontSize: FontSize.size_lg || 18,
        fontFamily: FontFamily.sFProDisplayMedium || 'SF Pro Display Medium',
        fontWeight: '700',
        color: colors.textPrimary,
    },
    optionsContainer: {
        gap: 12,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.22 : 0.06,
        shadowRadius: isDark ? 8 : 4,
        elevation: isDark ? 3 : 2,
        position: 'relative',
    },
    optionCardSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.cardBackground,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    optionCardDisabled: {
        opacity: 0.5,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary + '1A',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    iconContainerSelected: {
        backgroundColor: colors.primary + '1A',
        // Убрали тень
    },
    textContent: {
        flex: 1,
    },
    optionLabel: {
        fontSize: FontSize.size_base || 16,
        fontFamily: FontFamily.sFProDisplayMedium || 'SF Pro Display Medium',
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    optionLabelSelected: {
        color: colors.primary,
    },
    optionDescription: {
        fontSize: FontSize.size_sm || 14,
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        color: colors.textSecondary,
        fontWeight: '400',
    },
    optionDescriptionSelected: {
        color: colors.primary,
    },
    checkmarkContainer: {
        marginLeft: 8,
    },
});

