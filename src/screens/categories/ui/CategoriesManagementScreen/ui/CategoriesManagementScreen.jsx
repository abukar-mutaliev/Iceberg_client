import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchCategories,
    deleteCategory,
    updateCategory,
    createCategory,
    selectCategories,
    selectCategoriesLoading,
    selectCategoriesError,
    clearError
} from '@entities/category';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import { AdminHeader } from '@widgets/admin/AdminHeader';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CategoryListItem } from './CategoryListItem';
import { AddCategoryModal } from './AddCategoryModal';
import {ErrorState} from "@shared/ui/states/ErrorState";
import {fetchProducts, selectProducts} from "@entities/product";
import {CategoryIcon} from "@entities/category/ui/CategoryIcon";

export const CategoriesManagementScreen = () => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const route = useRoute();
    const categories = useSelector(selectCategories);
    const products = useSelector(selectProducts);
    const isLoading = useSelector(selectCategoriesLoading);
    const error = useSelector(selectCategoriesError);
    const [isAddModalVisible, setAddModalVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [operationInProgress, setOperationInProgress] = useState(false);

    const loadCategories = useCallback(async () => {
        setRefreshing(true);
        try {
            dispatch(clearError());
            await dispatch(fetchCategories()).unwrap();
            await dispatch(fetchProducts()).unwrap();
        } catch (err) {
            console.error('Error loading categories:', err);
            Alert.alert(
                'Ошибка загрузки',
                'Не удалось загрузить список категорий. Попробуйте еще раз.',
                [{ text: 'OK' }]
            );
        } finally {
            setRefreshing(false);
        }
    }, [dispatch]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    const handleBackPress = () => {
        console.log('CategoriesManagement: Going back');
        
        // Получаем параметры возврата из роута
        const { fromScreen, returnTo } = route.params || {};
        
        // Если пришли из AdminPanel, возвращаемся туда
        if (fromScreen === 'AdminPanel' || returnTo === 'AdminPanel') {
            console.log('CategoriesManagement: Returning to AdminPanel');
            if (navigation.canGoBack()) {
                navigation.goBack();
            } else {
                // Если нет возможности вернуться назад, переходим к AdminPanel через профиль
                navigation.navigate('Main', {
                    screen: 'ProfileTab', 
                    params: {
                        screen: 'ProfileMain'
                    }
                });
            }
            return;
        }
        
        // Стандартное поведение - проверяем, можем ли мы вернуться назад
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            // Если нет возможности вернуться назад, переходим к профилю
            console.log('CategoriesManagement: Going back to Profile');
            navigation.navigate('Main', {
                screen: 'ProfileTab',
                params: {
                    screen: 'ProfileMain'
                }
            });
        }
    };

    const handleAddCategory = () => {
        setSelectedCategory(null);
        setAddModalVisible(true);
    };

    const handleEditCategory = (category) => {
        setSelectedCategory(category);
        setAddModalVisible(true);
    };

    const handleDeleteCategory = (categoryId) => {
        Alert.alert(
            'Подтверждение',
            'Вы действительно хотите удалить эту категорию?',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        setOperationInProgress(true);
                        try {
                            await dispatch(deleteCategory(categoryId)).unwrap();
                            Alert.alert('Успех', 'Категория успешно удалена');
                            await loadCategories();
                        } catch (err) {
                            Alert.alert('Ошибка', typeof err === 'string' ? err : 'Не удалось удалить категорию');
                        } finally {
                            setOperationInProgress(false);
                        }
                    }
                }
            ]
        );
    };

    const handleModalClose = () => {
        setAddModalVisible(false);
        setSelectedCategory(null);
    };

    const handleCategoryFormSubmit = async (formData) => {
        setOperationInProgress(true);
        try {
            if (selectedCategory) {
                await dispatch(updateCategory({
                    id: selectedCategory.id,
                    categoryData: formData
                })).unwrap();
                Alert.alert('Успех', 'Категория успешно обновлена');
            } else {
                await dispatch(createCategory(formData)).unwrap();
                Alert.alert('Успех', 'Категория успешно создана');
            }

            setAddModalVisible(false);

            await loadCategories();

            return true;
        } catch (error) {
            const errorMessage = typeof error === 'string' ? error : 'Произошла ошибка при сохранении категории';
            Alert.alert('Ошибка', errorMessage);
            return false;
        } finally {
            setOperationInProgress(false);
        }
    };

    const renderCategoryItem = ({ item }) => (
        <CategoryListItem
            category={item}
            products={products}
            onEdit={() => handleEditCategory(item)}
            onDelete={() => handleDeleteCategory(item.id)}
        />
    );

    return (
        <View style={styles.container}>
            <AdminHeader
                title="Управление категориями"
                onBack={handleBackPress}
                icon={<CategoryIcon width={24} height={24} color={Color.blue2} />}
            />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Список категорий</Text>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleAddCategory}
                        disabled={operationInProgress}
                    >
                        <Text style={styles.addButtonText}>Добавить категорию</Text>
                    </TouchableOpacity>
                </View>

                {isLoading && !refreshing ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Color.blue2} />
                        <Text style={styles.loadingText}>Загрузка категорий...</Text>
                    </View>
                ) : error ? (
                    <ErrorState
                        message={error || 'Ошибка загрузки категорий'}
                        onRetry={loadCategories}
                        buttonText="Повторить"
                    />
                ) : categories.length === 0 ? (
                    <View style={styles.centered}>
                        <Text style={styles.emptyText}>Категории отсутствуют</Text>
                        <TouchableOpacity
                            style={styles.addEmptyButton}
                            onPress={handleAddCategory}
                        >
                            <Text style={styles.addButtonText}>Добавить первую категорию</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={categories}
                        products={products}
                        renderItem={renderCategoryItem}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.listContainer}
                        refreshing={refreshing}
                        onRefresh={loadCategories}
                    />
                )}
            </View>

            <AddCategoryModal
                visible={isAddModalVisible}
                onClose={handleModalClose}
                onSubmit={handleCategoryFormSubmit}
                category={selectedCategory}
                isSubmitting={operationInProgress}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    content: {
        flex: 1,
        padding: normalize(16),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(16),
    },
    title: {
        fontSize: normalizeFont(FontSize.size_lg),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
    },
    addButton: {
        backgroundColor: Color.blue2,
        paddingVertical: normalize(8),
        paddingHorizontal: normalize(12),
        borderRadius: Border.radius.small,
    },
    addEmptyButton: {
        backgroundColor: Color.blue2,
        paddingVertical: normalize(10),
        paddingHorizontal: normalize(16),
        borderRadius: Border.radius.small,
        marginTop: normalize(16),
    },
    addButtonText: {
        color: Color.colorLightMode,
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginTop: normalize(10),
    },
    emptyText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
    },
    listContainer: {
        paddingBottom: normalize(16),
    },
});