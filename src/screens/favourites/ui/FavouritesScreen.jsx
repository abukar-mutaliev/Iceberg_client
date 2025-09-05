import React, {useState, useCallback, useEffect, useMemo, useRef} from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    RefreshControl,
    ActivityIndicator,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { useFavorites } from '@entities/favorites/hooks/useFavorites';

import {fetchProducts, ProductCard, resetCurrentProduct, selectProducts} from '@entities/product';
import { useDispatch, useSelector } from 'react-redux';

import { EmptyList } from '@shared/ui/EmptyList';
import { ErrorMessage } from '@shared/ui/ErrorMessage';
import Text from '@shared/ui/Text/Text';
import { ScrollableBackgroundGradient } from '@shared/ui/BackgroundGradient';
import { BackButton } from '@shared/ui/Button/BackButton';
import { Color, FontFamily, FontSize, CommonStyles } from '@app/styles/GlobalStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const FavouritesScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { colors } = useTheme();
    const { isAuthenticated, authDialog } = useAuth();

    const products = useSelector(selectProducts);

    const {
        favorites,
        favoritesWithDetails,
        loading,
        error,
        favoritesCount,
        loadFavorites
    } = useFavorites();

    const [refreshing, setRefreshing] = useState(false);
    const [contentHeight, setContentHeight] = useState(1000);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    const navigatedToProductRef = useRef(false);

    const displayData = useMemo(() => {
        if (favoritesWithDetails && Array.isArray(favoritesWithDetails) && favoritesWithDetails.length > 0) {
            return favoritesWithDetails;
        }

        if (favorites && Array.isArray(favorites) && favorites.length > 0) {
            return favorites.filter(item => item.product || item.productId);
        }

        return [];
    }, [favoritesWithDetails, favorites]);

    useFocusEffect(
        useCallback(() => {
            navigatedToProductRef.current = false;

            if (isAuthenticated && !isDataLoaded) {
                loadData();
                setIsDataLoaded(true);
            }
        }, [isAuthenticated, isDataLoaded])
    );

    useFocusEffect(
        useCallback(() => {
            return () => {
                setIsDataLoaded(false);
            };
        }, [])
    );

    const loadData = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            const favoritesLoaded = favorites && Array.isArray(favorites) && favorites.length > 0;
            const productsLoaded = products && Array.isArray(products) && products.length > 0;

            const promises = [];

            if (!favoritesLoaded) {
                promises.push(loadFavorites());
            }

            if (!productsLoaded) {
                promises.push(dispatch(fetchProducts()));
            }

            if (promises.length === 0) {
                return;
            }

            await Promise.all(promises);
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
        }
    }, [isAuthenticated, loadFavorites, dispatch, favorites, products]);

    const handleRefresh = useCallback(async () => {
        if (refreshing) return;

        setRefreshing(true);
        try {
            await loadData();
        } finally {
            setRefreshing(false);
        }
    }, [loadData, refreshing]);

    const handleProductPress = useCallback((productId) => {
        if (!productId || navigatedToProductRef.current) return;

        navigatedToProductRef.current = true;

        dispatch(resetCurrentProduct());

        navigation.navigate('ProductDetail', {
            productId: Number(productId),
            fromScreen: 'Favourites'
        });
    }, [dispatch, navigation]);

    const handleContentSizeChange = useCallback((width, height) => {
        setContentHeight(height + 100);
    }, []);


    const handleAuthPress = useCallback(() => {
        navigation.navigate('Auth', { activeTab: 'login' });
    }, [navigation]);


    const renderItem = useCallback(({ item }) => {
        let rawProductId = null;

        if (item.product && item.product.id) {
            rawProductId = item.product.id;
        } else if (item.productId) {
            rawProductId = item.productId;
        } else if (item.id) {
            rawProductId = item.id;
        }

        let productId;
        try {
            productId = parseInt(rawProductId, 10);
            if (isNaN(productId) || productId <= 0) {
                return null;
            }
        } catch (error) {
            return null;
        }

        const productData = item;

        const wrappedProduct = {
            id: productId,
            title: productData.name || productData.title,
            description: productData.description,
            price: productData.price,
            image: productData.image || (productData.images && productData.images[0]),
            originalData: {
                ...productData,
                id: productId
            }
        };

        return (
            <View style={styles.cardContainer}>
                <ProductCard
                    product={wrappedProduct}
                    onPress={() => handleProductPress(productId)}
                />
            </View>
        );
    }, [handleProductPress]);

    if (!isAuthenticated) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Заголовок как в StopsListScreen */}
                <View style={styles.header}>
                                    <BackButton onPress={() => navigation.goBack()} />

                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>
                            Избранное
                        </Text>
                    </View>

                    <View style={styles.backButton} />
                </View>

                <ScrollableBackgroundGradient contentHeight={1000} />
                <View style={styles.centerContainer}>
                    <Text style={[styles.authText, { color: colors.dark }]}>
                        Для доступа к избранным товарам необходимо авторизоваться
                    </Text>
                    <TouchableOpacity
                        style={[styles.authButton, { backgroundColor: colors.primary }]}
                        onPress={handleAuthPress}
                    >
                        <Text style={[styles.authButtonText, { color: colors.text }]}>
                            Войти или зарегистрироваться
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
            <ScrollableBackgroundGradient contentHeight={contentHeight} />

            {/* Заголовок как в StopsListScreen */}
            <View style={styles.header}>
                <BackButton onPress={() => navigation.goBack()} />

                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>
                        Избранное
                    </Text>
                    {favoritesCount > 0 && (
                        <Text style={styles.headerSubtitle}>
                            {favoritesCount} {favoritesCount === 1 ? 'товар' :
                            favoritesCount < 5 ? 'товара' : 'товаров'}
                        </Text>
                    )}
                </View>

                <View style={styles.backButton} />
            </View>

            {error ? (
                <ErrorMessage
                    message={error}
                    onRetry={loadData}
                    style={styles.errorContainer}
                />
            ) : (
                <FlatList
                    data={displayData}
                    keyExtractor={(item, index) => `favorite-${item.id || item.productId || index}`}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                    ListEmptyComponent={
                        loading ? (
                            <View style={styles.loaderContainer}>
                                <ActivityIndicator size="large" color={colors.primary} />
                            </View>
                        ) : (
                            <EmptyList
                                title="Ваш список избранного пуст"
                                description="Добавляйте товары в избранное, чтобы они отображались здесь"
                                icon="heart-outline"
                                buttonText="Перейти к каталогу"
                                onButtonPress={() => navigation.navigate('Catalog')}
                                titleStyle={{ color: '#000000' }} // или { color: 'black' }
                            />
                        )
                    }
                    renderItem={renderItem}
                    onContentSizeChange={handleContentSizeChange}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...CommonStyles.container,
        overflow: "hidden",
        flex: 1,
    },
    // Стили заголовка как в StopsListScreen
    header: {
        ...CommonStyles.flexRow,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingVertical: 5,
        backgroundColor: "rgba(255,255,255,0.5)",
},
    backButton: {
        padding: 15,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: FontSize.size_lg,
        fontWeight: '500',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        letterSpacing: 0.9,
    },
    headerSubtitle: {
        fontSize: FontSize.size_sm,
        fontWeight: '400',
        color: Color.gray,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginTop: 2,
    },
    listContainer: {
        padding: 16,
        paddingBottom: 80,
        minHeight: 300,
    },
    cardContainer: {
        marginBottom: 12,
        width: '100%',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: 300,
    },
    errorContainer: {
        marginTop: 40,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    authText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    authButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    authButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
})