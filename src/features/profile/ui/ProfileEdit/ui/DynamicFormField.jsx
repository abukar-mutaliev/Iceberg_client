// src/features/profile/ui/ProfileEdit/ui/DynamicFormField.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Pressable,
    Animated,
    Platform,
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
                                 }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [rotateAnimation] = useState(new Animated.Value(0));
    const [fieldValue, setFieldValue] = useState(value);

    useEffect(() => {
        Animated.timing(rotateAnimation, {
            toValue: showDropdown ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [showDropdown]);

    useEffect(() => {
        setFieldValue(value);
    }, [value]);

    const rotateInterpolate = rotateAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    const animatedStyle = {
        transform: [{ rotate: rotateInterpolate }],
    };

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
        Keyboard.dismiss();
    };

    const handleChangeText = (text) => {
        setFieldValue(text);
        onChange(field.id, text);
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
        if (!value) return '';

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
                            placeholder={field.placeholder}
                            placeholderTextColor="#A0A0A0"
                            editable={editable}
                            keyboardType={field.type === 'phone' ? 'phone-pad' : (field.keyboardType || 'default')}
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
                    <View>
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
                            <View style={styles.dropdown}>
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
                // Упрощенная реализация multiselect, можно расширить по необходимости
                return (
                    <View>
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
                            <View style={styles.dropdown}>
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
        <View style={styles.fieldContainer}>
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
        zIndex: 1,
        borderWidth: 0.5,
        borderColor: '#E5E5E5',
        borderRadius: normalize(8),
        backgroundColor: '#F5F5F7',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
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