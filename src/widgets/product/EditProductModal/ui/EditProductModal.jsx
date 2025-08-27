import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import { useSelector } from 'react-redux';
import { MultipleImageUpload } from '@entities/product/ui/MultipleImageUpload';
import { CategoryPicker } from "@widgets/product/EditProductModal/ui/CategoryPicker";
import { SupplierPicker } from './ui/SupplierPicker';
import { selectUser } from '@entities/auth/model/selectors';
import { uploadProductWithImages, updateProductWithImages } from '@shared/api/uploadHelpers';
import { ReusableModal } from "@shared/ui/Modal/ui/ReusableModal";

// Функция для извлечения ID категории из разных форматов
const extractCategoryId = (categoryValue) => {
    if (typeof categoryValue === 'number') {
        return categoryValue;
    }

    if (typeof categoryValue === 'string') {
        if (!isNaN(categoryValue)) {
            const numValue = parseInt(categoryValue, 10);
            return numValue;
        }
        return categoryValue;
    }

    if (categoryValue && typeof categoryValue === 'object') {
        if ('id' in categoryValue) {
            return categoryValue.id;
        }
    }

    if (Array.isArray(categoryValue) && categoryValue.length > 0) {
        const firstCategory = categoryValue[0];
        if (firstCategory && typeof firstCategory === 'object' && 'id' in firstCategory) {
            return firstCategory.id;
        } else if (typeof firstCategory === 'number' || typeof firstCategory === 'string') {
            return firstCategory;
        }
    }

    return categoryValue;
};

export const EditProductModal = ({ visible, onClose, product, onSave }) => {
    // Получаем текущего пользователя из редакса авторизации
    const user = useSelector(selectUser);

    // Определяем, может ли пользователь менять поставщика
    const canChangeSupplier = user && (user.role === 'ADMIN' || user.role === 'EMPLOYEE');

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        weight: '',
        price: '',
        discount: '',
        stockQuantity: '',
        description: '',
        images: [],
        supplierId: '',
        originalImages: []
    });

    const [errors, setErrors] = useState({
        name: '',
        category: '',
        weight: '',
        price: '',
        discount: '',
        stockQuantity: '',
        description: '',
        images: '',
        supplierId: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [removedImages, setRemovedImages] = useState([]);

    useEffect(() => {
        if (product) {
            // Извлекаем ID категории из продукта
            const categoryId = extractCategoryId(product.category);

            console.log('Подготовка данных для редактирования:', {
                categoryValue: product.category,
                categoryId,
                productName: product.name,
                supplierId: product.supplierId || (product.supplier && product.supplier.id)
            });
            // Подготавливаем массив изображений
            let imagesList = [];
            if (product.images && Array.isArray(product.images) && product.images.length > 0) {
                imagesList = product.images.map(img =>
                    typeof img === 'string' ? img : (img.uri || '')
                ).filter(Boolean);
            } else if (product.image) {
                const imgUri = typeof product.image === 'string'
                    ? product.image
                    : (product.image.uri || '');

                if (imgUri) {
                    imagesList = [imgUri];
                }
            }

            // Правильное получение ID поставщика из объекта product
            let supplierId = '';
            if (product.supplierId) {
                // Если это прямое значение supplierId
                supplierId = product.supplierId.toString();
            } else if (product.supplier && product.supplier.id) {
                // Если поставщик представлен как объект
                supplierId = product.supplier.id.toString();
            }

            console.log('Инициализация EditProductModal с данными поставщика:', {
                productSupplierId: product.supplierId,
                extractedSupplierId: supplierId
            });

            setFormData({
                name: product.name || '',
                category: categoryId || '',
                weight: product.weight ? product.weight.toString() : '',
                price: product.price ? product.price.toString() : '',
                discount: product.discount ? product.discount.toString() : '',
                stockQuantity: product.stockQuantity ? product.stockQuantity.toString() : '',
                description: product.description || '',
                images: imagesList,
                originalImages: [...imagesList], // Сохраняем копию для отслеживания удаленных
                supplierId: supplierId
            });

            // Сбрасываем список удаленных изображений
            setRemovedImages([]);
        }
    }, [product]);

    // Обработчик изменения данных формы
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

    // Обработчик изменения категории
    const handleCategoryChange = (categoryId) => {
        console.log('Изменена категория в EditProductModal. Новый ID:', categoryId, 'Тип:', typeof categoryId);
        console.log('Предыдущая категория:', formData.category, 'Тип:', typeof formData.category);

        // Сохраняем категорию в состоянии
        setFormData(prev => {
            const newState = {
                ...prev,
                category: categoryId
            };
            console.log('Новое состояние категории:', newState.category, 'Тип:', typeof newState.category);
            return newState;
        });

        // Сбрасываем ошибку
        setErrors(prev => ({ ...prev, category: '' }));
    };


    // Обработчик изменения поставщика
    const handleSupplierChange = (supplierId) => {
        console.log('Изменен поставщик:', supplierId);
        setFormData(prev => ({
            ...prev,
            supplierId: supplierId
        }));
        setErrors(prev => ({ ...prev, supplierId: '' }));
    };

    // Обработчик изменения изображений
    const handleImagesChange = (newImages) => {
        // Определяем, какие изображения были удалены
        const deletedImages = formData.originalImages.filter(
            originalImg => !newImages.includes(originalImg)
        );

        // Добавляем удаленные изображения в список для отправки на сервер
        setRemovedImages([...removedImages, ...deletedImages]);

        setFormData(prev => ({
            ...prev,
            images: newImages
        }));

        setErrors(prev => ({ ...prev, images: '' }));
    };

    const validateForm = () => {
        let isValid = true;
        const newErrors = { ...errors };

        if (!formData.name || !formData.name.trim()) {
            newErrors.name = 'Введите название товара';
            isValid = false;
        }

        if (!formData.category) {
            newErrors.category = 'Выберите категорию товара';
            isValid = false;
        }

        if (!formData.price) {
            newErrors.price = 'Введите цену товара';
            isValid = false;
        } else if (typeof formData.price === 'string') {
            if (!formData.price.trim()) {
                newErrors.price = 'Введите цену товара';
                isValid = false;
            } else if (isNaN(parseFloat(formData.price.replace(/[^0-9,.]/g, '')))) {
                newErrors.price = 'Цена должна быть числом';
                isValid = false;
            }
        } else if (typeof formData.price !== 'number') {
            newErrors.price = 'Некорректный формат цены';
            isValid = false;
        }

        if (formData.weight) {
            if (typeof formData.weight === 'string') {
                if (formData.weight.trim() && isNaN(parseFloat(formData.weight.replace(/[^0-9,.]/g, '')))) {
                    newErrors.weight = 'Вес должен быть числом';
                    isValid = false;
                }
            } else if (typeof formData.weight !== 'number' && formData.weight !== null) {
                newErrors.weight = 'Некорректный формат веса';
                isValid = false;
            }
        }

        if (!formData.stockQuantity) {
            newErrors.stockQuantity = 'Введите количество на складе';
            isValid = false;
        }

        if (formData.discount) {
            if (typeof formData.discount === 'string') {
                if (formData.discount.trim() && isNaN(parseFloat(formData.discount.replace(/[^0-9,.]/g, '')))) {
                    newErrors.discount = 'Скидка должна быть числом';
                    isValid = false;
                }
            } else if (typeof formData.discount !== 'number' && formData.discount !== null) {
                newErrors.discount = 'Некорректный формат скидки';
                isValid = false;
            }
        }

        if (!formData.images || formData.images.length === 0) {
            newErrors.images = 'Добавьте хотя бы одно изображение товара';
            isValid = false;
        }

        // Валидация поставщика только для админов и сотрудников
        if (canChangeSupplier && !formData.supplierId) {
            newErrors.supplierId = 'Выберите поставщика';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };


// В функции handleSubmit добавим дополнительную диагностику
    const handleSubmit = async () => {
        if (!validateForm() || isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Печатаем все данные формы перед отправкой
            console.log('Данные формы перед отправкой:', {
                name: formData.name,
                category: formData.category,
                categoryType: typeof formData.category,
                price: formData.price,
                priceType: typeof formData.price,
                stockQuantity: formData.stockQuantity,
                stockQuantityType: typeof formData.stockQuantity,
                weight: formData.weight,
                weightType: typeof formData.weight,
                discount: formData.discount,
                discountType: typeof formData.discount,
                description: formData.description,
                descriptionType: typeof formData.description,
                supplierId: formData.supplierId,
                supplierIdType: typeof formData.supplierId,
                imagesCount: formData.images.length,
                removedImagesCount: removedImages.length
            });

            // Преобразуем данные формы для отправки
            const productData = {
                name: formData.name,
                // ВАЖНО: устанавливаем категорию как строку или число в зависимости от формата
                category: formData.category !== null ?
                    (typeof formData.category === 'number' ?
                        formData.category :
                        String(formData.category)) :
                    null,
                price: formData.price,
                stockQuantity: formData.stockQuantity,
                weight: formData.weight || null,
                discount: formData.discount || null,
                description: formData.description || '',
                supplierId: formData.supplierId,
            };

            console.log('Обработанные данные для API:', {
                category: productData.category,
                categoryType: typeof productData.category
            });

            let result;

            if (product && product.id) {
                // Обновляем существующий продукт
                result = await updateProductWithImages({
                    productId: product.id,
                    formData: productData,
                    images: formData.images,
                    removeImages: removedImages
                });
            } else {
                // Создаем новый продукт
                result = await uploadProductWithImages({
                    formData: productData,
                    images: formData.images
                });
            }

            console.log('Результат операции:', result);

            // Обработка успешного ответа
            if (result.status === 'success') {
                Alert.alert(
                    "Успешно",
                    product && product.id
                        ? "Товар успешно обновлен"
                        : "Товар успешно добавлен"
                );

                if (onSave && typeof onSave === 'function') {
                    onSave(result.data.product);
                }

                onClose();
            } else {
                // Обработка ошибки
                let errorMessage = result.message || "Произошла ошибка при сохранении товара";

                if (result.networkError) {
                    errorMessage = "Не удалось подключиться к серверу. Проверьте соединение с интернетом.";
                }

                Alert.alert("Ошибка", errorMessage);
            }
        } catch (error) {
            console.error('Ошибка при отправке формы:', error);

            const errorMessage = error.message || "Произошла ошибка при сохранении данных";
            Alert.alert("Ошибка", errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderContent = () => (
        <View style={styles.formContainer}>
            {/* Блок загрузки фото и основной информации */}
            <View style={styles.formHeader}>
                <View style={styles.leftColumn}>
                    {/* Загрузка фото - используем MultipleImageUpload */}
                    <MultipleImageUpload
                        photos={formData.images}
                        setPhotos={handleImagesChange}
                        error={errors.images}
                        maxImages={5}
                    />
                </View>

                <View style={styles.rightColumn}>
                    {/* Название товара */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Название товара *</Text>
                        <TextInput
                            style={[styles.input, errors.name ? styles.inputError : null]}
                            value={formData.name}
                            onChangeText={(text) => handleChange('name', text)}
                            placeholder="Введите название"
                        />
                        <View style={[styles.inputUnderline, errors.name ? styles.underlineError : null]} />
                        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
                    </View>

                    {/* Выпадающий список категорий */}
                    <CategoryPicker
                        selectedCategory={formData.category}
                        onSelectCategory={handleCategoryChange}
                        error={errors.category}
                    />

                    {/* Поле веса товара */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Вес товара (г)</Text>
                        <TextInput
                            style={[styles.input, errors.weight ? styles.inputError : null]}
                            value={formData.weight}
                            onChangeText={(text) => handleChange('weight', text)}
                            placeholder="Введите вес"
                            keyboardType="numeric"
                        />
                        <View style={[styles.inputUnderline, errors.weight ? styles.underlineError : null]} />
                        {errors.weight ? <Text style={styles.errorText}>{errors.weight}</Text> : null}
                    </View>
                </View>
            </View>

            {/* Поле выбора поставщика (только для админов и сотрудников) */}
            {canChangeSupplier && (
                <View style={styles.inputGroup}>
                    <SupplierPicker
                        selectedSupplier={formData.supplierId}
                        onSelectSupplier={handleSupplierChange}
                        error={errors.supplierId}
                    />
                </View>
            )}

            {/* Ряд для скидки и цены */}
            <View style={styles.inputsRow}>
                <View style={styles.inputContainerHalf}>
                    <Text style={styles.label}>Введите скидку</Text>
                    <TextInput
                        style={[styles.input, errors.discount ? styles.inputError : null]}
                        value={formData.discount}
                        onChangeText={(text) => handleChange('discount', text)}
                        placeholder="Скидка (%)"
                        keyboardType="numeric"
                    />
                    <View style={[styles.inputUnderline, errors.discount ? styles.underlineError : null]} />
                    {errors.discount ? <Text style={styles.errorText}>{errors.discount}</Text> : null}
                </View>
                <View style={styles.inputContainerHalf}>
                    <Text style={styles.label}>Цена товара *</Text>
                    <TextInput
                        style={[styles.input, errors.price ? styles.inputError : null]}
                        value={formData.price}
                        onChangeText={(text) => handleChange('price', text)}
                        placeholder="Введите цену за 1 шт"
                        keyboardType="numeric"
                    />
                    <View style={[styles.inputUnderline, errors.price ? styles.underlineError : null]} />
                    {errors.price ? <Text style={styles.errorText}>{errors.price}</Text> : null}
                </View>
            </View>

            {/* Количество товара на складе */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Количество на складе *</Text>
                <TextInput
                    style={[styles.input, errors.stockQuantity ? styles.inputError : null]}
                    value={formData.stockQuantity}
                    onChangeText={(text) => handleChange('stockQuantity', text)}
                    placeholder="Введите количество товара на складе"
                    keyboardType="numeric"
                />
                <View style={[styles.inputUnderline, errors.stockQuantity ? styles.underlineError : null]} />
                {errors.stockQuantity ? <Text style={styles.errorText}>{errors.stockQuantity}</Text> : null}
            </View>

            {/* Описание товара */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Описание товара</Text>
                <TextInput
                    style={[styles.input, styles.textArea, errors.description ? styles.inputError : null]}
                    value={formData.description}
                    onChangeText={(text) => handleChange('description', text)}
                    placeholder="Введите описание"
                    multiline
                    numberOfLines={3}
                />
                <View style={[styles.inputUnderline, errors.description ? styles.underlineError : null]} />
                {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}
            </View>

            {/* Кнопка сохранения */}
            <TouchableOpacity
                style={[styles.submitButton, isSubmitting ? styles.disabledButton : null]}
                onPress={handleSubmit}
                activeOpacity={0.7}
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <Text style={styles.submitButtonText}>
                        {product && product.id ? "Сохранить изменения" : "Добавить товар"}
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <ReusableModal
            visible={visible}
            onClose={onClose}
            title={product && product.id ? "Внести изменения товара" : "Добавить товар"}
            height={90}
        >
            {renderContent()}
        </ReusableModal>
    );
};

const styles = StyleSheet.create({
    formContainer: {
        padding: 16,
    },
    formHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    leftColumn: {
        width: '40%',
    },
    rightColumn: {
        width: '47%',
    },
    inputGroup: {
        marginBottom: 10,
        position: 'relative',
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: Color.dark,
        opacity: 0.4,
        marginBottom: 0,
        fontFamily: FontFamily.sFProText,
    },
    input: {
        height: 30,
        fontSize: 13,
        color: Color.dark,
        paddingVertical: 5,
        paddingLeft: 0,
        fontFamily: FontFamily.sFProText,
    },
    inputError: {
        color: '#FF3B30',
    },
    textArea: {
        height: 30,
        textAlignVertical: 'top',
    },
    inputUnderline: {
        height: 1,
        backgroundColor: '#000',
        marginTop: 0,
    },
    underlineError: {
        backgroundColor: '#FF3B30',
        height: 1.5,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 12,
        marginTop: 5,
        fontFamily: FontFamily.sFProText,
    },
    inputsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    inputContainerHalf: {
        width: '48%',
        marginBottom: 10,
    },
    submitButton: {
        backgroundColor: '#3B43A2',
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    disabledButton: {
        backgroundColor: '#a0a0a0',
    },
    submitButtonText: {
        color: Color.colorLightMode,
        fontSize: 16,
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
    }
});

export default EditProductModal;