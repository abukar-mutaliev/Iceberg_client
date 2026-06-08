import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    FlatList,
    BackHandler,
    StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import {fetchProducts, resetCurrentProduct} from '@entities/product/model/slice';
import {
    selectProducts,
    selectProductsLoading,
    selectProductsError,
    selectProductsLoadingMore,
    selectProductsHasMore,
    selectProductsCurrentPage
} from '@entities/product/model/selectors';
import { FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { ProductCard } from "@entities/product";
import {BackButton} from "@shared/ui/Button/BackButton";
import { navigateToProductDetail } from '@shared/utils/NavigationUtils';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

// Заменяем изображение на простой серый блок
const defaultProductImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };
const PRODUCTS_PER_PAGE = 20;

export const CatalogScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const route = useRoute();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const products = useSelector(selectProducts);
    const isLoading = useSelector(selectProductsLoading);
    const isLoadingMore = useSelector(selectProductsLoadingMore);
    const hasMoreProducts = useSelector(selectProductsHasMore);
    const currentPage = useSelector(selectProductsCurrentPage);
    const error = useSelector(selectProductsError);
    const [selectedCategory, setSelectedCategory] = useState(null);

    useEffect(() => {
        dispatch(fetchProducts({
            page: 1,
            limit: PRODUCTS_PER_PAGE,
            refresh: true
        }));
    }, [dispatch]);

    const fromScreen = route?.params?.fromScreen;

    const handleBackPress = React.useCallback(() => {
        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }

        if (fromScreen === 'Favourites') {
            navigation.navigate('Main', {
                screen: 'ProfileTab',
                params: { screen: 'Favourites' }
            });
            return;
        }

        navigation.navigate('Main', {
            screen: 'MainTab',
            params: { screen: 'Main' }
        });
    }, [fromScreen, navigation]);

    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                handleBackPress();
                return true;
            };

            const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => {
                if (backHandler && typeof backHandler.remove === 'function') {
                    backHandler.remove();
                }
            };
        }, [handleBackPress])
    );

    const filteredProducts = useMemo(() => {
        if (!Array.isArray(products) || products.length === 0) {
            return [];
        }

        if (!selectedCategory) {
            return products;
        }

        return products.filter(product => product.categoryId === selectedCategory.id);
    }, [products, selectedCategory]);

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
    };

    const handleRefresh = useCallback(() => {
        dispatch(fetchProducts({
            page: 1,
            limit: PRODUCTS_PER_PAGE,
            refresh: true
        }));
    }, [dispatch]);

    const handleLoadMore = useCallback(() => {
        if (!hasMoreProducts || isLoading || isLoadingMore) {
            return;
        }

        dispatch(fetchProducts({
            page: currentPage + 1,
            limit: PRODUCTS_PER_PAGE
        }));
    }, [dispatch, currentPage, hasMoreProducts, isLoading, isLoadingMore]);

    const renderListFooter = useCallback(() => {
        if (!isLoadingMore) {
            return null;
        }

        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    }, [colors.primary, isLoadingMore, styles.footerLoader]);

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

        navigateToProductDetail(navigation, {
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
        });
    };

    const renderProduct = ({ item }) => {
        const adaptedProduct = adaptProduct(item);
        return (
            <ProductCard
                product={adaptedProduct}
                onPress={() => handleProductPress(adaptedProduct)}
                hideAddToCart
            />
        );
    };

    if (isLoading && (!products || products.length === 0)) {
        return (
            <SafeAreaView style={styles.loaderContainer} edges={['left', 'right', 'bottom']}>
                <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.errorContainer} edges={['left', 'right', 'bottom']}>
                <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
                <Text style={styles.errorText}>Ошибка загрузки продуктов: {error}</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
            <View style={styles.header}>
                <BackButton onPress={handleBackPress} />
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
                    onRefresh={handleRefresh}
                    refreshing={isLoading}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderListFooter}
                    fromScreen="Catalog"
                />
            )}
        </SafeAreaView>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 0,
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
        color: colors.primary,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    listContainer: {
        paddingBottom: 20,
    },
    footerLoader: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: colors.background,
    },
    errorText: {
        color: colors.error,
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
        color: colors.textSecondary,
    }
});