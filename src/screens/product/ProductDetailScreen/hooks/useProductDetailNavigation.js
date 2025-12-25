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
    const navigationParamsRef = useRef(params);

    // Обновляем ссылку на параметры при их изменении
    useEffect(() => {
        navigationParamsRef.current = params;
    }, [params]);

    // Раньше здесь был перехват "назад" из чата с reset в MainTab.
    // Это ломает UX: если товар открыт из комнаты чата, назад должен возвращать в ChatRoom.
    // Теперь ProductDetail может открываться в AppStack поверх ChatRoom, поэтому стандартный back работает корректно.

    const handleGoBack = useCallback(() => {
        // Разрешаем навигацию даже если предыдущая еще не завершена
        // Это позволяет прервать анимацию открытия экрана
        if (isNavigatingRef.current) {
            // Если уже идет навигация, просто сбрасываем флаг и продолжаем
            // Это позволяет прервать анимацию открытия
            isNavigatingRef.current = false;
        }

        isNavigatingRef.current = true;

        try {
            dispatch(resetCurrentProduct());

            const origin = navigationParamsRef.current?.fromScreen || fromScreen;
            const roomId = navigationParamsRef.current?.roomId;

            // Если открыли товар из ChatRoom — возвращаемся обратно в комнату.
            // Обычно достаточно goBack(), но оставляем fallback для случаев, когда стека нет.
            if (origin === 'ChatRoom') {
                if (navigation?.canGoBack?.()) {
                    navigation.dispatch(CommonActions.goBack());
                } else if (roomId) {
                    navigation.navigate('ChatRoom', { roomId });
                }
                setTimeout(() => { isNavigatingRef.current = false; }, 200);
                return;
            }

            // Если открыли из списка чатов — возвращаемся назад, либо на ChatList.
            if (origin === 'ChatList') {
                if (navigation?.canGoBack?.()) {
                    navigation.dispatch(CommonActions.goBack());
                } else {
                    navigation.navigate('ChatList');
                }
                setTimeout(() => { isNavigatingRef.current = false; }, 200);
                return;
            }
            
            // Используем dispatch для более надежной навигации, которая может прервать анимацию
            try {
                if (navigation.canGoBack()) {
                    navigation.dispatch(CommonActions.goBack());
                } else {
                    navigation.goBack();
                }
            } catch (innerError) {
                console.error('ProductDetailScreen: Navigation error:', innerError);
                try {
                    navigation.goBack();
                } catch (fallbackError) {
                    console.error('ProductDetailScreen: Critical navigation error:', fallbackError);
                }
            }
            
            // Сбрасываем блокировку быстрее, чтобы разрешить повторные нажатия
            setTimeout(() => {
                isNavigatingRef.current = false;
            }, 200);
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
        
        // НЕ сбрасываем currentProduct здесь - новый экран сам загрузит свой продукт
        // Это позволяет при возврате назад корректно восстановить предыдущий продукт
        
        navigation.push('ProductDetail', {
            productId: similarProductId,
            fromScreen: 'SimilarProducts',
            previousProductId: currentProductId,
            originalFromScreen: fromScreen || 'MainTab'
        });
    }, [navigation, fromScreen]);

    return {
        handleGoBack,
        handleSupplierPress,
        handleSimilarProductPress,
        isNavigatingRef
    };
};

