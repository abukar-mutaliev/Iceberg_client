// @/pages/AdminProductDetailPage/ui/AdminProductDetailPage.jsx
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

// Shared
import { normalize } from '@shared/lib/normalize';
import { Color } from '@app/styles/GlobalStyles';

import { useAuth } from "@entities/auth/hooks/useAuth";
import { selectProductById, fetchProducts } from '@entities/product';
import { ProductImageGallery } from '@entities/product/ui/ProductImageGallery';
import { useProductDetail } from '@entities/product/hooks/useProductDetail';
import { useProductStock } from '@entities/warehouse/hooks/useProductStock';
import { WarehouseStockInfo } from '@entities/warehouse/ui/WarehouseStockInfo';

// Features - админская функциональность
import { AdminProductHeader } from '@features/admin-product-management/ui/AdminProductHeader';
import { AdminProductEditForm } from '@features/admin-product-management/ui/AdminProductEditForm';
import { useProductEdit } from '@features/admin-product-management/model/hooks/useProductEdit';
import { useAdminPermissions } from '@features/admin-product-management/model/hooks/useAdminPermissions';
import {LoadingState} from "@shared/ui/states/LoadingState";
import {ErrorState} from "@shared/ui/states/ErrorState";
import {AdminProductDetailScreen} from "@screens/product/AdminProductDetailScreen";

export const AdminProductDetailPage = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const dispatch = useDispatch();
    const { currentUser } = useAuth();

    // Получаем ID продукта из параметров навигации
    const productId = route.params?.productId;
    const fromScreen = route.params?.fromScreen || 'ProductManagement';

    // Состояния компонента
    const [isInitialized, setIsInitialized] = useState(false);

    // Ref для отслеживания состояния компонента
    const isMountedRef = useRef(true);

    // Используем СУЩЕСТВУЮЩИЙ хук для работы с деталями продукта
    const {
        product: displayProduct,
        supplier,
        isLoading: productLoading,
        error: productError,
        refreshData
    } = useProductDetail(productId);

    // Используем СУЩЕСТВУЮЩИЙ хук для работы со складами
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
        autoLoad: true,           // Автоматически загружаем остатки
        findWarehouses: true      // Ищем склады с товаром
    });

    // Хуки для админской функциональности
    const {
        isEditMode,
        isSaving,
        editFormData,
        editErrors,
        handleEditPress,
        handleCancelEdit,
        handleFieldChange,
        handleSaveEdit
    } = useProductEdit(productId, displayProduct);

    // Хук для проверки прав доступа
    const { canEdit, canDelete } = useAdminPermissions(currentUser);

    // Мемоизированные данные для отображения
    const displayData = useMemo(() => {
        if (!displayProduct) return null;

        return {
            price: displayProduct.price ? `${parseFloat(displayProduct.price).toFixed(0)} ₽` : 'Не указана',
            weight: displayProduct.weight ? `${displayProduct.weight} г` : 'Не указан',
            stock: displayProduct.stockQuantity ? `${displayProduct.stockQuantity} шт.` : '0 шт.',
            discount: displayProduct.discount ? `${displayProduct.discount}%` : 'Нет скидки',
            categoryName: (() => {
                const category = displayProduct.category || displayProduct.categories?.[0];
                if (!category) return 'Без категории';
                if (typeof category === 'string') return category;
                if (typeof category === 'object' && category.name) return category.name;
                return 'Без категории';
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
    }, [displayProduct, supplier]);


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

        console.log('AdminProductDetailPage: Going back, fromScreen:', fromScreen);

        InteractionManager.runAfterInteractions(() => {
            if (isMountedRef.current) {
                if (navigation.canGoBack()) {
                    navigation.goBack();
                } else {
                    navigation.navigate('ProductManagement', {
                        fromScreen: 'AdminProductDetail'
                    });
                }
            }
        });
    }, [navigation, fromScreen]);

    const handleDeletePress = useCallback(() => {
        if (!isMountedRef.current) return;

        Alert.alert(
            'Подтверждение',
            'Вы уверены, что хотите удалить этот товар?',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert('Информация', 'Функция удаления будет реализована позже');
                    }
                }
            ]
        );
    }, []);

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
                onEdit={handleEditPress}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
                onDelete={handleDeletePress}
            />

            {/* Галерея изображений - ВЫНЕСЕНА ИЗ ScrollView */}
            <ProductImageGallery
                images={displayProduct?.images || [displayProduct?.image].filter(Boolean) || []}
            />

            <ScrollView 
                style={styles.scrollView} 
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                scrollEventThrottle={16}
            >
                {/* Основная информация или форма редактирования */}
                {isEditMode ? (
                    <AdminProductEditForm
                        formData={editFormData}
                        errors={editErrors}
                        onFieldChange={handleFieldChange}
                    />
                ) : (
                    <AdminProductDetailScreen
                        product={displayProduct}
                        displayData={displayData}
                        showAdditionalInfo={true}
                        supplier={supplier}
                    />
                )}

                {/* Информация о складах - используем существующие данные */}
                <WarehouseStockInfo
                    warehousesWithStock={warehousesWithStock}
                    totalStock={totalStock}
                    availableStock={availableStock}
                    loading={stockLoading}
                    error={stockError}
                    productStocks={productStocks}
                    nearestWarehouses={nearestWarehouses}
                    hasStock={hasStock}
                    isLowStock={isLowStock}
                    stockStats={stockStats}
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

export default AdminProductDetailPage;