import React, { useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
    ActivityIndicator,
    Dimensions,
    PixelRatio,
    SafeAreaView,
    TouchableOpacity,
    Pressable
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Простая замена BackArrowIcon без SVG
const SimpleBackArrow = ({ size = 20, color = '#3478F6' }) => (
    <Text style={{
        fontSize: size,
        color,
        fontWeight: 'bold',
        lineHeight: size
    }}>
        ←
    </Text>
);

// Простая замена CategoryCard без SVG и изображений
const SimpleCategoryCard = ({ category, onPress }) => {
    // Безопасная проверка категории
    if (!category || typeof category !== 'object') {
        return <View style={styles.placeholderCard} />;
    }

    // Получаем первую букву названия для иконки
    const getInitial = (name) => {
        if (!name || typeof name !== 'string') return '?';
        const firstChar = name.charAt(0);
        return firstChar ? firstChar.toUpperCase() : '?';
    };

    // Цвета для разных категорий
    const getCardColor = (name) => {
        if (!name || typeof name !== 'string') return '#6b5be6';

        const colors = [
            '#6b5be6', '#ff6b6b', '#4ecdc4', '#45b7d1',
            '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7'
        ];

        const index = name.length % colors.length;
        return colors[index];
    };

    // Безопасное получение отображаемого имени
    const getDisplayName = () => {
        if (category.name && typeof category.name === 'string') {
            return category.name;
        }
        if (category.description && typeof category.description === 'string') {
            return category.description;
        }
        return 'Категория';
    };

    const displayName = getDisplayName();
    const categoryName = category.name || '';

    return (
        <Pressable
            style={[
                styles.categoryContainer,
                { backgroundColor: getCardColor(categoryName) }
            ]}
            onPress={() => onPress && typeof onPress === 'function' && onPress(category)}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.1)' }}
        >
            <View style={styles.textContainer}>
                <Text
                    style={styles.categoryText}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                >
                    {displayName}
                </Text>
            </View>

            <View style={styles.iconContainer}>
                <Text style={styles.iconText}>
                    {getInitial(categoryName)}
                </Text>
            </View>
        </Pressable>
    );
};

export const CategoriesScreen = ({ navigation }) => {
    const dispatch = useDispatch();

    // Безопасные селекторы с fallback значениями
    const categories = useSelector((state) => {
        try {
            const { selectCategories } = require('@entities/category/model/selectors');
            return selectCategories(state) || [];
        } catch (error) {
            console.warn('CategoriesScreen: Error selecting categories:', error);
            return [];
        }
    });

    const isLoading = useSelector((state) => {
        try {
            const { selectCategoriesLoading } = require('@entities/category/model/selectors');
            return selectCategoriesLoading(state) || false;
        } catch (error) {
            console.warn('CategoriesScreen: Error selecting loading state:', error);
            return false;
        }
    });

    const error = useSelector((state) => {
        try {
            const { selectCategoriesError } = require('@entities/category/model/selectors');
            return selectCategoriesError(state) || null;
        } catch (error) {
            console.warn('CategoriesScreen: Error selecting error state:', error);
            return null;
        }
    });

    useEffect(() => {
        const loadCategories = async () => {
            try {
                if (!Array.isArray(categories) || categories.length === 0) {
                    if (!isLoading && dispatch) {
                        const { fetchCategories } = require('@entities/category/model/slice');
                        dispatch(fetchCategories());
                    }
                }
            } catch (error) {
                console.warn('CategoriesScreen: Error loading categories:', error);
            }
        };

        loadCategories();
    }, [dispatch, categories, isLoading]);

    const handleCategoryPress = useCallback((category) => {
        try {
            if (navigation && typeof navigation.navigate === 'function' && category && category.id) {
                navigation.navigate('ProductsByCategory', {
                    categoryId: category.id,
                    categoryName: category.name || 'Категория',
                    categoryDescription: category.description || 'Описание отсутствует',
                });
            }
        } catch (error) {
            console.warn('CategoriesScreen: Error navigating to category:', error);
        }
    }, [navigation]);

    const handleBackPress = useCallback(() => {
        try {
            if (navigation && typeof navigation.goBack === 'function') {
                navigation.goBack();
            }
        } catch (error) {
            console.warn('CategoriesScreen: Error going back:', error);
        }
    }, [navigation]);

    const handleRetry = useCallback(() => {
        try {
            if (dispatch) {
                const { fetchCategories } = require('@entities/category/model/slice');
                dispatch(fetchCategories());
            }
        } catch (error) {
            console.warn('CategoriesScreen: Error retrying:', error);
        }
    }, [dispatch]);

    // Мемоизированное разбиение категорий на ряды
    const chunkedCategories = useMemo(() => {
        if (!Array.isArray(categories)) return [];

        const chunks = [];
        const validCategories = categories.filter(cat => cat && typeof cat === 'object' && cat.id);

        for (let i = 0; i < validCategories.length; i += 3) {
            chunks.push(validCategories.slice(i, i + 3));
        }
        return chunks;
    }, [categories]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#6b5be6" />
                    <Text style={styles.loadingText}>
                        Загрузка категорий...
                    </Text>
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                        Ошибка загрузки категорий
                    </Text>
                    <Text style={styles.errorSubtext}>
                        {typeof error === 'string' ? error : 'Неизвестная ошибка'}
                    </Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={handleRetry}
                    >
                        <Text style={styles.retryButtonText}>
                            Повторить
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (!Array.isArray(categories) || categories.length === 0) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                        Категории не найдены
                    </Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={handleRetry}
                    >
                        <Text style={styles.retryButtonText}>
                            Обновить
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {chunkedCategories.map((row, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={styles.categoryRow}>
                        {row.map((category) => (
                            <SimpleCategoryCard
                                key={`category-${category.id}`}
                                category={category}
                                onPress={handleCategoryPress}
                            />
                        ))}
                        {row.length < 3 && Array(3 - row.length).fill(null).map((_, i) => (
                            <View key={`placeholder-${rowIndex}-${i}`} style={styles.placeholderCard} />
                        ))}
                    </View>
                ))}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBackPress}
                >
                    <SimpleBackArrow size={20} color="#3478F6"/>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    Категории
                </Text>
                <View style={styles.backButton} />
            </View>

            {renderContent()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        height: normalize(60),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 10,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: normalize(18),
        fontFamily: 'System',
        fontWeight: '600',
        color: '#000',
        textAlign: 'center',
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: normalize(16),
        paddingBottom: normalize(20),
        paddingTop: normalize(16),
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: normalize(16),
    },
    categoryContainer: {
        width: '32.43%',
        aspectRatio: 0.75,
        backgroundColor: "#6b5be6",
        borderRadius: 20,
        overflow: 'hidden',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: normalize(10),
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    textContainer: {
        width: '100%',
        height: normalize(33),
        marginTop: normalize(8),
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryText: {
        fontSize: normalize(14),
        lineHeight: normalize(18),
        fontWeight: '700',
        fontFamily: 'System',
        color: '#ffffff',
        textAlign: 'center',
    },
    iconContainer: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: normalize(8),
    },
    iconText: {
        fontSize: normalize(18),
        fontWeight: 'bold',
        color: '#ffffff',
        fontFamily: 'System',
    },
    placeholderCard: {
        width: '32.43%',
        aspectRatio: 0.75,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
        fontFamily: 'System',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: normalize(20),
    },
    errorText: {
        fontSize: normalize(16),
        color: '#d32f2f',
        textAlign: 'center',
        fontFamily: 'System',
        marginBottom: 8,
        fontWeight: '600',
    },
    errorSubtext: {
        fontSize: normalize(14),
        color: '#666',
        textAlign: 'center',
        fontFamily: 'System',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#6b5be6',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        elevation: 2,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'System',
    },
});