import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    Pressable
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute } from '@react-navigation/native';
import {fetchProducts, resetCurrentProduct} from '@entities/product/model/slice';
import {
    selectProducts,
    selectProductsLoading,
    selectProductsError
} from '@entities/product/model/selectors';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { ProductCard } from "@entities/product";
import BackIcon from '@shared/ui/Icon/BackArrowIcon/BackArrowIcon';
import {BackButton} from "@shared/ui/Button/BackButton";

// Заменяем изображение на простой серый блок
const defaultProductImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };

export const CatalogScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const products = useSelector(selectProducts);
    const isLoading = useSelector(selectProductsLoading);
    const error = useSelector(selectProductsError);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [filteredProducts, setFilteredProducts] = useState([]);

    useEffect(() => {
        dispatch(fetchProducts());
    }, [dispatch]);

    useEffect(() => {
        if (products && products.length > 0) {
            if (selectedCategory) {
                const filtered = products.filter(product =>
                    product.categoryId === selectedCategory.id);
                setFilteredProducts(filtered);
            } else {
                setFilteredProducts(products);
            }
        }
    }, [products, selectedCategory]);

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
    };

    const adaptProduct = (product) => ({
        id: product.id,
        title: product.name,
        description: product.description,
        price: product.price.toString(),
        image: product.images && product.images.length > 0
            ? { uri: product.images[0] }
            : defaultProductImage,
        originalData: product
    });

    const handleProductPress = (product) => {
        dispatch(resetCurrentProduct());

        navigation.navigate('MainTab', {
            screen: 'ProductDetail',
            params: {
                productId: product.id,
                fromScreen: 'Catalog',
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
                }
            }
        });
    };

    const handleBackPress = () => {
        navigation.navigate('MainTab');
    };

    const renderProduct = ({ item }) => {
        const adaptedProduct = adaptProduct(item);
        return (
            <ProductCard
                product={adaptedProduct}
                onPress={() => handleProductPress(adaptedProduct)}
            />
        );
    };

    if (isLoading && (!products || products.length === 0)) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={Color.purpleSoft} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Ошибка загрузки продуктов: {error}</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                    <BackButton />
                <Text style={styles.title}>Каталог</Text>
            </View>

            {filteredProducts.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Продукты не найдены</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredProducts}
                    renderItem={renderProduct}
                    keyExtractor={(item) => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                    onRefresh={() => dispatch(fetchProducts())}
                    refreshing={isLoading}
                    fromScreen="Catalog"
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 22,
        paddingBottom: 5,
    },
    backButton: {
        padding: 15,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        fontWeight: '600',
        color: Color.purpleSoft,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    listContainer: {
        paddingBottom: 20,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
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
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        color: Color.colorSilver_100,
    }
});