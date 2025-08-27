import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Switch
} from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { ReusableModal } from '@shared/ui/Modal/ui/ReusableModal';

// Функция для генерации slug из имени
const generateSlug = (name) => {
    return name
        .toLowerCase()
        .replace(/\s+/g, '-') // Заменяем пробелы на дефисы
        .replace(/[^\wа-яё-]/gi, '') // Удаляем все кроме букв, цифр и дефисов
        .replace(/^-+|-+$/g, '') // Удаляем дефисы в начале и конце
        .replace(/-+/g, '-'); // Заменяем множественные дефисы на один
};

export const AddCategoryModal = ({ visible, onClose, onSubmit, category, isSubmitting }) => {
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
    });
    const [errors, setErrors] = useState({});
    const [localSubmitting, setLocalSubmitting] = useState(false);
    const [autoGenerateSlug, setAutoGenerateSlug] = useState(true);

    // Обновляем данные формы при изменении category
    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name || '',
                slug: category.slug || '',
                description: category.description || '',
            });
            // Если у категории уже есть slug, отключаем автогенерацию
            setAutoGenerateSlug(!category.slug);
        } else {
            setFormData({
                name: '',
                slug: '',
                description: '',
            });
            setAutoGenerateSlug(true);
        }
        setErrors({});
    }, [category, visible]);

    // Автоматически обновляем slug при изменении имени, если включена автогенерация
    useEffect(() => {
        if (autoGenerateSlug && formData.name) {
            const generatedSlug = generateSlug(formData.name);
            setFormData(prev => ({
                ...prev,
                slug: generatedSlug
            }));
        }
    }, [formData.name, autoGenerateSlug]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Введите название категории';
        }

        // Slug будет автоматически сгенерирован на сервере, если поле пустое

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm() || isSubmitting || localSubmitting) {
            return;
        }

        setLocalSubmitting(true);
        try {
            // Генерируем slug, если его нет
            let dataToSubmit = {...formData};
            if (!dataToSubmit.slug.trim()) {
                dataToSubmit.slug = generateSlug(dataToSubmit.name);
            }

            // Вызываем onSubmit и ждем результат
            const success = await onSubmit(dataToSubmit);

            if (success) {
                // Сбрасываем форму только при успешном сохранении
                setFormData({
                    name: '',
                    slug: '',
                    description: '',
                });
                setAutoGenerateSlug(true);
            }
        } catch (error) {
            console.error('Error in form submission:', error);
            Alert.alert('Ошибка', 'Произошла ошибка при сохранении категории');
        } finally {
            setLocalSubmitting(false);
        }
    };

    // Обработчик изменения полей формы
    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Сбрасываем ошибку поля при изменении
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    // Обработчик включения/выключения автогенерации slug
    const toggleAutoGenerate = () => {
        setAutoGenerateSlug(!autoGenerateSlug);

        // Если включаем автогенерацию, сразу обновляем slug
        if (!autoGenerateSlug && formData.name) {
            setFormData(prev => ({
                ...prev,
                slug: generateSlug(formData.name)
            }));
        }
    };

    const isProcessing = isSubmitting || localSubmitting;

    return (
        <ReusableModal
            visible={visible}
            onClose={isProcessing ? null : onClose}
            title={category ? "Редактирование категории" : "Добавление категории"}
            height={70}
        >
            <View style={styles.container}>
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Название категории *</Text>
                    <TextInput
                        style={[styles.input, errors.name && styles.inputError]}
                        value={formData.name}
                        onChangeText={(text) => handleChange('name', text)}
                        placeholder="Введите название"
                        editable={!isProcessing}
                    />
                    {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
                </View>

                <View style={styles.formGroup}>
                    <View style={styles.slugHeader}>
                        <Text style={styles.label}>Slug категории</Text>
                        <View style={styles.autoGenerateContainer}>
                            <Text style={styles.autoGenerateText}>Авто</Text>
                            <Switch
                                value={autoGenerateSlug}
                                onValueChange={toggleAutoGenerate}
                                trackColor={{ false: '#d3d3d3', true: '#c0d5ff' }}
                                thumbColor={autoGenerateSlug ? Color.blue2 : '#f4f3f4'}
                                disabled={isProcessing}
                            />
                        </View>
                    </View>
                    <Text style={styles.helperText}>
                        URL-идентификатор для категории (например: "ice-cream")
                    </Text>
                    <TextInput
                        style={[styles.input, errors.slug && styles.inputError]}
                        value={formData.slug}
                        onChangeText={(text) => handleChange('slug', text)}
                        placeholder="Введите slug или он будет создан автоматически"
                        editable={!isProcessing && !autoGenerateSlug}
                    />
                    {errors.slug ? <Text style={styles.errorText}>{errors.slug}</Text> : null}
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Описание</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={formData.description}
                        onChangeText={(text) => handleChange('description', text)}
                        placeholder="Введите описание (необязательно)"
                        multiline
                        numberOfLines={3}
                        editable={!isProcessing}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, isProcessing && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator size="small" color={Color.colorLightMode} />
                    ) : (
                        <Text style={styles.submitButtonText}>
                            {category ? 'Сохранить изменения' : 'Добавить категорию'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </ReusableModal>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: normalize(16),
    },
    formGroup: {
        marginBottom: normalize(16),
    },
    slugHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    autoGenerateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    autoGenerateText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginRight: normalize(8),
    },
    label: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        color: Color.textPrimary,
        marginBottom: normalize(4),
    },
    helperText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginBottom: normalize(4),
    },
    input: {
        backgroundColor: Color.colorLightMode,
        borderWidth: 1,
        borderColor: Color.border,
        borderRadius: Border.radius.small,
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(8),
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textPrimary,
    },
    inputError: {
        borderColor: Color.red,
    },
    textArea: {
        minHeight: normalize(80),
        textAlignVertical: 'top',
    },
    errorText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.red,
        marginTop: normalize(4),
    },
    submitButton: {
        backgroundColor: Color.blue2,
        borderRadius: Border.radius.small,
        paddingVertical: normalize(12),
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: normalize(16),
    },
    disabledButton: {
        backgroundColor: Color.gray,
    },
    submitButtonText: {
        color: Color.colorLightMode,
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
});