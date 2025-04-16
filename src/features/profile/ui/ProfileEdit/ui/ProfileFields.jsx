import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Pressable, Animated } from 'react-native';
import { Color } from '@app/styles/GlobalStyles';
import { normalize, normalizeFont } from '@/shared/lib/normalize';
import DropdownArrowIcon from '@shared/ui/Icon/Profile/DropdownArrowIcon';

const genderTranslations = {
    MALE: 'Мужской',
    FEMALE: 'Женский',
    OTHER: 'Другой',
    PREFER_NOT_TO_SAY: 'Предпочитаю не указывать',
};

export const ProfileFields = ({
                                  name,
                                  phone,
                                  gender,
                                  isNameEditable,
                                  isPhoneEditable,
                                  setName,
                                  setPhone,
                                  setGender,
                                  handleNameEditPress,
                                  handlePhoneEditPress
                              }) => {
    const [showGenderDropdown, setShowGenderDropdown] = useState(false);
    const [rotateAnimation] = useState(new Animated.Value(0));

    useEffect(() => {
        Animated.timing(rotateAnimation, {
            toValue: showGenderDropdown ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [showGenderDropdown]);

    const rotateInterpolate = rotateAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    const animatedStyle = {
        transform: [{ rotate: rotateInterpolate }],
    };

    const toggleGenderDropdown = () => {
        setShowGenderDropdown(!showGenderDropdown);
    };

    return (
        <>
            <View style={[styles.fieldContainer, { marginHorizontal: normalize(20), marginBottom: normalize(20) }]}>
                <View style={styles.labelContainer}>
                    <Text style={[styles.fieldLabel, { fontSize: normalizeFont(16), lineHeight: normalize(23) }]}>
                        ФИО
                    </Text>
                </View>
                <View
                    style={[
                        styles.inputWrapper,
                        {
                            height: normalize(50),
                            backgroundColor: isNameEditable ? '#FFFFFF' : '#f2f3ff',
                            borderColor: isNameEditable ? '#007AFF' : '#E5E5E5',
                            borderWidth: isNameEditable ? 1 : 0.5,
                        },
                    ]}
                >
                    <TextInput
                        style={[
                            styles.input,
                            {
                                paddingHorizontal: normalize(5),
                                fontSize: normalizeFont(14),
                                color: isNameEditable ? '#000000' : '#A0A0A0',
                            },
                        ]}
                        value={name}
                        onChangeText={setName}
                        placeholder="Введите ФИО"
                        placeholderTextColor="#A0A0A0"
                        editable={isNameEditable}
                        onSubmitEditing={() => handleNameEditPress()}
                    />
                    <TouchableOpacity
                        style={[styles.editButtonContainer, { paddingHorizontal: normalize(10) }]}
                        onPress={handleNameEditPress}
                    >
                        <Text
                            style={[
                                styles.editButtonText,
                                {
                                    fontSize: normalizeFont(12),
                                    lineHeight: normalize(20),
                                    color: isNameEditable ? '#007AFF' : Color.dark,
                                },
                            ]}
                        >
                            {isNameEditable ? 'Готово' : 'Изменить'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.fieldContainer, { marginHorizontal: normalize(20), marginBottom: normalize(20) }]}>
                <View style={styles.labelContainer}>
                    <Text style={[styles.fieldLabel, { fontSize: normalizeFont(16), lineHeight: normalize(23) }]}>
                        Номер телефона
                    </Text>
                </View>
                <View
                    style={[
                        styles.inputWrapper,
                        {
                            height: normalize(50),
                            backgroundColor: isPhoneEditable ? '#FFFFFF' : '#f2f3ff',
                            borderColor: isPhoneEditable ? '#007AFF' : '#E5E5E5',
                            borderWidth: isPhoneEditable ? 1 : 0.5,
                        },
                    ]}
                >
                    <TextInput
                        style={[
                            styles.input,
                            {
                                paddingHorizontal: normalize(5),
                                fontSize: normalizeFont(14),
                                color: isPhoneEditable ? '#000000' : '#A0A0A0',
                            },
                        ]}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="Введите номер телефона"
                        placeholderTextColor="#A0A0A0"
                        keyboardType="phone-pad"
                        editable={isPhoneEditable}
                        onSubmitEditing={() => handlePhoneEditPress()}
                    />
                    <TouchableOpacity
                        style={[styles.editButtonContainer, { paddingHorizontal: normalize(10) }]}
                        onPress={handlePhoneEditPress}
                    >
                        <Text
                            style={[
                                styles.editButtonText,
                                {
                                    fontSize: normalizeFont(12),
                                    lineHeight: normalize(20),
                                    color: isPhoneEditable ? '#007AFF' : Color.dark,
                                },
                            ]}
                        >
                            {isPhoneEditable ? 'Готово' : 'Изменить'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.fieldContainer, { marginHorizontal: normalize(20), marginBottom: normalize(20) }]}>
                <View style={styles.labelContainer}>
                    <Text style={[styles.fieldLabel, { fontSize: normalizeFont(16), lineHeight: normalize(23) }]}>
                        Пол
                    </Text>
                </View>
                <Pressable
                    style={[styles.genderSelector, { height: normalize(50), paddingHorizontal: normalize(10) }]}
                    onPress={toggleGenderDropdown}
                >
                    <Text
                        style={[
                            gender ? styles.selectedGender : styles.placeholderText,
                            { fontSize: normalizeFont(16) },
                        ]}
                    >
                        {gender ? genderTranslations[gender] : 'Выбрать'}
                    </Text>
                    <Animated.View
                        style={[styles.iconDownContainer, { padding: normalize(10), ...animatedStyle }]}
                    >
                        <DropdownArrowIcon
                            color={showGenderDropdown ? '#007AFF' : '#3339B0'}
                            width={normalize(14)}
                            height={normalize(8)}
                        />
                    </Animated.View>
                </Pressable>
                {showGenderDropdown && (
                    <View style={[styles.genderDropdown, { top: normalize(83) }]}>
                        {Object.entries(genderTranslations).map(([value, label]) => (
                            <Pressable
                                key={value}
                                style={[
                                    styles.genderOption,
                                    { height: normalize(41), paddingHorizontal: normalize(10) },
                                    value === gender && styles.selectedGenderOption,
                                ]}
                                onPress={() => {
                                    setGender(value);
                                    setShowGenderDropdown(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.genderOptionText,
                                        { fontSize: normalizeFont(16), lineHeight: normalize(23) },
                                        value === gender && styles.selectedGenderOptionText,
                                    ]}
                                >
                                    {label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    fieldContainer: {
        marginHorizontal: 20,
        marginBottom: 20,
        position: 'relative',
    },
    labelContainer: {
        marginBottom: 10,
    },
    fieldLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000000',
        lineHeight: 23,
    },
    inputWrapper: {
        borderWidth: 0.5,
        borderColor: '#E5E5E5',
        borderRadius: 8,
        backgroundColor: '#f2f3ff',
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    input: {
        flex: 1,
        height: '100%',
        paddingHorizontal: 5,
        fontSize: 14,
        color: '#A0A0A0',
    },
    editButtonContainer: {
        height: '100%',
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    editButtonText: {
        color: Color.dark,
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 20,
    },
    genderSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 50,
        borderWidth: 0.5,
        borderColor: '#E5E5E5',
        borderRadius: 8,
        backgroundColor: '#f2f3ff',
        paddingHorizontal: 10,
    },
    selectedGender: {
        fontSize: 16,
        color: '#000000',
    },
    placeholderText: {
        fontSize: 16,
        color: '#A0A0A0',
    },
    iconDownContainer: {
        padding: 10,
    },
    genderDropdown: {
        width: '100%',
        position: 'absolute',
        top: 83,
        left: 0,
        right: 0,
        zIndex: 1,
        borderWidth: 0.5,
        borderColor: '#E5E5E5',
        borderRadius: 8,
        backgroundColor: '#F5F5F7',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    genderOption: {
        height: 41,
        paddingHorizontal: 10,
        justifyContent: 'center',
        backgroundColor: '#f2f3ff',
    },
    selectedGenderOption: {
        backgroundColor: '#007AFF',
    },
    genderOptionText: {
        fontSize: 16,
        color: '#000000',
        lineHeight: 23,
    },
    selectedGenderOptionText: {
        color: '#FFFFFF',
    },
});