import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
    View,
    StyleSheet,
    SafeAreaView,
    Keyboard,
    Text,
    Platform,
    BackHandler,
    TouchableWithoutFeedback, Dimensions, PixelRatio
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchProducts,
    selectProducts,
    selectProductsLoading,
    selectProductsError, resetCurrentProduct
} from '@entities/product';
import { Loader } from '@shared/ui/Loader';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import LogoSvg from '@assets/logo/Logo';
import { useFocusEffect } from '@react-navigation/native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};


import {
    loadSearchHistory,
    addSearchQuery,
} from '@entities/search';


import {
    PopularTags,
    ScreenSearchBar,
    ProductSuggestions,
    SearchHistory
} from "@features/search";

export const SearchScreen = ({ navigation }) => {
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [suggestedTags, setSuggestedTags] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const searchInputRef = useRef(null);
    const componentMounted = useRef(true);
    const initialFocusComplete = useRef(false);
    const preventFocusLoop = useRef(false);
    const keyboardShowTimeout = useRef(null);
    const [showingHistory, setShowingHistory] = useState(false);

    const dispatch = useDispatch();
    const products = useSelector(selectProducts);
    const isLoading = useSelector(selectProductsLoading);
    const error = useSelector(selectProductsError);

    // Отслеживание показа/скрытия клавиатуры
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
            () => {
                setKeyboardVisible(true);
            }
        );

        const keyboardDidHideListener = Keyboard.addListener(
            Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
            () => {
                setKeyboardVisible(false);
            }
        );

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    // Функция безопасного фокуса
    const safelyFocusInput = useCallback(() => {
        if (preventFocusLoop.current || !componentMounted.current || !searchInputRef.current) {
            return;
        }

        // Устанавливаем защиту от зацикливания
        preventFocusLoop.current = true;

        // Фокусируем поле ввода
        try {
            searchInputRef.current.focus();
        } catch (e) {
            console.warn('Ошибка при фокусировке поля', e);
        }

        // Снимаем защиту через некоторое время
        setTimeout(() => {
            preventFocusLoop.current = false;
        }, 500);
    }, []);

    // При первом открытии экрана
    useFocusEffect(
        useCallback(() => {
            componentMounted.current = true;

            // Только при первом открытии экрана
            if (!initialFocusComplete.current) {
                // Первый фокус с задержкой
                clearTimeout(keyboardShowTimeout.current);
                keyboardShowTimeout.current = setTimeout(() => {
                    if (componentMounted.current) {
                        safelyFocusInput();
                        initialFocusComplete.current = true;
                    }
                }, 300);
            }

            return () => {
                componentMounted.current = false;
                clearTimeout(keyboardShowTimeout.current);
            };
        }, [safelyFocusInput])
    );

    // Загрузка продуктов при монтировании
    useEffect(() => {
        dispatch(fetchProducts());
    }, [dispatch]);

    // Загрузка истории поиска при монтировании
    useEffect(() => {
        dispatch(loadSearchHistory());
    }, [dispatch]);

    // Генерируем теги на основе продуктов
    useEffect(() => {
        if (products?.length) {
            const tags = new Set();

            products.forEach(product => {
                if (product.name) {
                    tags.add(product.name);
                }
                if (product.category) {
                    tags.add(product.category);
                }
                if (product.brand) {
                    tags.add(product.brand);
                }
            });

            setSuggestedTags(Array.from(tags).slice(0, 15));
        }
    }, [products]);

    // Обработка нажатия кнопки "назад" на Android
    useEffect(() => {
        if (Platform.OS === 'android') {
            const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
                if (keyboardVisible) {
                    Keyboard.dismiss();
                    return true;
                }

                // Если клавиатура не видна, выполняем переход назад
                navigation.goBack();
                return true;
            });

            return () => {
                backHandler.remove();
            };
        }
    }, [keyboardVisible, navigation]);

    // Фильтрация продуктов по поисковому запросу
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredProducts([]);
            return;
        }

        const lowercaseQuery = searchQuery.toLowerCase();
        const filtered = products.filter(product =>
            (product.name && product.name.toLowerCase().includes(lowercaseQuery)) ||
            (product.description && product.description.toLowerCase().includes(lowercaseQuery)) ||
            (product.category && product.category.toLowerCase().includes(lowercaseQuery))
        );

        setFilteredProducts(filtered);
    }, [searchQuery, products]);

    const handleProductPress = (product) => {
        console.log('SearchScreen: handleProductPress called with product:', product);

        if (!product || !product.id) {
            console.warn('SearchScreen: Product is null or missing ID');
            return;
        }

        console.log('SearchScreen: Navigating to ProductDetail with ID:', product.id);
        dispatch(resetCurrentProduct());
        dispatch(addSearchQuery(product.name));

        // Используем прямую навигацию внутри SearchStack
        navigation.navigate('ProductDetail', {
            productId: product.id,
            fromScreen: 'Search'
        });
    };

    // Обработчик нажатия на элемент истории
    const handleSearchHistoryPress = (historyItem) => {
        setSearchQuery(historyItem);
        dispatch(addSearchQuery(historyItem));
        Keyboard.dismiss();
        navigation.navigate('SearchResults', {
            searchQuery: historyItem
        });
    };


    const handleSearch = () => {
        if (searchQuery.trim()) {
            // Добавляем запрос в историю поиска
            dispatch(addSearchQuery(searchQuery));

            // Закрываем клавиатуру перед навигацией
            Keyboard.dismiss();

            // Переходим на экран с результатами поиска (карточками)
            navigation.navigate('SearchResults', {
                searchQuery: searchQuery
            });
        }
    };

    // Обработчик нажатия на тег
    const handleTagPress = (tag) => {
        setSearchQuery(tag);
        dispatch(addSearchQuery(tag));
        Keyboard.dismiss();
        navigation.navigate('SearchResults', {
            searchQuery: tag
        });
    };

    // Обработчик очистки поля поиска
    const handleClearSearch = () => {
        setSearchQuery('');
        // Важно: не вызываем здесь safelyFocusInput, это создает цикл
    };

    // Обработчик нажатия "Отмена"
    const handleCancel = () => {
        Keyboard.dismiss();
        navigation.goBack();
    };

    // Обработчик фокуса на поле поиска
    const handleFocus = () => {
        setIsFocused(true);
        if (!searchQuery.trim()) {
            setShowingHistory(true);
        }
    };

    // Обработчик потери фокуса
    const handleBlur = () => {
        setIsFocused(false);
        setShowingHistory(false);
    };

    const handleSearchTextChange = (text) => {
        setSearchQuery(text);
        // Если текст пустой и поле в фокусе, показываем историю
        if (!text.trim() && isFocused) {
            setShowingHistory(true);
        } else {
            setShowingHistory(false);
        }
    };

    // Функция для закрытия клавиатуры при нажатии на фон
    const dismissKeyboard = () => {
        Keyboard.dismiss();
    };

    return (
        <SafeAreaView style={styles.container}>
            <TouchableWithoutFeedback onPress={dismissKeyboard}>
                <View style={styles.logoWrapper}>
                    <View style={styles.logoContainer}>
                        <LogoSvg width={29} height={25} />
                    </View>
                </View>
            </TouchableWithoutFeedback>

            <View style={styles.header}>
                <ScreenSearchBar
                    ref={searchInputRef}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onClear={handleClearSearch}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onCancel={handleCancel}
                    onSubmitEditing={handleSearch}
                    showFullWidth={showingHistory}
                    historyMode={showingHistory}

                />
            </View>

            <TouchableWithoutFeedback onPress={dismissKeyboard}>
                <View style={styles.content}>
                    {isLoading ? (
                        <Loader />
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : (
                        <>
                            {/* Когда поле поиска в фокусе и пустое - показываем историю поиска */}
                            {isFocused && !searchQuery && (
                                <SearchHistory
                                    onItemPress={handleSearchHistoryPress}
                                    searchInputRef={searchInputRef}
                                />
                            )}

                            {/* Когда поле поиска не пустое - показываем результаты поиска */}
                            {searchQuery.trim() !== '' && (
                                <ProductSuggestions
                                    products={filteredProducts}
                                    searchQuery={searchQuery}
                                    onProductPress={handleProductPress}
                                />
                            )}

                            {/* Когда поле поиска не в фокусе - показываем популярные теги */}
                            {!isFocused && !searchQuery && (
                                <PopularTags
                                    tags={suggestedTags}
                                    onTagPress={handleTagPress}
                                />
                            )}
                        </>
                    )}
                </View>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
        borderRadius: 20,
    },
    logoWrapper: {
        paddingHorizontal: 40,
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 25,
        marginTop: 80
    },
    searchBarContainer: {
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(10),
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    header: {
        paddingHorizontal: 30,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_md,
    },
});