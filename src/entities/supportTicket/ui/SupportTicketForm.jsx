import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
    Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import CustomButton from '@shared/ui/Button/CustomButton';
import Icon from 'react-native-vector-icons/MaterialIcons';

/**
 * Компонент формы обращения к разработчику
 */
export const SupportTicketForm = ({ 
    initialSubject = '', 
    initialMessage = '', 
    initialAttachments = [],
    onSubmit, 
    onCancel,
    submitting = false 
}) => {
    const [subject, setSubject] = useState(initialSubject);
    const [message, setMessage] = useState(initialMessage);
    const [attachments, setAttachments] = useState(initialAttachments);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        setSubject(initialSubject);
        setMessage(initialMessage);
        setAttachments(initialAttachments);
    }, [initialSubject, initialMessage, initialAttachments]);

    const validate = () => {
        const newErrors = {};

        if (!subject || subject.trim().length < 3) {
            newErrors.subject = 'Тема должна содержать минимум 3 символа';
        } else if (subject.length > 200) {
            newErrors.subject = 'Тема не должна превышать 200 символов';
        }

        if (!message || message.trim().length < 10) {
            newErrors.message = 'Сообщение должно содержать минимум 10 символов';
        } else if (message.length > 5000) {
            newErrors.message = 'Сообщение не должно превышать 5000 символов';
        }

        if (attachments.length > 5) {
            newErrors.attachments = 'Максимум 5 файлов';
        }

        // Проверка размера файлов
        const totalSize = attachments.reduce((sum, file) => sum + (file.size || 0), 0);
        if (totalSize > 50 * 1024 * 1024) { // 50MB
            newErrors.attachments = 'Общий размер файлов не должен превышать 50MB';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) {
            return;
        }

        onSubmit({
            subject: subject.trim(),
            message: message.trim(),
            attachments,
        });
    };

    const pickImage = async () => {
        if (attachments.length >= 5) {
            Alert.alert('Лимит файлов', 'Максимум 5 файлов');
            return;
        }

        try {
            // Запрашиваем разрешение
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Требуется разрешение', 'Для выбора файла необходимо разрешение на доступ к галерее.');
                return;
            }

            // Открываем галерею
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const newFile = {
                    uri: asset.uri,
                    name: asset.fileName || `image_${Date.now()}.jpg`,
                    type: asset.type || 'image/jpeg',
                    size: asset.fileSize || 0,
                };
                setAttachments([...attachments, newFile]);
                if (errors.attachments) {
                    setErrors(prev => ({ ...prev, attachments: null }));
                }
            }
        } catch (error) {
            console.error('Ошибка при выборе файла:', error);
            Alert.alert('Ошибка', 'Не удалось выбрать файл');
        }
    };

    const removeAttachment = (index) => {
        const newAttachments = attachments.filter((_, i) => i !== index);
        setAttachments(newAttachments);
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>
                Тема обращения <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
                style={[styles.input, errors.subject && styles.inputError]}
                value={subject}
                onChangeText={(text) => {
                    setSubject(text);
                    if (errors.subject) {
                        setErrors(prev => ({ ...prev, subject: null }));
                    }
                }}
                placeholder="Опишите проблему кратко"
                placeholderTextColor={Color.grey7D7D7D}
                maxLength={200}
            />
            {errors.subject && (
                <Text style={styles.errorText}>{errors.subject}</Text>
            )}
            {subject.length > 0 && (
                <Text style={styles.charCount}>{subject.length}/200 символов</Text>
            )}

            <Text style={[styles.label, styles.messageLabel]}>
                Сообщение <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
                style={[styles.messageInput, errors.message && styles.inputError]}
                value={message}
                onChangeText={(text) => {
                    setMessage(text);
                    if (errors.message) {
                        setErrors(prev => ({ ...prev, message: null }));
                    }
                }}
                placeholder="Опишите проблему подробно. Чем больше деталей, тем быстрее мы сможем помочь..."
                placeholderTextColor={Color.grey7D7D7D}
                multiline
                numberOfLines={8}
                maxLength={5000}
                textAlignVertical="top"
            />
            {errors.message && (
                <Text style={styles.errorText}>{errors.message}</Text>
            )}
            {message.length > 0 && (
                <Text style={styles.charCount}>{message.length}/5000 символов</Text>
            )}

            <Text style={[styles.label, styles.attachmentsLabel]}>
                Вложения (необязательно)
            </Text>
            <Text style={styles.hint}>
                Вы можете прикрепить скриншоты или логи. Максимум 5 файлов, каждый до 10MB.
            </Text>

            {attachments.length > 0 && (
                <View style={styles.attachmentsContainer}>
                    {attachments.map((file, index) => (
                        <View key={index} style={styles.attachmentItem}>
                            <Image
                                source={{ uri: file.uri }}
                                style={styles.attachmentImage}
                                resizeMode="cover"
                            />
                            <View style={styles.attachmentInfo}>
                                <Text style={styles.attachmentName} numberOfLines={1}>
                                    {file.name}
                                </Text>
                                {file.size > 0 && (
                                    <Text style={styles.attachmentSize}>
                                        {formatFileSize(file.size)}
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity
                                onPress={() => removeAttachment(index)}
                                style={styles.removeButton}
                                activeOpacity={0.7}
                            >
                                <Icon name="close" size={20} color={Color.error || Color.red || '#FF3B30'} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {attachments.length < 5 && (
                <TouchableOpacity
                    style={styles.addAttachmentButton}
                    onPress={pickImage}
                    activeOpacity={0.7}
                >
                    <Icon name="add-photo-alternate" size={24} color={Color.blue2} />
                    <Text style={styles.addAttachmentText}>Добавить файл</Text>
                </TouchableOpacity>
            )}

            {errors.attachments && (
                <Text style={styles.errorText}>{errors.attachments}</Text>
            )}

            <View style={styles.buttonsContainer}>
                {onCancel && (
                    <CustomButton
                        title="Отмена"
                        onPress={onCancel}
                        outlined={true}
                        color={Color.grey7D7D7D}
                        style={styles.cancelButton}
                    />
                )}
                <CustomButton
                    title={submitting ? "Отправка..." : "Отправить обращение"}
                    onPress={handleSubmit}
                    outlined={false}
                    color={Color.blue2}
                    activeColor="#FFFFFF"
                    disabled={submitting}
                    style={styles.submitButton}
                />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: normalize(20),
    },
    label: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: Color.colorGray_100,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(8),
    },
    required: {
        color: Color.error || Color.red || '#FF3B30',
    },
    messageLabel: {
        marginTop: normalize(16),
    },
    attachmentsLabel: {
        marginTop: normalize(16),
    },
    hint: {
        fontSize: normalizeFont(13),
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(12),
        lineHeight: normalizeFont(18),
    },
    input: {
        borderWidth: 1,
        borderColor: Color.colorGainsboro,
        borderRadius: normalize(12),
        padding: normalize(12),
        fontSize: normalizeFont(15),
        color: Color.colorGray_100,
        fontFamily: FontFamily.sFProText,
        backgroundColor: '#fff',
    },
    inputError: {
        borderColor: Color.error || Color.red || '#FF3B30',
    },
    messageInput: {
        borderWidth: 1,
        borderColor: Color.colorGainsboro,
        borderRadius: normalize(12),
        padding: normalize(12),
        fontSize: normalizeFont(15),
        color: Color.colorGray_100,
        fontFamily: FontFamily.sFProText,
        minHeight: normalize(150),
        backgroundColor: '#fff',
    },
    errorText: {
        fontSize: normalizeFont(13),
        color: Color.error || Color.red || '#FF3B30',
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(4),
    },
    charCount: {
        fontSize: normalizeFont(12),
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(4),
        textAlign: 'right',
    },
    attachmentsContainer: {
        marginTop: normalize(12),
        gap: normalize(12),
    },
    attachmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Color.colorLavender || '#f5f5f5',
        borderRadius: normalize(8),
        padding: normalize(12),
    },
    attachmentImage: {
        width: normalize(60),
        height: normalize(60),
        borderRadius: normalize(8),
        marginRight: normalize(12),
    },
    attachmentInfo: {
        flex: 1,
    },
    attachmentName: {
        fontSize: normalizeFont(14),
        color: Color.colorGray_100,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(4),
    },
    attachmentSize: {
        fontSize: normalizeFont(12),
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProText,
    },
    removeButton: {
        padding: normalize(4),
    },
    addAttachmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Color.blue2,
        borderStyle: 'dashed',
        borderRadius: normalize(12),
        padding: normalize(16),
        marginTop: normalize(12),
        gap: normalize(8),
    },
    addAttachmentText: {
        fontSize: normalizeFont(15),
        color: Color.blue2,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    buttonsContainer: {
        flexDirection: 'row',
        gap: normalize(12),
        marginTop: normalize(24),
        marginBottom: normalize(20),
    },
    cancelButton: {
        flex: 1,
    },
    submitButton: {
        flex: 1,
    },
});


