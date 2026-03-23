import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { logData } from '@shared/lib/logger';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';

export const PhotoSection = React.forwardRef(({ photo, setPhoto, error }, ref) => {
    const { showAlert, showWarning, showError, hideAlert } = useCustomAlert();
    const [pendingAction, setPendingAction] = useState(null);
    const runAfterAlertClose = (callback) => {
        // iOS can fail to present ImagePicker while custom modal is still dismissing.
        setTimeout(() => {
            callback?.();
        }, 250);
    };

    const processSelectedAsset = async (selectedAsset) => {
        if (!selectedAsset?.uri) {
            throw new Error('Не удалось получить URI изображения');
        }

        logData('Выбрано изображение (оригинал)', {
            uri: selectedAsset.uri,
            fileSize: selectedAsset.fileSize,
            width: selectedAsset.width,
            height: selectedAsset.height,
            mimeType: selectedAsset.mimeType
        });

        const MAX_FILE_SIZE = 700 * 1024; // 700KB

        if (selectedAsset.fileSize && selectedAsset.fileSize > MAX_FILE_SIZE) {
            try {
                const compressedImage = await ImageManipulator.manipulateAsync(
                    selectedAsset.uri,
                    [{ resize: { width: 800 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );

                const optimizedAsset = {
                    uri: compressedImage.uri,
                    width: compressedImage.width,
                    height: compressedImage.height,
                    mimeType: 'image/jpeg',
                    fileSize: selectedAsset.fileSize / 2,
                };

                logData('Изображение оптимизировано', {
                    originalSize: selectedAsset.fileSize,
                    originalDimensions: `${selectedAsset.width}x${selectedAsset.height}`,
                    newDimensions: `${optimizedAsset.width}x${optimizedAsset.height}`,
                    estimatedNewSize: optimizedAsset.fileSize
                });

                setPhoto(optimizedAsset);
            } catch (compressionError) {
                logData('Ошибка при сжатии, используем оригинал', compressionError);
                setPhoto(selectedAsset);
            }
            return;
        }

        setPhoto(selectedAsset);
    };

    const openSettings = async () => {
        try {
            await Linking.openSettings();
        } catch (openSettingsError) {
            logData('Ошибка при открытии настроек', openSettingsError);
            showError(
                'Ошибка',
                'Не удалось открыть настройки. Откройте их вручную и выдайте разрешение.',
                [{ text: 'OK', style: 'primary' }]
            );
        }
    };

    const showPermissionDeniedAlert = (permissionType) => {
        const isCamera = permissionType === 'camera';
        showAlert({
            type: 'warning',
            title: isCamera ? 'Доступ к камере' : 'Доступ к фото',
            message: isCamera
                ? 'Чтобы сделать снимок, разрешите доступ к камере в настройках устройства.'
                : 'Чтобы выбрать фото, разрешите доступ к галерее в настройках устройства.',
            buttons: [
                {
                    text: 'Открыть настройки',
                    style: 'primary',
                    onPress: () => runAfterAlertClose(openSettings),
                },
                { text: 'Отмена', style: 'cancel' }
            ],
            autoClose: false,
            showCloseButton: true,
        });
    };

    const ensureGalleryPermission = async () => {
        try {
            const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();

            if (currentStatus === 'granted') {
                return true;
            }

            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.status === 'granted') {
                return true;
            }

            if (Platform.OS === 'ios') {
                showPermissionDeniedAlert('gallery');
            } else {
                showWarning(
                    'Требуется разрешение',
                    'Для выбора фото необходимо разрешение на доступ к галерее.',
                    [{ text: 'Понятно', style: 'primary' }]
                );
            }
            return false;
        } catch (permissionError) {
            logData('Ошибка при запросе разрешения галереи', permissionError);
            showError(
                'Ошибка',
                'Не удалось проверить разрешение на доступ к галерее.',
                [{ text: 'OK', style: 'primary' }]
            );
            return false;
        }
    };

    const ensureCameraPermission = async () => {
        try {
            const { status: currentStatus } = await ImagePicker.getCameraPermissionsAsync();

            if (currentStatus === 'granted') {
                return true;
            }

            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.status === 'granted') {
                return true;
            }

            if (Platform.OS === 'ios') {
                showPermissionDeniedAlert('camera');
            } else {
                showWarning(
                    'Требуется разрешение',
                    'Для съемки фото необходимо разрешение на доступ к камере.',
                    [{ text: 'Понятно', style: 'primary' }]
                );
            }
            return false;
        } catch (permissionError) {
            logData('Ошибка при запросе разрешения камеры', permissionError);
            showError(
                'Ошибка',
                'Не удалось проверить разрешение на доступ к камере.',
                [{ text: 'OK', style: 'primary' }]
            );
            return false;
        }
    };

    const pickFromLibrary = async () => {
        try {
            const hasPermission = await ensureGalleryPermission();
            if (!hasPermission) {
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
                allowsMultipleSelection: false,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                await processSelectedAsset(result.assets[0]);
            }
        } catch (error) {
            logData('Ошибка при выборе изображения:', error);
            showError(
                'Ошибка',
                'Не удалось загрузить изображение. Пожалуйста, попробуйте другое фото.',
                [{ text: 'OK', style: 'primary' }]
            );
        }
    };

    const takePhoto = async () => {
        try {
            const hasPermission = await ensureCameraPermission();
            if (!hasPermission) {
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                await processSelectedAsset(result.assets[0]);
            }
        } catch (error) {
            logData('Ошибка при съемке изображения:', error);
            showError(
                'Ошибка',
                'Не удалось сделать снимок. Пожалуйста, попробуйте еще раз.',
                [{ text: 'OK', style: 'primary' }]
            );
        }
    };

    const openPhotoSourcePicker = () => {
        showAlert({
            type: 'confirm',
            title: 'Добавить фото',
            message: 'Выберите источник изображения',
            buttons: [
                {
                    text: 'Камера',
                    style: 'primary',
                    icon: 'photo-camera',
                    closeOnPress: false,
                    onPress: () => {
                        hideAlert();
                        setPendingAction('camera');
                    }
                },
                {
                    text: 'Галерея',
                    style: 'primary',
                    icon: 'photo-library',
                    closeOnPress: false,
                    onPress: () => {
                        hideAlert();
                        setPendingAction('gallery');
                    }
                },
                { text: 'Отмена', style: 'cancel' }
            ],
            autoClose: false,
            showCloseButton: true,
        });
    };

    useEffect(() => {
        if (!pendingAction) return;

        const timer = setTimeout(() => {
            if (pendingAction === 'camera') {
                runAfterAlertClose(takePhoto);
            } else if (pendingAction === 'gallery') {
                runAfterAlertClose(pickFromLibrary);
            }
            setPendingAction(null);
        }, 220);

        return () => clearTimeout(timer);
    }, [pendingAction]);

    return (
        <View style={styles.photoSection} ref={ref}>
            <Text style={styles.label}>Добавить фото *</Text>
            <TouchableOpacity
                style={[
                    styles.photoPickerButton,
                    error ? styles.photoPickerButtonError : null
                ]}
                onPress={openPhotoSourcePicker}
                activeOpacity={0.7}
            >
                {photo ? (
                    <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                ) : (
                    <View style={styles.photoPlaceholder}>
                        <Text style={[
                            styles.photoPlaceholderText,
                            error ? styles.photoPlaceholderTextError : null
                        ]}>
                            Нажмите для выбора фото
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
});

const styles = StyleSheet.create({
    photoSection: {
        marginBottom: normalize(10),
        width: '100%',
    },
    label: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontWeight: '600',
        color: Color.dark,
        opacity: 0.4,
        marginBottom: normalize(6),
        fontFamily: FontFamily.sFProText,
    },
    photoPickerButton: {
        height: normalize(160),
        borderRadius: normalize(8),
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoPickerButtonError: {
        borderColor: '#FF3B30',
        borderWidth: 1,
    },
    photoPreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    photoPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoPlaceholderText: {
        marginTop: normalize(10),
        color: '#999',
        fontSize: normalizeFont(13),
    },
    photoPlaceholderTextError: {
        color: '#FF3B30',
    },
    errorText: {
        color: '#FF3B30',
        fontSize: normalizeFont(FontSize.size_xs),
        marginTop: normalize(5),
        fontFamily: FontFamily.sFProText,
    },
});