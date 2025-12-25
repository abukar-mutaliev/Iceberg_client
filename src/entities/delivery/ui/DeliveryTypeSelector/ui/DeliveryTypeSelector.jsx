import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';

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
                <Icon name="local-shipping" size={24} color="#667eea" />
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
                                    color="#667eea" 
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
                                    <Icon name="check-circle" size={24} color="#667eea" />
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
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
        color: '#1a1a1a',
    },
    optionsContainer: {
        gap: 12,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: '#f0f0f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        position: 'relative',
    },
    optionCardSelected: {
        borderColor: '#667eea',
        backgroundColor: '#fff', // Белый фон остается
        shadowColor: '#667eea',
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
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    iconContainerSelected: {
        backgroundColor: 'rgba(102, 126, 234, 0.1)', // Такой же фон как обычно
        // Убрали тень
    },
    textContent: {
        flex: 1,
    },
    optionLabel: {
        fontSize: FontSize.size_base || 16,
        fontFamily: FontFamily.sFProDisplayMedium || 'SF Pro Display Medium',
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    optionLabelSelected: {
        color: '#667eea',
    },
    optionDescription: {
        fontSize: FontSize.size_sm || 14,
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        color: '#666',
        fontWeight: '400',
    },
    optionDescriptionSelected: {
        color: '#5a6fd8',
    },
    checkmarkContainer: {
        marginLeft: 8,
    },
});

