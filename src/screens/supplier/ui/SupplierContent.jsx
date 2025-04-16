import React, {useState, useRef, useCallback, useMemo, useEffect} from 'react';
import { View, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {useDispatch, useSelector} from 'react-redux';
import { selectSupplierRating, selectSupplierProducts } from '@/entities/supplier';
import { useTheme } from '@/app/providers/themeProvider/ThemeProvider';
import Text from '@/shared/ui/Text/Text';
import { ProductsSlider, SupplierHeader, BestFeedbacks } from '@features/supplier/ui';
import { calculateSupplierRating } from '@/services/supplierRatingService';
import { selectAllSupplierFeedbacks } from "@entities/supplier/model/selectors";
import { ScrollableBackgroundGradient } from '@/shared/ui/BackgroundGradient';
import {fetchSupplierFeedbacks} from "@entities/feedback/model/slice";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const SupplierContent = ({ supplierId, supplier, navigation, onRefresh }) => {
    const { colors } = useTheme();
    const scrollViewRef = useRef(null);
    const dispatch = useDispatch();

    const [contentHeight, setContentHeight] = useState(SCREEN_HEIGHT * 2);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const supplierProducts = useSelector((state) => selectSupplierProducts(state, supplierId)) || [];
    const allFeedbacks = useSelector((state) => selectAllSupplierFeedbacks(state, supplierId)) || [];
    const storedSupplierRating = useSelector((state) => selectSupplierRating(state, supplierId)) || 0;

    const supplierProductsCount = supplierProducts.map(product => product);



    const hasProducts = supplierProducts.length > 0;

    useEffect(() => {
        if (supplierId && hasProducts) {
            dispatch(fetchSupplierFeedbacks(supplierId));
        }
    }, [supplierId, hasProducts, dispatch]);
    const calculatedRating = useMemo(() => {
        if (storedSupplierRating > 0) {
            return storedSupplierRating;
        }

        if (!supplierId || !supplierProducts || !Array.isArray(supplierProducts)) {
            return 0;
        }

        const enrichedProducts = supplierProducts.map(p => {
            const productFeedbacks = allFeedbacks.filter(f => f.productId === p.id);
            const ratings = productFeedbacks.map(f => f.rating).filter(r => r !== undefined && r !== null);
            const avgRating = ratings.length > 0
                ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
                : 0;

            return {
                ...p,
                averageRating: avgRating,
                feedbackCount: ratings.length
            };
        });

        const { rating } = calculateSupplierRating(enrichedProducts);
        return rating;
    }, [supplierId, supplierProducts, allFeedbacks, storedSupplierRating]);

    const supplierRating = storedSupplierRating > 0 ? storedSupplierRating : calculatedRating;


    const handleContentSizeChange = useCallback((width, height) => {
        setContentHeight(height + 100);
    }, []);

    const handleGoBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handleProductPress = useCallback(
        (productId) => {
            if (productId) {
                navigation.navigate('ProductDetail', {
                    productId,
                    fromScreen: 'SupplierScreen',
                });
            }
        },
        [navigation]
    );

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await onRefresh();
        setIsRefreshing(false);
    }, [onRefresh]);

    return (
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
            <ScrollView
                ref={scrollViewRef}
                style={styles.contentScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                onContentSizeChange={handleContentSizeChange}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={[colors.primary || '#5e00ff']}
                        tintColor={colors.primary || '#5e00ff'}
                    />
                }
                overScrollMode="never"
                bounces={true}
                horizontal={false}
                waitFor={[]}
                simultaneousHandlers={[]}
            >
                <ScrollableBackgroundGradient
                    contentHeight={contentHeight}
                    showOverlayGradient={false}
                    showShadowGradient={false}
                />
                <SupplierHeader
                    supplier={supplier}
                    supplierRating={supplierRating}
                    onGoBack={handleGoBack}
                    supplierProducts={supplierProductsCount}
                />

                {hasProducts ? (
                    <View style={styles.productsContainer}>
                        <ProductsSlider products={supplierProducts} onProductPress={handleProductPress} />
                    </View>
                ) : (
                    <View style={[styles.noProductsContainer, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.noProductsText, { color: colors.textSecondary }]}>
                            У поставщика нет продуктов
                        </Text>
                    </View>
                )}

                {allFeedbacks.length > 0 && (
                    <View style={styles.feedbacksContainer}>
                        <BestFeedbacks feedbacks={allFeedbacks} onProductPress={handleProductPress} />
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    contentScrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: SCREEN_WIDTH * 0.187,
    },
    productsContainer: {
        position: 'relative',
    },
    feedbacksContainer: {
        marginTop: SCREEN_WIDTH * 0.047,
    },
    noProductsContainer: {
        marginHorizontal: SCREEN_WIDTH * 0.037,
        marginVertical: SCREEN_WIDTH * 0.047,
        padding: SCREEN_WIDTH * 0.047,
        alignItems: 'center',
        borderRadius: SCREEN_WIDTH * 0.023,
    },
    noProductsText: {
        fontSize: SCREEN_WIDTH * 0.037,
    },
});

export { SupplierContent };