import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
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
import { CommonActions, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, Padding, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { ProductTile } from "@entities/product";
import { AndroidShadow } from '@shared/ui/Shadow';
import { ScrollableBackgroundGradient } from "@shared/ui/BackgroundGradient";
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ThemedStatusBar } from '@shared/ui/ThemedStatusBar/ThemedStatusBar';
import {
    logCategoryProducts,
    summarizeProducts,
    summarizeReduxProductsByCategory,
} from '@entities/category/lib/categoryProductsDebug';

import {
    loadCategoryProducts,
    selectProductsByCategory,
    selectProductsByCategoryLoading,
    selectProductsByCategoryLoadingMore,
    selectProductsByCategoryError,
    selectProductsByCategoryHasMore,
    selectProductsByCategoryCurrentPage,
} from '@entities/category';
import { ProductCard } from '@entities/product/ui/ProductCard';

const PRODUCTS_PER_PAGE = 20;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 414;
const isIOS = Platform.OS === 'ios';

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const ModernBackArrow = ({ size = 24, color = '#fff', onPress, styles }) => {
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
            <Text style={[{ fontSize: size, color }]}>←</Text>
        </Pressable>
    );
};

const LoadingComponent = ({ styles, colors, isDark }) => {
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

    const loadingGradientColors = isDark
        ? [colors.primary, colors.primaryMuted || colors.primary]
        : ['#b5c9fb', '#b7c4fd'];

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
                    colors={loadingGradientColors}
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

const EmptyStateComponent = ({ categoryName, onRetry, onGoHome, navigation, bottomInset = 0, styles, colors, isDark }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;
    const iconScale = useRef(new Animated.Value(0.85)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 80,
                friction: 10,
                useNativeDriver: true,
            }),
            Animated.spring(iconScale, {
                toValue: 1,
                tension: 60,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, slideAnim, iconScale]);

    const accentGradient = isDark
        ? [colors.primary, colors.primaryMuted || colors.primary]
        : ['#b5c9fb', '#b7c4fd'];
    const accentShadow = isDark
        ? 'rgba(0, 0, 0, 0.5)'
        : 'rgba(181, 201, 251, 0.35)';
    const displayCategory = categoryName || 'Категория';

    return (
        <Animated.View
            style={[
                styles.emptyContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                    paddingBottom: bottomInset,
                },
            ]}
        >
            <View style={styles.emptyDecor} pointerEvents="none">
                <View style={styles.emptyDecorCircle1} />
                <View style={styles.emptyDecorCircle2} />
            </View>

            <View style={styles.emptyCard}>
                <Animated.View style={[styles.emptyIconWrap, { transform: [{ scale: iconScale }] }]}>
                    <AndroidShadow
                        shadowColor={accentShadow}
                        shadowConfig={{
                            offsetX: 0,
                            offsetY: 8,
                            elevation: 10,
                            radius: 16,
                            opacity: 0.25,
                        }}
                        borderRadius={56}
                        style={styles.emptyIconContainer}
                    >
                        <LinearGradient
                            colors={accentGradient}
                            style={styles.emptyIconGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <Icon name="inventory-2" size={44} color="#fff" />
                    </AndroidShadow>
                </Animated.View>

                <View style={styles.emptyCategoryBadge}>
                    <Icon name="category" size={14} color={colors.primary} />
                    <Text style={styles.emptyCategoryBadgeText} numberOfLines={1}>
                        {displayCategory}
                    </Text>
                </View>

                <Text style={styles.emptyTitle}>Товары не найдены</Text>
                <Text style={styles.emptySubtitle}>
                    В этой категории пока нет товаров. Обновите список или выберите другую категорию.
                </Text>

                <View style={styles.emptyActions}>
                    <AndroidShadow
                        shadowColor={accentShadow}
                        shadowConfig={{
                            offsetX: 0,
                            offsetY: 6,
                            elevation: 8,
                            radius: 12,
                            opacity: 0.3,
                        }}
                        borderRadius={14}
                        style={styles.emptyPrimaryButton}
                    >
                        <TouchableOpacity
                            style={styles.fullAreaButton}
                            onPress={onRetry}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={accentGradient}
                                style={styles.buttonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                            <View style={styles.emptyButtonContent}>
                                <Icon name="refresh" size={20} color="#fff" />
                                <Text style={styles.emptyPrimaryButtonText}>Обновить</Text>
                            </View>
                        </TouchableOpacity>
                    </AndroidShadow>

                    <TouchableOpacity
                        style={styles.emptySecondaryButton}
                        onPress={() => navigation.navigate('Categories')}
                        activeOpacity={0.85}
                    >
                        <Icon name="folder-open" size={20} color={colors.primary} />
                        <Text style={styles.emptySecondaryButtonText}>Все категории</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.emptyTertiaryButton}
                        onPress={onGoHome}
                        activeOpacity={0.85}
                    >
                        <Icon name="home" size={18} color={colors.textSecondary} />
                        <Text style={styles.emptyTertiaryButtonText}>На главную</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.emptyFooter}>
                    <Icon name="lightbulb-outline" size={16} color={colors.primary} />
                    <Text style={styles.emptyFooterText}>
                        Попробуйте поиск или другие категории
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
};

const ErrorComponent = ({ error, onRetry, styles, colors, isDark }) => {
    const accentGradient = isDark
        ? [colors.primary, colors.primary]
        : ['#b5c9fb', '#b7c4fd'];

    return (
        <View style={styles.errorContainer}>
            <AndroidShadow
                shadowColor={isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 107, 107, 0.3)'}
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
                shadowColor={isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(181, 201, 251, 0.3)'}
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
                        colors={accentGradient}
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

const AnimatedProductCard = React.memo(({ item, onPress, index, styles }) => {
    const fadeAnimRef = React.useRef(null);
    const slideAnimRef = React.useRef(null);
    const hasAnimatedRef = React.useRef(false);
    const itemIdRef = React.useRef(null);

    if (fadeAnimRef.current === null) {
        fadeAnimRef.current = new Animated.Value(1);
        slideAnimRef.current = new Animated.Value(0);
    }

    const fadeAnim = fadeAnimRef.current;
    const slideAnim = slideAnimRef.current;

    useEffect(() => {
        if (itemIdRef.current !== item?.id) {
            itemIdRef.current = item?.id;
            hasAnimatedRef.current = false;
        }

        if (!hasAnimatedRef.current && item?.id) {
            hasAnimatedRef.current = true;
            const delay = Math.min(index * 80, 400);

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
            if (fadeAnim._value !== 1) {
                fadeAnim.setValue(1);
            }
            if (slideAnim._value !== 0) {
                slideAnim.setValue(0);
            }
        }
    }, [item?.id, index, fadeAnim, slideAnim]);

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
                    width={SCREEN_WIDTH - normalize(32)}
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
    return prevProps.item?.id === nextProps.item?.id &&
        prevProps.index === nextProps.index;
});

export const ProductsByCategoryScreen = ({ navigation }) => {
    const route = useRoute();
    const { categoryId: rawCategoryId, categoryName } = route.params || {};
    const categoryId = useMemo(() => {
        const numericId = Number(rawCategoryId);
        return Number.isFinite(numericId) ? numericId : null;
    }, [rawCategoryId]);

    const dispatch = useDispatch();
    const [refreshing, setRefreshing] = useState(false);
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const products = useSelector((state) => selectProductsByCategory(state, categoryId));
    const isLoading = useSelector((state) => selectProductsByCategoryLoading(state, categoryId));
    const isLoadingMore = useSelector((state) => selectProductsByCategoryLoadingMore(state, categoryId));
    const hasMoreProducts = useSelector((state) => selectProductsByCategoryHasMore(state, categoryId));
    const currentPage = useSelector((state) => selectProductsByCategoryCurrentPage(state, categoryId));
    const error = useSelector((state) => selectProductsByCategoryError(state, categoryId));
    const categoryStateSnapshot = useSelector((state) => state.category);

    useEffect(() => {
        logCategoryProducts('ProductsByCategoryScreen.mount', {
            routeParams: route.params,
            rawCategoryId,
            normalizedCategoryId: categoryId,
            categoryName,
        });
    }, []);

    useEffect(() => {
        const hasProducts = Array.isArray(products) && products.length > 0;
        const contentBranch = (isLoading && !refreshing && !hasProducts)
            ? 'loading'
            : hasProducts
                ? 'list'
                : (error && !refreshing)
                    ? 'error'
                    : (!refreshing && !isLoading)
                        ? 'empty'
                        : 'refreshing-placeholder';

        logCategoryProducts('ProductsByCategoryScreen.state', {
            normalizedCategoryId: categoryId,
            categoryName,
            contentBranch,
            selectorProducts: summarizeProducts(products),
            isLoading,
            isLoadingMore,
            hasMoreProducts,
            currentPage,
            error,
            redux: summarizeReduxProductsByCategory(categoryStateSnapshot),
        });
    }, [
        categoryId,
        categoryName,
        products,
        isLoading,
        isLoadingMore,
        hasMoreProducts,
        currentPage,
        error,
        refreshing,
        categoryStateSnapshot,
    ]);

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

    const requestCategoryProducts = useCallback((options = {}) => {
        if (!categoryId || !dispatch) {
            logCategoryProducts('ProductsByCategoryScreen.load.skip', {
                categoryId,
                hasDispatch: !!dispatch,
                options,
            });
            return null;
        }

        logCategoryProducts('ProductsByCategoryScreen.load.dispatch', {
            categoryId,
            categoryName,
            page: options.page ?? 1,
            limit: PRODUCTS_PER_PAGE,
        });

        return dispatch(loadCategoryProducts({
            categoryId,
            categoryName,
            page: options.page ?? 1,
            limit: PRODUCTS_PER_PAGE,
        }));
    }, [dispatch, categoryId, categoryName]);

    useEffect(() => {
        if (!categoryId || !dispatch) {
            return;
        }

        logCategoryProducts('ProductsByCategoryScreen.effect.load', {
            categoryId,
            categoryName,
        });

        dispatch(loadCategoryProducts({
            categoryId,
            categoryName,
            page: 1,
            limit: PRODUCTS_PER_PAGE,
        }));
    }, [dispatch, categoryId, categoryName]);

    const handleProductPress = useCallback((product) => {
        const productId = typeof product === 'object' && product?.id ? product.id : product;
        if (!productId) return;

        const numericId = typeof productId === 'string' ? parseInt(productId, 10) : productId;
        if (isNaN(numericId)) return;

        navigation.navigate('ProductDetail', {
            productId: numericId,
            fromScreen: 'ProductsByCategory'
        });
    }, [navigation]);

    const handleBackPress = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handleRetry = useCallback(() => {
        requestCategoryProducts({ page: 1 });
    }, [requestCategoryProducts]);

    const handleLoadMore = useCallback(() => {
        if (!categoryId || !dispatch) {
            return;
        }
        if (!hasMoreProducts || isLoading || isLoadingMore) {
            logCategoryProducts('ProductsByCategoryScreen.loadMore.skip', {
                categoryId,
                hasMoreProducts,
                isLoading,
                isLoadingMore,
                currentPage,
            });
            return;
        }

        logCategoryProducts('ProductsByCategoryScreen.loadMore.dispatch', {
            categoryId,
            categoryName,
            nextPage: currentPage + 1,
            currentProductsCount: products?.length ?? 0,
        });

        dispatch(loadCategoryProducts({
            categoryId,
            categoryName,
            page: currentPage + 1,
            limit: PRODUCTS_PER_PAGE,
        }));
    }, [dispatch, categoryId, categoryName, hasMoreProducts, isLoading, isLoadingMore, currentPage, products?.length]);

    const onRefresh = useCallback(async () => {
        if (!categoryId) {
            return;
        }

        setRefreshing(true);
        try {
            await dispatch(loadCategoryProducts({
                categoryId,
                categoryName,
                page: 1,
                limit: PRODUCTS_PER_PAGE,
            }));
        } catch (error) {
            console.error('ProductsByCategory: Ошибка при обновлении:', error);
        } finally {
            setRefreshing(false);
        }
    }, [categoryId, categoryName, dispatch]);

    const renderListFooter = useCallback(() => {
        if (!isLoadingMore) {
            return null;
        }

        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    }, [colors.primary, isLoadingMore, styles.footerLoader]);

    const renderProductItem = useCallback(({ item, index }) => (
        <AnimatedProductCard
            item={item}
            index={index}
            onPress={handleProductPress}
            styles={styles}
        />
    ), [handleProductPress, styles]);

    const refreshColors = useMemo(
        () => (isDark ? [colors.primary] : ['#b5c9fb', '#b7c4fd']),
        [isDark, colors.primary]
    );
    const refreshTint = isDark ? colors.primary : '#b5c9fb';
    const refreshProgressBg = isDark ? colors.surfaceElevated : '#fff';

    const content = useMemo(() => {
        const hasProducts = Array.isArray(products) && products.length > 0;

        if (isLoading && !refreshing && !hasProducts) {
            return <LoadingComponent styles={styles} colors={colors} isDark={isDark} />;
        }

        if (hasProducts) {
            return (
                <FlatList
                    key={`products-category-${categoryId}`}
                    data={products}
                    renderItem={renderProductItem}
                    keyExtractor={(item) => item?.id?.toString() || `product-${item?.name}`}
                    numColumns={1}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.productsList}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={refreshColors}
                            tintColor={refreshTint}
                            progressBackgroundColor={refreshProgressBg}
                        />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderListFooter}
                    removeClippedSubviews={false}
                    maxToRenderPerBatch={10}
                    updateCellsBatchingPeriod={50}
                    initialNumToRender={Math.min(products.length, PRODUCTS_PER_PAGE)}
                    windowSize={5}
                    ItemSeparatorComponent={() => <View style={styles.productSeparator} />}
                    extraData={`${refreshing}-${products.length}-${isLoadingMore}`}
                />
            );
        }

        if (error && !refreshing) {
            return <ErrorComponent error={error} onRetry={handleRetry} styles={styles} colors={colors} isDark={isDark} />;
        }

        if (!refreshing && !isLoading) {
            return (
                <EmptyStateComponent
                    categoryName={categoryName}
                    onRetry={handleRetry}
                    onGoHome={handleGoHome}
                    navigation={navigation}
                    bottomInset={80 + insets.bottom + normalize(16)}
                    styles={styles}
                    colors={colors}
                    isDark={isDark}
                />
            );
        }

        return (
            <FlatList
                data={[]}
                renderItem={() => null}
                keyExtractor={() => 'empty'}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing || isLoading}
                        onRefresh={onRefresh}
                        colors={refreshColors}
                        tintColor={refreshTint}
                        progressBackgroundColor={refreshProgressBg}
                    />
                }
            />
        );
    }, [
        categoryId, isLoading, isLoadingMore, error, products, renderProductItem, refreshing, onRefresh,
        handleRetry, handleLoadMore, renderListFooter, categoryName, navigation, styles, colors, isDark,
        refreshColors, refreshTint, refreshProgressBg, insets.bottom,
    ]);

    const headerGradientColors = isDark
        ? [colors.surface, colors.surface]
        : [Color.blue250, Color.purpleSoft];
    const backArrowColor = isDark ? colors.textPrimary : '#fff';

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <ThemedStatusBar />
            <ScrollableBackgroundGradient
                contentHeight={SCREEN_HEIGHT}
                showOverlayGradient={true}
                showShadowGradient={false}
            />

            <LinearGradient
                colors={headerGradientColors}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={[styles.header, { height: normalize(70) }]}>
                    <ModernBackArrow onPress={handleBackPress} color={backArrowColor} styles={styles} />

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

            <View style={styles.contentContainer}>
                {content}
            </View>
        </SafeAreaView>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    headerGradient: {
        borderBottomWidth: isDark ? 1 : 0,
        borderBottomColor: isDark ? colors.border : 'transparent',
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
        color: isDark ? colors.textPrimary : '#fff',
        textAlign: 'center',
        textShadowColor: isDark ? 'transparent' : 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: isDark ? 0 : 2,
    },
    headerSubtitle: {
        fontSize: normalize(13),
        fontFamily: FontFamily?.sFProText || 'System',
        fontWeight: '500',
        color: isDark ? colors.textSecondary : 'rgba(255, 255, 255, 0.8)',
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
        color: isDark ? colors.textPrimary : '#333',
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
        backgroundColor: isDark ? colors.primary : '#b5c9fb',
        marginHorizontal: 4,
    },

    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: normalize(20),
        position: 'relative',
        overflow: 'hidden',
    },
    emptyDecor: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyDecorCircle1: {
        position: 'absolute',
        width: normalize(280),
        height: normalize(280),
        borderRadius: normalize(140),
        backgroundColor: isDark ? `${colors.primary}14` : 'rgba(181, 201, 251, 0.18)',
        top: '18%',
        right: -normalize(60),
    },
    emptyDecorCircle2: {
        position: 'absolute',
        width: normalize(200),
        height: normalize(200),
        borderRadius: normalize(100),
        backgroundColor: isDark ? `${colors.primary}0D` : 'rgba(183, 196, 253, 0.12)',
        bottom: '22%',
        left: -normalize(40),
    },
    emptyCard: {
        alignItems: 'center',
        width: '100%',
        maxWidth: 340,
        backgroundColor: isDark ? colors.surfaceElevated : 'rgba(255, 255, 255, 0.92)',
        borderRadius: 24,
        paddingHorizontal: normalize(24),
        paddingTop: normalize(32),
        paddingBottom: normalize(24),
        borderWidth: 1,
        borderColor: isDark ? colors.border : 'rgba(181, 201, 251, 0.35)',
        ...(isIOS ? {
            shadowColor: isDark ? '#000' : '#b5c9fb',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDark ? 0.25 : 0.18,
            shadowRadius: 16,
        } : {}),
    },
    emptyIconWrap: {
        marginBottom: normalize(20),
    },
    emptyIconContainer: {
        width: 112,
        height: 112,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    emptyIconGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 56,
    },
    emptyCategoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        maxWidth: '100%',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: isDark ? `${colors.primary}22` : 'rgba(181, 201, 251, 0.2)',
        marginBottom: normalize(16),
    },
    emptyCategoryBadgeText: {
        flexShrink: 1,
        fontSize: normalize(13),
        fontWeight: '600',
        color: colors.primary,
        fontFamily: FontFamily?.sFProText || 'System',
    },
    emptyTitle: {
        fontSize: normalize(22),
        fontWeight: '700',
        color: isDark ? colors.textPrimary : '#1a1a2e',
        textAlign: 'center',
        marginBottom: 10,
        fontFamily: FontFamily?.sFProText || 'System',
    },
    emptySubtitle: {
        fontSize: normalize(15),
        color: isDark ? colors.textSecondary : '#666',
        textAlign: 'center',
        marginBottom: normalize(24),
        lineHeight: 22,
        fontFamily: FontFamily?.sFProText || 'System',
    },
    emptyActions: {
        width: '100%',
        gap: 10,
        marginBottom: normalize(20),
    },
    emptyPrimaryButton: {
        width: '100%',
        height: 52,
        overflow: 'hidden',
        position: 'relative',
    },
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
    emptyButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        zIndex: 1,
    },
    emptyPrimaryButtonText: {
        color: '#fff',
        fontSize: normalize(16),
        fontWeight: '700',
        fontFamily: FontFamily?.sFProText || 'System',
    },
    emptySecondaryButton: {
        width: '100%',
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: isDark ? colors.surface : '#fff',
        borderWidth: 1.5,
        borderColor: isDark ? colors.primary : '#b5c9fb',
        borderRadius: 14,
    },
    emptySecondaryButtonText: {
        color: colors.primary,
        fontSize: normalize(15),
        fontWeight: '600',
        fontFamily: FontFamily?.sFProText || 'System',
    },
    emptyTertiaryButton: {
        width: '100%',
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    emptyTertiaryButtonText: {
        color: colors.textSecondary,
        fontSize: normalize(14),
        fontWeight: '500',
        fontFamily: FontFamily?.sFProText || 'System',
    },
    emptyFooter: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(181, 201, 251, 0.1)',
        borderRadius: 12,
    },
    emptyFooterText: {
        flex: 1,
        fontSize: normalize(13),
        color: isDark ? colors.textSecondary : '#666',
        lineHeight: 18,
        fontFamily: FontFamily?.sFProText || 'System',
    },

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
        color: colors.error,
        textAlign: 'center',
        marginBottom: 8,
        fontFamily: FontFamily?.sFProText || 'System',
    },
    errorText: {
        fontSize: normalize(16),
        color: isDark ? colors.textSecondary : '#666',
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

    productsList: {
        paddingTop: normalize(26),
        paddingBottom: normalize(100),
        alignItems: 'center',
    },
    footerLoader: {
        paddingVertical: normalize(16),
        alignItems: 'center',
        width: '100%',
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
