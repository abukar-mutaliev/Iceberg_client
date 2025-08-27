import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { StyleSheet, View, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {deleteProduct, fetchProductById, resetCurrentProduct, updateProductOptimistic} from '@entities/product';
import { fetchCategories } from '@entities/category';
import { fetchProfile } from '@entities/profile';
import Text from '@shared/ui/Text/Text';
import { IconChange } from "@shared/ui/Icon/Profile";
import { Color, FontFamily } from "@app/styles/GlobalStyles";
import { useAuth } from "@entities/auth/hooks/useAuth";
import { EditProductModal } from "@widgets/product/EditProductModal";


// Кастомный хук для проверки прав доступа к продукту
const useProductPermissions = (isAuthenticated, currentUser, productSupplierId) => {
    return useMemo(() => {
        if (!isAuthenticated || !currentUser) {
            return { canEdit: false, canDelete: false };
        }

        const userRole = currentUser?.role;
        const isAdmin = userRole === 'ADMIN';
        const isEmployee = userRole === 'EMPLOYEE';
        const isSupplier = userRole === 'SUPPLIER';
        const userSupplier = currentUser?.supplier;
        const profileData = currentUser?.profile;

        if (isAdmin || isEmployee) {
            return { canEdit: true, canDelete: true };
        }

        if (isSupplier) {
            let supplierInfo = userSupplier;

            if (!supplierInfo && profileData && profileData.id) {
                supplierInfo = {
                    id: profileData.id,
                    name: profileData.companyName
                };
            }

            if (!supplierInfo) {
                return { canEdit: false, canDelete: false };
            }

            const isProductOwner = productSupplierId &&
                String(supplierInfo.id) === String(productSupplierId);

            return {
                canEdit: isProductOwner,
                canDelete: isProductOwner
            };
        }

        return { canEdit: false, canDelete: false };
    }, [isAuthenticated, currentUser, productSupplierId]);
};

// Кастомный хук для подготовки данных продукта для редактирования
const useProductForEdit = (product) => {
    return useMemo(() => {
        if (!product) return {};

        // Функция для очистки значений полей
        const cleanFieldValue = (value) => {
            if (!value) return '';
            if (typeof value !== 'string') {
                return value.toString();
            }
            return value;
        };

        // Функция для извлечения ID категории
        const getProductCategory = () => {
            if (!product) return '';

            if (product.category !== undefined && product.category !== null) {
                if (typeof product.category === 'number') {
                    return product.category;
                } else if (typeof product.category === 'string' && !isNaN(product.category)) {
                    return parseInt(product.category, 10);
                } else if (typeof product.category === 'object' && product.category.id) {
                    return product.category.id;
                }
            }

            if (product.categories && Array.isArray(product.categories) && product.categories.length > 0) {
                const firstCategory = product.categories[0];
                if (typeof firstCategory === 'object' && firstCategory.id) {
                    return firstCategory.id;
                } else if (typeof firstCategory === 'number') {
                    return firstCategory;
                }
            }

            return '';
        };

        // Получаем категорию
        const categoryValue = getProductCategory();

        // Явно указываем supplierId для передачи в EditProductModal
        const productSupplierId = product.supplierId ?
            product.supplierId.toString() :
            '';

        return {
            id: product.id,
            name: product.name || '',
            category: categoryValue,
            weight: cleanFieldValue(product.weight),
            price: cleanFieldValue(product.price),
            discount: cleanFieldValue(product.discount),
            stockQuantity: product.stockQuantity ? product.stockQuantity.toString() : '',
            description: product.description || '',
            images: product.images || [],
            supplierId: productSupplierId,
        };
    }, [product]);
};

/**
 * Компонент для отображения кнопок действий с продуктом (редактирование/удаление)
 */
export const ProductActions = React.memo(({
                                              product,
                                              style = {},
                                              buttonStyle = {},
                                              textStyle = {},
                                              compact = false,
                                              onAddToCart,
                                              quantity,
                                              onProductUpdated,
                                              allowEdit = true,
                                              onAskQuestion
                                          }) => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const profileLoadedRef = useRef(false);

    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);

    // Используем кастомный хук для авторизации
    const { isAuthenticated, currentUser } = useAuth();

    // Используем хук для проверки прав доступа
    const { canEdit: hasEditPermission, canDelete } = useProductPermissions(
        isAuthenticated,
        currentUser,
        product?.supplierId
    );

    const canEdit = allowEdit && hasEditPermission;

    // Подготавливаем данные продукта для редактирования
    const productForEdit = useProductForEdit(product);

    // Загружаем профиль поставщика только один раз - с использованием useCallback
    const loadProfileIfNeeded = useCallback(async () => {
        if (isAuthenticated &&
            currentUser?.role === 'SUPPLIER' &&
            !currentUser?.supplier &&
            !profileLoadedRef.current &&
            !isLoadingProfile) {

            profileLoadedRef.current = true;
            setIsLoadingProfile(true);

            try {
                await dispatch(fetchProfile()).unwrap();
            } catch (error) {
                console.error('ProductActions: Ошибка загрузки профиля:', error);
            } finally {
                setIsLoadingProfile(false);
            }
        }
    }, [dispatch, isAuthenticated, currentUser?.role, currentUser?.supplier, isLoadingProfile]);

    // Загружаем профиль при монтировании компонента
    useEffect(() => {
        loadProfileIfNeeded();
    }, [loadProfileIfNeeded]);

    // Загружаем категории при открытии модального окна
    const handleOpenEditModal = useCallback(() => {
        dispatch(fetchCategories());
        setIsEditModalVisible(true);
    }, [dispatch]);



    // Обработчик удаления продукта
    const handleDelete = useCallback(() => {
        if (!product?.id || !product?.name) return;

        Alert.alert(
            'Подтверждение удаления',
            `Вы уверены, что хотите удалить товар "${product.name}"?`,
            [
                {
                    text: 'Отмена',
                    style: 'cancel',
                },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await dispatch(deleteProduct(product.id)).unwrap();
                            Alert.alert('Успех', 'Товар успешно удален');

                            // Сбрасываем текущий продукт в Redux
                            dispatch(resetCurrentProduct());

                            // Определяем, куда вернуться на основе навигационного контекста
                            const navigationState = navigation.getState();
                            const routes = navigationState?.routes || [];  
                            const currentRoute = routes[navigationState?.index];
                            
                            // Отладочная информация для навигации после удаления
                            console.log('ProductActions - Delete Navigation:', currentRoute?.name, currentRoute?.params);
                            
                            if (currentRoute?.name === 'ProductDetail') {
                                // Проверяем параметры текущего роута
                                const currentParams = currentRoute.params || {};
                                const fromScreen = currentParams.fromScreen;
                                const originalFromScreen = currentParams.originalFromScreen;
                                
                                if (fromScreen === 'ProductManagement' && originalFromScreen === 'AdminPanel') {
                                    navigation.navigate('MainTab', {
                                        screen: 'ProductManagement',
                                        params: { fromScreen: 'AdminPanel' }
                                    });
                                } else if (fromScreen === 'ProductManagement') {
                                    navigation.navigate('MainTab', {
                                        screen: 'ProductManagement'
                                    });
                                } else {
                                    navigation.goBack();
                                }
                            } else if (currentRoute?.name === 'ProductManagement') {
                                // Если мы на ProductManagement, проверяем его параметры
                                const currentParams = currentRoute.params || {};
                                const fromScreen = currentParams.fromScreen;
                                
                                if (fromScreen === 'AdminPanel') {
                                    // Остаемся на том же экране, просто товар удален из списка
                                    return;
                                } else {
                                    navigation.goBack();
                                }
                            } else {
                                navigation.goBack();
                            }
                        } catch (error) {
                            Alert.alert('Ошибка', error.toString());
                        }
                    },
                },
            ]
        );
    }, [dispatch, product?.id, product?.name, navigation]);

    // КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: обработчик сохранения продукта с глобальным обновлением
    const handleSaveProduct = useCallback(async (updatedProductData) => {
        if (!updatedProductData || !updatedProductData.id) {
            console.warn('ProductActions: Получены невалидные данные продукта');
            return;
        }

        console.log('ProductActions: Получены обновленные данные продукта:', updatedProductData);

        try {
            // 1. НЕМЕДЛЕННО применяем оптимистичное обновление в Redux
            // Это обновит данные везде, где используется products state
            dispatch(updateProductOptimistic(updatedProductData));
            console.log('ProductActions: Применено глобальное оптимистичное обновление в Redux');

            // 2. Обновляем UI через callback (для локального компонента)
            if (onProductUpdated && typeof onProductUpdated === 'function') {
                console.log('ProductActions: Применяем локальное оптимистичное обновление UI');
                onProductUpdated(updatedProductData);
            }

            // 3. Закрываем модальное окно
            setIsEditModalVisible(false);

            // 4. ВАЖНО: Теперь Redux автоматически обновит все компоненты,
            // включая ProductsList на главном экране, так как они используют
            // selectProducts селектор

            console.log('ProductActions: Обновление завершено успешно');

        } catch (error) {
            console.error('ProductActions: Ошибка при обработке обновленных данных:', error);
            Alert.alert('Предупреждение', 'Данные обновлены, но возможны проблемы с синхронизацией');
        }
    }, [dispatch, onProductUpdated]);

    // Обработчик закрытия модального окна
    const handleCloseModal = useCallback(() => {
        setIsEditModalVisible(false);
    }, []);

    // Показываем индикатор загрузки, если загружаем профиль для поставщика
    if (isLoadingProfile) {
        return (
            <View style={[styles.loadingContainer, style]}>
                <ActivityIndicator size="small" color="#3366FF" />
            </View>
        );
    }

    // Не отображаем компонент, если нет доступных действий
    if (!canEdit && !canDelete && !onAddToCart && !onAskQuestion) {
        return null;
    }

    // В компактном режиме показываем кнопки меньше и рядом
    if (compact) {
        return (
            <View style={[styles.compactContainer, style]}>
                {canEdit && (
                    <TouchableOpacity
                        style={[styles.compactButton, styles.editButtonColor, buttonStyle]}
                        onPress={handleOpenEditModal}
                        activeOpacity={0.7}
                    >
                        <IconChange color="#FFFFFF" width={16} height={16} />
                    </TouchableOpacity>
                )}

                {canDelete && (
                    <TouchableOpacity
                        style={[styles.compactButton, styles.deleteButtonColor, buttonStyle]}
                        onPress={handleDelete}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.compactButtonText, textStyle]}>✕</Text>
                    </TouchableOpacity>
                )}

                {/* Отображаем кнопку добавления в корзину, если передан обработчик и есть товар */}
                {onAddToCart && product && (
                    <TouchableOpacity
                        style={[styles.addToCartButton, buttonStyle]}
                        onPress={onAddToCart}
                        activeOpacity={0.7}
                    >
                        {/* Uncomment if needed:
                        <Text style={[styles.compactButtonText, textStyle]}>
                            Добавить в корзину {quantity > 1 ? `(${quantity})` : ''}
                        </Text>
                        */}
                    </TouchableOpacity>
                )}



                {isEditModalVisible && (
                    <EditProductModal
                        visible={isEditModalVisible}
                        onClose={handleCloseModal}
                        product={productForEdit}
                        onSave={handleSaveProduct}
                    />
                )}
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            {canEdit && (
                <TouchableOpacity
                    style={[styles.editButton, styles.editButtonColor, buttonStyle]}
                    onPress={handleOpenEditModal}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.buttonText, textStyle]}>Редактировать</Text>
                    <IconChange color="#FFFFFF" />
                </TouchableOpacity>
            )}

            {canDelete && (
                <TouchableOpacity
                    style={[styles.deleteButton, styles.deleteButtonColor, buttonStyle]}
                    onPress={handleDelete}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.buttonText, textStyle]}>Удалить</Text>
                </TouchableOpacity>
            )}



            {onAskQuestion && (
                <TouchableOpacity
                    style={[styles.editButton, styles.askButtonColor, buttonStyle]}
                    onPress={onAskQuestion}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.buttonText, textStyle]}>Задать вопрос</Text>
                </TouchableOpacity>
            )}

            {/* Модальное окно редактирования - рендерим только когда оно видимо */}
            {isEditModalVisible && (
                <EditProductModal
                    visible={isEditModalVisible}
                    onClose={handleCloseModal}
                    product={productForEdit}
                    onSave={handleSaveProduct}
                />
            )}


        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginTop: 10,
        marginBottom: 15,
        paddingHorizontal: 16,
        zIndex: 99,
        position: 'relative',
    },
    compactContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 99,
        position: 'relative',
        gap: 8,
    },
    editButton: {
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginBottom: 8,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
    },
    deleteButton: {
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
        marginBottom: 8,
    },
    addToCartButton: {
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        backgroundColor: '#4CAF50',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
    },
    compactButton: {
        borderRadius: 8,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
    },
    editButtonColor: {
        backgroundColor: '#3366FF',
    },
    deleteButtonColor: {
        backgroundColor: '#FF3B30',
    },
    askButtonColor: {
        backgroundColor: '#25D366',
    },

    buttonText: {
        fontWeight: '600',
        fontSize: 16,
        lineHeight: 23,
        fontFamily: FontFamily.sFProText,
        color: '#FFFFFF',
        marginRight: 8,
    },
    compactButtonText: {
        fontWeight: '600',
        fontSize: 14,
        fontFamily: FontFamily.sFProText,
        color: '#FFFFFF',
    },
    loadingContainer: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    }
});

export default React.memo(ProductActions)