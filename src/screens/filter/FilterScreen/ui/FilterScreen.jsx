import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    PixelRatio,
    StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';

import { ScrollableBackgroundGradient } from '@shared/ui/BackgroundGradient';

import { PriceRangeFilter } from './PriceRangeFilter';
import { CategoryFilter } from './CategoryFilter';
import { BrandFilter } from './BrandFilter';
import { RatingFilter } from './RatingFilter';
import { QuantityFilter } from './QuantityFilter';

import { FontFamily } from '@app/styles/GlobalStyles';

import {
    setFilterCriteria,
    saveFilters,
    selectFilterCriteria
} from '@entities/filter';

import {
    fetchProducts,
    selectProducts,
    selectProductsCurrentPage,
    selectProductsHasMore,
    selectProductsLoading,
    selectProductsLoadingMore
} from '@entities/product';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const normalizeFont = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const buildFilterCriteria = (criteria = {}) => ({
    minPrice: criteria.minPrice ?? 45,
    maxPrice: criteria.maxPrice ?? 1800,
    categories: criteria.categories ?? [],
    brands: criteria.brands ?? [],
    minRating: criteria.minRating ?? 4.5,
    compositions: criteria.compositions ?? [],
    packaging: criteria.packaging ?? [],
    quantity: criteria.quantity ?? [],
    suppliers: [],
});

export const FilterScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();

    const [contentHeight, setContentHeight] = useState(0);

    const filterCriteria = useSelector(selectFilterCriteria);
    const products = useSelector(selectProducts);
    const currentPage = useSelector(selectProductsCurrentPage);
    const hasMoreProducts = useSelector(selectProductsHasMore);
    const isProductsLoading = useSelector(selectProductsLoading);
    const isProductsLoadingMore = useSelector(selectProductsLoadingMore);

    const [localFilterCriteria, setLocalFilterCriteria] = useState(buildFilterCriteria());

    const searchQuery = route.params?.searchQuery || '';
    const fromScreen = route.params?.fromScreen || 'SearchResults';
    const resetFilters = route.params?.resetFilters || false;

    useEffect(() => {
        if (resetFilters) {
            const defaultFilters = buildFilterCriteria({
                minPrice: 0,
                maxPrice: 0,
            });
            setLocalFilterCriteria(defaultFilters);

            if (route?.params?.resetFilters) {
                navigation.setParams({ resetFilters: false });
            }
        } else if (filterCriteria) {
            setLocalFilterCriteria(buildFilterCriteria(filterCriteria));
        }
    }, [resetFilters, filterCriteria, navigation, route?.params?.resetFilters]);

    useEffect(() => {
        if (!products.length && !isProductsLoading && !isProductsLoadingMore) {
            dispatch(fetchProducts());
        }
    }, [dispatch, products.length, isProductsLoading, isProductsLoadingMore]);

    useEffect(() => {
        if (!products.length) {
            return;
        }

        if (hasMoreProducts && !isProductsLoading && !isProductsLoadingMore) {
            dispatch(fetchProducts({ page: currentPage + 1 }));
        }
    }, [
        dispatch,
        products.length,
        hasMoreProducts,
        currentPage,
        isProductsLoading,
        isProductsLoadingMore
    ]);

    const handleFilterChange = (filterName, value) => {
        setLocalFilterCriteria(prev => {
            const updated = {
                ...prev,
                [filterName]: value
            };
            return updated;
        });
    };

    const handleClose = () => {
        navigation.goBack();
    };

    const handleReset = () => {
        const resetFilters = buildFilterCriteria();
        setLocalFilterCriteria(resetFilters);
    };

    const handleApplyFilters = () => {
        dispatch(setFilterCriteria(buildFilterCriteria(localFilterCriteria)));

        dispatch(saveFilters());

        navigation.navigate(fromScreen, {
            filterApplied: true,
            searchQuery: searchQuery,
            timestamp: Date.now()
        });
    };

    const onContentSizeChange = (width, height) => {
        setContentHeight(height);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

            <ScrollableBackgroundGradient
                contentHeight={contentHeight + 150}
                showOverlayGradient={false}
            />

            <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
                <View style={[styles.header, { paddingTop: insets.top + normalize(4) }]}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={handleClose}
                    >
                        <Text style={styles.headerButtonText}>Закрыть</Text>
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>Фильтры</Text>

                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={handleReset}
                    >
                        <Text style={[styles.headerButtonText, styles.resetText]}>Сбросить</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.whiteContainer}>
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.contentContainer}
                        showsVerticalScrollIndicator={false}
                        onContentSizeChange={onContentSizeChange}
                    >
                        {/* Фильтр по цене */}
                        <PriceRangeFilter
                            minPrice={localFilterCriteria.minPrice}
                            maxPrice={localFilterCriteria.maxPrice}
                            onChangeMinPrice={(value) => handleFilterChange('minPrice', value)}
                            onChangeMaxPrice={(value) => handleFilterChange('maxPrice', value)}
                        />

                        <View style={styles.separator} />

                        {/* Фильтр по категориям */}
                        <CategoryFilter
                            categories={localFilterCriteria.categories}
                            onChange={(value) => handleFilterChange('categories', value)}
                            products={products}
                        />

                        <View style={styles.separator} />

                        {/* Фильтр по брендам */}
                        <BrandFilter
                            brands={localFilterCriteria.brands}
                            onChange={(value) => handleFilterChange('brands', value)}
                            products={products}
                        />

                        <View style={styles.separator} />

                        {/* Фильтр по рейтингу */}
                        <RatingFilter
                            minRating={localFilterCriteria.minRating}
                            onChange={(value) => handleFilterChange('minRating', value)}
                        />

                        {/* Разделительная линия */}
                        <View style={styles.separator} />

                        {/* Фильтр по количеству */}
                        <QuantityFilter
                            quantity={localFilterCriteria.quantity}
                            onChange={(value) => handleFilterChange('quantity', value)}
                            products={products}
                        />

                        {/* Разделительная линия */}
                    </ScrollView>
                </View>
            </SafeAreaView>

            {/* Кнопка применения фильтров */}
            <TouchableOpacity
                style={[styles.applyButton, { bottom: normalize(100) + insets.bottom }]}
                onPress={handleApplyFilters}
            >
                <Text style={styles.applyButtonText}>ПРИМЕНИТЬ</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: normalize(15),
        paddingHorizontal: normalize(20),
    },
    headerButton: {
        padding: normalize(5),
    },
    headerButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#000000',
    },
    resetText: {
        color: '#86868a',
    },
    headerTitle: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(18),
        fontWeight: '500',
        color: '#000000',
        textAlign: 'center',
    },
    whiteContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: normalize(12),
        marginHorizontal: normalize(16),
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(10),
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: normalize(120),
    },
    separator: {
        height: 0.5,
        width: '100%',
        backgroundColor: '#D2D2D7',
    },
    applyButton: {
        backgroundColor: '#5500ff',
        borderRadius: normalize(30),
        position: 'absolute',
        left: normalize(20),
        right: normalize(20),
        marginHorizontal: normalize(20),
        alignItems: 'center',
        justifyContent: 'center',
        height: normalize(59),
    },
    applyButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(17),
        fontWeight: '500',
        color: 'white',
        textTransform: 'uppercase',
    }
});

export default FilterScreen;