import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    SafeAreaView
} from 'react-native';
import { useDispatch } from 'react-redux';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import IconClose from '@shared/ui/Icon/Profile/CloseIcon';
import IconWarehouse from '@shared/ui/Icon/Warehouse/IconWarehouse';
import { MapPinIcon } from '@shared/ui/Icon/DistrictManagement/MapPinIcon';
import { Picker } from '@react-native-picker/picker';
import { fetchAllDistricts } from '@entities/district';

export const AddWarehouseModal = ({ visible, onClose, onSubmit, warehouse, isSubmitting }) => {
    const dispatch = useDispatch();
    
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        districtId: null,
        latitude: '',
        longitude: '',
        maxDeliveryRadius: '30',
        isActive: true
    });
    const [districts, setDistricts] = useState([]);
    const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
    const [errors, setErrors] = useState({});

    // Инициализация формы при открытии модального окна
    useEffect(() => {
        if (visible) {
            if (warehouse) {
                // Режим редактирования
                setFormData({
                    name: warehouse.name || '',
                    address: warehouse.address || '',
                    districtId: warehouse.districtId || null,
                    latitude: warehouse.latitude?.toString() || '',
                    longitude: warehouse.longitude?.toString() || '',
                    maxDeliveryRadius: warehouse.maxDeliveryRadius?.toString() || '30',
                    isActive: warehouse.isActive !== undefined ? warehouse.isActive : true
                });
            } else {
                // Режим создания
                setFormData({
                    name: '',
                    address: '',
                    districtId: null,
                    latitude: '',
                    longitude: '',
                    maxDeliveryRadius: '30',
                    isActive: true
                });
            }
            setErrors({});
            loadDistricts();
        }
    }, [visible, warehouse]);

    // Загрузка списка районов
    const loadDistricts = async () => {
        try {
            setIsLoadingDistricts(true);
            // Используем Redux для загрузки районов
            const response = await dispatch(fetchAllDistricts()).unwrap();
            const districts = response.data || [];
            
            console.log('Загружены районы для склада:', districts.length);
            setDistricts(districts);
        } catch (error) {
            console.error('Ошибка загрузки районов:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить список районов');
        } finally {
            setIsLoadingDistricts(false);
        }
    };

    // Валидация формы
    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Название склада обязательно';
        }

        if (!formData.address.trim()) {
            newErrors.address = 'Адрес склада обязателен';
        }

        if (!formData.districtId) {
            newErrors.districtId = 'Необходимо выбрать район';
        }

        if (formData.latitude && isNaN(parseFloat(formData.latitude))) {
            newErrors.latitude = 'Широта должна быть числом';
        }

        if (formData.longitude && isNaN(parseFloat(formData.longitude))) {
            newErrors.longitude = 'Долгота должна быть числом';
        }

        if (formData.maxDeliveryRadius && (isNaN(parseFloat(formData.maxDeliveryRadius)) || parseFloat(formData.maxDeliveryRadius) <= 0)) {
            newErrors.maxDeliveryRadius = 'Радиус доставки должен быть положительным числом';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Обработка отправки формы
    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        const submitData = {
            ...formData,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
            maxDeliveryRadius: parseFloat(formData.maxDeliveryRadius) || 30
        };

        const success = await onSubmit(submitData);
        if (success) {
            onClose();
        }
    };

    // Обработка изменения полей
    const handleFieldChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Очищаем ошибку для поля при изменении
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Заголовок */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={styles.title}>
                            {warehouse ? 'Редактировать склад' : 'Добавить склад'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <IconClose width={24} height={24} color={Color.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Форма */}
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Название склада */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Название склада *</Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            value={formData.name}
                            onChangeText={(value) => handleFieldChange('name', value)}
                            placeholder="Введите название склада"
                            placeholderTextColor={Color.textSecondary}
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>

                    {/* Адрес склада */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Адрес склада *</Text>
                        <TextInput
                            style={[styles.input, errors.address && styles.inputError]}
                            value={formData.address}
                            onChangeText={(value) => handleFieldChange('address', value)}
                            placeholder="Введите адрес склада"
                            placeholderTextColor={Color.textSecondary}
                            multiline
                            numberOfLines={2}
                        />
                        {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
                    </View>

                    {/* Район */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Район *</Text>
                        {isLoadingDistricts ? (
                            <View style={styles.pickerContainer}>
                                <ActivityIndicator size="small" color={Color.blue2} />
                                <Text style={styles.loadingText}>Загрузка районов...</Text>
                            </View>
                        ) : (
                            <View style={[styles.pickerContainer, errors.districtId && styles.inputError]}>
                                <Picker
                                    selectedValue={formData.districtId}
                                    onValueChange={(value) => handleFieldChange('districtId', value)}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Выберите район" value={null} />
                                    {districts.map((district) => (
                                        <Picker.Item
                                            key={district.id}
                                            label={district.name}
                                            value={district.id}
                                        />
                                    ))}
                                </Picker>
                            </View>
                        )}
                        {errors.districtId && <Text style={styles.errorText}>{errors.districtId}</Text>}
                    </View>

                    {/* Координаты */}
                    <View style={styles.row}>
                        <View style={[styles.fieldContainer, styles.halfWidth]}>
                            <Text style={styles.label}>Широта</Text>
                            <TextInput
                                style={[styles.input, errors.latitude && styles.inputError]}
                                value={formData.latitude}
                                onChangeText={(value) => handleFieldChange('latitude', value)}
                                placeholder="0.000000"
                                placeholderTextColor={Color.textSecondary}
                                keyboardType="numeric"
                            />
                            {errors.latitude && <Text style={styles.errorText}>{errors.latitude}</Text>}
                        </View>
                        <View style={[styles.fieldContainer, styles.halfWidth]}>
                            <Text style={styles.label}>Долгота</Text>
                            <TextInput
                                style={[styles.input, errors.longitude && styles.inputError]}
                                value={formData.longitude}
                                onChangeText={(value) => handleFieldChange('longitude', value)}
                                placeholder="0.000000"
                                placeholderTextColor={Color.textSecondary}
                                keyboardType="numeric"
                            />
                            {errors.longitude && <Text style={styles.errorText}>{errors.longitude}</Text>}
                        </View>
                    </View>

                    {/* Радиус доставки */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Радиус доставки (км)</Text>
                        <TextInput
                            style={[styles.input, errors.maxDeliveryRadius && styles.inputError]}
                            value={formData.maxDeliveryRadius}
                            onChangeText={(value) => handleFieldChange('maxDeliveryRadius', value)}
                            placeholder="30"
                            placeholderTextColor={Color.textSecondary}
                            keyboardType="numeric"
                        />
                        {errors.maxDeliveryRadius && <Text style={styles.errorText}>{errors.maxDeliveryRadius}</Text>}
                    </View>

                    {/* Статус активности */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Статус</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={formData.isActive}
                                onValueChange={(value) => handleFieldChange('isActive', value)}
                                style={styles.picker}
                            >
                                <Picker.Item label="Активен" value={true} />
                                <Picker.Item label="Неактивен" value={false} />
                            </Picker>
                        </View>
                    </View>
                </ScrollView>

                {/* Кнопки действий */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={onClose}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.cancelButtonText}>Отмена</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[styles.saveButton, isSubmitting && styles.disabledButton]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color={Color.colorLightMode} />
                        ) : (
                            <Text style={styles.saveButtonText}>
                                {warehouse ? 'Сохранить' : 'Добавить'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: Color.border,
        backgroundColor: Color.colorLightMode,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: normalizeFont(FontSize.size_lg),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
    },
    closeButton: {
        padding: normalize(8),
    },
    content: {
        flex: 1,
        paddingHorizontal: normalize(20),
    },
    fieldContainer: {
        marginBottom: normalize(16),
    },
    row: {
        flexDirection: 'row',
        gap: normalize(12),
    },
    halfWidth: {
        flex: 1,
    },
    label: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: normalize(6),
    },
    input: {
        borderWidth: 1,
        borderColor: Color.border,
        borderRadius: Border.radius.small,
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(10),
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textPrimary,
        backgroundColor: Color.colorLightMode,
    },
    inputError: {
        borderColor: Color.red,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: Color.border,
        borderRadius: Border.radius.small,
        backgroundColor: Color.colorLightMode,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: normalize(12),
        minHeight: normalize(44),
    },
    picker: {
        flex: 1,
        height: normalize(44),
    },
    loadingText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginLeft: normalize(8),
    },
    errorText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.red,
        marginTop: normalize(4),
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        borderTopWidth: 1,
        borderTopColor: Color.border,
        backgroundColor: Color.colorLightMode,
        gap: normalize(12),
    },
    cancelButton: {
        flex: 1,
        paddingVertical: normalize(12),
        borderRadius: Border.radius.medium,
        borderWidth: 1,
        borderColor: Color.border,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
    },
    saveButton: {
        flex: 1,
        paddingVertical: normalize(12),
        borderRadius: Border.radius.medium,
        backgroundColor: Color.blue2,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: Color.colorLightGray,
    },
    saveButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.colorLightMode,
    },
});

export default AddWarehouseModal;
