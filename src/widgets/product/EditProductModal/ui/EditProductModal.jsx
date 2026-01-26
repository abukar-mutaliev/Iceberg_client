import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    TextInput,
    ScrollView,
    InteractionManager,
    Platform,
} from 'react-native';
import { FontFamily } from '@app/styles/GlobalStyles';
import { useSelector } from 'react-redux';
import { MultipleImageUpload } from '@entities/product/ui/MultipleImageUpload';
import { CategoryPicker } from "@shared/ui/Pickers/CategoryPicker/ui/CategoryPicker";
import { SupplierPicker } from '@shared/ui/Pickers/SupplierPicker';
import { WarehouseSelectionInline } from '@screens/warehouse/ui/WarehouseSelectionScreen';
import { selectUser } from '@entities/auth/model/selectors';
import { updateProductWithImages, uploadProductWithImages } from '@shared/api/uploadHelpers';
import { ReusableModal } from "@shared/ui/Modal/ui/ReusableModal";
import WarehouseService from '@entities/warehouse/api/warehouseApi';

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

// Выносим компонент формы в отдельную функцию
const ProductFormContent = React.memo(({
    formData,
    errors,
    isSubmitting,
    isInteracting,
    product,
    canChangeSupplier,
    handleChange,
    handleCategoriesChange,
    handleSupplierChange,
    handleWarehouseQuantitiesChange,
    handleImagesChange,
    handleSubmit,
    user
}) => {
    const isFormEditable = !isSubmitting && !isInteracting;

    const renderSection = (title, children, zIndex = 1) => (
        <View style={[styles.section, { zIndex }]}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionContent}>
                {children}
            </View>
        </View>
    );

    const renderInputCard = (label, value, onChangeText, placeholder, options = {}) => {
        const {
            keyboardType = 'default',
            multiline = false,
            error = null,
            required = false,
            editable = true
        } = options;

        return (
            <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>
                    {label} {required && <Text style={styles.requiredStar}>*</Text>}
                </Text>
                <TextInput
                    style={[
                        styles.cardInput,
                        multiline && styles.cardInputMultiline,
                        error && styles.cardInputError,
                        !editable && styles.cardInputDisabled
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#999"
                    keyboardType={keyboardType}
                    multiline={multiline}
                    editable={editable}
                />
                {error ? <Text style={styles.cardErrorText}>{error}</Text> : null}
            </View>
        );
    };

    return (
        <View style={styles.formContainer}>
            {renderSection("📸 Фотографии товара", (
                <View style={styles.photoSection}>
                    <MultipleImageUpload
                        photos={formData.images}
                        setPhotos={handleImagesChange}
                        error={errors.images}
                        maxImages={10}
                    />
                    {errors.images ? (
                        <Text style={styles.sectionError}>{errors.images}</Text>
                    ) : null}
                </View>
            ), 100)}

            {renderSection("ℹ️ Основная информация", (
                <>
                    {renderInputCard(
                        "Название товара",
                        String(formData.name || ''),
                        (text) => handleChange('name', text),
                        "Введите название товара",
                        { multiline: true, error: errors.name, required: true, editable: isFormEditable }
                    )}

                    <View style={styles.pickerCardCategory}>
                        <CategoryPicker
                            selectedCategories={formData.categories || []}
                            onSelectCategories={handleCategoriesChange}
                            error={errors.categories}
                            allowMultiple={true}
                        />
                    </View>

                    {canChangeSupplier && (
                        <View style={styles.pickerCard}>
                            <SupplierPicker
                                selectedSupplier={formData.supplierId}
                                onSelectSupplier={handleSupplierChange}
                                error={errors.supplierId}
                            />
                        </View>
                    )}

                    {renderInputCard(
                        "Описание товара",
                        String(formData.description || ''),
                        (text) => handleChange('description', text),
                        "Добавьте описание (опционально)",
                        { multiline: true, error: errors.description, editable: isFormEditable }
                    )}
                </>
            ), 99)}

            {renderSection("📏 Характеристики", (
                <>
                    {renderInputCard(
                        "Вес",
                        String(formData.weight || ''),
                        (text) => handleChange('weight', text),
                        "Вес в граммах",
                        { keyboardType: "numeric", error: errors.weight, required: true, editable: isFormEditable }
                    )}

                    {renderInputCard(
                        "Количество штук в коробке",
                        String(formData.itemsPerBox || ''),
                        (text) => handleChange('itemsPerBox', text),
                        "Штук в одной коробке",
                        { keyboardType: "numeric", error: errors.itemsPerBox, required: true, editable: isFormEditable }
                    )}
                </>
            ), 98)}

            {renderSection("💰 Ценообразование", (
                <>
                    <View style={styles.priceRow}>
                        <View style={styles.priceColumn}>
                            {renderInputCard(
                                "Цена за штуку",
                                String(formData.price || ''),
                                (text) => handleChange('price', text),
                                "₽",
                                { keyboardType: "numeric", error: errors.price, required: true, editable: isFormEditable }
                            )}
                        </View>
                        <View style={styles.priceColumn}>
                            {renderInputCard(
                                "Цена за коробку",
                                String(formData.boxPrice || ''),
                                (text) => handleChange('boxPrice', text),
                                "Авто",
                                { keyboardType: "numeric", error: errors.boxPrice, editable: isFormEditable }
                            )}
                        </View>
                    </View>
                    {renderInputCard(
                        "Скидка (%)",
                        String(formData.discount || ''),
                        (text) => handleChange('discount', text),
                        "Скидка",
                        { keyboardType: "numeric", error: errors.discount, editable: isFormEditable }
                    )}
                    <View style={styles.additionalPriceInfo}>
                        <Text style={styles.additionalPriceNote}>
                            💡 Цены для складов и фургонов указываются при выборе складов
                        </Text>
                    </View>
                </>
            ), 97)}

            {renderSection("📦 Складские запасы", (
                <>
                    <View style={styles.pickerCard}>
                        <WarehouseSelectionInline
                            selectedWarehouseQuantities={formData.warehouseQuantities}
                            onSelectWarehouseQuantities={handleWarehouseQuantitiesChange}
                            basePrice={formData.boxPrice ? parseFloat(formData.boxPrice) : null}
                            isAdmin={user?.role === 'ADMIN'}
                        />
                        {errors.warehouseQuantities ? (
                            <Text style={styles.sectionError}>{errors.warehouseQuantities}</Text>
                        ) : null}
                    </View>

                    {formData.warehouseQuantities?.length > 0 ? (
                        <View style={styles.stockSummaryCard}>
                            <View style={styles.stockSummaryRow}>
                                <Text style={styles.stockSummaryLabel}>Общее количество коробок:</Text>
                                <Text style={styles.stockSummaryValue}>
                                    {formData.warehouseQuantities.reduce((sum, item) => sum + item.quantity, 0)}
                                </Text>
                            </View>
                        </View>
                    ) : (
                        renderInputCard(
                            "Количество коробок на складе",
                            String(formData.stockQuantity || ''),
                            (text) => handleChange('stockQuantity', text),
                            "Количество коробок",
                            { keyboardType: "numeric", error: errors.stockQuantity, required: true, editable: isFormEditable }
                        )
                    )}
                </>
            ), 96)}

            <TouchableOpacity
                style={[styles.submitButton, !isFormEditable && styles.disabledButton]}
                onPress={handleSubmit}
                activeOpacity={0.7}
                disabled={!isFormEditable}
            >
                {isSubmitting ? (
                    <View style={styles.submitButtonContent}>
                        <ActivityIndicator size="small" color="#FFFFFF" style={styles.submitButtonLoader} />
                        <Text style={styles.submitButtonText}>Сохранение...</Text>
                    </View>
                ) : (
                    <Text style={styles.submitButtonText}>
                        {product && product.id ? "Сохранить изменения" : "Добавить товар"}
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );
});

export const EditProductModal = React.memo(({ visible, onClose, product, onSave }) => {
    // Получаем текущего пользователя из редакса авторизации
    const user = useSelector(selectUser);
    const [isModalMounted, setIsModalMounted] = useState(false);
    const [isModalReady, setIsModalReady] = useState(false);
    const [contentReady, setContentReady] = useState(false);
    const [isInteracting, setIsInteracting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [closeRequestPending, setCloseRequestPending] = useState(false);

    console.log('[EditProductModal] Открытие модального окна', { visible, productId: product?.id });

    // Определяем, может ли пользователь менять поставщика
    const canChangeSupplier = useMemo(() =>
            user && (user.role === 'ADMIN' || user.role === 'EMPLOYEE'),
        [user?.role]
    );


    const [formData, setFormData] = useState({
        name: '',
        categories: [], // изменено с category на categories для множественного выбора
        weight: '',
        price: '',
        itemsPerBox: '',
        boxPrice: '',
        discount: '',
        stockQuantity: '',
        description: '',
        images: [],
        supplierId: '',
        warehouseQuantities: [], // массив [{warehouseId, quantity}, ...]
        originalImages: []
    });

    const [errors, setErrors] = useState({
        name: '',
        categories: '', // изменено с category на categories
        weight: '',
        price: '',
        itemsPerBox: '',
        boxPrice: '',
        discount: '',
        stockQuantity: '',
        description: '',
        images: '',
        supplierId: '',
        warehouseQuantities: '' // Ошибки для складов с количествами
    });

    const [removedImages, setRemovedImages] = useState([]);
    const [loadingWarehouses, setLoadingWarehouses] = useState(false);

    // Инициализация модального окна с защитой от ViewState конфликтов
    useEffect(() => {
        if (visible && !isModalMounted) {
            // Используем InteractionManager для безопасного монтирования
            const mountTask = InteractionManager.runAfterInteractions(() => {
                setIsModalMounted(true);
                
                // Добавляем дополнительную задержку для стабилизации ViewState
                setTimeout(() => {
                    setIsModalReady(true);
                    
                    // И еще одну задержку для контента
                    setTimeout(() => {
                        setContentReady(true);
                    }, Platform.OS === 'android' ? 150 : 100);
                }, Platform.OS === 'android' ? 200 : 100);
            });

            return () => mountTask.cancel();
        } else if (!visible && isModalMounted) {
            // При закрытии сначала скрываем контент
            setContentReady(false);
            setIsInteracting(false);
            
            // Затем с задержкой размонтируем модальное окно
            const unmountTask = InteractionManager.runAfterInteractions(() => {
                setTimeout(() => {
                    setIsModalReady(false);
                    setTimeout(() => {
                        setIsModalMounted(false);
                        setCloseRequestPending(false);
                    }, 100);
                }, 100);
            });

            return () => unmountTask.cancel();
        }
    }, [visible, isModalMounted]);

    // Очищаем данные формы при закрытии модального окна
    useEffect(() => {
        if (!visible) {
            const timer = setTimeout(() => {
                            setFormData({
                name: '',
                categories: [],
                weight: '',
                price: '',
                itemsPerBox: '',
                boxPrice: '',
                discount: '',
                stockQuantity: '',
                description: '',
                images: [],
                originalImages: [],
                supplierId: '',
                warehouseQuantities: []
            });
                setRemovedImages([]);
                setErrors({
                    name: '',
                    categories: '',
                    weight: '',
                    price: '',
                    itemsPerBox: '',
                    boxPrice: '',
                    discount: '',
                    stockQuantity: '',
                    description: '',
                    images: '',
                    supplierId: '',
                    warehouseQuantities: ''
                });
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    // Функция для загрузки складов продукта с количествами
    const loadProductWarehouses = useCallback(async (productId) => {
        console.log('[EditProductModal] Начинаем загрузку складов для товара:', productId);
        try {
            setLoadingWarehouses(true);
            console.log('[EditProductModal] Вызываем API findWarehousesWithProduct с productId:', productId);
            const response = await WarehouseService.findWarehousesWithProduct(productId);
            console.log('[EditProductModal] Полный ответ от API:', response);

            if (response?.data) {
                console.log('[EditProductModal] Данные в response.data:', response.data);

                // Проверяем разные возможные структуры ответа
                let warehouses = [];
                console.log('[EditProductModal] Структура ответа сервера:', {
                    hasData: !!response.data,
                    dataKeys: response.data ? Object.keys(response.data) : [],
                    warehousesInData: response.data?.warehouses ? 'present' : 'absent',
                    warehousesLength: response.data?.warehouses?.length || 0,
                    dataInData: response.data?.data ? 'present' : 'absent'
                });

                if (response.data.warehouses && Array.isArray(response.data.warehouses)) {
                    warehouses = response.data.warehouses;
                    console.log('[EditProductModal] Найдены склады в response.data.warehouses');
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    warehouses = response.data.data;
                    console.log('[EditProductModal] Найдены склады в response.data.data');
                } else if (Array.isArray(response.data)) {
                    warehouses = response.data;
                    console.log('[EditProductModal] Найдены склады в response.data (массив)');
                } else {
                    console.log('[EditProductModal] Склады не найдены в стандартных местах');
                }

                console.log('[EditProductModal] Найденные склады в ответе:', warehouses);

                if (warehouses.length > 0) {
                    // Извлекаем склады с количествами и ценами из ответа
                    const warehouseQuantities = warehouses.map(w => {
                        const item = {
                            warehouseId: w.warehouseId || w.id,
                            quantity: w.quantity || w.stockQuantity || w.amount || 0
                        };
                        // Добавляем warehousePrice если он есть
                        if (w.warehousePrice !== undefined && w.warehousePrice !== null) {
                            item.warehousePrice = w.warehousePrice;
                        }
                        // Добавляем stopPrice если он есть (хотя обычно его нет при загрузке складов)
                        if (w.stopPrice !== undefined && w.stopPrice !== null) {
                            item.stopPrice = w.stopPrice;
                        }
                        return item;
                    });
                    console.log('[EditProductModal] Загружены склады продукта с количествами и ценами:', warehouseQuantities);
                    return warehouseQuantities;
                } else {
                    console.log('[EditProductModal] Склады не найдены для товара:', productId);
                    return [];
                }
            } else {
                console.log('[EditProductModal] Ответ не содержит данных или data поля:', response);
                return [];
            }
        } catch (error) {
            console.error('[EditProductModal] Ошибка загрузки складов продукта:', error);
            console.error('[EditProductModal] Детали ошибки:', error.response?.data || error.message);
            return [];
        } finally {
            setLoadingWarehouses(false);
        }
    }, []);

    // Инициализируем данные формы при изменении product или visible
    useEffect(() => {
        if (product && visible) {
            console.log('[EditProductModal] Инициализация данных формы:', product);
            console.log('[EditProductModal] Product ID:', product.id);
            console.log('[EditProductModal] Product type:', typeof product.id);

            // Извлекаем категории из продукта
            let categoryIds = [];
            if (product.categories && Array.isArray(product.categories)) {
                categoryIds = product.categories.map(cat => {
                    if (typeof cat === 'object' && cat.id) {
                        return cat.id;
                    } else if (typeof cat === 'number') {
                        return cat;
                    } else if (typeof cat === 'string' && !isNaN(cat)) {
                        return parseInt(cat, 10);
                    }
                    return null;
                }).filter(Boolean);
            } else if (product.category) {
                const categoryId = extractCategoryId(product.category);
                if (categoryId) categoryIds = [categoryId];
            }

            console.log('[EditProductModal] Извлеченные категории:', {
                originalCategories: product.categories,
                originalCategory: product.category,
                extractedCategoryIds: categoryIds,
                categoryIdsType: typeof categoryIds,
                categoryIdsIsArray: Array.isArray(categoryIds)
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

            console.log('[EditProductModal] Подготовленные данные:', {
                name: product.name,
                categories: categoryIds,
                images: imagesList.length,
                supplierId
            });

            // Инициализируем базовые данные формы
            const baseFormData = {
                name: product.name || '',
                categories: categoryIds,
                weight: product.weight ? product.weight.toString() : '',
                price: product.price ? product.price.toString() : '',
                itemsPerBox: product.itemsPerBox ? product.itemsPerBox.toString() : '1',
                boxPrice: product.boxPrice ? product.boxPrice.toString() : '',
                discount: product.discount ? product.discount.toString() : '',
                stockQuantity: product.stockQuantity ? product.stockQuantity.toString() : '',
                description: product.description || '',
                images: imagesList,
                originalImages: [...imagesList], // Сохраняем копию для отслеживания удаленных
                supplierId: supplierId,
                warehouseQuantities: [] // Будем загружать асинхронно
            };

            setFormData(baseFormData);
            
            console.log('[EditProductModal] Форма инициализирована:', {
                categories: baseFormData.categories,
                categoriesLength: baseFormData.categories?.length
            });

            // Загружаем склады продукта с количествами асинхронно
            if (product.id) {
                console.log('[EditProductModal] Товар имеет ID, загружаем склады:', product.id);
                loadProductWarehouses(product.id).then(warehouseQuantities => {
                    console.log('[EditProductModal] Загружены склады с количествами для формы:', warehouseQuantities);
                    console.log('[EditProductModal] Устанавливаем warehouseQuantities в форму:', warehouseQuantities);
                    setFormData(prev => ({
                        ...prev,
                        warehouseQuantities: warehouseQuantities
                    }));
                }).catch(error => {
                    console.error('[EditProductModal] Ошибка при загрузке складов для формы:', error);
                });
            } else {
                console.log('[EditProductModal] Товар не имеет ID, пропускаем загрузку складов:', product);
            }

            // Сбрасываем список удаленных изображений и ошибки
            setRemovedImages([]);
            setErrors({
                name: '',
                categories: '',
                weight: '',
                price: '',
                discount: '',
                stockQuantity: '',
                description: '',
                images: '',
                supplierId: ''
            });
        }
    }, [product, visible, loadProductWarehouses]);

    // Улучшенный handleClose с защитой от повторных вызовов
    const handleClose = useCallback(() => {
        if (closeRequestPending || isSubmitting) {
            console.log('[EditProductModal] Закрытие уже в процессе или идет сохранение');
            return;
        }

        setCloseRequestPending(true);
        setIsInteracting(true);

        // Используем InteractionManager для безопасного закрытия
        InteractionManager.runAfterInteractions(() => {
            setTimeout(() => {
                if (onClose && typeof onClose === 'function') {
                    onClose();
                }
            }, 100);
        });
    }, [onClose, closeRequestPending, isSubmitting]);

    // Защищенный handleChange с блокировкой взаимодействий
    const handleChange = useCallback((field, value) => {
        if (isSubmitting || isInteracting) {
            return;
        }

        console.log(`[EditProductModal] Изменение поля ${field}:`, value);

        setFormData(prev => {
            const newData = {
                ...prev,
                [field]: value
            };

            // Автоматически рассчитываем рекомендуемую цену за коробку
            if (field === 'price' || field === 'itemsPerBox') {
                const priceStr = field === 'price' ? value : prev.price;
                const itemsStr = field === 'itemsPerBox' ? value : prev.itemsPerBox;

                // Очищаем строки от нечисловых символов
                const price = parseFloat(priceStr.toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
                const itemsPerBox = parseInt(itemsStr.toString().replace(/[^0-9]/g, ''));

                if (!isNaN(price) && !isNaN(itemsPerBox) && itemsPerBox > 0 && price > 0) {
                    // Расчетная цена за коробку = цена за штуку * количество штук
                    const calculatedBoxPrice = price * itemsPerBox;

                    // Устанавливаем полную стоимость (100%) при изменении price или itemsPerBox
                    newData.boxPrice = calculatedBoxPrice.toFixed(2);
                }
            }

            return newData;
        });

        // Сбрасываем ошибку поля при изменении
        setErrors(prev => ({
            ...prev,
            [field]: ''
        }));
    }, [isSubmitting, isInteracting]);

    // Обработчик изменения категорий
    const handleCategoriesChange = useCallback((categoryIds) => {
        console.log(`[EditProductModal] Изменение категорий:`, {
            received: categoryIds,
            type: typeof categoryIds,
            isArray: Array.isArray(categoryIds)
        });

        setFormData(prev => {
            const newCategories = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
            console.log(`[EditProductModal] Устанавливаем категории:`, {
                previous: prev.categories,
                new: newCategories
            });
            return {
                ...prev,
                categories: newCategories
            };
        });

        // Сбрасываем ошибку
        setErrors(prev => ({ ...prev, categories: '' }));
    }, []);

    // Обработчик изменения поставщика
    const handleSupplierChange = useCallback((supplierId) => {
        console.log(`[EditProductModal] Изменение поставщика:`, supplierId);

        setFormData(prev => ({
            ...prev,
            supplierId: supplierId
        }));
        setErrors(prev => ({ ...prev, supplierId: '' }));
    }, []);

    // Обработчик изменения складов с количествами
    const handleWarehouseQuantitiesChange = useCallback((warehouseQuantities) => {
        console.log('[EditProductModal] Изменение складов с количествами:', {
            warehouseQuantities,
            isArray: Array.isArray(warehouseQuantities),
            length: warehouseQuantities?.length
        });
        setFormData(prev => ({
            ...prev,
            warehouseQuantities: warehouseQuantities
        }));
        setErrors(prev => ({ ...prev, warehouseQuantities: '' }));
    }, []);

    useEffect(() => {
        if (formData.warehouseQuantities && formData.warehouseQuantities.length > 0) {
            const totalBoxes = formData.warehouseQuantities.reduce((sum, item) => sum + item.quantity, 0);
            if (totalBoxes > 0 && (!formData.stockQuantity || formData.stockQuantity !== totalBoxes.toString())) {
                setFormData(prev => ({
                    ...prev,
                    stockQuantity: totalBoxes.toString()
                }));
            }
        }
    }, [formData.warehouseQuantities]);

    // Обработчик изменения изображений
    const handleImagesChange = useCallback((newImages) => {
        console.log(`[EditProductModal] Изменение изображений:`, newImages?.length);

        setFormData(prev => {
            // Определяем, какие изображения были удалены
            const deletedImages = prev.originalImages.filter(
                originalImg => !newImages.includes(originalImg)
            );

            // Добавляем удаленные изображения в список для отправки на сервер
            setRemovedImages(oldRemoved => [...oldRemoved, ...deletedImages]);

            return {
                ...prev,
                images: newImages
            };
        });

        setErrors(prev => ({ ...prev, images: '' }));
    }, []);

    // Валидация формы
    const validateForm = useCallback(() => {
        let isValid = true;
        const newErrors = {};

        if (!formData.name || !formData.name.trim()) {
            newErrors.name = 'Введите название товара';
            isValid = false;
        }

        if (!formData.categories || formData.categories.length === 0) {
            newErrors.categories = 'Выберите хотя бы одну категорию товара';
            isValid = false;
        }

        if (!formData.price) {
            newErrors.price = 'Введите цену за штуку';
            isValid = false;
        } else if (typeof formData.price === 'string') {
            if (!formData.price.trim()) {
                newErrors.price = 'Введите цену за штуку';
                isValid = false;
            } else if (isNaN(parseFloat(formData.price.replace(/[^0-9,.]/g, '')))) {
                newErrors.price = 'Цена должна быть числом';
                isValid = false;
            }
        } else if (typeof formData.price !== 'number') {
            newErrors.price = 'Некорректный формат цены';
            isValid = false;
        }

        if (!formData.itemsPerBox) {
            newErrors.itemsPerBox = 'Введите количество штук в коробке';
            isValid = false;
        } else if (typeof formData.itemsPerBox === 'string') {
            if (!formData.itemsPerBox.trim()) {
                newErrors.itemsPerBox = 'Введите количество штук в коробке';
                isValid = false;
            } else {
                const itemsPerBox = parseInt(formData.itemsPerBox);
                if (isNaN(itemsPerBox) || itemsPerBox < 1) {
                    newErrors.itemsPerBox = 'Количество штук должно быть больше 0';
                    isValid = false;
                }
            }
        } else if (typeof formData.itemsPerBox !== 'number') {
            newErrors.itemsPerBox = 'Некорректный формат количества штук';
            isValid = false;
        }

        if (formData.boxPrice) {
            if (typeof formData.boxPrice === 'string') {
                if (formData.boxPrice.trim() && isNaN(parseFloat(formData.boxPrice.replace(/[^0-9,.]/g, '')))) {
                    newErrors.boxPrice = 'Цена за коробку должна быть числом';
                    isValid = false;
                }
            } else if (typeof formData.boxPrice !== 'number' && formData.boxPrice !== null) {
                newErrors.boxPrice = 'Некорректный формат цены за коробку';
                isValid = false;
            }
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

        if (!formData.warehouseQuantities || formData.warehouseQuantities.length === 0) {
            if (!formData.stockQuantity) {
                newErrors.stockQuantity = 'Введите количество коробок на складе';
                isValid = false;
            }
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

        // Валидация выбора складов с количествами (предупреждение, не ошибка)
        if (!formData.warehouseQuantities || formData.warehouseQuantities.length === 0) {
            newErrors.warehouseQuantities = "Не выбраны склады. Изменения будут применены ко всем складам";
            // isValid остается true - это предупреждение
        }

        setErrors(newErrors);
        return isValid;
    }, [formData, canChangeSupplier]);

    // ИСПРАВЛЕННЫЙ обработчик отправки формы
    const handleSubmit = useCallback(async () => {
        if (!validateForm() || isSubmitting || isInteracting) {
            console.log('[EditProductModal] Отправка заблокирована:', { 
                isValid: validateForm(), 
                isSubmitting, 
                isInteracting 
            });
            return;
        }

        setIsSubmitting(true);
        setIsInteracting(true);
        console.log('[EditProductModal] Начало отправки формы');

        try {
            // Готовим данные для отправки
            const productData = {
                name: formData.name,
                categories: formData.categories, // отправляем массив категорий
                price: formData.price,
                itemsPerBox: formData.itemsPerBox,
                boxPrice: formData.boxPrice || null,
                stockQuantity: formData.stockQuantity,
                weight: formData.weight || null,
                discount: formData.discount || null,
                description: formData.description || '',
                supplierId: canChangeSupplier ? formData.supplierId : undefined,
                warehouses: formData.warehouseQuantities.length > 0 ? JSON.stringify(formData.warehouseQuantities) : "all",
            };

            if (product && product.id && formData.warehouseQuantities.length > 0) {
                productData.warehouseStocks = formData.warehouseQuantities;
            }

            console.log('[EditProductModal] Данные для отправки:', {
                ...productData,
                warehousesDetail: {
                    original: formData.warehouseQuantities,
                    isArray: Array.isArray(formData.warehouseQuantities),
                    length: formData.warehouseQuantities?.length,
                    final: productData.warehouses,
                    finalType: typeof productData.warehouses,
                    finalIsArray: Array.isArray(productData.warehouses)
                }
            });

            let result;

            if (product && product.id) {
                // Обновляем существующий продукт
                console.log('[EditProductModal] Обновление существующего продукта');
                result = await updateProductWithImages({
                    productId: product.id,
                    formData: productData,
                    images: formData.images || [],
                    removeImages: removedImages || []
                });
            } else {
                // Создаем новый продукт
                console.log('[EditProductModal] Создание нового продукта');
                result = await uploadProductWithImages({
                    formData: productData,
                    images: formData.images || []
                });
            }

            console.log('[EditProductModal] Результат от API:', result);

            // Проверяем результат
            if (result && (result.status === 'success' || result.success)) {
                // Готовим финальные данные продукта для передачи в родительский компонент
                const updatedProductData = {
                    ...product, // Сохраняем все существующие данные
                    ...productData, // Перезаписываем обновленными данными
                    // Обновляем специфичные поля с правильными типами
                    price: parseFloat(productData.price) || product?.price || 0,
                    itemsPerBox: parseInt(productData.itemsPerBox, 10) || product?.itemsPerBox || 1,
                    boxPrice: productData.boxPrice ? parseFloat(productData.boxPrice) : (product?.boxPrice || null),
                    weight: productData.weight ? parseFloat(productData.weight) : (product?.weight || null),
                    discount: productData.discount ? parseFloat(productData.discount) : (product?.discount || null),
                    stockQuantity: parseInt(productData.stockQuantity, 10) || product?.stockQuantity || 0,
                    images: formData.images, // Обновленные изображения
                };

                console.log('[EditProductModal] Передаем обновленные данные в onSave:', updatedProductData);

                // Сначала закрываем модальное окно
                handleClose();

                // Затем с задержкой передаем данные в родительский компонент
                setTimeout(() => {
                    if (onSave && typeof onSave === 'function') {
                        onSave(updatedProductData);
                    }
                }, 100);

            } else {
                // Обработка ошибки
                let errorMessage = "Произошла ошибка при сохранении товара";

                if (result && result.message) {
                    errorMessage = result.message;
                } else if (result && result.error) {
                    errorMessage = result.error;
                }

                if (result && result.networkError) {
                    errorMessage = "Не удалось подключиться к серверу. Проверьте соединение с интернетом.";
                }

                Alert.alert("Ошибка", errorMessage);
            }
        } catch (error) {
            console.error('EditProductModal: Ошибка при отправке формы:', error);
            const errorMessage = error?.message || "Произошла ошибка при сохранении данных";
            Alert.alert("Ошибка", errorMessage);
        } finally {
            setIsSubmitting(false);
            setIsInteracting(false);
        }
    }, [formData, product, removedImages, validateForm, onSave, handleClose, isSubmitting, isInteracting]);

    // Не рендерим ничего, если модальное окно не видимо или не готово
    if (!visible || !isModalReady) {
        return null;
    }

    return (
        <>
        <ReusableModal
            visible={visible && isModalReady && isModalMounted}
            onClose={handleClose}
            title={product && product.id ? "Внести изменения товара" : "Добавить товар"}
            height={90}
            // Добавляем специальные настройки для предотвращения ViewState конфликтов
            disableSwipe={isInteracting || isSubmitting}
            fullScreenOnKeyboard={Platform.OS === 'android'}
        >
            {contentReady ? (
                <ScrollView
                    style={{flex: 1}}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{paddingBottom: 20}}
                    // Добавляем дополнительные настройки для стабильности
                    removeClippedSubviews={false}
                    keyboardDismissMode="interactive"
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                >
                    <ProductFormContent
                        formData={formData}
                        errors={errors}
                        isSubmitting={isSubmitting}
                        isInteracting={isInteracting}
                        product={product}
                        canChangeSupplier={canChangeSupplier}
                        handleChange={handleChange}
                        handleCategoriesChange={handleCategoriesChange}
                        handleSupplierChange={handleSupplierChange}
                        handleWarehouseQuantitiesChange={handleWarehouseQuantitiesChange}
                        handleImagesChange={handleImagesChange}
                        handleSubmit={handleSubmit}
                        user={user}
                    />
                </ScrollView>
            ) : (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B43A2" />
                    <Text style={styles.loadingText}>Загрузка формы...</Text>
                </View>
            )}
        </ReusableModal>
        </>
    );
});

const styles = StyleSheet.create({
    formContainer: {
        padding: 16,
    },

    // Section Styles
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        fontFamily: FontFamily.sFProDisplay,
        marginBottom: 12,
        paddingLeft: 4,
    },
    sectionContent: {
        gap: 12,
    },
    sectionError: {
        color: '#FF3B30',
        fontSize: 13,
        marginTop: 8,
        paddingLeft: 4,
        fontFamily: FontFamily.sFProText,
    },

    // Photo Section
    photoSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 8,
        maxHeight: 200,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
            },
            android: {
                elevation: 2,
            },
        }),
    },

    // Input Card Styles
    inputCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
        fontFamily: FontFamily.sFProText,
    },
    requiredStar: {
        color: '#FF3B30',
    },
    cardInput: {
        fontSize: 16,
        color: '#1A1A1A',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#F5F7FA',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E8ECF1',
        fontFamily: FontFamily.sFProText,
        minHeight: 44,
    },
    cardInputMultiline: {
        minHeight: 80,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    cardInputError: {
        borderColor: '#FF3B30',
        backgroundColor: '#FFF5F5',
    },
    cardInputDisabled: {
        backgroundColor: '#F5F7FA',
        color: '#999',
    },
    cardErrorText: {
        color: '#FF3B30',
        fontSize: 12,
        marginTop: 6,
        paddingLeft: 4,
        fontFamily: FontFamily.sFProText,
    },

    // Picker Card
    pickerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    pickerCardCategory: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        zIndex: 1000,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 10,
            },
        }),
    },

    // Price Row
    priceRow: {
        flexDirection: 'row',
        gap: 12,
    },
    priceColumn: {
        flex: 1,
    },
    additionalPriceInfo: {
        backgroundColor: '#FFF9E6',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#FFE08A',
        marginTop: 8,
    },
    additionalPriceNote: {
        fontSize: 13,
        color: '#856404',
        fontFamily: FontFamily.sFProText,
        lineHeight: 18,
    },

    // Stock Summary
    stockSummaryCard: {
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#BAE6FD',
    },
    stockSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stockSummaryLabel: {
        fontSize: 14,
        color: '#0369A1',
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
    },
    stockSummaryValue: {
        fontSize: 18,
        color: '#0369A1',
        fontWeight: '700',
        fontFamily: FontFamily.sFProDisplay,
    },

    // Submit Button
    submitButton: {
        backgroundColor: '#3B43A2',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#3B43A2',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    disabledButton: {
        backgroundColor: '#C7C7CC',
        ...Platform.select({
            ios: {
                shadowOpacity: 0.1,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    submitButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    submitButtonLoader: {
        marginRight: 10,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
        fontFamily: FontFamily.sFProDisplay,
    },

    // Loading State
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
        minHeight: 200,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
        fontFamily: FontFamily.sFProText,
    }
});

export default React.memo(EditProductModal);