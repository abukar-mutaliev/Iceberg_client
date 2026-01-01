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
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { X } from 'lucide-react-native';
import { FontFamily } from '@app/styles/GlobalStyles';

// Импорт действий и селекторов напрямую, чтобы избежать циклической зависимости
import {
    selectFilterCriteria,
    selectAppliedFilters
} from '../model/selectors';
import {
    setFilterCriteria,
    clearFilterCriteria
} from '../model/slice';

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

export const AppliedFilters = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const filterCriteria = useSelector(selectFilterCriteria);
    const appliedFilters = useSelector(selectAppliedFilters);

    if (!appliedFilters || appliedFilters.length === 0) {
        return null;
    }

    // Обработчик удаления конкретного фильтра
    const handleRemoveFilter = (filter) => {
        const updatedCriteria = { ...filterCriteria };

        switch (filter.type) {
            case 'price':
                // Сбрасываем к значениям по умолчанию
                updatedCriteria.minPrice = 45;
                updatedCriteria.maxPrice = 1800;
                break;

            case 'category':
                // Удаляем категорию из массива
                updatedCriteria.categories = filterCriteria.categories.filter(
                    cat => cat.id !== filter.data.id
                );
                break;

            case 'brand':
                // Удаляем бренд из массива
                updatedCriteria.brands = filterCriteria.brands.filter(
                    brand => brand.id !== filter.data.id
                );
                break;

            case 'rating':
                // Сбрасываем к значению по умолчанию
                updatedCriteria.minRating = 4.5;
                break;

            case 'supplier':
                // Удаляем поставщика из массива
                updatedCriteria.suppliers = filterCriteria.suppliers.filter(
                    supplier => supplier.id !== filter.data.id
                );
                break;

            case 'quantity':
                // Удаляем количество из массива
                updatedCriteria.quantity = filterCriteria.quantity.filter(
                    q => q.id !== filter.data.id && q.value !== filter.data.value
                );
                break;

            default:
                break;
        }

        dispatch(setFilterCriteria(updatedCriteria));
    };

    // Обработчик сброса всех фильтров
    const handleClearAllFilters = () => {
        dispatch(clearFilterCriteria());
    };

    // Обработчик перехода к экрану фильтров
    const handleEditFilters = () => {
        navigation.navigate('FilterScreen', {
            fromScreen: 'SearchResults'
        });
    };

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filtersScrollView}
                contentContainerStyle={styles.filtersContent}
            >
                {appliedFilters.map(filter => (
                    <TouchableOpacity
                        key={filter.id}
                        style={styles.filterChip}
                        onPress={() => handleRemoveFilter(filter)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.filterChipText}>{filter.label}</Text>
                        <X color="#000000" size={normalize(16)} />
                    </TouchableOpacity>
                ))}

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleClearAllFilters}
                    activeOpacity={0.7}
                >
                    <Text style={styles.actionButtonText}>Сбросить все</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={handleEditFilters}
                    activeOpacity={0.7}
                >
                    <Text style={styles.actionButtonText}>Изменить</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        paddingVertical: normalize(10),
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        zIndex: 1,
    },
    filtersScrollView: {
        flexGrow: 0,
    },
    filtersContent: {
        paddingHorizontal: normalize(16),
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF1FE',
        borderRadius: normalize(20),
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(8),
        marginRight: normalize(8),
    },
    filterChipText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(14),
        color: '#000000',
        marginRight: normalize(5),
    },
    actionButton: {
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(8),
        marginRight: normalize(8),
    },
    actionButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(14),
        color: '#6a3cf7',
        fontWeight: '500',
    },
    editButton: {
        backgroundColor: '#EFF1FE',
        borderRadius: normalize(20),
    }
});

export default AppliedFilters;