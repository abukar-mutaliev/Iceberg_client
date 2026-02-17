import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';

// Правильные импорты из shared UI
import { FormSection, InputField, ProductWarehouseStockManager } from "@shared/ui/Admin/AdminProduct";
import { MultipleImageUpload } from '@entities/product/ui/MultipleImageUpload';
import { CategoryPicker } from "@shared/ui/Pickers/CategoryPicker/ui/CategoryPicker";
import { SupplierPicker } from '@shared/ui/Pickers/SupplierPicker';
import WarehouseService from '@entities/warehouse/api/warehouseApi';

// Утилита для извлечения ID категории (как в EditProductModal)
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

export const AdminProductEditForm = ({
                                         formData,
                                         errors,
                                         onFieldChange,
                                         onSubmit,
                                         isLoading = false,
                                         validationRules = {},
                                         canChangeSupplier = true,
                                         user = null,
                                         product = null, // Добавляем продукт для инициализации данных
                                         // Дополнительные пропсы для интеграции с useProductEdit
                                         isEditMode = false,
                                         displayProduct = null, // Альтернативный источник данных продукта
                                         onSaveSuccess = null, // Колбэк для успешного сохранения
                                         onGetSaveFunction = null // Колбэк для передачи функции сохранения
                                     }) => {
    const [removedImages, setRemovedImages] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Определяем источник данных о продукте
    const sourceProduct = product || displayProduct;

    // Используем formData напрямую без локального состояния для лучшей производительности
    const currentFormData = formData || {};



    // Инициализация данных при загрузке продукта или переходе в режим редактирования
    // Но только если данные не приходят уже готовыми из родительского компонента
    useEffect(() => {
        if (sourceProduct && (isEditMode || product) && !isInitialized && (!formData || Object.keys(formData).length === 0)) {
            // console.log('[AdminProductEditForm] Инициализация данных продукта:', sourceProduct);

            // Инициализируем категории - поддерживаем множественный выбор
            let categoryIds = [];
            if (sourceProduct.categories && Array.isArray(sourceProduct.categories)) {
                categoryIds = sourceProduct.categories.map(cat => {
                    if (typeof cat === 'object' && cat.id) {
                        return cat.id;
                    } else if (typeof cat === 'number') {
                        return cat;
                    } else if (typeof cat === 'string' && !isNaN(cat)) {
                        return parseInt(cat, 10);
                    }
                    return null;
                }).filter(Boolean);
            } else if (sourceProduct.category) {
                const categoryId = extractCategoryId(sourceProduct.category);
                if (categoryId) categoryIds = [categoryId];
            }

            // Подготавливаем изображения
            let imagesList = [];
            if (sourceProduct.images && Array.isArray(sourceProduct.images) && sourceProduct.images.length > 0) {
                imagesList = sourceProduct.images.map(img =>
                    typeof img === 'string' ? img : (img.uri || '')
                ).filter(Boolean);
            } else if (sourceProduct.image) {
                const imgUri = typeof sourceProduct.image === 'string'
                    ? sourceProduct.image
                    : (sourceProduct.image.uri || '');
                if (imgUri) {
                    imagesList = [imgUri];
                }
            }

            // Получаем ID поставщика
            let supplierId = '';
            if (sourceProduct.supplierId) {
                supplierId = sourceProduct.supplierId.toString();
            } else if (sourceProduct.supplier && sourceProduct.supplier.id) {
                supplierId = sourceProduct.supplier.id.toString();
            }

            // Обновляем все базовые поля
            const normalizedItemsPerBox =
                parseInt(sourceProduct.itemsPerBox, 10) ||
                parseInt(sourceProduct.boxInfo?.itemsPerBox, 10) ||
                1;
            const normalizedBoxPrice =
                parseFloat(sourceProduct.boxPrice) ||
                parseFloat(sourceProduct.boxInfo?.boxPrice) ||
                '';

            const updates = {
                name: sourceProduct.name || '',
                categories: categoryIds, // Изменено с category на categories
                weight: sourceProduct.weight ? sourceProduct.weight.toString() : '',
                price: sourceProduct.price ? sourceProduct.price.toString() : '',
                itemsPerBox: normalizedItemsPerBox.toString(),
                boxPrice: normalizedBoxPrice !== '' ? normalizedBoxPrice.toString() : '',
                discount: sourceProduct.discount ? sourceProduct.discount.toString() : '',
                stockQuantity: sourceProduct.stockQuantity ? sourceProduct.stockQuantity.toString() : '',
                description: sourceProduct.description || '',
                images: imagesList,
                supplierId: supplierId,
                sku: sourceProduct.sku || '',
                warehouseStocks: [] // Будем загружать асинхронно
            };

            // console.log('[AdminProductEditForm] Обновления для формы:', updates);

            // Применяем обновления через onFieldChange (если есть)
            if (onFieldChange) {
                Object.keys(updates).forEach(key => {
                    onFieldChange(key, updates[key]);
                });
            }

            // Локальное состояние больше не нужно - используем только onFieldChange

            // Загружаем остатки по складам асинхронно
            if (sourceProduct.id) {
                loadProductStocks(sourceProduct.id).then(warehouseStocks => {
                    // console.log('[AdminProductEditForm] Обновляем остатки по складам:', warehouseStocks);
                    if (onFieldChange) {
                        onFieldChange('warehouseStocks', warehouseStocks);
                    }
                });
            }

            setIsInitialized(true);
        }
    }, [sourceProduct, isEditMode, product, isInitialized, onFieldChange, loadProductStocks, formData]);

    // Сбрасываем инициализацию при выходе из режима редактирования
    useEffect(() => {
        if (!isEditMode && !product) {
            setIsInitialized(false);
        }
    }, [isEditMode, product]);

    // Обработчик изменения изображений с отслеживанием удаленных
    const handleImagesChange = useCallback((newImages) => {
        // Определяем удаленные изображения
        const currentImages = currentFormData.images || [];
        const deletedImages = currentImages.filter(
            originalImg => !newImages.includes(originalImg)
        );

        // Добавляем удаленные изображения в список
        if (deletedImages.length > 0) {
            setRemovedImages(prev => [...prev, ...deletedImages]);
        }

        // Обновляем формData
        onFieldChange('images', newImages);
    }, [currentFormData.images, onFieldChange]);

    // Обработчик изменения категорий (множественный выбор)
    const handleCategoriesChange = useCallback((categoryIds) => {
        // console.log('Изменение категорий:', categoryIds);
        onFieldChange('categories', Array.isArray(categoryIds) ? categoryIds : [categoryIds]);
    }, [onFieldChange]);

    // Обработчик изменения поставщика
    const handleSupplierChange = useCallback((supplierId) => {
        // console.log('Изменение поставщика:', supplierId);
        onFieldChange('supplierId', supplierId);
    }, [onFieldChange]);

    // Функция для загрузки остатков продукта по складам
    const loadProductStocks = useCallback(async (productId) => {
        try {
            const response = await WarehouseService.getProductStock(productId);
            if (response?.data?.stocks) {
                return response.data.stocks.map(stock => ({
                    warehouseId: stock.warehouseId,
                    quantity: stock.quantity
                }));
            }
            return [];
        } catch (error) {
            console.error('[AdminProductEditForm] Ошибка загрузки остатков продукта:', error);
            return [];
        }
    }, []);

    // Мемоизированные обработчики для полей ввода
    const handleNameChange = useCallback((text) => onFieldChange('name', text), [onFieldChange]);
    const handleWeightChange = useCallback((text) => onFieldChange('weight', text), [onFieldChange]);
    const handleDiscountChange = useCallback((text) => onFieldChange('discount', text), [onFieldChange]);
    const handlePriceChange = useCallback((text) => onFieldChange('price', text), [onFieldChange]);
    const handleStockQuantityChange = useCallback((text) => onFieldChange('stockQuantity', text), [onFieldChange]);
    const handleDescriptionChange = useCallback((text) => onFieldChange('description', text), [onFieldChange]);
    const handleSkuChange = useCallback((text) => onFieldChange('sku', text), [onFieldChange]);

    // Обработчик отправки формы
    const handleSubmit = useCallback(async () => {
        console.log('[AdminProductEditForm] Начинаем сохранение:', {
            hasOnSubmit: !!onSubmit,
            formDataKeys: Object.keys(currentFormData),
            removedImagesCount: removedImages.length
        });

        if (onSubmit) {
            try {
                const result = await onSubmit({
                    ...currentFormData,
                    removedImages: removedImages
                });
                
                console.log('[AdminProductEditForm] Результат сохранения:', result);
                
                // Если сохранение прошло успешно и есть колбэк
                if (result && result.success && onSaveSuccess) {
                    onSaveSuccess(result.data || currentFormData);
                }
                
                return result;
            } catch (error) {
                console.error('[AdminProductEditForm] Ошибка при сохранении:', error);
                throw error;
            }
        } else {
            console.warn('[AdminProductEditForm] onSubmit не передан!');
        }
    }, [currentFormData, removedImages, onSubmit, onSaveSuccess]);

    // Передаем функцию сохранения в родительский компонент при инициализации
    useEffect(() => {
        if (onGetSaveFunction && typeof handleSubmit === 'function') {
            onGetSaveFunction(handleSubmit);
        }
    }, [onGetSaveFunction, handleSubmit]);

    return (
        <View style={styles.container}>
            <Text style={styles.formTitle}>Редактирование товара</Text>

            {/* Блок изображений и основной информации */}
            <FormSection title="Изображения и основная информация">
                <View style={styles.imageAndInfoRow}>
                    {/* Левая колонка - изображения */}
                    <View style={styles.imageColumn}>
                        <Text style={styles.fieldLabel}>Изображения товара *</Text>
                        <MultipleImageUpload
                            photos={currentFormData.images || []}
                            setPhotos={handleImagesChange}
                            error={errors.images}
                            maxImages={10}
                        />
                        {errors.images && (
                            <Text style={styles.errorText}>{errors.images}</Text>
                        )}
                    </View>

                    {/* Правая колонка - основная информация */}
                    <View style={styles.infoColumn}>
                        <InputField
                            label="Название товара"
                            value={currentFormData.name || ''}
                            onChangeText={handleNameChange}
                            error={errors.name}
                            placeholder="Введите название товара"
                            multiline={true}
                            required={true}
                            icon="📝"
                            maxLength={100}
                        />

                        {/* Выбор категорий (множественный) */}
                        <CategoryPicker
                            selectedCategories={currentFormData.categories}
                            onSelectCategories={handleCategoriesChange}
                            error={errors.categories}
                            allowMultiple={true}
                        />

                        <InputField
                            label="Вес товара (г)"
                            value={currentFormData.weight || ''}
                            onChangeText={handleWeightChange}
                            error={errors.weight}
                            keyboardType="numeric"
                            placeholder="Введите вес товара"
                            icon="⚖️"
                        />
                    </View>
                </View>
            </FormSection>

            {/* Поставщик (только для админов и сотрудников) */}
            {canChangeSupplier && (
                <FormSection title="Поставщик">
                                    <SupplierPicker
                    selectedSupplier={currentFormData.supplierId}
                    onSelectSupplier={handleSupplierChange}
                    error={errors.supplierId}
                />
                </FormSection>
            )}

            {/* Склады и остатки */}
            <FormSection title="Остатки по складам">
                <ProductWarehouseStockManager
                    productStocks={currentFormData.warehouseStocks || []}
                    onStocksChange={(stocks) => onFieldChange('warehouseStocks', stocks)}
                    error={errors.warehouseStocks}
                />
                
                {/* Поле только для отображения общего количества */}
                <View style={styles.totalQuantityContainer}>
                    <Text style={styles.totalQuantityLabel}>Общее количество на складах:</Text>
                    <Text style={styles.totalQuantityValue}>
                        {currentFormData.stockQuantity || '0'} шт.
                    </Text>
                </View>
            </FormSection>

            {/* Цена и коробка */}
            <FormSection title="Цена и упаковка">
                <View style={styles.row}>
                    <View style={styles.halfWidth}>
                        <InputField
                            label="Штук в коробке"
                            value={currentFormData.itemsPerBox || ''}
                            onChangeText={(text) => onFieldChange('itemsPerBox', text)}
                            error={errors.itemsPerBox}
                            keyboardType="numeric"
                            placeholder="Количество штук в коробке"
                            required={true}
                            icon="📦"
                        />
                    </View>

                    <View style={styles.halfWidth}>
                        <InputField
                            label="Цена за штуку (₽)"
                            value={currentFormData.price || ''}
                            onChangeText={handlePriceChange}
                            error={errors.price}
                            keyboardType="numeric"
                            placeholder="Введите цену за 1 шт"
                            required={true}
                            icon="₽"
                        />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.halfWidth}>
                        <InputField
                            label="Цена за коробку (₽)"
                            value={currentFormData.boxPrice || ''}
                            onChangeText={(text) => onFieldChange('boxPrice', text)}
                            error={errors.boxPrice}
                            keyboardType="numeric"
                            placeholder="Автоматически рассчитается"
                            icon="💰"
                        />
                    </View>

                    <View style={styles.halfWidth}>
                        <InputField
                            label="Скидка (%)"
                            value={currentFormData.discount || ''}
                            onChangeText={handleDiscountChange}
                            error={errors.discount}
                            keyboardType="numeric"
                            placeholder="Введите скидку"
                            icon="%"
                        />
                    </View>
                </View>
            </FormSection>

            {/* Количество коробок автоматически рассчитывается из остатков по складам */}

            {/* Описание товара */}
            <FormSection title="Описание">
                <InputField
                    label="Описание товара"
                    value={currentFormData.description || ''}
                    onChangeText={handleDescriptionChange}
                    error={errors.description}
                    placeholder="Введите описание товара"
                    multiline={true}
                    numberOfLines={4}
                    icon="📄"
                    maxLength={500}
                />

                <InputField
                    label="Артикул (SKU)"
                    value={currentFormData.sku || ''}
                    onChangeText={handleSkuChange}
                    error={errors.sku}
                    placeholder="Введите артикул товара"
                    icon="🏷️"
                />
            </FormSection>

            {/* Кнопка сохранения */}
            <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.disabledButton]}
                onPress={handleSubmit}
                activeOpacity={0.7}
                disabled={isLoading}
            >
                <Text style={styles.submitButtonText}>
                    {isLoading ? "Сохранение..." : "Сохранить изменения"}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: normalize(20),
        backgroundColor: Color.colorLightMode,
    },
    formTitle: {
        fontSize: normalizeFont(20),
        fontWeight: '700',
        color: Color.dark,
        marginBottom: normalize(24),
        fontFamily: FontFamily.sFProDisplay,
        textAlign: 'center',
    },
    imageAndInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: normalize(5),
    },
    imageColumn: {
        width: '40%',
    },
    infoColumn: {
        width: '55%',
    },
    row: {
        flexDirection: 'row',
        gap: normalize(12),
    },
    halfWidth: {
        flex: 1,
    },
    pickerContainer: {
        marginBottom: normalize(16),
    },
    fieldLabel: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: Color.dark,
        opacity: 0.4,
        marginBottom: normalize(8),
        fontFamily: FontFamily.sFProText,
    },
    submitButton: {
        backgroundColor: '#3B43A2',
        height: normalize(44),
        borderRadius: normalize(8),
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: normalize(20),
        marginBottom: normalize(30),
    },
    disabledButton: {
        backgroundColor: '#a0a0a0',
    },
    submitButtonText: {
        color: Color.colorLightMode,
        fontSize: normalizeFont(16),
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
    },
    totalQuantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: normalize(12),
    },
    totalQuantityLabel: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: Color.dark,
        opacity: 0.4,
        marginRight: normalize(8),
        fontFamily: FontFamily.sFProText,
    },
    totalQuantityValue: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
});

export default AdminProductEditForm;