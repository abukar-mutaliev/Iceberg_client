import { useState, useRef, useCallback, useEffect } from 'react';
import { Animated, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Хук для управления состоянием ProductDetailScreen
 */
export const useProductDetailState = (productId) => {
    // Состояния компонента
    const [contentHeight, setContentHeight] = useState(SCREEN_HEIGHT * 2);
    const [selectedQuantity, setSelectedQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('description');
    const [optimisticProduct, setOptimisticProduct] = useState(null);

    // Refs для управления жизненным циклом
    const isMountedRef = useRef(true);
    const timersRef = useRef([]);
    const scrollViewRef = useRef(null);
    const scrollY = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const previousProductIdRef = useRef(productId);
    const hasLoggedRef = useRef(false);

    // Функции для безопасной работы с таймерами
    const createSafeTimeout = useCallback((callback, delay) => {
        const timeoutId = setTimeout(() => {
            if (isMountedRef.current) {
                callback();
            }
        }, delay);
        
        timersRef.current.push(timeoutId);
        return timeoutId;
    }, []);

    const clearAllTimers = useCallback(() => {
        timersRef.current.forEach(timerId => clearTimeout(timerId));
        timersRef.current = [];
    }, []);

    // Функция прокрутки к верху
    const scrollToTop = useCallback(() => {
        if (isMountedRef.current && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
                y: 0,
                animated: true
            });
        }
    }, []);

    // Анимация обновления
    const animateUpdate = useCallback(() => {
        if (!isMountedRef.current) return;
        
        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 0.7,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim]);

    // Обработчики событий
    const handleScroll = useCallback(
        Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false }),
        [scrollY]
    );

    const handleContentSizeChange = useCallback((width, height) => {
        setContentHeight(height + 100);
    }, []);

    const handleQuantityChange = useCallback((newQuantity) => {
        setSelectedQuantity(newQuantity);
    }, []);

    const handleTabChange = useCallback((tabId) => {
        setActiveTab(tabId);
    }, []);

    const handleViewAllReviews = useCallback(() => {
        if (!isMountedRef.current) return;
        
        setActiveTab('reviews');
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: 350, animated: true });
        }
    }, []);

    // Обработчик обновления продукта
    const handleProductUpdated = useCallback((updatedProductData, refreshData) => {
        if (!isMountedRef.current) return;
        
        console.log('ProductDetailScreen: Product update received:', updatedProductData);
        
        setOptimisticProduct(updatedProductData);
        animateUpdate();

        createSafeTimeout(() => {
            if (isMountedRef.current) {
                console.log('ProductDetailScreen: Refreshing data after update');
                refreshData(true);
                setOptimisticProduct(null);
            }
        }, 100);
    }, [animateUpdate, createSafeTimeout]);

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            clearAllTimers();
            fadeAnim.stopAnimation();
            scrollY.stopAnimation();
        };
    }, [clearAllTimers, fadeAnim, scrollY]);

    return {
        // Состояния
        contentHeight,
        selectedQuantity,
        activeTab,
        optimisticProduct,
        
        // Refs
        isMountedRef,
        scrollViewRef,
        scrollY,
        fadeAnim,
        previousProductIdRef,
        hasLoggedRef,
        
        // Функции
        createSafeTimeout,
        clearAllTimers,
        scrollToTop,
        animateUpdate,
        
        // Обработчики
        handleScroll,
        handleContentSizeChange,
        handleQuantityChange,
        handleTabChange,
        handleViewAllReviews,
        handleProductUpdated,
        
        // Сеттеры
        setSelectedQuantity,
        setOptimisticProduct
    };
};

