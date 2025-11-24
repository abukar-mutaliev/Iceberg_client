import React from 'react';
import {
    View,
    Text,
    Alert,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator
} from 'react-native';
import { useDispatch } from 'react-redux';
import { deleteProduct } from '@entities/product';
import { useProductManagement } from '@entities/product/hooks/useProductManagement';
import { useAuth } from '@entities/auth/hooks/useAuth';

export const ProductListScreen = () => {
    const dispatch = useDispatch();
    const { currentUser } = useAuth();

    // Используем кастомный хук для управления продуктами
    const {
        filteredProducts,
        isLoading,
        error,
        isRefreshing,
        handleRefresh,
        forceReloadData
    } = useProductManagement();

    const handleDeleteProduct = async (productId) => {
        try {
            await dispatch(deleteProduct(productId)).unwrap();
            Alert.alert('Готово', 'Продукт удален');

            // После удаления принудительно обновляем данные
            await forceReloadData();
        } catch (err) {
            Alert.alert('Ошибка', err.message || 'Не удалось удалить продукт');
        }
    };

    const renderProductCard = ({ item }) => {
        // Расчет коробочной информации
        const itemsPerBox = item.itemsPerBox || 1;
        const pricePerItem = item.price || 0;
        const boxPrice = item.boxPrice || (pricePerItem * itemsPerBox);
        const stockBoxes = item.stockQuantity || 0;
        const totalItems = stockBoxes * itemsPerBox;

        return (
            <View style={styles.card}>
                <Text style={styles.productName} numberOfLines={2}>
                    {item.name || 'Без названия'}
                </Text>

                {/* Цена за коробку или за штуку */}
                {/*<Text style={styles.productPrice}>*/}
                {/*    {itemsPerBox > 1*/}
                {/*        ? `${boxPrice.toFixed(0)} ₽/коробка`*/}
                {/*        : `${pricePerItem.toFixed(0)} ₽/шт.`*/}
                {/*    }*/}
                {/*</Text>*/}

                {/*/!* Информация об упаковке *!/*/}
                {/*{itemsPerBox > 1 && (*/}
                {/*    <Text style={styles.packagingInfo}>*/}
                {/*        {itemsPerBox} шт. в коробке*/}
                {/*    </Text>*/}
                {/*)}*/}

                {/*/!* Информация о складе *!/*/}
                {/*<Text style={styles.stockInfo}>*/}
                {/*    На складе: {stockBoxes} {itemsPerBox > 1 ? 'коробок' : 'шт.'}*/}
                {/*    {itemsPerBox > 1 && ` (${totalItems} шт.)`}*/}
                {/*</Text>*/}

                {/*<TouchableOpacity*/}
                {/*    style={styles.deleteButton}*/}
                {/*    onPress={() => handleDeleteProduct(item.id)}*/}
                {/*>*/}
                {/*    <Text style={styles.deleteButtonText}>Удалить</Text>*/}
                {/*</TouchableOpacity>*/}
            </View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Продукты отсутствуют</Text>
            {currentUser?.role === 'SUPPLIER' && (
                <Text style={styles.hintText}>
                    Добавьте продукты через раздел "Добавить продукт"
                </Text>
            )}
            <TouchableOpacity style={styles.refreshButton} onPress={forceReloadData}>
                <Text style={styles.refreshButtonText}>Обновить</Text>
            </TouchableOpacity>
        </View>
    );

    if (isLoading && !isRefreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0066cc" />
                <Text style={styles.loadingText}>Загрузка продуктов...</Text>
            </View>
        );
    }

    if (error && !filteredProducts.length) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={forceReloadData}>
                    <Text style={styles.retryButtonText}>Попробовать снова</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>
                    {currentUser?.role === 'SUPPLIER' ? 'Мои продукты' : 'Список продуктов'}
                </Text>
                <Text style={styles.count}>
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'товар' : 'товаров'}
                </Text>
            </View>

            {filteredProducts.length === 0 ? (
                renderEmptyState()
            ) : (
                <FlatList
                    data={filteredProducts}
                    renderItem={renderProductCard}
                    keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={['#0066cc']}
                            tintColor="#0066cc"
                        />
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    header: {
        marginBottom: 15,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    count: {
        fontSize: 14,
        color: '#666',
    },
    card: {
        width: 120,
        height: 150,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 10,
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        flex: 1,
    },
    productPrice: {
        fontSize: 12,
        color: '#666',
        marginVertical: 5,
    },
    packagingInfo: {
        fontSize: 12,
        color: '#666',
        marginVertical: 5,
    },
    stockInfo: {
        fontSize: 12,
        color: '#666',
        marginVertical: 5,
    },
    deleteButton: {
        backgroundColor: '#ff4444',
        borderRadius: 5,
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    listContainer: {
        paddingVertical: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
        marginTop: 10,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#ff4444',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#0066cc',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 18,
        textAlign: 'center',
        color: '#666',
        marginBottom: 10,
    },
    hintText: {
        fontSize: 14,
        textAlign: 'center',
        color: '#999',
        fontStyle: 'italic',
        marginBottom: 20,
    },
    refreshButton: {
        backgroundColor: '#0066cc',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    refreshButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ProductListScreen;