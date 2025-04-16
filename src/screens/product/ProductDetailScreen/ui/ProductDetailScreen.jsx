import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    Animated,
    Dimensions,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {addToCart} from '@/features/addToCart/model/slice';

import {
    fetchProductById,
    selectCurrentProduct,
    selectProductsLoading,
    selectProductsError,
    selectProducts,
    fetchProducts, selectSimilarProducts
} from '@/entities/product';

import {
    fetchProductFeedbacks,
    selectFeedbackError,
    selectFeedbackLoading,
    selectFeedbacksByProductId,
    selectIsFeedbacksLoaded
} from '@/entities/feedback';

import {
    fetchSupplierById,
    selectSupplierById,
    selectSuppliersLoading,
    selectSuppliersError,
    selectSupplierRating,
    setSupplierRating
} from '@/entities/supplier';

import {calculateSupplierRating} from '@/services/supplierRatingService';

import {ProductHeader} from '@/widgets/productHeader';
import {ProductContent} from '@/widgets/productContent';
import {SimilarProducts} from '@/widgets/similarProducts';
import {RecentFeedbacks} from '@/widgets/recentFeedbacks';
import {BrandCard} from '@/widgets/brandCard';

import {useTheme} from '@/app/providers/themeProvider/ThemeProvider';
import {Loader} from '@/shared/ui/Loader';
import Text from '@/shared/ui/Text/Text';

import {
    StaticBackgroundGradient,
    ScrollableBackgroundGradient,
} from '@/shared/ui/BackgroundGradient';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const ProductDetailScreen = ({route, navigation}) => {
    const {productId, fromScreen} = route.params || {};
    const dispatch = useDispatch();
    const {colors, theme} = useTheme();
    const scrollViewRef = useRef(null);
    const scrollY = new Animated.Value(0);

    const handleScroll = (event) => {
        Animated.event(
            [{nativeEvent: {contentOffset: {y: scrollY}}}],
            {useNativeDriver: false}
        )(event);
    };

    const [contentHeight, setContentHeight] = useState(SCREEN_HEIGHT * 2);
    const [quantity, setQuantity] = useState(1);
    const [isFavorite, setIsFavorite] = useState(false);
    const [activeTab, setActiveTab] = useState('description');

    const product = useSelector(selectCurrentProduct);
    const products = useSelector(selectProducts) || [];
    const similarProducts = useSelector(state => productId ? selectSimilarProducts(state, productId) : []);
    const productsLoading = useSelector(selectProductsLoading);
    const productsError = useSelector(selectProductsError);

    const feedbacks = useSelector(state => selectFeedbacksByProductId(state, productId)) || [];
    const feedbackLoading = useSelector(selectFeedbackLoading);
    const feedbackError = useSelector(selectFeedbackError);
    const isFeedbacksLoaded = useSelector(state => selectIsFeedbacksLoaded(state, productId));

    const suppliersLoading = useSelector(selectSuppliersLoading);
    const suppliersError = useSelector(selectSuppliersError);
    const supplier = useSelector(state =>
        product?.supplierId ? selectSupplierById(state, product.supplierId) : null
    );

    const storedSupplierRating = useSelector(
        state => product?.supplierId ? selectSupplierRating(state, product.supplierId) : 0
    );

    const isInCart = false;

    useEffect(() => {
        if (product?.supplierId && !supplier && !suppliersLoading && !suppliersError) {
            dispatch(fetchSupplierById(product.supplierId));
        }
    }, [product?.supplierId, supplier, suppliersLoading, suppliersError, dispatch]);

    const calculatedRating = useMemo(() => {
        if (storedSupplierRating > 0) {
            return storedSupplierRating;
        }

        if (!product?.supplierId || !products || !Array.isArray(products)) {
            return 0;
        }

        const supplierProducts = products.filter(
            p => p && p.supplierId === product.supplierId
        );

        const enrichedProducts = supplierProducts.map(p => {
            if (p.id === product.id && feedbacks && Array.isArray(feedbacks)) {
                const ratings = feedbacks.map(f => f.rating).filter(r => r !== undefined);
                const avgRating = ratings?.length > 0
                    ? ratings.reduce((sum, r) => sum + r, 0) / ratings?.length
                    : 0;

                return {
                    ...p,
                    averageRating: avgRating,
                    feedbackCount: ratings?.length
                };
            }
            return p;
        });

        const {rating} = calculateSupplierRating(enrichedProducts);
        return rating;
    }, [product, products, feedbacks, storedSupplierRating]);


    useEffect(() => {
        if (productId) {
            dispatch(fetchProductById(productId));
            dispatch(fetchProducts());
            if (!isFeedbacksLoaded) {
                dispatch(fetchProductFeedbacks(productId));
            }
        }
    }, [dispatch, productId, isFeedbacksLoaded]);

    const handleContentSizeChange = (width, height) => {
        setContentHeight(height + 100);
    };
    useEffect(() => {
        if (productId) {
            dispatch(fetchProductById(productId));
            dispatch(fetchProducts());
            if (!isFeedbacksLoaded) {
                dispatch(fetchProductFeedbacks(productId));
            }

            if (route.params?.fromScreen === 'SimilarProducts' && !route.params?.originalFromScreen) {
                const prevParams = navigation.getState().routes.find(r =>
                    r.name === 'ProductDetail' && r.params?.productId === route.params.previousProductId
                )?.params;

                if (prevParams?.fromScreen && prevParams.fromScreen !== 'SimilarProducts') {
                    route.params.originalFromScreen = prevParams.fromScreen;
                }
            }
        }
    }, [dispatch, productId, isFeedbacksLoaded]);

    const handleAddToCart = () => {
        if (product) {
            dispatch(addToCart({
                id: product.id,
                title: product.name,
                description: product.description,
                price: product.price,
                image: product.images && Array.isArray(product.images) && product.images?.length > 0
                    ? {uri: product.images[0]}
                    : require('@/assets/images/placeholder.png'),
                quantity
            }));
        }
    };

    const handleQuantityChange = (newQuantity) => {
        setQuantity(newQuantity);
    };

    const handleToggleFavorite = () => {
        setIsFavorite(!isFavorite);
    };

    const handleGoBack = () => {
        const { fromScreen, previousProductId } = route.params || {};

        switch (fromScreen) {
            case 'MainTab':
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainTab' }]
                });
                break;
            case 'Catalog':
                navigation.navigate('Catalog', { fromScreen: 'ProductDetail' });
                break;
            case 'SimilarProducts':
                if (previousProductId) {
                    console.log('Возвращаемся к предыдущему продукту ID:', previousProductId);
                    navigation.navigate('ProductDetail', {
                        productId: previousProductId,
                        fromScreen: route.params.originalFromScreen || 'MainTab'
                    });
                } else {
                    navigation.goBack();
                }
                break;
            case 'Search':
                navigation.navigate('Search', {
                    screen: 'SearchMain'
                });
                break;
            case 'Favourites':
                navigation.navigate('Favourites');
                break;
            case 'Cart':
                navigation.navigate('Cart');
                break;
            case 'ProfileTab':
                navigation.navigate('ProfileTab');
                break;
            case 'ProductList':
                navigation.navigate('ProductList');
                break;
            default:
                navigation.goBack();
        }
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
    };

    const handleViewAllReviews = () => {
        setActiveTab('reviews');
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({y: 350, animated: true});
        }
    };

    const handleSupplierPress = () => {
        if (product?.supplierId) {
            navigation.navigate('MainTab', {
                screen: 'SupplierScreen',
                params: {supplierId: product.supplierId}
            });
        }
    };

    const handleRefreshFeedbacks = async () => {
        if (productId) {
            await dispatch(fetchProductFeedbacks(productId));
        }
    };

    const prepareProductImages = () => {
        if (!product || !product.images || !Array.isArray(product.images)) {
            return [];
        }
        return product.images;
    };

    const isLoading = productsLoading || feedbackLoading || suppliersLoading;
    const error = productsError || feedbackError || suppliersError;

    if (isLoading) {
        return (
            <View style={styles.fullScreenContainer}>
                <StaticBackgroundGradient/>
                <Loader/>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.fullScreenContainer}>
                <StaticBackgroundGradient/>
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, {color: colors.text}]}>
                        Произошла ошибка: {error}
                    </Text>
                </View>
            </View>
        );
    }

    if (!product && !productsLoading) {
        return (
            <View style={styles.fullScreenContainer}>
                <StaticBackgroundGradient/>
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, {color: colors.text}]}>
                        Продукт не найден
                    </Text>
                </View>
            </View>
        );
    }

    const productImages = prepareProductImages();

    const supplierRating = storedSupplierRating > 0 ? storedSupplierRating : calculatedRating;

    const enrichedProduct = supplier ? {
        ...product,
        supplier
    } : product;

    return (
        <View style={styles.fullScreenContainer}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.contentScrollView}
                    showsVerticalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    contentContainerStyle={styles.scrollContent}
                    onContentSizeChange={handleContentSizeChange}
                    overScrollMode="never"
                    bounces={false}
                >
                    <ScrollableBackgroundGradient
                        showOverlayGradient={true}
                        showShadowGradient={false}
                        contentHeight={contentHeight}
                    />

                    <View style={styles.contentContainer}>
                        {enrichedProduct && (
                            <ProductHeader
                                product={{...enrichedProduct, images: productImages}}
                                scrollY={scrollY}
                                onGoBack={handleGoBack}
                                isFavorite={isFavorite}
                                onToggleFavorite={handleToggleFavorite}
                            />
                        )}

                        {enrichedProduct && (
                            <ProductContent
                                product={enrichedProduct}
                                feedbacks={feedbacks}
                                feedbackLoading={feedbackLoading}
                                feedbackError={feedbackError}
                                isFeedbacksLoaded={isFeedbacksLoaded}
                                quantity={quantity}
                                activeTab={activeTab}
                                onQuantityChange={handleQuantityChange}
                                onTabChange={handleTabChange}
                                onRefreshFeedbacks={handleRefreshFeedbacks}
                            />
                        )}

                        {activeTab === 'description' && supplier && (
                            <View style={styles.brandCardContainer}>
                                <BrandCard
                                    supplier={supplier}
                                    rating={supplierRating}
                                    onSupplierPress={handleSupplierPress}
                                />
                            </View>
                        )}

                        {activeTab === 'description' && feedbacks && Array.isArray(feedbacks) && feedbacks.length > 0 && (
                            <RecentFeedbacks
                                feedbacks={feedbacks}
                                productId={product.id}
                                onViewAllPress={handleViewAllReviews}
                            />
                        )}

                        {similarProducts && Array.isArray(similarProducts) && similarProducts.length > 0 && (
                            <SimilarProducts products={similarProducts} color={colors}/>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        paddingBottom: 0
    },
    safeArea: {
        flex: 1,
        width: '100%',
    },
    contentScrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 10,
    },
    contentContainer: {
        position: 'relative',
        zIndex: 0,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'transparent',
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
    },
    brandCardContainer: {
        paddingHorizontal: 16,
        marginVertical: 10,
    },
});

export {ProductDetailScreen};
export default ProductDetailScreen;