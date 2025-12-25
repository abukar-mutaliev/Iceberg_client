import { useState, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Alert, InteractionManager } from 'react-native';
import { fetchProducts } from '@entities/product';
import WarehouseService from '@entities/warehouse/api/warehouseApi';

/**
 * Хук для админского редактирования продукта
 * @param {number|string} productId - ID продукта
 * @param {Object} displayProduct - Данные продукта для редактирования
 * @returns {Object} - Состояние и методы редактирования
 */
export const useProductEdit = (productId, displayProduct) => {
    const dispatch = useDispatch();
    const isMountedRef = useRef(true);

    // Состояния редактирования
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editFormData, setEditFormData] = useState({});
    const [editErrors, setEditErrors] = useState({});
    const [removedImages, setRemovedImages] = useState([]);

    // Функция для загрузки остатков продукта по складам
    const loadProductStocks = useCallback(async (productId) => {
        try {
            // console.log('[useProductEdit] Загружаем остатки для продукта:', productId);
            const response = await WarehouseService.getProductStock(productId);

            if (response?.data?.stocks) {
                const warehouseStocks = response.data.stocks.map(stock => ({
                    warehouseId: stock.warehouseId,
                    quantity: stock.quantity
                }));
                // console.log('[useProductEdit] Загружены остатки продукта:', warehouseStocks);
                return warehouseStocks;
            }
            return [];
        } catch (error) {
            console.error('[useProductEdit] Ошибка загрузки остатков продукта:', error);
            return [];
        }
    }, []);

    // Инициализация формы редактирования
    const initializeEditForm = useCallback(() => {
        if (!displayProduct || !isMountedRef.current) return;

        // Обработка категорий - поддерживаем множественный выбор
        let categoryIds = [];
        if (displayProduct.categories && Array.isArray(displayProduct.categories)) {
            categoryIds = displayProduct.categories.map(cat => {
                if (typeof cat === 'object' && cat.id) {
                    return cat.id;
                } else if (typeof cat === 'number') {
                    return cat;
                } else if (typeof cat === 'string' && !isNaN(cat)) {
                    return parseInt(cat, 10);
                }
                return null;
            }).filter(Boolean);
        } else if (displayProduct.category) {
            const category = displayProduct.category;
            if (typeof category === 'number') categoryIds = [category];
            else if (typeof category === 'string' && !isNaN(category)) categoryIds = [parseInt(category, 10)];
            else if (typeof category === 'object' && category.id) categoryIds = [category.id];
        }

        // Обработка поставщика - правильно извлекаем ID
        let supplierId = '';
        if (displayProduct.supplierId) {
            supplierId = displayProduct.supplierId.toString();
        } else if (displayProduct.supplier) {
            if (typeof displayProduct.supplier === 'object' && displayProduct.supplier.id) {
                supplierId = displayProduct.supplier.id.toString();
            } else if (typeof displayProduct.supplier === 'string') {
                supplierId = displayProduct.supplier;
            } else if (typeof displayProduct.supplier === 'number') {
                supplierId = displayProduct.supplier.toString();
            }
        }

        console.log('[useProductEdit] Инициализация поставщика:', {
            displayProductSupplierId: displayProduct.supplierId,
            displayProductSupplier: displayProduct.supplier,
            extractedSupplierId: supplierId
        });

        const formData = {
            name: displayProduct.name || '',
            price: displayProduct.price ? displayProduct.price.toString() : '',
            itemsPerBox: displayProduct.itemsPerBox ? displayProduct.itemsPerBox.toString() : '1',
            boxPrice: displayProduct.boxPrice ? displayProduct.boxPrice.toString() : '',
            weight: displayProduct.weight ? displayProduct.weight.toString() : '',
            stockQuantity: displayProduct.stockQuantity ? displayProduct.stockQuantity.toString() : '',
            discount: displayProduct.discount ? displayProduct.discount.toString() : '',
            description: displayProduct.description || '',
            categories: categoryIds, // Изменено с category на categories
            sku: displayProduct.sku || '',
            supplierId: supplierId, // Добавляем инициализацию поставщика
            isActive: displayProduct.isActive !== undefined ? displayProduct.isActive : true,
            warehouseStocks: [], // Будем загружать асинхронно
            images: displayProduct.images || [] // Добавляем существующие изображения
        };

        if (isMountedRef.current) {
            setEditFormData(formData);
            setEditErrors({});
            
            // Загружаем остатки продукта по складам асинхронно
            if (displayProduct.id) {
                loadProductStocks(displayProduct.id).then(warehouseStocks => {
                    if (isMountedRef.current) {
                        // Рассчитываем общее количество из остатков по складам
                        const totalQuantity = warehouseStocks.reduce((sum, stock) => sum + (stock.quantity || 0), 0);
                        
                        setEditFormData(prev => ({
                            ...prev,
                            warehouseStocks: warehouseStocks,
                            stockQuantity: totalQuantity.toString() // Автоматически обновляем общее количество
                        }));
                        
                        console.log('[useProductEdit] Загружены остатки по складам:', {
                            warehouseStocks,
                            totalQuantity
                        });
                    }
                });
            }
        }
    }, [displayProduct, loadProductStocks]);

    // Обработчики
    const handleEditPress = useCallback(() => {
        if (!isMountedRef.current || isEditMode || isSaving) return;

        initializeEditForm();

        InteractionManager.runAfterInteractions(() => {
            if (isMountedRef.current) {
                setIsEditMode(true);
            }
        });
    }, [isEditMode, isSaving, initializeEditForm]);

    const handleCancelEdit = useCallback(() => {
        if (!isMountedRef.current) return;

        InteractionManager.runAfterInteractions(() => {
            if (isMountedRef.current) {
                setIsEditMode(false);
                setEditFormData({});
                setEditErrors({});
                setRemovedImages([]);
            }
        });
    }, []);

    const handleFieldChange = useCallback((field, value) => {
        if (!isMountedRef.current || !isEditMode) return;

        // Специальная обработка для изображений - отслеживаем удаленные
        if (field === 'images') {
            const currentImages = editFormData.images || displayProduct?.images || [];
            const newImages = value || [];
            
            // Находим удаленные изображения (те что были в currentImages но нет в newImages)
            const removed = currentImages.filter(img => 
                typeof img === 'string' && 
                (img.startsWith('http://') || img.startsWith('https://')) &&
                !newImages.includes(img)
            );
            
            if (removed.length > 0) {
                setRemovedImages(prev => [...prev, ...removed.filter(img => !prev.includes(img))]);
            }
        }

        // Специальная обработка для остатков по складам - автоматически рассчитываем общее количество
        if (field === 'warehouseStocks') {
            const warehouseStocks = value || [];
            const totalQuantity = warehouseStocks.reduce((sum, stock) => sum + (stock.quantity || 0), 0);
            
            console.log('[useProductEdit] Обновление остатков по складам:', {
                warehouseStocks,
                totalQuantity
            });
            
            setEditFormData(prev => ({
                ...prev,
                [field]: value,
                stockQuantity: totalQuantity.toString() // Автоматически обновляем общее количество
            }));
            
            // Сбрасываем ошибки
            setEditErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                delete newErrors.stockQuantity; // Убираем ошибку общего количества тоже
                return newErrors;
            });
            
            return; // Выходим, чтобы не выполнить обычную логику ниже
        }

        setEditFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Сбрасываем ошибку поля при изменении
        setEditErrors(prev => {
            if (prev[field]) {
                const { [field]: removedError, ...rest } = prev;
                return rest;
            }
            return prev;
        });
    }, [isEditMode, editFormData.images, displayProduct?.images]);

    const handleSaveEdit = useCallback(async () => {
        if (!isMountedRef.current || isSaving || !displayProduct) return;

        // // Валидация формы
        // const validation = validateProductForm(editFormData);
        // if (!validation.isValid) {
        //     setEditErrors(validation.errors);
        //     return;
        // }

        setIsSaving(true);

        try {
            // Динамический импорт для избежания циклических зависимостей
            const { updateProductWithImages } = await import('@shared/api/uploadHelpers');

            const productData = {
                name: editFormData.name.trim(),
                price: parseFloat(editFormData.price),
                itemsPerBox: editFormData.itemsPerBox ? parseInt(editFormData.itemsPerBox) : 1,
                boxPrice: editFormData.boxPrice ? parseFloat(editFormData.boxPrice) : null,
                stockQuantity: parseInt(editFormData.stockQuantity),
                weight: editFormData.weight ? parseFloat(editFormData.weight) : null,
                discount: editFormData.discount ? parseFloat(editFormData.discount) : null,
                description: editFormData.description?.trim() || '',
                categories: editFormData.categories || [], // Изменено с category на categories
                sku: editFormData.sku?.trim() || null,
                isActive: editFormData.isActive,
                warehouseStocks: editFormData.warehouseStocks || []
            };

            // console.log('[useProductEdit] Сохранение данных:', {
            //     ...productData,
            //     warehousesDetail: {
            //         original: editFormData.warehouses,
            //         isArray: Array.isArray(editFormData.warehouses),
            //         length: editFormData.warehouses?.length,
            //         final: productData.warehouses
            //     }
            // });

            const result = await updateProductWithImages({
                productId: displayProduct.id,
                formData: productData,
                images: editFormData.images || displayProduct.images || [],
                removeImages: removedImages
            });

            if (isMountedRef.current && result && (result.status === 'success' || result.success)) {
                // Обновляем список продуктов в store
                dispatch(fetchProducts(true)); // Принудительное обновление

                InteractionManager.runAfterInteractions(() => {
                    if (isMountedRef.current) {
                        setIsEditMode(false);
                        setEditFormData({});
                        setEditErrors({});
                        setRemovedImages([]);
                        Alert.alert('Успешно', 'Изменения сохранены');
                    }
                });
                
                // Возвращаем успешный результат с обновленными данными
                return { success: true, data: result.data || result };
            } else if (isMountedRef.current) {
                const errorMessage = result?.message || result?.error || 'Произошла ошибка при сохранении';
                Alert.alert('Ошибка', errorMessage);
                return { success: false, error: errorMessage };
            }
        } catch (error) {
            console.error('[useProductEdit] Ошибка при сохранении:', error);
            if (isMountedRef.current) {
                Alert.alert('Ошибка', 'Произошла ошибка при сохранении данных');
            }
        } finally {
            if (isMountedRef.current) {
                setIsSaving(false);
            }
        }
        
        return { success: false, error: 'Неизвестная ошибка' };
    }, [editFormData, displayProduct, dispatch, isSaving]);

    // Cleanup при размонтировании
    useCallback(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    return {
        // Состояние
        isEditMode,
        isSaving,
        editFormData,
        editErrors,
        removedImages,

        // Методы
        handleEditPress,
        handleCancelEdit,
        handleFieldChange,
        handleSaveEdit,

        // Вспомогательные свойства
        canEdit: !!displayProduct && !isSaving,
        hasChanges: Object.keys(editFormData).length > 0,
        isFormValid: Object.keys(editErrors).length === 0
    };
};