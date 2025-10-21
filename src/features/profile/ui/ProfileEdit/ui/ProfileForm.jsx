import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { DynamicFormField } from './DynamicFormField';
import { ProfileSaveButton } from './ProfileSaveButton';
import { normalize } from '@shared/lib/normalize';
import { logData } from '@shared/lib/logger';
import { roleFieldsConfig } from "@features/profile";

const ProfileFormComponent = ({
                                  userType = 'client',
                                  initialValues = {},
                                  onSave,
                                  isSaving,
                                  extraData = {},
                                  scrollViewRef,
                                  onScroll,
                                  editableFields = {},
                                  toggleFieldEditable,
                              }) => {
    const fieldsConfig = useMemo(() =>
            roleFieldsConfig[userType] || roleFieldsConfig.client,
        [userType]);

    const [formValues, setFormValues] = useState({});
    const [formErrors, setFormErrors] = useState({});
    const [hasOpenDropdown, setHasOpenDropdown] = useState(false); // Отслеживаем открытые dropdown
    const renderCountRef = useRef(0);
    const isFormInitializedRef = useRef(false); // Флаг для отслеживания инициализации формы

    const handleOptimizedScroll = useCallback((event) => {
        if (onScroll) {
            onScroll(event);
        }
    }, [onScroll]);

    // Очищаем состояние при изменении userType
    useEffect(() => {
        isFormInitializedRef.current = false;
        renderCountRef.current = 0;
        setFormValues({});
        setFormErrors({});
    }, [userType]);

    useEffect(() => {
        renderCountRef.current += 1;
        const isInitialRender = renderCountRef.current <= 2;

        if (Object.keys(initialValues).length > 0) {
            // Убеждаемся, что поле gender имеет значение по умолчанию
            const valuesWithDefaults = {
                ...initialValues,
                gender: initialValues.gender || 'MALE'
            };

            // Инициализируем форму начальными значениями только при первом рендере
            // или если форма еще не была инициализирована
            if (isInitialRender || !isFormInitializedRef.current) {
                if (__DEV__) {
                    console.log('ProfileForm: Установка начальных значений формы', {
                        userType,
                        gender: valuesWithDefaults.gender,
                        isInitialRender,
                        isFormInitialized: isFormInitializedRef.current
                    });
                }

                setFormValues(valuesWithDefaults);
                isFormInitializedRef.current = true; // Помечаем форму как инициализированную

                // Для отладки gender поля
                if (__DEV__ && valuesWithDefaults.gender) {
                    console.log('ProfileForm: gender set in formValues', {
                        gender: valuesWithDefaults.gender
                    });
                }
            } else {
                setFormValues(prevValues => {
                    const updatedValues = { ...prevValues };
                    let hasChanges = false;

                    // Обновляем только те поля, которые отсутствуют в текущем состоянии формы
                    Object.keys(valuesWithDefaults).forEach(key => {
                        if (updatedValues[key] === undefined || updatedValues[key] === null) {
                            if (key === 'districts' && Array.isArray(valuesWithDefaults[key])) {
                                updatedValues[key] = [...valuesWithDefaults[key]];
                                hasChanges = true;
                            } else if (key === 'warehouseId' && valuesWithDefaults[key] !== null) {
                                updatedValues[key] = valuesWithDefaults[key];
                                hasChanges = true;
                            } else if (key !== 'districts' && key !== 'warehouseId') {
                                updatedValues[key] = valuesWithDefaults[key];
                                hasChanges = true;
                            }
                        }
                    });

                    // Всегда обновляем gender если он изменился на валидное значение
                    if (valuesWithDefaults.gender && valuesWithDefaults.gender !== updatedValues.gender) {
                        updatedValues.gender = valuesWithDefaults.gender;
                        hasChanges = true;
                    }

                    return hasChanges ? updatedValues : prevValues;
                });
            }
        }
    }, [initialValues, userType]);

    const handleFieldChange = useCallback((fieldId, value) => {

        setFormValues(prev => ({
            ...prev,
            [fieldId]: value
        }));

        setFormErrors(prev => ({
            ...prev,
            [fieldId]: null
        }));
    }, [userType]);

    const validateForm = useCallback(() => {
        const errors = {};
        let isValid = true;

        Object.keys(fieldsConfig).forEach(fieldKey => {
            const field = fieldsConfig[fieldKey];
            const value = formValues[fieldKey] || '';

            if (field.required && (!value || (Array.isArray(value) && value.length === 0))) {
                errors[fieldKey] = 'Это поле обязательно для заполнения';
                isValid = false;
            }
            else if (field.validation && value && !field.validation(value)) {
                errors[fieldKey] = field.errorMessage || 'Неверное значение';
                isValid = false;
            }
        });

        setFormErrors(errors);


        return isValid;
    }, [formValues, fieldsConfig, userType]);

    const handleSave = useCallback(() => {
        if (validateForm()) {
            logData('ProfileForm: Форма валидна, отправка данных', {
                formValues,
                gender: formValues.gender,
                formValuesKeys: Object.keys(formValues)
            });


            onSave(formValues);
        } else {
            logData('ProfileForm: Ошибка валидации формы', {
                formErrors,
                formValues,
                gender: formValues.gender
            });

        }
    }, [validateForm, formValues, onSave, userType]);

    const sortedFields = useMemo(() => {
        return Object.keys(fieldsConfig)
            .map(key => ({ id: key, ...fieldsConfig[key] }))
            .sort((a, b) => (a.order || 999) - (b.order || 999));
    }, [fieldsConfig]);

    const getExtraOptions = useCallback((fieldId) => {
        return extraData[fieldId] || [];
    }, [extraData]);

    return (
        <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[
                styles.contentContainer,
                hasOpenDropdown && styles.contentContainerExpanded
            ]}
            keyboardShouldPersistTaps="handled"
            onScroll={handleOptimizedScroll}
            scrollEventThrottle={32}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
        >
            <View style={styles.formContainer}>
                {sortedFields.map(field => {
                    return (
                        <DynamicFormField
                            key={field.id}
                            field={field}
                            value={formValues[field.id]}
                            onChange={handleFieldChange}
                            editable={editableFields[field.id] || false}
                            setEditable={(isEditable) => toggleFieldEditable(field.id, isEditable)}
                            extraOptions={getExtraOptions(field.id)}
                            error={formErrors[field.id]}
                            scrollViewRef={scrollViewRef}
                        />
                    );
                })}
            </View>

            <ProfileSaveButton
                onPress={handleSave}
                isSaving={isSaving}
            />
        </ScrollView>
    );
};

const ProfileForm = React.memo(ProfileFormComponent, (prevProps, nextProps) => {
    // Простая оптимизация - сравниваем основные пропсы
    return (
        prevProps.userType === nextProps.userType &&
        prevProps.isSaving === nextProps.isSaving &&
        prevProps.onSave === nextProps.onSave &&
        prevProps.onScroll === nextProps.onScroll &&
        prevProps.toggleFieldEditable === nextProps.toggleFieldEditable &&
        prevProps.scrollViewRef === nextProps.scrollViewRef &&
        JSON.stringify(prevProps.initialValues) === JSON.stringify(nextProps.initialValues) &&
        JSON.stringify(prevProps.editableFields) === JSON.stringify(nextProps.editableFields) &&
        JSON.stringify(prevProps.extraData) === JSON.stringify(nextProps.extraData)
    );
});

const styles = StyleSheet.create({
    contentContainer: {
        paddingBottom: normalize(90),
    },
    contentContainerExpanded: {
        paddingBottom: normalize(300),
    },
    formContainer: {
        marginTop: normalize(20),
    },
});

export { ProfileForm };
export default ProfileForm;