import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Alert,
    InteractionManager,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';

import { Color } from '@app/styles/GlobalStyles';
import { LoadingState } from "@shared/ui/states/LoadingState";
import { ErrorState } from "@shared/ui/states/ErrorState";

import { useAuth } from "@entities/auth/hooks/useAuth";
import { ProductImageGallery } from '@entities/product/ui/ProductImageGallery';
import { useProductDetail } from '@entities/product/hooks/useProductDetail';
import { useProductStock } from '@entities/warehouse/hooks/useProductStock';
import { selectCategories, selectCategoriesLoading, fetchCategories } from '@entities/category';
import ProductsService from '@entities/product/api/productsApi';

import { useAdminPermissions } from "@features/admin/hooks/useAdminPermissions";
import { useProductEdit } from "@features/admin/hooks/useProductEdit";
import { AdminProductBasicInfo, AdminProductEditForm, AdminProductHeader } from "@features/admin";
import {ProductWarehouseInfo} from "@entities/product";

export const AdminProductDetailScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const dispatch = useDispatch();
    const { currentUser } = useAuth();

    // Получаем ID продукта из параметров навигации
    const productId = route.params?.productId;
    const fromScreen = route.params?.fromScreen || 'ProductManagement';

    const [isInitialized, setIsInitialized] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const isMountedRef = useRef(true);
    
    const saveFormRef = useRef(null);

    const {
        product: displayProduct,
        supplier,
        isLoading: productLoading,
        error: productError,
        refreshData
    } = useProductDetail(productId);

    const {
        productStocks,
        totalStock,
        availableStock,
        warehousesWithStock,
        nearestWarehouses,
        loading: stockLoading,
        error: stockError,
        loadProductStock,
        findWarehousesWithProductStock,
        refreshProductStock,
        hasStock,
        isAvailable: stockAvailable,
        isLowStock,
        stats: stockStats
    } = useProductStock(productId, {
        autoLoad: true,
        findWarehouses: true
    });

    // Хуки для админской функциональности
    const {
        isEditMode,
        isSaving,
        editFormData,
        editErrors,
        removedImages,
        handleEditPress,
        handleCancelEdit,
        handleFieldChange,
        handleSaveEdit
    } = useProductEdit(productId, displayProduct);

    // Хук для проверки прав доступа
    const { canEdit, canDelete } = useAdminPermissions(currentUser, displayProduct?.supplierId);


    const categories = useSelector(selectCategories);

    useEffect(() => {
        if (!categories || categories.length === 0) {
            dispatch(fetchCategories());
        }
    }, [dispatch, categories]);

    const getBoxesText = useCallback((count) => {
        if (count % 10 === 1 && count % 100 !== 11) {
            return 'коробка';
        } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
            return 'коробки';
        } else {
            return 'коробок';
        }
    }, []);

    // Мемоизированные данные для отображения
    const displayData = useMemo(() => {
        if (!displayProduct) return null;

        const itemsPerBox = displayProduct.itemsPerBox || 1;
        const boxPrice = displayProduct.boxPrice || (displayProduct.price * itemsPerBox);
        const pricePerItem = displayProduct.price || (boxPrice / itemsPerBox);
        const stockBoxes = displayProduct.stockQuantity || 0;
        const totalItems = stockBoxes * itemsPerBox;

        return {
            // Коробочная информация
            boxPrice: boxPrice ? `${parseFloat(boxPrice).toFixed(0)} ₽` : 'Не указана',
            pricePerItem: pricePerItem ? `${parseFloat(pricePerItem).toFixed(0)} ₽` : 'Не указана',
            stockBoxes: stockBoxes ? `${stockBoxes} ${getBoxesText(stockBoxes)}` : '0 коробок',
            totalItems: totalItems ? `${totalItems} шт.` : '0 шт.',
            itemsPerBox: itemsPerBox,
            
            // Остальная информация
            weight: displayProduct.weight ? `${displayProduct.weight} г` : 'Не указан',
            discount: displayProduct.discount ? `${displayProduct.discount}%` : 'Нет скидки',
            categoryNames: (() => {
                // Поддерживаем как новый формат (categories массив), так и старый (category)
                let productCategories = [];
                if (displayProduct.categories && Array.isArray(displayProduct.categories)) {
                    productCategories = displayProduct.categories;
                } else if (displayProduct.category) {
                    productCategories = [displayProduct.category];
                }
                
                if (!productCategories || productCategories.length === 0) return 'Без категорий';
                
                const categoryNames = productCategories.map(category => {
                    // Если category - это объект с именем
                    if (typeof category === 'object' && category.name) {
                        return category.name;
                    }
                    
                    // Если category - это ID, ищем в загруженных категориях
                    if (typeof category === 'number' || typeof category === 'string') {
                        const categoryId = parseInt(category);
                        const foundCategory = categories?.find(cat => cat.id === categoryId);
                        if (foundCategory) {
                            return foundCategory.name;
                        }
                        // Если не нашли, возвращаем ID как строку
                        return `Категория ${category}`;
                    }
                    
                    return 'Неизвестная категория';
                }).filter(Boolean);
                
                return categoryNames.length > 0 ? categoryNames.join(', ') : 'Без категорий';
            })(),
            supplierName: (() => {
                if (supplier) {
                    return supplier.companyName || supplier.name || 'Не указан';
                }
                const productSupplier = displayProduct.supplier;
                if (!productSupplier) return 'Не указан';
                if (typeof productSupplier === 'string') return productSupplier;
                if (typeof productSupplier === 'object') {
                    return productSupplier.companyName || productSupplier.name || 'Не указан';
                }
                return 'Не указан';
            })()
        };
    }, [displayProduct, supplier, getBoxesText, categories]);

    // Отложенная инициализация
    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            if (isMountedRef.current) {
                setIsInitialized(true);
            }
        });

        return () => task.cancel();
    }, []);

    // Обработка размонтирования компонента
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // === Обработчики событий ===

    const handleGoBack = useCallback(() => {
        if (!isMountedRef.current) return;

        console.log('AdminProductDetailScreen: Going back, fromScreen:', fromScreen);

        // Простая навигация без InteractionManager
        try {
            if (navigation.canGoBack()) {
                navigation.goBack();
            } else {
                navigation.navigate('ProductManagement', {
                    fromScreen: 'AdminProductDetail'
                });
            }
        } catch (error) {
            console.error('Ошибка навигации:', error);
            // Fallback навигация
            navigation.navigate('ProductManagement');
        }
    }, [navigation, fromScreen]);

    const handleDeletePress = useCallback(async () => {
        if (!isMountedRef.current || isDeleting) return;

        const productName = displayProduct?.name || 'этот товар';

        Alert.alert(
            'Подтверждение удаления',
            `Вы уверены, что хотите удалить товар "${productName}"?\n\nЭто действие нельзя отменить.`,
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        if (!isMountedRef.current) return;

                        try {
                            setIsDeleting(true);
                            console.log('Удаление товара с ID:', productId);

                            const response = await ProductsService.deleteProduct(productId);
                            console.log('Ответ сервера на удаление:', response);
                            
                            if (response.status === 'success') {
                                const { action, hasOrders, hasSupplies } = response.data || {};
                                
                                let title = 'Успех';
                                let message = response.message;
                                
                                // Дополняем сообщение в зависимости от типа операции
                                if (action === 'archived') {
                                    title = 'Товар архивирован';
                                    if (hasOrders && hasSupplies) {
                                        message += '\n\nТовар связан с заказами и поставками, поэтому был архивирован вместо удаления.';
                                    } else if (hasOrders) {
                                        message += '\n\nТовар есть в заказах, поэтому был архивирован вместо удаления.';
                                    } else if (hasSupplies) {
                                        message += '\n\nТовар связан с поставками, поэтому был архивирован вместо удаления.';
                                    }
                                } else if (action === 'deleted') {
                                    title = 'Товар удален';
                                    message = message || 'Товар был полностью удален из системы.';
                                }
                                
                                Alert.alert(
                                    title,
                                    message,
                                    [
                                        {
                                            text: 'OK',
                                            onPress: () => {
                                                console.log('AdminProductDetailScreen: Навигация к ProductManagement с refresh: true');
                                                // Возвращаемся к списку товаров с автообновлением
                                                navigation.navigate('ProductManagement', {
                                                    fromScreen: 'AdminProductDetail',
                                                    refresh: true
                                                });
                                            }
                                        }
                                    ]
                                );
                            } else {
                                throw new Error(response.message || 'Не удалось удалить товар');
                            }
                        } catch (error) {
                            console.error('Ошибка удаления товара:', error);
                            
                            const errorMessage = error.response?.data?.message || 
                                               error.message || 
                                               'Произошла ошибка при удалении товара';
                            
                            Alert.alert('Ошибка', errorMessage);
                        } finally {
                            if (isMountedRef.current) {
                                setIsDeleting(false);
                            }
                        }
                    }
                }
            ]
        );
    }, [displayProduct, productId, isDeleting, navigation]);

    const handleRefreshData = useCallback(async () => {
        try {
            await Promise.all([
                refreshData(true),           // Обновляем данные продукта
                refreshProductStock()        // Обновляем данные складов
            ]);
        } catch (error) {
            console.error('Ошибка обновления данных:', error);
        }
    }, [refreshData, refreshProductStock]);

    // Новая функция для принудительного обновления продукта после редактирования
    const handleForceRefreshProduct = useCallback(async () => {
        try {
            console.log('[AdminProductDetailScreen] Принудительное обновление продукта:', productId);
            
            // Используем правильный механизм обновления через useProductDetail
            // refreshData(true) сбросит shouldReload и принудительно перезагрузит данные
            await refreshData(true);
            
            // Также обновляем данные складов
            await refreshProductStock();
            
            console.log('[AdminProductDetailScreen] Продукт успешно обновлен в UI');
        } catch (error) {
            console.error('Ошибка принудительного обновления продукта:', error);
        }
    }, [refreshData, refreshProductStock]);

    // === Рендеринг состояний ===

    if (!isInitialized || productLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <LoadingState
                    message={!isInitialized ? 'Инициализация...' : 'Загрузка продукта...'}
                />
            </SafeAreaView>
        );
    }

    if (productError || (!displayProduct && !productLoading)) {
        return (
            <SafeAreaView style={styles.container}>
                <ErrorState
                    message={productError || "Продукт не найден"}
                    description="Возможно, продукт был удален или у вас нет прав доступа"
                    actionText="Обновить"
                    onAction={handleRefreshData}
                />
            </SafeAreaView>
        );
    }

    if (!displayProduct || !displayData) {
        return (
            <SafeAreaView style={styles.container}>
                <ErrorState
                    message="Ошибка загрузки продукта"
                    description="Не удалось получить информацию о продукте"
                    actionText="Вернуться назад"
                    onAction={handleGoBack}
                />
            </SafeAreaView>
        );
    }

    // console.log('[AdminProductDetailScreen] Данные складов:', {
    //     warehousesWithStock: warehousesWithStock?.length,
    //     totalStock,
    //     availableStock,
    //     stockLoading,
    //     stockError
    // });

    // === Основной рендер ===

    return (
        <SafeAreaView style={styles.container}>
            {/* Заголовок с админскими действиями */}
            <AdminProductHeader
                title={displayProduct.name}
                onBack={handleGoBack}
                canEdit={canEdit}
                canDelete={canDelete}
                isEditMode={isEditMode}
                isSaving={isSaving}
                isDeleting={isDeleting}
                onEdit={handleEditPress}
                onSave={() => {
                    // Вызываем функцию сохранения из формы если она есть
                    if (saveFormRef.current) {
                        saveFormRef.current();
                    } else {
                        // Fallback к старой логике
                        handleSaveEdit();
                    }
                }}
                onCancel={handleCancelEdit}
                onDelete={handleDeletePress}
            />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Галерея изображений */}
                <ProductImageGallery
                    images={displayProduct?.images || [displayProduct?.image].filter(Boolean) || []}
                />

                {/* Основная информация или форма редактирования */}
                {isEditMode ? (
                    <AdminProductEditForm
                        formData={editFormData}
                        errors={editErrors}
                        removedImages={removedImages}
                        onFieldChange={handleFieldChange}
                        // Передаем функцию сохранения из хука
                        onSubmit={handleSaveEdit}
                        onSaveSuccess={(updatedProduct) => {
                            console.log('[AdminProductDetailScreen] Продукт успешно обновлен:', {
                                id: updatedProduct.id,
                                name: updatedProduct.name,
                                imagesCount: updatedProduct.images?.length || 0
                            });
                            
                            // Выходим из режима редактирования
                            handleCancelEdit();
                            
                            // Принудительно обновляем данные продукта
                            handleForceRefreshProduct();
                        }}
                        isLoading={isSaving}
                        canChangeSupplier={canEdit}
                        user={currentUser}
                        // Передаем данные продукта для инициализации
                        displayProduct={displayProduct}
                        // Данные приходят из хука useProductEdit
                        isEditMode={true}
                        // Передаем функцию для получения ссылки на сохранение
                        onGetSaveFunction={(saveFunction) => {
                            // Сохраняем функцию сохранения в ref для вызова из заголовка
                            saveFormRef.current = saveFunction;
                        }}
                    />
                ) : (
                    <AdminProductBasicInfo
                        product={displayProduct}
                        displayData={displayData}
                        showAdditionalInfo={true}
                        supplier={supplier}
                    />
                )}

                {/* Информация о складах - используем правильный компонент */}
                <ProductWarehouseInfo
                    warehousesWithStock={warehousesWithStock}
                    totalStock={totalStock}
                    availableStock={availableStock}
                    loading={stockLoading}
                    error={stockError}
                />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    scrollView: {
        flex: 1,
    },
});

export default AdminProductDetailScreen;