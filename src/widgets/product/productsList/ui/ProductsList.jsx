import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text, FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
    selectProducts,
    selectProductsLoading,
    selectProductsError
} from '@entities/product/model/selectors';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';

import defaultImage from '@assets/images/chocolate-icecream.png';
import {ProductCard} from "@entities/product/ui/ProductCard";

export const ProductsList = ({
                                 fromScreen = 'ProductsList',
                                 onProductPress,
                                 visibleProducts,
                                 onEndReached
                             }) => {
    const navigation = useNavigation();
    const products = useSelector(selectProducts);
    const isLoading = useSelector(selectProductsLoading);
    const error = useSelector(selectProductsError);

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Ошибка загрузки продуктов: {error}</Text>
            </View>
        );
    }

    if (!Array.isArray(products) || products.length === 0) {
        return (
            <View style={styles.noProductsContainer}>
                <Text style={styles.noProductsText}>Товары не найдены</Text>
            </View>
        );
    }
    const validProducts = products.filter(product => product !== undefined);


    if (validProducts.length === 0) {
        return (
            <View style={styles.noProductsContainer}>
                <Text style={styles.noProductsText}>Товары не найдены</Text>
            </View>
        );
    }

    const displayProducts = products.slice(0, visibleProducts);

    const adaptedProducts = displayProducts.map(product => ({
        id: product.id,
        title: product.name,
        description: product.description,
        price: product.price.toString(),
        image: product.images && product.images.length > 0
            ? { uri: product.images[0] }
            : defaultImage,
        originalData: product
    }));

    const handleProductPress = (product) => {
        if (onProductPress) {
            onProductPress(product.id);
        } else {
            navigation.navigate('ProductDetail', {
                productId: product.id,
                product: {
                    id: product.id,
                    name: product.title,
                    description: product.description,
                    type: product.originalData.type || 'Рожок',
                    shortDescription: product.description?.substring(0, 100) || '',
                    price: parseFloat(product.price),
                    weight: product.originalData.weight || '~150 грамм',
                    rating: product.originalData.rating || 4.5,
                    reviewCount: product.originalData.reviewCount || 0,
                    image: product.image
                },
                fromScreen
            });
        }
    };

    const renderItem = ({ item }) => (
        <ProductCard
            key={item.id}
            product={item}
            onPress={() => handleProductPress(item)}
        />
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={adaptedProducts}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    isLoading ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="small" color={Color.purpleSoft} />
                        </View>
                    ) : null
                }
                scrollEnabled={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginVertical: 10,
    },
    loaderContainer: {
        paddingVertical: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    errorText: {
        color: 'red',
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
    },
    emptyContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        color: Color.colorSilver_100,
    }
});