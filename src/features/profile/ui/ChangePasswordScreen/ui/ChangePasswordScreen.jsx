import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    SafeAreaView,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import {CommonActions, useNavigation} from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { FontFamily, Border, Color } from '@app/styles/GlobalStyles';
import ArrowBackIcon from '@shared/ui/Icon/Common/ArrowBackIcon';
import { changePassword } from '@entities/profile';
import { selectProfileLoading, selectProfileError } from '@entities/profile/model/selectors';
import { removeTokensFromStorage} from '@entities/auth';

export const ChangePasswordScreen = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const isLoading = useSelector(selectProfileLoading);
    const error = useSelector(selectProfileError);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});

    useEffect(() => {
        if (currentPassword) {
            setValidationErrors(prev => ({ ...prev, currentPassword: '' }));
        }
        if (newPassword) {
            setValidationErrors(prev => ({ ...prev, newPassword: '' }));
        }
        if (confirmPassword) {
            setValidationErrors(prev => ({ ...prev, confirmPassword: '' }));
        }
    }, [currentPassword, newPassword, confirmPassword]);

    useEffect(() => {
        if (error) {
            Alert.alert('Ошибка', error);
        }
    }, [error]);

    const handleGoBack = () => {
        navigation.goBack();
    };

    const validateForm = () => {
        const errors = {};
        
        if (!currentPassword) {
            errors.currentPassword = 'Введите текущий пароль';
        }
        
        if (!newPassword) {
            errors.newPassword = 'Введите новый пароль';
        } else if (newPassword.length < 6) {
            errors.newPassword = 'Пароль должен быть не менее 6 символов';
        }
        
        if (!confirmPassword) {
            errors.confirmPassword = 'Подтвердите новый пароль';
        } else if (newPassword !== confirmPassword) {
            errors.confirmPassword = 'Пароли не совпадают';
        }
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleChangePassword = async () => {
        if (!validateForm()) return;

        try {
            const result = await dispatch(changePassword({
                currentPassword,
                newPassword
            })).unwrap();

            if (result) {
                Alert.alert(
                    'Успешно',
                    'Пароль успешно изменен. Пожалуйста, войдите в систему снова.',
                    [
                        {
                            text: 'ОК',
                            onPress: () => {
                                removeTokensFromStorage().then(() => {
                                    dispatch({
                                        type: 'auth/resetState'
                                    });

                                    navigation.dispatch(
                                        CommonActions.reset({
                                            index: 0,
                                            routes: [
                                                { name: 'Auth' }
                                            ],
                                        })
                                    );
                                });
                            }
                        }
                    ]
                );
            }
        } catch (error) {
            console.error('Ошибка при смене пароля:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                    <ArrowBackIcon width={24} height={24} color="rgba(0, 12, 255, 1)" />
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>Изменение пароля</Text>
                </View>
            </View>

            <ScrollView 
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Текущий пароль</Text>
                    <View style={[styles.inputWrapper, validationErrors.currentPassword && styles.errorInput]}>
                        <TextInput
                            style={styles.input}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            secureTextEntry={!showCurrentPassword}
                            placeholder="Введите текущий пароль"
                        />
                        <TouchableOpacity
                            onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                            style={styles.eyeIcon}
                        >
                            <Text style={styles.eyeText}>{showCurrentPassword ? '👁️' : '👁️‍🗨️'}</Text>
                        </TouchableOpacity>
                    </View>
                    {validationErrors.currentPassword && (
                        <Text style={styles.errorText}>{validationErrors.currentPassword}</Text>
                    )}
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Новый пароль</Text>
                    <View style={[styles.inputWrapper, validationErrors.newPassword && styles.errorInput]}>
                        <TextInput
                            style={styles.input}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry={!showNewPassword}
                            placeholder="Введите новый пароль"
                        />
                        <TouchableOpacity
                            onPress={() => setShowNewPassword(!showNewPassword)}
                            style={styles.eyeIcon}
                        >
                            <Text style={styles.eyeText}>{showNewPassword ? '👁️' : '👁️‍🗨️'}</Text>
                        </TouchableOpacity>
                    </View>
                    {validationErrors.newPassword && (
                        <Text style={styles.errorText}>{validationErrors.newPassword}</Text>
                    )}
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Подтверждение пароля</Text>
                    <View style={[styles.inputWrapper, validationErrors.confirmPassword && styles.errorInput]}>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showConfirmPassword}
                            placeholder="Подтвердите новый пароль"
                        />
                        <TouchableOpacity
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            style={styles.eyeIcon}
                        >
                            <Text style={styles.eyeText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                        </TouchableOpacity>
                    </View>
                    {validationErrors.confirmPassword && (
                        <Text style={styles.errorText}>{validationErrors.confirmPassword}</Text>
                    )}
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleChangePassword}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Сохранить</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        position: 'relative',
    },
    backButton: {
        padding: 8,
        zIndex: 1,
    },
    titleContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
        textAlign: 'center',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },
    inputContainer: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontFamily: FontFamily.sFProText,
        color: '#333',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: Border.br_3xs,
        paddingHorizontal: 12,
        height: 50,
        backgroundColor: '#FAFAFA',
    },
    input: {
        flex: 1,
        height: '100%',
        fontFamily: FontFamily.sFProText,
    },
    eyeIcon: {
        padding: 8,
    },
    eyeText: {
        fontSize: 16,
    },
    errorInput: {
        borderColor: Color.red,
    },
    errorText: {
        color: Color.red,
        fontSize: 12,
        fontFamily: FontFamily.sFProText,
        marginTop: 4,
    },
    buttonContainer: {
        marginTop: 16,
    },
    saveButton: {
        backgroundColor: '#3f51b5',
        borderRadius: Border.br_3xs,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
});

export default ChangePasswordScreen; 