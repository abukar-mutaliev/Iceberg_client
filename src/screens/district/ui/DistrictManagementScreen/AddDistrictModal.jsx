import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { ReusableModal } from '@shared/ui/Modal/ui/ReusableModal';

export const AddDistrictModal = ({ visible, onClose, onSubmit, district, isSubmitting }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });
    const [errors, setErrors] = useState({});
    const [localSubmitting, setLocalSubmitting] = useState(false);

    // Обновляем данные формы при изменении district
    useEffect(() => {
        if (district) {
            setFormData({
                name: district.name || '',
                description: district.description || '',
            });
        } else {
            setFormData({
                name: '',
                description: '',
            });
        }
        setErrors({});
    }, [district, visible]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Введите название района';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm() || isSubmitting || localSubmitting) {
            return;
        }

        setLocalSubmitting(true);
        try {
            const dataToSubmit = {...formData};

            // Вызываем onSubmit и ждем результат
            const success = await onSubmit(dataToSubmit);

            if (success) {
                // Сбрасываем форму только при успешном сохранении
                setFormData({
                    name: '',
                    description: '',
                });
            }
        } catch (error) {
            console.error('Error in form submission:', error);
            Alert.alert('Ошибка', 'Произошла ошибка при сохранении района');
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

    const isProcessing = isSubmitting || localSubmitting;

    return (
        <ReusableModal
            visible={visible}
            onClose={isProcessing ? null : onClose}
            title={district ? "Редактирование района" : "Добавление района"}
            height={60}
        >
            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContentContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.container}>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Название района *</Text>
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
                                {district ? 'Сохранить изменения' : 'Добавить район'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ReusableModal>
    );
};

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: normalize(100),
    },
    container: {
        padding: normalize(16),
    },
    formGroup: {
        marginBottom: normalize(16),
    },
    label: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        color: Color.textPrimary,
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