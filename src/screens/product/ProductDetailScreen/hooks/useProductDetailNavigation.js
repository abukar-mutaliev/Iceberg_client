import { useCallback, useRef, useEffect } from 'react';
import { CommonActions } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { resetCurrentProduct } from '@entities/product';

/**
 * Хук для управления навигацией в ProductDetailScreen
 */
export const useProductDetailNavigation = (navigation, fromScreen, params) => {
    const dispatch = useDispatch();
    const isNavigatingRef = useRef(false);
    const backInterceptRef = useRef(false);
    const navigationParamsRef = useRef(params);

    // Обновляем ссылку на параметры при их изменении
    useEffect(() => {
        navigationParamsRef.current = params;
    }, [params]);

    // Перехватчик для кнопки "назад" из чата
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            const origin = navigationParamsRef.current?.fromScreen || fromScreen;
            if (origin === 'ChatRoom' || origin === 'ChatList') {
                if (backInterceptRef.current) return;
                backInterceptRef.current = true;
                e.preventDefault();
                navigation.dispatch(
                    CommonActions.reset({ index: 0, routes: [{ name: 'MainTab' }] })
                );
                setTimeout(() => { backInterceptRef.current = false; }, 800);
            }
        });
        return unsubscribe;
    }, [navigation, fromScreen]);

    const handleGoBack = useCallback(() => {
        if (isNavigatingRef.current) return;

        isNavigatingRef.current = true;

        try {
            dispatch(resetCurrentProduct());

            setTimeout(() => {
                const origin = navigationParamsRef.current?.fromScreen || fromScreen;
                if (origin === 'ChatRoom' || origin === 'ChatList') {
                    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'MainTab' }] }));
                    setTimeout(() => { isNavigatingRef.current = false; }, 500);
                    return;
                }
                
                try {
                    navigation.goBack();
                } catch (innerError) {
                    console.error('ProductDetailScreen: Navigation error:', innerError);
                    try {
                        navigation.goBack();
                    } catch (fallbackError) {
                        console.error('ProductDetailScreen: Critical navigation error:', fallbackError);
                    }
                } finally {
                    setTimeout(() => {
                        isNavigatingRef.current = false;
                    }, 1000);
                }
            }, 50);
        } catch (error) {
            console.error('ProductDetailScreen: Critical error:', error);
            isNavigatingRef.current = false;
        }
    }, [dispatch, fromScreen, navigation]);

    const handleSupplierPress = useCallback((productId, supplierId) => {
        if (supplierId) {
            navigation.navigate('SupplierScreen', {
                supplierId,
                fromScreen: 'ProductDetail',
                previousProductId: productId
            });
        }
    }, [navigation]);

    const handleSimilarProductPress = useCallback((similarProductId, currentProductId) => {
        if (!similarProductId) return;
        
        console.log('ProductDetailScreen: Navigating to similar product', {
            from: currentProductId,
            to: similarProductId,
            fromScreen
        });
        
        dispatch(resetCurrentProduct());
        
        navigation.push('ProductDetail', {
            productId: similarProductId,
            fromScreen: 'SimilarProducts',
            previousProductId: currentProductId,
            originalFromScreen: fromScreen || 'MainTab'
        });
    }, [navigation, fromScreen, dispatch]);

    return {
        handleGoBack,
        handleSupplierPress,
        handleSimilarProductPress,
        isNavigatingRef
    };
};

