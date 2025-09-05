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
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import { useSelector } from 'react-redux';
import { MultipleImageUpload } from '@entities/product/ui/MultipleImageUpload';
import { CategoryPicker } from "@shared/ui/Pickers/CategoryPicker/ui/CategoryPicker";
import { SupplierPicker } from '@shared/ui/Pickers/SupplierPicker';
import { WarehouseQuantityPicker } from '@shared/ui/Pickers/WarehousePicker';
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
    handleSubmit
}) => {
    // Добавляем состояния для хранения высоты текстовых полей
    const [nameHeight, setNameHeight] = useState(30);
    const [descriptionHeight, setDescriptionHeight] = useState(60);

    // Обработчик изменения размера текста
    const handleContentSizeChange = (field, event) => {
        const { height } = event.nativeEvent.contentSize;
        if (field === 'name') {
            setNameHeight(Math.max(30, height));
        } else if (field === 'description') {
            setDescriptionHeight(Math.max(60, height));
        }
    };

    return (
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
                    {/* Название товара - теперь адаптивное */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Название товара *</Text>
                        <View style={{ overflow: "hidden" }}>
                            <TextInput
                                style={[
                                    styles.input,
                                    errors.name ? styles.inputError : null,
                                    { height: Math.max(30, nameHeight) }
                                ]}
                                value={String(formData.name || '')}
                                onChangeText={(text) => {
                                    // Простое обновление без InteractionManager для текстовых полей
                                    handleChange('name', text);
                                }}
                                onContentSizeChange={(e) => {
                                    if (e?.nativeEvent?.contentSize?.height) {
                                        handleContentSizeChange('name', e);
                                    }
                                }}
                                onFocus={() => {
                                    // Дополнительная защита от ViewState конфликтов при фокусе
                                    if (isSubmitting || isInteracting) {
                                        return false;
                                    }
                                }}
                                placeholder="Введите название"
                                multiline={true}
                                maxLength={100}
                                blurOnSubmit={true}
                                returnKeyType="done"
                                editable={!isSubmitting && !isInteracting}
                                selectTextOnFocus={false}
                                // Добавляем дополнительные настройки для стабильности
                                caretHidden={isSubmitting || isInteracting}
                                contextMenuHidden={true}
                            />
                        </View>
                        <View style={[styles.inputUnderline, errors.name ? styles.underlineError : null]} />
                        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
                    </View>

                    {/* Выпадающий список категорий */}
                    <CategoryPicker
                        selectedCategories={formData.categories || []}
                        onSelectCategories={handleCategoriesChange}
                        error={errors.categories}
                        allowMultiple={true}
                    />

                    {/* Поле веса товара */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Вес товара (г)</Text>
                        <View style={{ overflow: "hidden" }}>
                                                    <TextInput
                            style={[styles.input, errors.weight ? styles.inputError : null]}
                            value={String(formData.weight || '')}
                            onChangeText={(text) => handleChange('weight', text)}
                            onFocus={() => {
                                if (isSubmitting || isInteracting) {
                                    return false;
                                }
                            }}
                            placeholder="Введите вес"
                            keyboardType="numeric"
                            editable={!isSubmitting && !isInteracting}
                            caretHidden={isSubmitting || isInteracting}
                            contextMenuHidden={true}
                        />
                        </View>
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

            {/* Выбор складов */}
            <View style={styles.inputGroup}>
                <WarehouseQuantityPicker
                    selectedWarehouseQuantities={formData.warehouseQuantities}
                    onSelectWarehouseQuantities={handleWarehouseQuantitiesChange}
                    error={errors.warehouseQuantities}
                    isWarning={errors.warehouseQuantities && errors.warehouseQuantities.includes("будет добавлен на все")}
                />
            </View>

            {/* Ряд для цены за штуку и количества штук в коробке */}
            <View style={styles.inputsRow}>
                <View style={styles.inputContainerHalf}>
                    <Text style={styles.label}>Цена за штуку *</Text>
                    <View style={{ overflow: "hidden" }}>
                        <TextInput
                            style={[styles.input, errors.price ? styles.inputError : null]}
                            value={String(formData.price || '')}
                            onChangeText={(text) => handleChange('price', text)}
                            onFocus={() => {
                                if (isSubmitting || isInteracting) {
                                    return false;
                                }
                            }}
                            placeholder="Цена за 1 шт"
                            keyboardType="numeric"
                            editable={!isSubmitting && !isInteracting}
                            caretHidden={isSubmitting || isInteracting}
                            contextMenuHidden={true}
                        />
                    </View>
                    <View style={[styles.inputUnderline, errors.price ? styles.underlineError : null]} />
                    {errors.price ? <Text style={styles.errorText}>{errors.price}</Text> : null}
                </View>
                <View style={styles.inputContainerHalf}>
                    <Text style={styles.label}>Штук в коробке *</Text>
                    <View style={{ overflow: "hidden" }}>
                        <TextInput
                            style={[styles.input, errors.itemsPerBox ? styles.inputError : null]}
                            value={String(formData.itemsPerBox || '')}
                            onChangeText={(text) => handleChange('itemsPerBox', text)}
                            onFocus={() => {
                                if (isSubmitting || isInteracting) {
                                    return false;
                                }
                            }}
                            placeholder="Количество штук"
                            keyboardType="numeric"
                            editable={!isSubmitting && !isInteracting}
                            caretHidden={isSubmitting || isInteracting}
                            contextMenuHidden={true}
                        />
                    </View>
                    <View style={[styles.inputUnderline, errors.itemsPerBox ? styles.underlineError : null]} />
                    {errors.itemsPerBox ? <Text style={styles.errorText}>{errors.itemsPerBox}</Text> : null}
                </View>
            </View>

            {/* Ряд для цены за коробку и скидки */}
            <View style={styles.inputsRow}>
                <View style={styles.inputContainerHalf}>
                    <Text style={styles.label}>Цена за коробку</Text>
                    <View style={{ overflow: "hidden" }}>
                        <TextInput
                            style={[styles.input, errors.boxPrice ? styles.inputError : null]}
                            value={String(formData.boxPrice || '')}
                            onChangeText={(text) => handleChange('boxPrice', text)}
                            onFocus={() => {
                                if (isSubmitting || isInteracting) {
                                    return false;
                                }
                            }}
                            placeholder="Авто-расчет"
                            keyboardType="numeric"
                            editable={!isSubmitting && !isInteracting}
                            caretHidden={isSubmitting || isInteracting}
                            contextMenuHidden={true}
                        />
                    </View>
                    <View style={[styles.inputUnderline, errors.boxPrice ? styles.underlineError : null]} />
                    {errors.boxPrice ? <Text style={styles.errorText}>{errors.boxPrice}</Text> : null}
                </View>
                <View style={styles.inputContainerHalf}>
                    <Text style={styles.label}>Скидка (%)</Text>
                    <View style={{ overflow: "hidden" }}>
                        <TextInput
                            style={[styles.input, errors.discount ? styles.inputError : null]}
                            value={String(formData.discount || '')}
                            onChangeText={(text) => handleChange('discount', text)}
                            onFocus={() => {
                                if (isSubmitting || isInteracting) {
                                    return false;
                                }
                            }}
                            placeholder="Скидка"
                            keyboardType="numeric"
                            editable={!isSubmitting && !isInteracting}
                            caretHidden={isSubmitting || isInteracting}
                            contextMenuHidden={true}
                        />
                    </View>
                    <View style={[styles.inputUnderline, errors.discount ? styles.underlineError : null]} />
                    {errors.discount ? <Text style={styles.errorText}>{errors.discount}</Text> : null}
                </View>
            </View>

            {/* Количество коробок на складе */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Количество коробок на складе *</Text>
                <View style={{ overflow: "hidden" }}>
                    <TextInput
                        style={[styles.input, errors.stockQuantity ? styles.inputError : null]}
                        value={String(formData.stockQuantity || '')}
                        onChangeText={(text) => handleChange('stockQuantity', text)}
                        onFocus={() => {
                            if (isSubmitting || isInteracting) {
                                return false;
                            }
                        }}
                        placeholder="Количество коробок"
                        keyboardType="numeric"
                        editable={!isSubmitting && !isInteracting}
                        caretHidden={isSubmitting || isInteracting}
                        contextMenuHidden={true}
                    />
                </View>
                <View style={[styles.inputUnderline, errors.stockQuantity ? styles.underlineError : null]} />
                {errors.stockQuantity ? <Text style={styles.errorText}>{errors.stockQuantity}</Text> : null}
            </View>

            {/* Описание товара - теперь адаптивное */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Описание товара</Text>
                <View style={{ overflow: "hidden" }}>
                    <TextInput
                        style={[
                            styles.input,
                            styles.textArea,
                            errors.description ? styles.inputError : null,
                            { height: descriptionHeight }
                        ]}
                        value={String(formData.description || '')}
                        onChangeText={(text) => handleChange('description', text)}
                        onContentSizeChange={(e) => handleContentSizeChange('description', e)}
                        placeholder="Введите описание"
                        multiline={true}
                        textAlignVertical="top"
                        editable={!isSubmitting && !isInteracting}
                        blurOnSubmit={true}
                    />
                </View>
                <View style={[styles.inputUnderline, errors.description ? styles.underlineError : null]} />
                {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}
            </View>

            {/* Кнопка сохранения */}
            <TouchableOpacity
                style={[styles.submitButton, (isSubmitting || isInteracting) ? styles.disabledButton : null]}
                onPress={handleSubmit}
                activeOpacity={0.7}
                disabled={isSubmitting || isInteracting}
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
                    // Извлекаем склады с количествами из ответа
                    const warehouseQuantities = warehouses.map(w => ({
                        warehouseId: w.warehouseId || w.id,
                        quantity: w.quantity || w.stockQuantity || w.amount || 0
                    }));
                    console.log('[EditProductModal] Загружены склады продукта с количествами:', warehouseQuantities);
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

        if (!formData.stockQuantity) {
            newErrors.stockQuantity = 'Введите количество коробок на складе';
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
                    />
                </ScrollView>
            ) : (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B43A2" />
                    <Text style={styles.loadingText}>Загрузка формы...</Text>
                </View>
            )}
        </ReusableModal>
    );
});

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
        minHeight: 30,
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
        minHeight: 60,
        textAlignVertical: 'top',
        paddingTop: 5,
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
    },
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