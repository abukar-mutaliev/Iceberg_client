import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { deleteProduct, updateProduct, fetchProductById, selectCurrentProduct, selectProductById } from '@entities/product';
import { fetchCategories } from '@entities/category';
import { fetchProfile } from '@entities/profile';
import Text from '@shared/ui/Text/Text';
import { IconChange } from "@shared/ui/Icon/Profile";
import { Color, FontFamily } from "@app/styles/GlobalStyles";
import { selectIsAuthenticated, selectUser } from '@entities/auth';
import { EditProductModal } from "@widgets/EditProductModal";

/**
 * Компонент для отображения кнопок действий с продуктом (редактирование/удаление)
 *
 * @param {Object} product - Объект продукта
 * @returns {JSX.Element}
 */
export const ProductActions = React.memo(({ product }) => {
    const dispatch = useDispatch();
    const navigation = useNavigation();

    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);

    // Получаем информацию о пользователе и авторизации
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const user = useSelector(selectUser);
    const userRole = user?.role;
    const userSupplier = user?.supplier;

    // Напрямую получаем данные профиля из Redux
    const profileData = useSelector(state => state.profile?.data);

    const currentProduct = useSelector(selectCurrentProduct);
    const productFromStore = useSelector(state => selectProductById(state, product.id));

    // Определение activeProduct - ВАЖНО: это исправляет ошибку ReferenceError
    const activeProduct = useMemo(() => {
        if (currentProduct && currentProduct.id === product.id) {
            return currentProduct;
        }

        // Если есть продукт в products.items
        if (productFromStore) {
            return productFromStore;
        }

        // В противном случае используем продукт из props
        return product;
    }, [product, currentProduct, productFromStore]);

    // Логируем состояние для отладки
    console.log('ProductActions: Состояние авторизации:', {
        isAuthenticated,
        userRole,
        hasSupplier: Boolean(userSupplier),
        supplierId: userSupplier?.id,
        productSupplierId: activeProduct?.supplierId,
        profileLoaded: Boolean(profileData),
        profileId: profileData?.id
    });

    // Загружаем профиль поставщика, если необходимо
    useEffect(() => {
        // Если пользователь авторизован как SUPPLIER, но нет информации о поставщике
        if (isAuthenticated && userRole === 'SUPPLIER' && !userSupplier) {
            console.log('ProductActions: Загружаем профиль для поставщика');
            setIsLoadingProfile(true);

            dispatch(fetchProfile())
                .then(() => {
                    console.log('ProductActions: Профиль поставщика загружен успешно');
                })
                .catch(error => {
                    console.error('ProductActions: Ошибка загрузки профиля:', error);
                })
                .finally(() => {
                    setIsLoadingProfile(false);
                });
        }
    }, [dispatch, isAuthenticated, userRole, userSupplier]);

    // Функция для обработки входных данных
    const cleanFieldValue = (value, fieldType) => {
        if (!value) return '';

        if (typeof value !== 'string') {
            return value.toString();
        }

        let cleanValue = value;

        if (fieldType === 'weight') {
            cleanValue = value.replace(/\s*г\s*$/, '');
        } else if (fieldType === 'price') {
            cleanValue = value.replace(/\s*р\s*$/, '');
        } else if (fieldType === 'discount') {
            cleanValue = value.replace(/\s*%\s*$/, '');
        }

        return cleanValue;
    };

    // Функция для извлечения ID категории
    const getProductCategory = useMemo(() => {
        if (!activeProduct) return '';

        // Если есть поле category и оно не является объектом или имеет id
        if (activeProduct.category !== undefined && activeProduct.category !== null) {
            if (typeof activeProduct.category === 'number') {
                return activeProduct.category;
            } else if (typeof activeProduct.category === 'string' && !isNaN(activeProduct.category)) {
                return parseInt(activeProduct.category, 10);
            } else if (typeof activeProduct.category === 'object' && activeProduct.category.id) {
                return activeProduct.category.id;
            }
        }

        if (activeProduct.categories && Array.isArray(activeProduct.categories) && activeProduct.categories.length > 0) {
            const firstCategory = activeProduct.categories[0];
            if (typeof firstCategory === 'object' && firstCategory.id) {
                return firstCategory.id;
            } else if (typeof firstCategory === 'number') {
                return firstCategory;
            }
        }

        return '';
    }, [activeProduct]);

    useEffect(() => {
        dispatch(fetchCategories());
    }, [dispatch]);

    // Проверка прав доступа с использованием profileData
    const { canEdit, canDelete } = useMemo(() => {
        if (!isAuthenticated || !user) {
            console.log('ProductActions: нет авторизации');
            return { canEdit: false, canDelete: false };
        }

        const isAdmin = userRole === 'ADMIN';
        const isEmployee = userRole === 'EMPLOYEE';
        const isSupplier = userRole === 'SUPPLIER';

        // Администраторы и сотрудники всегда имеют доступ
        if (isAdmin || isEmployee) {
            console.log('ProductActions: доступ разрешен для ADMIN/EMPLOYEE');
            return { canEdit: true, canDelete: true };
        }

        // Для поставщиков, проверяем принадлежность продукта
        if (isSupplier) {
            // Проверяем доступ через profileData, если userSupplier отсутствует
            let supplierInfo = userSupplier;

            // Если нет supplier в user, но есть profileData и пользователь - поставщик
            if (!supplierInfo && profileData && profileData.id) {
                supplierInfo = {
                    id: profileData.id,
                    name: profileData.companyName
                };
                console.log('ProductActions: используем данные из профиля:', supplierInfo);
            }

            if (!supplierInfo) {
                console.log('ProductActions: нет информации о поставщике, но пользователь SUPPLIER');
                return { canEdit: false, canDelete: false };
            }

            const isProductOwner = activeProduct?.supplierId &&
                String(supplierInfo.id) === String(activeProduct.supplierId);

            console.log('ProductActions: проверка владения продуктом:', {
                supplierId: supplierInfo.id,
                productSupplierId: activeProduct?.supplierId,
                isMatch: isProductOwner
            });

            return {
                canEdit: isProductOwner,
                canDelete: isProductOwner
            };
        }

        return { canEdit: false, canDelete: false };
    }, [isAuthenticated, user, userRole, userSupplier, profileData, activeProduct]);

    const handleEdit = useCallback(() => {
        dispatch(fetchCategories());
        setIsEditModalVisible(true);
    }, [dispatch]);

    const handleDelete = useCallback(() => {
        Alert.alert(
            'Подтверждение удаления',
            `Вы уверены, что хотите удалить товар "${activeProduct.name}"?`,
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
                            await dispatch(deleteProduct(activeProduct.id)).unwrap();
                            Alert.alert('Успех', 'Товар успешно удален');
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Ошибка', error.toString());
                        }
                    },
                },
            ]
        );
    }, [dispatch, activeProduct, navigation]);

    const handleSaveProduct = useCallback((formData) => {
        const apiFormData = new FormData();

        apiFormData.append('name', formData.name || '');

        if (formData.category) {
            let categoryId = formData.category;

            if (typeof categoryId === 'object' && categoryId !== null && 'id' in categoryId) {
                categoryId = categoryId.id;
            }

            apiFormData.append('categories', JSON.stringify([categoryId]));
        }

        if (formData.weight) {
            const weight = typeof formData.weight === 'string'
                ? formData.weight.replace(/[^\d.]/g, '')
                : String(formData.weight);
            apiFormData.append('weight', weight);
        }

        if (formData.price) {
            const price = typeof formData.price === 'string'
                ? formData.price.replace(/[^\d.]/g, '')
                : String(formData.price);
            apiFormData.append('price', price);
        }

        if (formData.discount) {
            const discount = typeof formData.discount === 'string'
                ? formData.discount.replace(/[^\d.]/g, '')
                : String(formData.discount);
            apiFormData.append('discount', discount);
        }

        apiFormData.append('title', formData.title || '');
        apiFormData.append('description', formData.description || '');

        if (formData.image && (!activeProduct.images || formData.image !== activeProduct.images[0])) {
            const imageUri = formData.image.uri || formData.image;
            const filename = imageUri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            apiFormData.append('images', {
                uri: imageUri,
                name: filename,
                type,
            });
        }

        dispatch(updateProduct({
            productId: activeProduct.id,
            formData: apiFormData,
        }))
            .then(() => {
                return dispatch(fetchProductById(activeProduct.id));
            })
            .then(() => {
                Alert.alert('Успех', 'Товар успешно обновлен');
                setIsEditModalVisible(false);
            })
            .catch((error) => {
                Alert.alert('Ошибка', error.toString());
            });
    }, [dispatch, activeProduct]);

    const productForEdit = useMemo(() => {
        if (!activeProduct) return {};

        // Получаем категорию
        const categoryValue = getProductCategory;

        return {
            name: activeProduct.name || '',
            category: categoryValue,
            weight: cleanFieldValue(activeProduct.weight, 'weight'),
            price: cleanFieldValue(activeProduct.price, 'price'),
            discount: cleanFieldValue(activeProduct.discount, 'discount'),
            title: activeProduct.title || activeProduct.name || '',
            description: activeProduct.description || '',
            image: activeProduct.images?.[0] || null,
        };
    }, [activeProduct, getProductCategory, cleanFieldValue]);

    const handleCloseModal = useCallback(() => {
        setIsEditModalVisible(false);
    }, []);

    // Показываем индикатор загрузки, если загружаем профиль для поставщика
    if (isLoadingProfile) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3366FF" />
            </View>
        );
    }

    // Не отображаем компонент, если нет прав на редактирование или удаление
    if (!canEdit && !canDelete) {
        console.log('ProductActions: Компонент скрыт - нет прав доступа');
        return null;
    }

    return (
        <View style={styles.container}>
            {canEdit && (
                <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: '#3366FF' }]}
                    onPress={handleEdit}
                    activeOpacity={0.7}
                >
                    <Text style={styles.buttonText}>Редактировать</Text>
                    <IconChange color="#FFFFFF" />
                </TouchableOpacity>
            )}

            {canDelete && (
                <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: '#FF3B30' }]}
                    onPress={handleDelete}
                    activeOpacity={0.7}
                >
                    <Text style={styles.buttonText}>Удалить</Text>
                </TouchableOpacity>
            )}

            {/* Модальное окно редактирования */}
            <EditProductModal
                visible={isEditModalVisible}
                onClose={handleCloseModal}
                product={productForEdit}
                onSave={handleSaveProduct}
            />
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
    },
    buttonText: {
        fontWeight: '600',
        fontSize: 16,
        lineHeight: 23,
        fontFamily: FontFamily.sFProText,
        color: '#FFFFFF',
        marginRight: 8,
    },
    loadingContainer: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    }
});

export default ProductActions;