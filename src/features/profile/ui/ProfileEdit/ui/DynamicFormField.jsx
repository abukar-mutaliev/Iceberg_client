import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Pressable,
    Animated,
    Keyboard
} from 'react-native';
import DropdownArrowIcon from '@shared/ui/Icon/Profile/DropdownArrowIcon';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color } from '@app/styles/GlobalStyles';

export const DynamicFormField = ({
                                     field,
                                     value,
                                     onChange,
                                     editable,
                                     setEditable,
                                     extraOptions = [],
                                     error = null,
                                     scrollViewRef,
                                 }) => {

    const [showDropdown, setShowDropdown] = useState(false);
    const [rotateAnimation] = useState(new Animated.Value(0));
    const [fieldValue, setFieldValue] = useState(value);
    const fieldContainerRef = useRef(null);

    // Форматирование телефона: +7 (XXX) XXX-XX-XX
    const formatPhoneNumber = useCallback((text) => {
        // Убираем все нецифровые символы
        let digits = text.replace(/\D/g, '');
        
        // Если начинается с 8, заменяем на 7
        if (digits.startsWith('8')) {
            digits = '7' + digits.slice(1);
        }
        
        // Если не начинается с 7, добавляем 7
        if (digits.length > 0 && !digits.startsWith('7')) {
            digits = '7' + digits;
        }
        
        // Ограничиваем до 11 цифр (7 + 10 цифр номера)
        digits = digits.slice(0, 11);
        
        // Форматируем
        let formatted = '';
        if (digits.length > 0) {
            formatted = '+7';
        }
        if (digits.length > 1) {
            formatted += ' (' + digits.slice(1, 4);
        }
        if (digits.length >= 4) {
            formatted += ')';
        }
        if (digits.length > 4) {
            formatted += ' ' + digits.slice(4, 7);
        }
        if (digits.length > 7) {
            formatted += '-' + digits.slice(7, 9);
        }
        if (digits.length > 9) {
            formatted += '-' + digits.slice(9, 11);
        }
        
        return formatted;
    }, []);

    useEffect(() => {
        Animated.timing(rotateAnimation, {
            toValue: showDropdown ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [showDropdown]);

    useEffect(() => {
        // Для полей телефона форматируем значение при загрузке
        if (field.type === 'phone' && value) {
            const digits = value.replace(/\D/g, '');
            // Если значение уже отформатировано или содержит 11 цифр, форматируем его
            if (digits.length === 11 || value.includes('(') || value.includes(')')) {
                const formatted = formatPhoneNumber(value);
                setFieldValue(formatted);
            } else {
                setFieldValue(value);
            }
        } else {
            setFieldValue(value);
        }
    }, [value, field.id, field.type, formatPhoneNumber]);

    const rotateInterpolate = rotateAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    const animatedStyle = {
        transform: [{ rotate: rotateInterpolate }],
    };

    const handleAutoScroll = () => {
        if (fieldContainerRef.current && scrollViewRef?.current) {
            setTimeout(() => {
                fieldContainerRef.current.measureLayout(
                    scrollViewRef.current,
                    (x, y, width, height) => {
                        const options = field.options ? [...field.options, ...extraOptions] : extraOptions;
                        const dropdownHeight = Math.min(options.length * normalize(41), normalize(200)); // Максимальная высота dropdown
                        const fieldBottom = y + height + dropdownHeight;

                        scrollViewRef.current.scrollTo({
                            y: fieldBottom - 300,
                            animated: true,
                        });
                    },
                    (error) => {
                        console.warn('Ошибка измерения позиции поля:', error);
                    }
                );
            }, 100);
        }
    };

    const toggleDropdown = () => {
        const newShowDropdown = !showDropdown;
        setShowDropdown(newShowDropdown);
        Keyboard.dismiss();

        if (newShowDropdown) {
            handleAutoScroll();
        }
    };

    const handleChangeText = (text) => {
        if (field.type === 'phone') {
            const formatted = formatPhoneNumber(text);
            setFieldValue(formatted);
            onChange(field.id, formatted);
        } else {
            setFieldValue(text);
            onChange(field.id, text);
        }
    };

    const handlePhoneFocus = () => {
        // При фокусе на поле телефона, если оно пустое, устанавливаем +7 (
        if (field.type === 'phone' && (!fieldValue || fieldValue.trim() === '')) {
            const formatted = '+7 (';
            setFieldValue(formatted);
            onChange(field.id, formatted);
        }
    };

    const handleEditToggle = () => {
        if (editable) {
            if (field.validation && !field.validation(fieldValue)) {
                return;
            }
            Keyboard.dismiss();
        }
        setEditable(!editable);
    };

    const handleOptionSelect = (option) => {
        onChange(field.id, option.value);
        setShowDropdown(false);
    };

    const options = field.options ? [...field.options, ...extraOptions] : extraOptions;

    const getSelectedOptionLabel = () => {
        if (!value) {
    
            return '';
        }

        if (field.type === 'multiselect' && Array.isArray(value)) {
            return value.map(v => {
                const option = options.find(opt => opt.value === v || opt.id === v);
                return option ? option.label || option.name : '';
            }).join(', ');
        } else {
            const option = options.find(opt => opt.value === value || opt.id === value);
            return option ? option.label || option.name : '';
        }
    };

    const renderField = () => {
        switch (field.type) {
            case 'text':
            case 'phone':
                return (
                    <View
                        style={[
                            styles.inputWrapper,
                            {
                                backgroundColor: editable ? '#FFFFFF' : '#f2f3ff',
                                borderColor: editable ? '#007AFF' : '#E5E5E5',
                                borderWidth: editable ? 1 : 0.5,
                            },
                        ]}
                    >
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    color: editable ? '#000000' : '#A0A0A0',
                                },
                            ]}
                            value={fieldValue}
                            onChangeText={handleChangeText}
                            onFocus={field.type === 'phone' ? handlePhoneFocus : undefined}
                            placeholder={field.type === 'phone' ? '+7 (___) ___-__-__' : field.placeholder}
                            placeholderTextColor="#A0A0A0"
                            editable={editable}
                            keyboardType={field.type === 'phone' ? 'phone-pad' : (field.keyboardType || 'default')}
                            maxLength={field.type === 'phone' ? 18 : undefined}
                            onSubmitEditing={handleEditToggle}
                        />
                        <TouchableOpacity
                            style={styles.editButtonContainer}
                            onPress={handleEditToggle}
                        >
                            <Text
                                style={[
                                    styles.editButtonText,
                                    {
                                        color: editable ? '#007AFF' : Color.dark,
                                    },
                                ]}
                            >
                                {editable ? 'Готово' : 'Изменить'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                );

            case 'select':
                return (
                    <View style={styles.selectContainer}>
                        <Pressable
                            style={styles.selector}
                            onPress={toggleDropdown}
                        >
                            <Text
                                style={[
                                    value ? styles.selectedValue : styles.placeholderText,
                                ]}
                            >
                                {value ? getSelectedOptionLabel() : field.placeholder || 'Выбрать'}
                            </Text>
                            <Animated.View
                                style={[styles.iconDownContainer, animatedStyle]}
                            >
                                <DropdownArrowIcon
                                    color={showDropdown ? '#007AFF' : '#3339B0'}
                                    width={normalize(14)}
                                    height={normalize(8)}
                                />
                            </Animated.View>
                        </Pressable>
                        {showDropdown && (
                            <View style={[
                                styles.dropdown,
                                { maxHeight: normalize(300) }
                            ]}>
                                {options.map((option) => (
                                    <Pressable
                                        key={option.value || option.id}
                                        style={[
                                            styles.option,
                                            (option.value === value || option.id === value) && styles.selectedOption,
                                        ]}
                                        onPress={() => handleOptionSelect(option)}
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                (option.value === value || option.id === value) && styles.selectedOptionText,
                                            ]}
                                        >
                                            {option.label || option.name}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>
                );

            case 'multiselect':
                return (
                    <View style={styles.selectContainer}>
                        <Pressable
                            style={styles.selector}
                            onPress={toggleDropdown}
                        >
                            <Text
                                style={[
                                    value && value.length > 0 ? styles.selectedValue : styles.placeholderText,
                                ]}
                            >
                                {value && value.length > 0 ? getSelectedOptionLabel() : field.placeholder || 'Выбрать'}
                            </Text>
                            <Animated.View
                                style={[styles.iconDownContainer, animatedStyle]}
                            >
                                <DropdownArrowIcon
                                    color={showDropdown ? '#007AFF' : '#3339B0'}
                                    width={normalize(14)}
                                    height={normalize(8)}
                                />
                            </Animated.View>
                        </Pressable>
                        {showDropdown && (
                            <View style={[
                                styles.dropdown,
                                { maxHeight: normalize(300) }
                            ]}>
                                {options.map((option) => {
                                    const isSelected = Array.isArray(value) && (value.includes(option.value) || value.includes(option.id));
                                    return (
                                        <Pressable
                                            key={option.value || option.id}
                                            style={[
                                                styles.option,
                                                isSelected && styles.selectedOption,
                                            ]}
                                            onPress={() => {
                                                const newValue = [...(Array.isArray(value) ? value : [])];
                                                const optionValue = option.value || option.id;
                                                const index = newValue.indexOf(optionValue);

                                                if (index > -1) {
                                                    newValue.splice(index, 1);
                                                } else {
                                                    newValue.push(optionValue);
                                                }

                                                handleOptionSelect({ value: newValue });
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.optionText,
                                                    isSelected && styles.selectedOptionText,
                                                ]}
                                            >
                                                {option.label || option.name}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <View
            style={[
                styles.fieldContainer,
                showDropdown && (field.type === 'select' || field.type === 'multiselect') && styles.fieldContainerExpanded
            ]}
            ref={fieldContainerRef}
        >
            <View style={styles.labelContainer}>
                <Text style={styles.fieldLabel}>
                    {field.label}
                    {field.required && <Text style={styles.requiredMark}> *</Text>}
                </Text>
            </View>
            {renderField()}
            {error && (
                <Text style={styles.errorMessage}>{error}</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    fieldContainer: {
        marginHorizontal: normalize(20),
        marginBottom: normalize(20),
        position: 'relative',
    },
    fieldContainerExpanded: {
        marginBottom: normalize(220),
    },
    labelContainer: {
        marginBottom: normalize(10),
    },
    fieldLabel: {
        fontSize: normalizeFont(16),
        fontWeight: '500',
        color: '#000000',
        lineHeight: normalize(23),
    },
    requiredMark: {
        color: '#FF0000',
    },
    inputWrapper: {
        borderWidth: 0.5,
        borderColor: '#E5E5E5',
        borderRadius: normalize(8),
        backgroundColor: '#f2f3ff',
        height: normalize(50),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: normalize(10),
    },
    input: {
        flex: 1,
        height: '100%',
        paddingHorizontal: normalize(5),
        fontSize: normalizeFont(14),
        color: '#A0A0A0',
    },
    editButtonContainer: {
        height: '100%',
        justifyContent: 'center',
        paddingHorizontal: normalize(10),
    },
    editButtonText: {
        color: Color.dark,
        fontSize: normalizeFont(12),
        fontWeight: '700',
        lineHeight: normalize(20),
    },
    selectContainer: {
        position: 'relative',
        zIndex: 1,
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: normalize(50),
        borderWidth: 0.5,
        borderColor: '#E5E5E5',
        borderRadius: normalize(8),
        backgroundColor: '#f2f3ff',
        paddingHorizontal: normalize(10),
    },
    selectedValue: {
        fontSize: normalizeFont(16),
        color: '#000000',
    },
    placeholderText: {
        fontSize: normalizeFont(16),
        color: '#A0A0A0',
    },
    iconDownContainer: {
        padding: normalize(10),
    },
    dropdown: {
        width: '100%',
        position: 'absolute',
        top: normalize(55),
        left: 0,
        right: 0,
        zIndex: 2,
        borderWidth: 0.5,
        borderColor: '#E5E5E5',
        borderRadius: normalize(8),
        backgroundColor: '#F5F5F7',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        overflow: 'hidden',
    },
    option: {
        height: normalize(41),
        paddingHorizontal: normalize(10),
        justifyContent: 'center',
        backgroundColor: '#f2f3ff',
    },
    selectedOption: {
        backgroundColor: '#007AFF',
    },
    optionText: {
        fontSize: normalizeFont(16),
        color: '#000000',
        lineHeight: normalize(23),
    },
    selectedOptionText: {
        color: '#FFFFFF',
    },
    errorMessage: {
        fontSize: normalizeFont(12),
        color: '#FF0000',
        marginTop: normalize(5),
    },
});