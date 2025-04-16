import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    Dimensions,
    PixelRatio,
    StatusBar,
    Platform,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

// Импорт компонентов и стилей
import { ScreenSearchBar } from '@/features/search/ui/ScreenSearchBar';
import { Border, Color, FontFamily, FontSize } from '@/app/styles/GlobalStyles';
import BackArrowIcon from "@shared/ui/Icon/BackArrowIcon/BackArrowIcon";
import { FilterIcon } from '@/shared/ui/Icon/SearchIcons/FilterIcon';
import { AppliedFilters } from '@/features/filter/AppliedFilters';

// Импорт действий и селекторов
import {
    fetchProducts,
    selectProducts,
    selectProductsLoading,
    selectProductsError,
    ProductTile
} from '@/entities/product';

import {
    selectFilterCriteria,
    selectIsFilterActive,
    selectFilteredProductsBySearch // Используем имя вашего селектора
} from '@/entities/filter';

import { addSearchQuery } from '@/entities/search';

// Адаптивные размеры
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

const NUM_COLUMNS = 2;
const GRID_SPACING = normalize(16);

export const SearchResultsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const dispatch = useDispatch();

    const searchQuery = route.params?.searchQuery || '';
    const filterApplied = route.params?.filterApplied || false;

    const [searchText, setSearchText] = useState(searchQuery);
    const searchInputRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [forceUpdate, setForceUpdate] = useState(0); // Для принудительного обновления списка

    // Получаем продукты и фильтры из состояния Redux
    const products = useSelector(selectProducts);
    const filterCriteria = useSelector(selectFilterCriteria);
    const isFilterActive = useSelector(selectIsFilterActive);
    const isProductsLoading = useSelector(selectProductsLoading);

    // Используем селектор для получения отфильтрованных продуктов
    const filteredProducts = useSelector(state =>
        selectFilteredProductsBySearch(state, searchText)
    );

    // Загружаем продукты, если их еще нет
    useEffect(() => {
        if (!products?.length) {
            dispatch(fetchProducts());
        }
    }, [dispatch, products]);

    // Обновляем поисковый запрос при изменении параметра route
    useEffect(() => {
        if (searchQuery) {
            setSearchText(searchQuery);
        }
    }, [searchQuery]);

    // Кратковременная загрузка при применении фильтров для лучшего UX
    useEffect(() => {
        if (filterApplied) {
            setIsLoading(true);
            const timer = setTimeout(() => {
                setIsLoading(false);
                setForceUpdate(prev => prev + 1);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [filterApplied]);

    // Обработчики событий
    const handleClearSearch = () => {
        setSearchText('');
        setForceUpdate(prev => prev + 1);
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

    const handleOpenFilters = () => {
        navigation.navigate('FilterScreen', {
            searchQuery: searchText,
            fromScreen: 'SearchResults'
        });
    };

    const handleSubmitSearch = () => {
        if (searchText.trim()) {
            dispatch(addSearchQuery(searchText));
            setForceUpdate(prev => prev + 1);
        }
    };

    const handleProductPress = useCallback((product) => {
        if (product) {
            dispatch(addSearchQuery(product.name));
            navigation.navigate('ProductDetail', {
                productId: product.id,
                fromScreen: 'SearchResults'
            });
        }
    }, [dispatch, navigation]);

    const renderItem = ({ item, index }) => {
        const isEven = index % 2 === 0;
        const marginRight = isEven ? GRID_SPACING : 0;

        return (
            <View style={[styles.itemContainer, { marginRight }]}>
                <ProductTile product={item} onPress={() => handleProductPress(item)} />
            </View>
        );
    };

    if (isProductsLoading || isLoading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#5500FF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

            <View style={styles.headerSection}>
                <LinearGradient
                    style={styles.gradient}
                    colors={['#e4f6fc', '#c3dffa', '#b5c9fb', '#b7c4fd', '#e2ddff']}
                    locations={[0, 0.26, 0.44, 0.68, 1]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                >
                    <SafeAreaView style={styles.safeAreaHeader}>
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleGoBack}
                                activeOpacity={0.7}
                            >
                                <BackArrowIcon size={normalize(24)} color="rgba(51, 57, 176, 1)" />
                            </TouchableOpacity>

                            <Text style={styles.headerTitle}>Поиск</Text>

                            <TouchableOpacity
                                style={styles.filterButton}
                                onPress={handleOpenFilters}
                                activeOpacity={0.7}
                            >
                                <FilterIcon
                                    width={normalize(24)}
                                    height={normalize(24)}
                                    color={isFilterActive ? "#6a3cf7" : "#000000"}
                                />
                                {isFilterActive && (
                                    <View style={styles.filterActiveIndicator} />
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchBarContainer}>
                            <ScreenSearchBar
                                ref={searchInputRef}
                                value={searchText}
                                onChangeText={setSearchText}
                                onClear={handleClearSearch}
                                onSubmitEditing={handleSubmitSearch}
                                placeholder="Запрос"
                                showFullWidth={true}
                                historyMode={true}
                            />
                        </View>
                    </SafeAreaView>
                </LinearGradient>
            </View>

            {/* Отображение примененных фильтров */}
            {isFilterActive && <AppliedFilters />}

            {/* Нижняя часть с белым фоном и сеткой продуктов */}
            <View style={styles.contentWrapper}>
                {filteredProducts.length > 0 ? (
                    <FlatList
                        data={filteredProducts}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                        numColumns={NUM_COLUMNS}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        columnWrapperStyle={styles.columnWrapper}
                        extraData={forceUpdate} // Для обновления при изменении фильтров или поиска
                    />
                ) : (
                    <View style={styles.emptyResultsContainer}>
                        {searchText || isFilterActive ? (
                            <>
                                <Text style={styles.emptyResultsText}>
                                    По вашему запросу ничего не найдено
                                </Text>
                                <Text style={styles.emptyResultsHint}>
                                    Попробуйте изменить параметры поиска или фильтры
                                </Text>
                                {isFilterActive && (
                                    <TouchableOpacity
                                        style={styles.resetFiltersButton}
                                        onPress={() => navigation.navigate('FilterScreen', {
                                            searchQuery: searchText,
                                            fromScreen: 'SearchResults',
                                            resetFilters: true
                                        })}
                                    >
                                        <Text style={styles.resetFiltersText}>Сбросить фильтры</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        ) : (
                            <Text style={styles.emptyResultsText}>
                                Введите поисковый запрос для поиска продуктов
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerSection: {
        width: '100%',
        height: 'auto',
        zIndex: 1,
    },
    gradient: {
        width: '100%',
        paddingBottom: normalize(10),
    },
    safeAreaHeader: {
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? normalize(15) : normalize(45),
        paddingBottom: normalize(8),
        paddingHorizontal: normalize(16),
    },
    backButton: {
        padding: normalize(5),
        width: normalize(30),
    },
    headerTitle: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(22),
        fontWeight: '700',
        color: '#000000',
        textAlign: 'center',
    },
    filterButton: {
        padding: normalize(5),
        width: normalize(30),
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    filterActiveIndicator: {
        position: 'absolute',
        top: normalize(2),
        right: normalize(2),
        width: normalize(8),
        height: normalize(8),
        borderRadius: normalize(4),
        backgroundColor: '#6a3cf7',
    },
    searchBarContainer: {
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(10),
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    contentWrapper: {
        flex: 1,
        backgroundColor: 'white',
        zIndex: 0,
        paddingTop: normalize(15),
    },
    listContent: {
        paddingTop: normalize(10),
        paddingBottom: normalize(20),
    },
    columnWrapper: {
        justifyContent: 'flex-start',
        paddingHorizontal: normalize(16),
        marginBottom: GRID_SPACING,
    },
    itemContainer: {
        width: (SCREEN_WIDTH - normalize(48)) / 2, // 48 = левый отступ + правый отступ + промежуток
        height: normalize(269),
        marginBottom: normalize(20),
        borderRadius: normalize(Border.br_xl),
        overflow: 'hidden',
        backgroundColor: 'white',
    },
    emptyResultsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: normalize(24),
    },
    emptyResultsText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(18),
        fontWeight: '600',
        color: '#000000',
        textAlign: 'center',
        marginBottom: normalize(8),
    },
    emptyResultsHint: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#666666',
        textAlign: 'center',
        marginBottom: normalize(24),
    },
    resetFiltersButton: {
        backgroundColor: '#EFF1FE',
        borderRadius: normalize(25),
        paddingVertical: normalize(12),
        paddingHorizontal: normalize(24),
    },
    resetFiltersText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: '#6a3cf7',
    }
});

export default SearchResultsScreen;