import React, { useEffect } from 'react';
import { View, Text, Button, Alert, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts, deleteProduct, selectProducts, selectProductsLoading, selectProductsError } from '@entities/product';
import { fetchProfile, selectProfile, selectProfileLoading, selectProfileError } from '@entities/profile';
import { selectUser } from '@entities/auth';

export const ProductListScreen = () => {
    const dispatch = useDispatch();
    const products = useSelector(selectProducts);
    const productsLoading = useSelector(selectProductsLoading);
    const productsError = useSelector(selectProductsError);
    const profile = useSelector(selectProfile);
    const profileLoading = useSelector(selectProfileLoading);
    const profileError = useSelector(selectProfileError);
    const user = useSelector(selectUser);

    useEffect(() => {
        if (user?.role === 'SUPPLIER') {
            dispatch(fetchProfile());
        } else {
            dispatch(fetchProducts());
        }
    }, [dispatch, user]);

    useEffect(() => {

    }, [products, profile]);

    const handleDeleteProduct = async (productId) => {
        try {
            await dispatch(deleteProduct(productId)).unwrap();
            Alert.alert('Успех', 'Продукт удален');
        } catch (err) {
            Alert.alert('Ошибка', err.message || 'Не удалось удалить продукт');
        }
    };

    const filteredProducts = user?.role === 'SUPPLIER'
        ? (profile?.products || [])
        : products;

    const renderProductCard = ({ item }) => (
        <View style={styles.card}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productPrice}>{item.price} руб.</Text>
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteProduct(item.id)}
            >
                <Text style={styles.deleteButtonText}>Удалить</Text>
            </TouchableOpacity>
        </View>
    );

    if (productsLoading || profileLoading) return <Text style={styles.loadingText}>Загрузка продуктов...</Text>;
    if (productsError) return <Text style={styles.errorText}>Ошибка продуктов: {productsError}</Text>;
    if (profileError && user?.role === 'SUPPLIER') return <Text style={styles.errorText}>Ошибка профиля: {profileError}</Text>;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Список продуктов</Text>
            {filteredProducts.length === 0 ? (
                <Text style={styles.emptyText}>Продукты отсутствуют</Text>
            ) : (
                <FlatList
                    data={filteredProducts}
                    renderItem={renderProductCard}
                    keyExtractor={(item) => item.id.toString()}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
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
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
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
    },
    productPrice: {
        fontSize: 12,
        color: '#666',
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
    loadingText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    },
    errorText: {
        fontSize: 16,
        color: 'red',
        textAlign: 'center',
        marginTop: 20,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
        color: '#666',
        marginTop: 20,
    },
});

export default ProductListScreen;