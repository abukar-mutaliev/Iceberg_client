import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    PixelRatio
} from 'react-native';
import { X } from 'lucide-react-native';
import { FontFamily } from '@/app/styles/GlobalStyles';
import { useSelector, useDispatch } from 'react-redux';
import { selectFilterCriteria, setFilterCriteria } from '@/entities/filter';

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

// Форматирование даты для отображения
const formatDate = (date) => {
    if (!date) return '';

    const dateObj = new Date(date);
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();

    return `${day}.${month}.${year}`;
};

export const AppliedFilters = () => {
    const dispatch = useDispatch();
    const filterCriteria = useSelector(selectFilterCriteria);

    // Если нет активных фильтров, не отображаем компонент
    if (!filterCriteria) {
        return null;
    }

    // Форматирование фильтра цены
    const getPriceFilter = () => {
        const { minPrice, maxPrice } = filterCriteria;
        const defaultMinPrice = 45;
        const defaultMaxPrice = 1800;

        // Если цены по умолчанию, не отображаем фильтр
        if (minPrice === defaultMinPrice && maxPrice === defaultMaxPrice) {
            return null;
        }

        const label = `${minPrice} ₽ - ${maxPrice} ₽`;

        return {
            id: 'price',
            label,
            onRemove: () => {
                dispatch(setFilterCriteria({
                    ...filterCriteria,
                    minPrice: defaultMinPrice,
                    maxPrice: defaultMaxPrice
                }));
            }
        };
    };

    // Получение всех категорий
    const getCategoryFilters = () => {
        const { categories } = filterCriteria;

        if (!categories || categories.length === 0) {
            return [];
        }

        return categories.map(category => ({
            id: `category-${category.id}`,
            label: category.name,
            onRemove: () => {
                dispatch(setFilterCriteria({
                    ...filterCriteria,
                    categories: filterCriteria.categories.filter(c => c.id !== category.id)
                }));
            }
        }));
    };

    // Получение всех брендов
    const getBrandFilters = () => {
        const { brands } = filterCriteria;

        if (!brands || brands.length === 0) {
            return [];
        }

        return brands.map(brand => ({
            id: `brand-${brand.id}`,
            label: brand.name,
            onRemove: () => {
                dispatch(setFilterCriteria({
                    ...filterCriteria,
                    brands: filterCriteria.brands.filter(b => b.id !== brand.id)
                }));
            }
        }));
    };

    // Фильтр рейтинга
    const getRatingFilter = () => {
        const { minRating } = filterCriteria;
        const defaultRating = 4.5;

        if (!minRating || minRating === defaultRating) {
            return null;
        }

        return {
            id: 'rating',
            label: `Рейтинг от ${minRating}`,
            onRemove: () => {
                dispatch(setFilterCriteria({
                    ...filterCriteria,
                    minRating: defaultRating
                }));
            }
        };
    };

    // Фильтр срока годности
    const getExpirationDateFilter = () => {
        const { expirationDate } = filterCriteria;

        if (!expirationDate) {
            return null;
        }

        return {
            id: 'expiration-date',
            label: `До ${formatDate(expirationDate)}`,
            onRemove: () => {
                dispatch(setFilterCriteria({
                    ...filterCriteria,
                    expirationDate: null
                }));
            }
        };
    };

    // Получение всех фильтров состава
    const getCompositionFilters = () => {
        const { compositions } = filterCriteria;

        if (!compositions || compositions.length === 0) {
            return [];
        }

        return compositions.map(composition => ({
            id: `composition-${composition.id}`,
            label: composition.name,
            onRemove: () => {
                dispatch(setFilterCriteria({
                    ...filterCriteria,
                    compositions: filterCriteria.compositions.filter(c => c.id !== composition.id)
                }));
            }
        }));
    };

    // Получение всех фильтров упаковки
    const getPackagingFilters = () => {
        const { packaging } = filterCriteria;

        if (!packaging || packaging.length === 0) {
            return [];
        }

        return packaging.map(pack => ({
            id: `packaging-${pack.id}`,
            label: pack.name,
            onRemove: () => {
                dispatch(setFilterCriteria({
                    ...filterCriteria,
                    packaging: filterCriteria.packaging.filter(p => p.id !== pack.id)
                }));
            }
        }));
    };

    // Получение всех фильтров количества
    const getQuantityFilters = () => {
        const { quantity } = filterCriteria;

        if (!quantity || quantity.length === 0) {
            return [];
        }

        return quantity.map(q => ({
            id: `quantity-${q.id}`,
            label: q.name,
            onRemove: () => {
                dispatch(setFilterCriteria({
                    ...filterCriteria,
                    quantity: filterCriteria.quantity.filter(item => item.id !== q.id)
                }));
            }
        }));
    };

    // Получение всех фильтров поставщиков
    const getSupplierFilters = () => {
        const { suppliers } = filterCriteria;

        if (!suppliers || suppliers.length === 0) {
            return [];
        }

        return suppliers.map(supplier => ({
            id: `supplier-${supplier.id}`,
            label: supplier.name,
            onRemove: () => {
                dispatch(setFilterCriteria({
                    ...filterCriteria,
                    suppliers: filterCriteria.suppliers.filter(s => s.id !== supplier.id)
                }));
            }
        }));
    };

    // Собираем все активные фильтры
    const allFilters = [
        getPriceFilter(),
        ...getCategoryFilters(),
        ...getBrandFilters(),
        getRatingFilter(),
        getExpirationDateFilter(),
        ...getCompositionFilters(),
        ...getPackagingFilters(),
        ...getQuantityFilters(),
        ...getSupplierFilters()
    ].filter(Boolean);

    // Если нет активных фильтров, не отображаем компонент
    if (allFilters.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {allFilters.map(filter => (
                    <TouchableOpacity
                        key={filter.id}
                        style={styles.filterChip}
                        onPress={filter.onRemove}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.filterChipText}>
                            {filter.label}
                        </Text>
                        <X color="#555555" size={normalize(14)} />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingVertical: normalize(8),
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    scrollContent: {
        paddingHorizontal: normalize(16),
        flexDirection: 'row',
        flexWrap: 'nowrap',
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF1FE',
        borderRadius: normalize(16),
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(6),
        marginRight: normalize(8),
    },
    filterChipText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(14),
        color: '#333333',
        marginRight: normalize(4),
    }
});

export default AppliedFilters;