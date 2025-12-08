import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { deleteProfile, selectIsProfileDeleting, selectProfileError } from '@entities/profile';
import { logout, resetState, removeTokensFromStorage,  } from '@entities/auth';
import { FontFamily, Color, Border } from '@app/styles/GlobalStyles';
import { useCustomAlert } from '@shared/ui/CustomAlert';

const DeleteAccountModal = ({ visible, onClose }) => {
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState(null);

    const dispatch = useDispatch();
    const navigation = useNavigation();
    const { showSuccess } = useCustomAlert();

    const isDeleting = useSelector(selectIsProfileDeleting);
    const reduxError = useSelector(selectProfileError);

    const error = localError || reduxError;

    const handleCancel = () => {
        setPassword('');
        setLocalError(null);
        onClose();
    };

    const handleSuccessfulDeletion = async () => {
        try {
            console.log('🗑️ Обработка успешного удаления аккаунта...');

            // Деактивируем OneSignal токен при удалении аккаунта
            try {
                console.log('🔄 Деактивация OneSignal токена при удалении аккаунта...');
                const OneSignalService = require('@shared/services/OneSignalService').default;
                await OneSignalService.clearUserContext();
                console.log('✅ OneSignal токен деактивирован при удалении аккаунта');
            } catch (oneSignalError) {
                console.warn('⚠️ Ошибка деактивации OneSignal токена при удалении:', oneSignalError);
            }

            // Очищаем токены авторизации
            await removeTokensFromStorage();

            // Сбрасываем состояние приложения
            dispatch(resetState());

            onClose();

            // Переходим на главный экран (неавторизованный)
            navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
            });

            console.log('✅ Очистка данных после удаления аккаунта завершена');
        } catch (error) {
            console.error('❌ Ошибка при очистке данных после удаления:', error);
        }
    };
    const handleConfirm = async () => {
        if (!password) {
            setLocalError('Введите пароль для подтверждения');
            return;
        }

        // Валидация длины пароля на клиенте
        if (password.length < 6) {
            setLocalError('Пароль должен содержать минимум 6 символов');
            return;
        }

        setLocalError(null);

        try {
            await dispatch(deleteProfile({ password })).unwrap();

            showSuccess(
                'Аккаунт удален',
                'Ваш аккаунт был успешно удален',
                [
                    {
                        text: 'ОК',
                        style: 'primary',
                        onPress: handleSuccessfulDeletion
                    }
                ]
            );
        } catch (err) {
            // Обработка случая, когда пользователь уже удален (404)
            if (err &&
                (typeof err === 'object' && (err.code === 404 || err.status === 404)) ||
                (typeof err === 'string' && (err.includes('не найден') || err.includes('Not Found')))) {
                handleSuccessfulDeletion();
                return;
            }

            // Определяем сообщение об ошибке
            // handleError в slice.js возвращает строку, поэтому err обычно строка
            let errorMessage = '';
            if (typeof err === 'string') {
                errorMessage = err;
            } else if (err?.message) {
                errorMessage = err.message;
            } else if (err?.data?.message) {
                errorMessage = err.data.message;
            } else if (err?.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else {
                errorMessage = 'Произошла ошибка при удалении аккаунта';
            }

            // Проверяем, является ли ошибка ошибкой неправильного пароля
            // Важно: проверяем ТОЛЬКО на точное совпадение "Неверный пароль"
            // Ошибки валидации (например, "Пароль должен содержать минимум 6 символов") 
            // НЕ являются ошибками неправильного пароля
            const errorMessageLower = errorMessage.toLowerCase().trim();
            
            // Точная проверка на "Неверный пароль" (без учета ошибок валидации)
            const isPasswordError = 
                errorMessageLower === 'неверный пароль' ||
                errorMessageLower === 'invalid password' ||
                errorMessageLower === 'wrong password' ||
                (errorMessageLower.includes('неверный пароль') && !errorMessageLower.includes('должен')) ||
                (errorMessageLower.includes('invalid password') && !errorMessageLower.includes('must')) ||
                (errorMessageLower.includes('wrong password') && !errorMessageLower.includes('must'));

            // Показываем понятное сообщение об ошибке пароля
            if (isPasswordError) {
                setLocalError('Неверный пароль. Проверьте правильность введенного пароля.');
            } else {
                // Для всех остальных ошибок (включая валидацию) показываем оригинальное сообщение
                setLocalError(errorMessage);
            }
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleCancel}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Удаление аккаунта</Text>

                    <Text style={styles.warningText}>
                        Внимание! Это действие невозможно отменить. Все ваши данные будут удалены безвозвратно.
                    </Text>

                    <Text style={styles.passwordLabel}>
                        Введите пароль для подтверждения:
                    </Text>

                    <TextInput
                        style={[
                            styles.passwordInput,
                            error && styles.passwordInputError
                        ]}
                        secureTextEntry
                        value={password}
                        onChangeText={(text) => {
                            setPassword(text);
                            if (localError) setLocalError(null);
                        }}
                        placeholder="Ваш пароль"
                        autoCapitalize="none"
                        editable={!isDeleting}
                    />

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    <View style={styles.buttonsContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={handleCancel}
                            disabled={isDeleting}
                        >
                            <Text style={styles.buttonText}>Отмена</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.confirmButton,
                                isDeleting && styles.disabledButton
                            ]}
                            onPress={handleConfirm}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={[styles.buttonText, styles.confirmButtonText]}>
                                    Подтвердить
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: Border.br_3xs,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontFamily: FontFamily.sFProText,
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
        color: Color.dark,
    },
    warningText: {
        fontFamily: FontFamily.sFProText,
        fontSize: 14,
        color: Color.red,
        marginBottom: 20,
        textAlign: 'center',
    },
    passwordLabel: {
        fontFamily: FontFamily.sFProText,
        fontSize: 14,
        marginBottom: 8,
        color: Color.dark,
    },
    passwordInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: Border.br_3xs,
        padding: 12,
        marginBottom: 16,
        fontFamily: FontFamily.sFProText,
        fontSize: 14,
    },
    passwordInputError: {
        borderColor: Color.red,
        borderWidth: 1.5,
    },
    errorText: {
        color: Color.red,
        marginBottom: 16,
        fontFamily: FontFamily.sFProText,
        fontSize: 14,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        padding: 12,
        borderRadius: Border.br_3xs,
        flex: 1,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F0F0F0',
        marginRight: 8,
    },
    confirmButton: {
        backgroundColor: Color.red,
        marginLeft: 8,
    },
    disabledButton: {
        backgroundColor: 'rgba(255, 0, 0, 0.5)',
    },
    buttonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: 14,
        fontWeight: '500',
        color: Color.dark,
    },
    confirmButtonText: {
        color: 'white',
    },
});

export default DeleteAccountModal;