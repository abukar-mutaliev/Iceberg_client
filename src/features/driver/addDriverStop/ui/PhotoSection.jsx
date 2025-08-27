import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { logData } from '@shared/lib/logger';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import {BackButton} from "@shared/ui/Button/BackButton";

export const PhotoSection = React.forwardRef(({ photo, setPhoto, error }, ref) => {
    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Требуется разрешение', 'Для выбора фото необходимо разрешение на доступ к галерее.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
                allowsMultipleSelection: false,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedAsset = result.assets[0];
                
                if (!selectedAsset.uri) {
                    throw new Error('Не удалось получить URI изображения');
                }
                
                logData('Выбрано изображение (оригинал)', {
                    uri: selectedAsset.uri,
                    fileSize: selectedAsset.fileSize,
                    width: selectedAsset.width,
                    height: selectedAsset.height,
                    mimeType: selectedAsset.mimeType
                });
                
                // Определяем нужно ли сжимать изображение
                const MAX_FILE_SIZE = 700 * 1024; // 700KB
                
                if (selectedAsset.fileSize && selectedAsset.fileSize > MAX_FILE_SIZE) {
                    try {
                        // Сжимаем изображение с помощью expo-image-manipulator
                        const compressedImage = await ImageManipulator.manipulateAsync(
                            selectedAsset.uri,
                            [{ resize: { width: 800 } }],
                            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                        );
                        
                        // Создаем новый объект asset с обновленными данными
                        const optimizedAsset = {
                            uri: compressedImage.uri,
                            width: compressedImage.width,
                            height: compressedImage.height,
                            mimeType: 'image/jpeg',
                            fileSize: selectedAsset.fileSize / 2, // приблизительный размер
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
                } else {
                    // Если размер нормальный, используем как есть
                    setPhoto(selectedAsset);
                }
            }
        } catch (error) {
            logData('Ошибка при выборе изображения:', error);
            Alert.alert(
                'Ошибка',
                'Не удалось загрузить изображение. Пожалуйста, попробуйте другое фото.',
                [{ text: 'OK' }]
            );
        }
    };

    return (
        <View style={styles.photoSection} ref={ref}>
            <Text style={styles.label}>Добавить фото *</Text>
            <TouchableOpacity
                style={[
                    styles.photoPickerButton,
                    error ? styles.photoPickerButtonError : null
                ]}
                onPress={pickImage}
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