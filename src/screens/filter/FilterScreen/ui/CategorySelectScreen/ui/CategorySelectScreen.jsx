import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Dimensions,
    PixelRatio, Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';

import { FontFamily } from '@app/styles/GlobalStyles';

// Селекторы
import { selectProducts } from '@entities/product';
import {BackButton} from "@shared/ui/Button/BackButton";

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

export const CategorySelectScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const dispatch = useDispatch();

    // Получаем параметры из маршрута
    const selectedCategories = route.params?.selectedCategories || [];
    const onSelectComplete = route.params?.onSelectComplete;

    const [searchText, setSearchText] = useState('');
    const [localSelectedCategories, setLocalSelectedCategories] = useState(selectedCategories);

    // Получаем продукты из состояния
    const products = useSelector(selectProducts);

    // Извлекаем все уникальные категории из продуктов
    const [allCategories, setAllCategories] = useState([]);

    useEffect(() => {
        if (products && products.length > 0) {
            const uniqueCategories = [];

            products.forEach(product => {
                if (product.categories && Array.isArray(product.categories)) {
                    product.categories.forEach(category => {
                        const exists = uniqueCategories.find(c => c.id === category.id);
                        if (!exists && category.id && category.name) {
                            uniqueCategories.push({
                                id: category.id,
                                name: category.name,
                                description: category.description || ''
                            });
                        }
                    });
                }
            });

            setAllCategories(uniqueCategories.sort((a, b) => a.name.localeCompare(b.name)));
        }
    }, [products]);

    // Обработчик выбора категории
    const handleToggleCategory = (category) => {
        setLocalSelectedCategories(prev => {
            const isSelected = prev.some(c => c.id === category.id);

            if (isSelected) {
                return prev.filter(c => c.id !== category.id);
            } else {
                return [...prev, category];
            }
        });
    };

    // Обработчик применения выбранных категорий
    const handleApplySelection = () => {
        if (onSelectComplete && typeof onSelectComplete === 'function') {
            onSelectComplete(localSelectedCategories);
        }
        navigation.goBack();
    };

    // Обработчик сброса выбора
    const handleClearSelection = () => {
        setLocalSelectedCategories([]);
    };

    // Фильтрация категорий по поисковому запросу
    const filteredCategories = searchText.trim()
        ? allCategories.filter(category =>
            category.name.toLowerCase().includes(searchText.toLowerCase()) ||
            (category.description && category.description.toLowerCase().includes(searchText.toLowerCase()))
        )
        : allCategories;

    // Проверка, выбрана ли категория
    const isCategorySelected = (categoryId) => {
        return localSelectedCategories.some(c => c.id === categoryId);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

            {/* Градиентный хедер */}
            <LinearGradient
                style={styles.headerGradient}
                colors={['#e4f6fc', '#c3dffa', '#b5c9fb', '#b7c4fd', '#e2ddff']}
                locations={[0, 0.26, 0.44, 0.68, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
            >
                <SafeAreaView style={styles.headerContainer}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}

                        >
                            <BackButton />
                        </TouchableOpacity>

                        <Text style={styles.headerTitle}>Выберите категории</Text>

                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={handleClearSelection}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.clearButtonText}>Очистить</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            value={searchText}
                            onChangeText={setSearchText}
                            placeholder="Шоколадное"
                            placeholderTextColor="#999999"
                            autoCapitalize="none"
                        />
                        {searchText ? (
                            <TouchableOpacity
                                style={styles.searchClearButton}
                                onPress={() => setSearchText('')}
                            >
                                <Text style={styles.searchClearButtonText}>Отмена</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* Список категорий */}
            <FlatList
                data={filteredCategories}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.categoryItem}
                        onPress={() => handleToggleCategory(item)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.categoryInfo}>
                            <Text style={styles.categoryName}>{item.name}</Text>
                            {item.description ? (
                                <Text style={styles.categoryDescription}>{item.description}</Text>
                            ) : null}
                        </View>
                        <View style={[
                            styles.checkbox,
                            isCategorySelected(item.id) && styles.checkboxActive
                        ]}>
                            {isCategorySelected(item.id) && (
                                <View style={styles.checkboxSelected} />
                            )}
                        </View>
                    </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={() => (
                    <Text style={styles.emptyMessage}>Категории не найдены</Text>
                )}
            />

            {/* Кнопка применения */}
            <View style={styles.applyButtonContainer}>
                <TouchableOpacity
                    style={styles.applyButton}
                    onPress={handleApplySelection}
                    activeOpacity={0.8}
                >
                    <Text style={styles.applyButtonText}>ПРИМЕНИТЬ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    headerGradient: {
        width: '100%',
    },
    headerContainer: {
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? normalize(15) : normalize(45),
        paddingBottom: normalize(10),
        paddingHorizontal: normalize(16),
    },
    backButton: {
        padding: normalize(5),
    },
    headerTitle: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(17),
        fontWeight: '600',
        color: '#000000',
    },
    clearButton: {
        padding: normalize(5),
    },
    clearButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#999999',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(10),
    },
    searchInput: {
        flex: 1,
        height: normalize(40),
        backgroundColor: 'white',
        borderRadius: normalize(10),
        paddingHorizontal: normalize(15),
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
    },
    searchClearButton: {
        marginLeft: normalize(10),
    },
    searchClearButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#999999',
    },
    listContent: {
        paddingBottom: normalize(80), // Место для кнопки применения внизу
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(12),
        paddingHorizontal: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    categoryInfo: {
        flex: 1,
    },
    categoryName: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#000000',
    },
    categoryDescription: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(14),
        color: '#666666',
        marginTop: normalize(4),
    },
    checkbox: {
        width: normalize(20),
        height: normalize(20),
        borderWidth: 1,
        borderColor: '#CCCCCC',
        borderRadius: normalize(4),
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: normalize(10),
    },
    checkboxActive: {
        borderColor: '#6a3cf7',
    },
    checkboxSelected: {
        width: normalize(12),
        height: normalize(12),
        backgroundColor: '#6a3cf7',
        borderRadius: normalize(2),
    },
    emptyMessage: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#999999',
        textAlign: 'center',
        marginTop: normalize(20),
    },
    applyButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: normalize(16),
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    applyButton: {
        backgroundColor: '#6a3cf7',
        borderRadius: normalize(25),
        paddingVertical: normalize(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        fontWeight: '700',
        color: 'white',
    }
});

export default CategorySelectScreen;