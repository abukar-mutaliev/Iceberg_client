import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    PixelRatio,
    StatusBar,
    Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';

import { ScrollableBackgroundGradient } from '@shared/ui/BackgroundGradient';

import { PriceRangeFilter } from './PriceRangeFilter';
import { CategoryFilter } from './CategoryFilter';
import { BrandFilter } from './BrandFilter';
import { RatingFilter } from './RatingFilter';
import { QuantityFilter } from './QuantityFilter';
import { SupplierFilter } from './SupplierFilter';

import { FontFamily } from '@app/styles/GlobalStyles';

import {
    setFilterCriteria,
    saveFilters,
    selectFilterCriteria
} from '@entities/filter';

import { selectProducts } from '@entities/product';

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

export const FilterScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const dispatch = useDispatch();

    const [contentHeight, setContentHeight] = useState(0);

    const filterCriteria = useSelector(selectFilterCriteria);
    const products = useSelector(selectProducts);

    const [localFilterCriteria, setLocalFilterCriteria] = useState({
        minPrice: 45,
        maxPrice: 1800,
        categories: [],
        brands: [],
        minRating: 4.5,
        compositions: [],
        packaging: [],
        quantity: [],
        suppliers: [],
    });

    const searchQuery = route.params?.searchQuery || '';
    const fromScreen = route.params?.fromScreen || 'SearchResults';
    const resetFilters = route.params?.resetFilters || false;

    useEffect(() => {
        if (resetFilters) {
            const defaultFilters = {
                minPrice: 0,
                maxPrice: 0,
                categories: [],
                brands: [],
                minRating: 4.5,
                compositions: [],
                packaging: [],
                quantity: [],
                suppliers: [],
            };
            setLocalFilterCriteria(defaultFilters);
        } else if (filterCriteria) {
            setLocalFilterCriteria({...filterCriteria});
        }
    }, [resetFilters]);

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
        const resetFilters = {
            minPrice: 45,
            maxPrice: 1800,
            categories: [],
            brands: [],
            minRating: 4.5,
            compositions: [],
            packaging: [],
            quantity: [],
            suppliers: [],
        };
        setLocalFilterCriteria(resetFilters);
    };

    const handleApplyFilters = () => {

        dispatch(setFilterCriteria(localFilterCriteria));

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

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
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
                        <View style={styles.separator} />

                        {/* Фильтр по продавцам */}
                        <SupplierFilter
                            suppliers={localFilterCriteria.suppliers}
                            onChange={(value) => handleFilterChange('suppliers', value)}
                            products={products}
                        />
                    </ScrollView>
                </View>
            </SafeAreaView>

            {/* Кнопка применения фильтров */}
            <TouchableOpacity
                style={styles.applyButton}
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
        paddingTop: Platform.OS === 'ios' ? normalize(15) : normalize(45),
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
        marginBottom: normalize(20),
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(10),
    },
    content: {
        flex: 1,
    },
    separator: {
        height: 0.5,
        width: '100%',
        backgroundColor: '#D2D2D7',
    },
    applyButton: {
        backgroundColor: '#5500ff',
        borderRadius: normalize(30),
        marginHorizontal: normalize(20),
        marginBottom: normalize(25),
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