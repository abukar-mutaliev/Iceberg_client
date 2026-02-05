import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Dimensions,
    PixelRatio,
    TouchableOpacity,
    Pressable,
    Animated,
    RefreshControl,
    ImageBackground,
    Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient'; // или react-native-linear-gradient
import { BlurView } from 'expo-blur';
import {Color, Padding, FontFamily, FontSize, Border} from '@app/styles/GlobalStyles';
import {ProductTile} from "@entities/product";
import { AndroidShadow } from '@shared/ui/Shadow';
import {ScrollableBackgroundGradient} from "@shared/ui/BackgroundGradient";

// Безопасные импорты
let selectProductsByCategory, selectProductsByCategoryLoading, selectProductsByCategoryError, fetchProductsByCategory, ProductCard;
try {
    const categorySelectors = require('@entities/category/model/selectors');
    selectProductsByCategory = categorySelectors.selectProductsByCategory;
    selectProductsByCategoryLoading = categorySelectors.selectProductsByCategoryLoading;
    selectProductsByCategoryError = categorySelectors.selectProductsByCategoryError;

    const categoryActions = require('@entities/category');
    fetchProductsByCategory = categoryActions.fetchProductsByCategory;

    ProductCard = require('@entities/product/ui/ProductCard').ProductCard;
} catch (error) {
    selectProductsByCategory = () => [];
    selectProductsByCategoryLoading = () => false;
    selectProductsByCategoryError = () => null;
    fetchProductsByCategory = () => Promise.resolve();
    ProductCard = null;
}

// Адаптация размеров
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 414;
const isIOS = Platform.OS === 'ios';

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const ModernBackArrow = ({ size = 24, color = '#fff', onPress }) => {
    const [pressed, setPressed] = useState(false);

    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            style={[
                styles.backButton,
                { opacity: pressed ? 0.7 : 1 }
            ]}
        >
            <Text style={[ { fontSize: size, color }]}>←</Text>
        </Pressable>
    );
};

// Компонент загрузки с анимацией
const LoadingComponent = () => {
    const spinValue = new Animated.Value(0);
    const scaleValue = new Animated.Value(1);

    useEffect(() => {
        const spinAnimation = Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            })
        );

        const scaleAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(scaleValue, {
                    toValue: 1.1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );

        spinAnimation.start();
        scaleAnimation.start();

        return () => {
            spinAnimation.stop();
            scaleAnimation.stop();
        };
    }, []);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.loadingContainer}>
            <Animated.View
                style={[
                    styles.loadingCircle,
                    {
                        transform: [{ rotate: spin }, { scale: scaleValue }],
                    },
                ]}
            >
                <LinearGradient
                    colors={['#b5c9fb', '#b7c4fd']}
                    style={styles.loadingGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            </Animated.View>
            <Text style={styles.loadingText}>Загружаем товары...</Text>
            <View style={styles.loadingDots}>
                {[0, 1, 2].map((i) => (
                    <Animated.View
                        key={i}
                        style={[
                            styles.loadingDot,
                            {
                                opacity: scaleValue.interpolate({
                                    inputRange: [1, 1.1],
                                    outputRange: [0.3, 1],
                                }),
                            },
                        ]}
                    />
                ))}
            </View>
        </View>
    );
};

// Компонент пустого состояния
const EmptyStateComponent = ({ categoryName, onRetry, onGoHome, navigation, bottomInset = 0 }) => {
    const fadeAnim = new Animated.Value(0);
    const slideAnim = new Animated.Value(30);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.emptyContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                    paddingBottom: bottomInset
                }
            ]}
        >
            <View style={styles.emptyContent}>
                <AndroidShadow
                    shadowColor="rgba(181, 201, 251, 0.3)"
                    shadowConfig={{
                        offsetX: 0,
                        offsetY: 8,
                        elevation: 12,
                        radius: 16,
                        opacity: 0.3
                    }}
                    borderRadius={60}
                    style={styles.emptyIconContainer}
                >
                    <LinearGradient
                        colors={['#b5c9fb', '#b7c4fd']}
                        style={styles.emptyIconGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <Text style={styles.emptyIcon}>🛍️</Text>
                </AndroidShadow>

                <Text style={styles.emptyTitle}>Товары не найдены</Text>
                <Text style={styles.emptySubtitle}>
                    В категории "{categoryName || 'Категория'}" пока нет товаров
                </Text>

                <View style={styles.emptyActions}>
                    <AndroidShadow
                        shadowColor="rgba(181, 201, 251, 0.3)"
                        shadowConfig={{
                            offsetX: 0,
                            offsetY: 6,
                            elevation: 8,
                            radius: 12,
                            opacity: 0.3
                        }}
                        borderRadius={3}
                        style={styles.primaryButton}
                    >
                        <TouchableOpacity
                            style={styles.fullAreaButton}
                            onPress={onRetry}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[Color.colorLightMode, Color.colorLightMode]}
                                style={styles.buttonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                            <Text style={styles.primaryButtonText}>🔄 Обновить</Text>
                        </TouchableOpacity>
                    </AndroidShadow>

                    <AndroidShadow
                        shadowColor="rgba(181, 201, 251, 0.2)"
                        shadowConfig={{
                            offsetX: 0,
                            offsetY: 2,
                            elevation: 4,
                            radius: 8,
                            opacity: 0.2
                        }}
                        borderRadius={26}
                        style={styles.secondaryButton}
                    >
                        <TouchableOpacity
                            style={styles.fullAreaButton}
                            onPress={() => navigation.navigate('Categories')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.secondaryButtonText}>📂 Все категории</Text>
                        </TouchableOpacity>
                    </AndroidShadow>

                    <TouchableOpacity
                        style={styles.tertiaryButton}
                        onPress={onGoHome}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.tertiaryButtonText}>🏠 На главную</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.emptyFooter}>
                    <Text style={styles.emptyFooterText}>
                        💡 Попробуйте поискать в других категориях или воспользуйтесь поиском
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
};

// Компонент ошибки
const ErrorComponent = ({ error, onRetry }) => {
    return (
        <View style={styles.errorContainer}>
            <AndroidShadow
                shadowColor="rgba(255, 107, 107, 0.3)"
                shadowConfig={{
                    offsetX: 0,
                    offsetY: 6,
                    elevation: 8,
                    radius: 12,
                    opacity: 0.3
                }}
                borderRadius={40}
                style={styles.errorIconContainer}
            >
                <LinearGradient
                    colors={['#ff6b6b', '#ee5a52']}
                    style={styles.errorIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <Text style={styles.errorIcon}>⚠️</Text>
            </AndroidShadow>
            <Text style={styles.errorTitle}>Что-то пошло не так</Text>
            <Text style={styles.errorText}>{error}</Text>
            <AndroidShadow
                shadowColor="rgba(181, 201, 251, 0.3)"
                shadowConfig={{
                    offsetX: 0,
                    offsetY: 4,
                    elevation: 6,
                    radius: 8,
                    opacity: 0.3
                }}
                borderRadius={26}
                style={styles.retryButton}
            >
                <TouchableOpacity
                    style={styles.fullAreaButton}
                    onPress={onRetry}
                >
                    <LinearGradient
                        colors={['#b5c9fb', '#b7c4fd']}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    />
                    <Text style={styles.retryButtonText}>Повторить</Text>
                </TouchableOpacity>
            </AndroidShadow>
        </View>
    );
};

// Анимированная карточка продукта с использованием ProductCard или ProductTile
// Мемоизируем компонент для предотвращения ненужных ререндеров
const AnimatedProductCard = React.memo(({ item, onPress, index }) => {
    // Используем useRef для сохранения анимаций между ререндерами
    const fadeAnimRef = React.useRef(null);
    const slideAnimRef = React.useRef(null);
    const hasAnimatedRef = React.useRef(false);
    const itemIdRef = React.useRef(null);

    // Инициализируем анимации только один раз
    if (fadeAnimRef.current === null) {
        fadeAnimRef.current = new Animated.Value(1); // Начинаем с видимости 1
        slideAnimRef.current = new Animated.Value(0); // Начинаем с позиции 0
    }

    const fadeAnim = fadeAnimRef.current;
    const slideAnim = slideAnimRef.current;

    useEffect(() => {
        // Если это новый товар (ID изменился), сбрасываем флаг анимации
        if (itemIdRef.current !== item?.id) {
            itemIdRef.current = item?.id;
            hasAnimatedRef.current = false;
        }

        // Анимируем только при первом появлении нового товара
        if (!hasAnimatedRef.current && item?.id) {
            hasAnimatedRef.current = true;
            const delay = Math.min(index * 80, 400); // Ограничиваем задержку

            // Сбрасываем значения для анимации
            fadeAnim.setValue(0);
            slideAnim.setValue(30);

            const timeoutId = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        tension: 100,
                        friction: 8,
                        useNativeDriver: true,
                    }),
                ]).start();
            }, delay);

            return () => clearTimeout(timeoutId);
        } else if (item?.id) {
            // При обновлении существующего товара просто убеждаемся, что элемент видим
            // НЕ сбрасываем анимацию, чтобы товары не исчезали
            if (fadeAnim._value !== 1) {
                fadeAnim.setValue(1);
            }
            if (slideAnim._value !== 0) {
                slideAnim.setValue(0);
            }
        }
    }, [item?.id, index, fadeAnim, slideAnim]);

    // Обработчик нажатия на карточку продукта
    const handleProductPress = useCallback((productId) => {
        if (onPress && productId) {
            onPress(productId);
        }
    }, [onPress]);

    if (!item || !item.id) {
        return null;
    }

    return (
        <Animated.View
            style={[
                styles.productCardContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                }
            ]}
        >
            {ProductCard ? (
                <ProductCard
                    product={item}
                    onPress={handleProductPress}
                    width={SCREEN_WIDTH - normalize(32)} // Полная ширина минус отступы
                />
            ) : (
                <ProductTile
                    product={{
                        ...item,
                        category: item.categories?.[0]?.description || 'БАСКЕТ'
                    }}
                    onPress={() => handleProductPress(item.id)}
                />
            )}
        </Animated.View>
    );
}, (prevProps, nextProps) => {
    // Мемоизация: обновляем только если изменился ID товара
    return prevProps.item?.id === nextProps.item?.id && 
           prevProps.index === nextProps.index;
});

export const ProductsByCategoryScreen = ({ route, navigation }) => {
    const { categoryId, categoryName } = route.params || {};
    const dispatch = useDispatch();
    const [refreshing, setRefreshing] = useState(false);
    const insets = useSafeAreaInsets();

    const products = useSelector((state) => selectProductsByCategory(state, categoryId));
    const isLoading = useSelector(selectProductsByCategoryLoading);
    const error = useSelector(selectProductsByCategoryError);

    const getRootNavigation = useCallback(() => {
        let current = navigation;
        while (current?.getParent?.()) {
            current = current.getParent();
        }
        return current;
    }, [navigation]);

    const handleGoHome = useCallback(() => {
        const rootNavigation = getRootNavigation();
        const routeNames = rootNavigation?.getState?.()?.routeNames || [];

        if (routeNames.includes('Main')) {
            rootNavigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [
                        {
                            name: 'Main',
                            state: {
                                index: 0,
                                routes: [
                                    {
                                        name: 'MainTab',
                                        state: {
                                            index: 0,
                                            routes: [{ name: 'Main' }],
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                })
            );
            return;
        }

        navigation.navigate('MainTab', { screen: 'Main' });
    }, [getRootNavigation, navigation]);

    useEffect(() => {
        if (categoryId && dispatch && fetchProductsByCategory) {
            dispatch(fetchProductsByCategory({ categoryId, params: {} }));
        }
    }, [dispatch, categoryId]);

    const handleProductPress = useCallback((product) => {
        // Поддержка как productId, так и объекта продукта
        const productId = typeof product === 'object' && product?.id ? product.id : product;
        if (!productId) return;

        const numericId = typeof productId === 'string' ? parseInt(productId, 10) : productId;
        if (isNaN(numericId)) return;

        // Используем прямую навигацию внутри текущего стека
        navigation.navigate('ProductDetail', {
            productId: numericId,
            fromScreen: 'ProductsByCategory'
        });
    }, [navigation]);

    const handleBackPress = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handleRetry = useCallback(() => {
        if (categoryId && dispatch && fetchProductsByCategory) {
            dispatch(fetchProductsByCategory({ categoryId, params: {} }));
        }
    }, [dispatch, categoryId]);

    const onRefresh = useCallback(async () => {
        if (!categoryId || !dispatch || !fetchProductsByCategory) {
            return;
        }
        
        setRefreshing(true);
        try {
            // Ждем завершения загрузки перед сбросом refreshing
            const result = await dispatch(fetchProductsByCategory({ categoryId, params: {}, refresh: true })).unwrap();
        } catch (error) {
            console.error('ProductsByCategory: Ошибка при обновлении:', error);
            // Даже при ошибке сбрасываем refreshing, чтобы пользователь мог попробовать снова
        } finally {
            // Сбрасываем refreshing только после завершения загрузки
            setRefreshing(false);
        }
    }, [dispatch, categoryId, products]);

    const renderProductItem = useCallback(({ item, index }) => (
        <AnimatedProductCard
            item={item}
            index={index}
            onPress={handleProductPress}
        />
    ), [handleProductPress]);

    const content = useMemo(() => {
        const hasProducts = Array.isArray(products) && products.length > 0;

        // Показываем загрузку только при первой загрузке (не при обновлении)
        if (isLoading && !refreshing && !hasProducts) {
            return <LoadingComponent />;
        }

        // ВСЕГДА показываем список, если есть продукты, даже во время обновления
        // Это гарантирует, что товары не пропадут
        if (hasProducts) {
        return (
            <FlatList
                data={products}
                renderItem={renderProductItem}
                keyExtractor={(item) => {
                    // Используем стабильный ключ на основе ID продукта
                    const key = item?.id?.toString() || `product-${Math.random()}`;
                    return key;
                }}
                numColumns={1}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.productsList}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#b5c9fb', '#b7c4fd']}
                        tintColor="#b5c9fb"
                        progressBackgroundColor="#fff"
                    />
                }
                removeClippedSubviews={false} // Отключаем для предотвращения проблем с обновлением
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={products.length} // Рендерим все элементы сразу
                windowSize={5} // Увеличиваем размер окна для лучшей стабильности
                ItemSeparatorComponent={() => <View style={styles.productSeparator} />}
                // Добавляем extraData для принудительного обновления при изменении refreshing
                extraData={`${refreshing}-${products.length}`}
            />
        );
        }

        // Показываем ошибку только если нет продуктов и не идет обновление
        if (error && !refreshing) {
            return <ErrorComponent error={error} onRetry={handleRetry} />;
        }

        // Показываем пустое состояние только если нет продуктов и не идет загрузка/обновление
        if (!refreshing && !isLoading) {
            return (
                <EmptyStateComponent
                    categoryName={categoryName}
                    onRetry={handleRetry}
                    onGoHome={handleGoHome}
                    navigation={navigation}
                    bottomInset={80 + insets.bottom + normalize(16)}
                />
            );
        }

        // Во время обновления или загрузки показываем пустой список с RefreshControl
        return (
            <FlatList
                data={[]}
                renderItem={() => null}
                keyExtractor={() => 'empty'}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing || isLoading}
                        onRefresh={onRefresh}
                        colors={['#b5c9fb', '#b7c4fd']}
                        tintColor="#b5c9fb"
                        progressBackgroundColor="#fff"
                    />
                }
            />
        );
    }, [isLoading, error, products, renderProductItem, refreshing, onRefresh, handleRetry, categoryName, navigation]);

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            {/* Кастомный градиентный фон */}
            <ScrollableBackgroundGradient
                contentHeight={SCREEN_HEIGHT}
                showOverlayGradient={true}
                showShadowGradient={false}
            />

            {/* Градиентный заголовок */}
            <LinearGradient
                colors={[Color.blue250, Color.purpleSoft]}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {isIOS && (
                    <BlurView intensity={20} style={styles.headerBlur} />
                )}

                <View style={[styles.header, { height: normalize(70) }]}>
                    <ModernBackArrow onPress={handleBackPress} />

                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {categoryName || 'Категория'}
                        </Text>
                        <Text style={styles.headerSubtitle}>
                            {Array.isArray(products) ? `${products.length} товаров` : ''}
                        </Text>
                    </View>

                    <View style={styles.headerSpacer} />
                </View>
            </LinearGradient>

            {/* Контент */}
            <View style={styles.contentContainer}>
                {content}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    headerBlur: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    header: {
        height: normalize(70),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(20),
    },
    backButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    headerTitle: {
        fontSize: normalize(20),
        fontFamily: FontFamily?.sFProText || 'System',
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    headerSubtitle: {
        fontSize: normalize(13),
        fontFamily: FontFamily?.sFProText || 'System',
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        marginTop: 2,
    },
    headerSpacer: {
        width: 44,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },

    // Стили загрузки
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 24,
        overflow: 'hidden',
    },
    loadingGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
    },
    loadingText: {
        fontSize: normalize(18),
        fontFamily: FontFamily?.sFProText || 'System',
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 16,
    },
    loadingDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#b5c9fb',
        marginHorizontal: 4,
    },

    // Пустое состояние
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: normalize(24),
        position: 'relative',
    },
    emptyContent: {
        alignItems: 'center',
        maxWidth: 320,
        width: '100%',
        backgroundColor: 'transparent',
        borderRadius: 24,
        padding: 32,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
    },
    emptyIconGradient: {
        position: 'absolute',
        top: 5,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 60,
    },
    emptyIcon: {
        fontSize: 48,
        textAlign: 'center',
    },
    emptyTitle: {
        fontSize: normalize(24),
        fontWeight: '800',
        color: '#333',
        textAlign: 'center',
        marginBottom: 12,
        fontFamily: FontFamily?.sFProText || 'System',
    },
    emptySubtitle: {
        fontSize: normalize(16),
        color: '#666',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
        fontFamily: FontFamily?.sFProText || 'System',
    },
    emptyActions: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 24,
    },
    primaryButton: {
        width: '100%',
        height: 56,
        marginBottom: 12,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'white',
    },
    // НОВЫЙ СТИЛЬ: Для активности всей области кнопки
    fullAreaButton: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    buttonGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    primaryButtonText: {
        color: Color.dark,
        fontSize: normalize(16),
        fontWeight: '700',
        fontFamily: FontFamily?.sFProText || 'System',
        textAlign: 'center',
        backgroundColor: 'transparent',
    },
    secondaryButton: {
        width: '100%',
        height: 52,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#b5c9fb',
        marginBottom: 12,
        overflow: 'hidden', // Добавлено для правильного отображения
    },
    secondaryButtonText: {
        color: '#b5c9fb',
        fontSize: normalize(15),
        fontWeight: '600',
        fontFamily: FontFamily?.sFProText || 'System',
    },
    tertiaryButton: {
        width: '100%',
        height: 48,
        backgroundColor: 'rgba(181, 201, 251, 0.1)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(181, 201, 251, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tertiaryButtonText: {
        color: '#666',
        fontSize: normalize(14),
        fontWeight: '500',
        fontFamily: FontFamily?.sFProText || 'System',
    },
    emptyFooter: {
        width: '100%',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'rgba(181, 201, 251, 0.05)',
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#b5c9fb',
    },
    emptyFooterText: {
        fontSize: normalize(13),
        color: '#666',
        textAlign: 'center',
        lineHeight: 18,
        fontFamily: FontFamily?.sFProText || 'System',
        fontStyle: 'italic',
    },

    // Ошибка
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: normalize(24),
    },
    errorIconContainer: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        overflow: 'hidden',
    },
    errorIconGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    errorIcon: {
        fontSize: 40,
        textAlign: 'center',
    },
    errorTitle: {
        fontSize: normalize(20),
        fontWeight: '700',
        color: '#d32f2f',
        textAlign: 'center',
        marginBottom: 8,
        fontFamily: FontFamily?.sFProText || 'System',
    },
    errorText: {
        fontSize: normalize(16),
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
        fontFamily: FontFamily?.sFProText || 'System',
    },
    retryButton: {
        width: 200,
        height: 52,
        overflow: 'hidden',
        position: 'relative',
    },
    retryButtonText: {
        color: '#fff',
        fontSize: normalize(16),
        fontWeight: '600',
        fontFamily: FontFamily?.sFProText || 'System',
    },

    // Список продуктов
    productsList: {
        paddingTop: normalize(26),
        paddingBottom: normalize(100),
        alignItems: 'center',
    },
    productSeparator: {
        height: normalize(8),
    },
    productCardContainer: {
        alignSelf: 'center',
        marginBottom: normalize(0),
    },
});

export default ProductsByCategoryScreen;