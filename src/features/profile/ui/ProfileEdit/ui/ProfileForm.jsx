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

    const handleOptimizedScroll = useCallback((event) => {
        if (onScroll) {
            onScroll(event);
        }
    }, [onScroll]);

    useEffect(() => {
        renderCountRef.current += 1;
        const isInitialRender = renderCountRef.current <= 2;

        if (Object.keys(initialValues).length > 0) {
            if (isInitialRender) {
                logData('ProfileForm: Установка начальных значений формы', { userType });
            }
            setFormValues(initialValues);
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
    }, []);

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
    }, [formValues, fieldsConfig]);

    const handleSave = useCallback(() => {
        if (validateForm()) {
            logData('ProfileForm: Форма валидна, отправка данных', { formValues });
            onSave(formValues);
        } else {
            logData('ProfileForm: Ошибка валидации формы', { formErrors });
        }
    }, [validateForm, formValues, onSave]);

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
                {sortedFields.map(field => (
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
                        onDropdownToggle={setHasOpenDropdown}
                    />
                ))}
            </View>

            <ProfileSaveButton
                onPress={handleSave}
                isSaving={isSaving}
            />
        </ScrollView>
    );
};

const ProfileForm = React.memo(ProfileFormComponent, (prevProps, nextProps) => {
    return (
        prevProps.userType === nextProps.userType &&
        prevProps.isSaving === nextProps.isSaving &&
        JSON.stringify(prevProps.initialValues) === JSON.stringify(nextProps.initialValues) &&
        JSON.stringify(prevProps.editableFields) === JSON.stringify(nextProps.editableFields) &&
        prevProps.onSave === nextProps.onSave &&
        prevProps.onScroll === nextProps.onScroll &&
        prevProps.toggleFieldEditable === nextProps.toggleFieldEditable
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