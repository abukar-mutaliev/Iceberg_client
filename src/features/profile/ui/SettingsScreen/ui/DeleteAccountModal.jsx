import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {deleteProfile, selectIsProfileDeleting, selectProfileError} from '@entities/profile';
import { logout, resetState, removeTokensFromStorage,  } from '@entities/auth';
import { FontFamily, Color, Border } from '@app/styles/GlobalStyles';

const DeleteAccountModal = ({ visible, onClose }) => {
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState(null);

    const dispatch = useDispatch();
    const navigation = useNavigation();

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
            await removeTokensFromStorage();

            dispatch(resetState());

            onClose();

            navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
            });
        } catch (error) {
            console.error('Ошибка при очистке данных:', error);
        }
    };
    const handleConfirm = async () => {
        if (!password) {
            setLocalError('Введите пароль для подтверждения');
            return;
        }

        setLocalError(null);

        try {
            await dispatch(deleteProfile({ password })).unwrap();

            Alert.alert(
                'Аккаунт удален',
                'Ваш аккаунт был успешно удален',
                [{ text: 'ОК', onPress: handleSuccessfulDeletion }],
                { onDismiss: handleSuccessfulDeletion }
            );
        } catch (err) {

            if (err &&
                (typeof err === 'object' && (err.code === 404 || err.status === 404)) ||
                (typeof err === 'string' && (err.includes('не найден') || err.includes('Not Found')))) {
                handleSuccessfulDeletion();
                return;
            }

            setLocalError(typeof err === 'string' ? err : (
                err?.message || err?.data?.message || 'Произошла ошибка при удалении аккаунта'
            ));
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
                        style={styles.passwordInput}
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