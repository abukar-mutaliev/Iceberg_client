import { useCallback, useRef, useEffect } from 'react';
import { CommonActions } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { resetCurrentProduct } from '@entities/product';

/** Pop стека или родителей; без вызова goBack() при пустой истории (GO_BACK not handled). */
function dispatchGoBackSafe(navigation) {
    if (navigation?.canGoBack?.()) {
        navigation.dispatch(CommonActions.goBack());
        return true;
    }
    let nav = navigation;
    for (let d = 0; d < 8 && nav; d += 1) {
        const parent = nav.getParent?.();
        if (parent?.canGoBack?.()) {
            parent.dispatch(CommonActions.goBack());
            return true;
        }
        nav = parent;
    }
    const state = navigation.getState?.();
    const routes = state?.routes;
    const firstName = routes?.[0]?.name;
    if (firstName && firstName !== 'ProductDetail') {
        try {
            navigation.navigate(firstName);
            return true;
        } catch (_) {
            /* fall through */
        }
    }
    return false;
}

/**
 * Хук для управления навигацией в ProductDetailScreen.
 *
 * Переходы по похожим товарам — через navigation.replace() с массивом productHistory.
 * Это держит в стеке навигации ровно один экземпляр ProductDetailScreen, что критично
 * для слабых Android-устройств: нет накопления тяжёлых экранов в памяти.
 *
 * История хранится в route.params.productHistory (массив ID предыдущих товаров).
 * Кнопка «Назад» проверяет историю: если она непустая — заменяет экран предыдущим товаром,
 * иначе выполняет обычный goBack() к экрану-источнику.
 */
export const useProductDetailNavigation = (navigation, fromScreen, params) => {
    const dispatch = useDispatch();
    const isNavigatingRef = useRef(false);
    const lastNavigationTimeRef = useRef(0);

    useEffect(() => {
        return () => {
            isNavigatingRef.current = false;
        };
    }, []);

    const handleGoBack = useCallback(() => {
        if (isNavigatingRef.current) {
            isNavigatingRef.current = false;
        }

        isNavigatingRef.current = true;

        try {
            dispatch(resetCurrentProduct());

            const productHistory = params?.productHistory;

            // Если есть история цепочки товаров — идём назад по ней через replace
            if (Array.isArray(productHistory) && productHistory.length > 0) {
                const prevHistory = productHistory.slice(0, -1);
                const prevProductId = productHistory[productHistory.length - 1];
                const originalFrom = params?.originalFromScreen || fromScreen;

                navigation.replace('ProductDetail', {
                    productId: prevProductId,
                    fromScreen: prevHistory.length > 0 ? 'ProductDetail' : originalFrom,
                    originalFromScreen: originalFrom,
                    roomId: params?.roomId,
                    productHistory: prevHistory,
                });

                setTimeout(() => { isNavigatingRef.current = false; }, 200);
                return;
            }

            // Обычный goBack для первого продукта в цепочке
            if (navigation?.canGoBack?.()) {
                navigation.goBack();
                setTimeout(() => { isNavigatingRef.current = false; }, 200);
                return;
            }

            const origin = params?.fromScreen || fromScreen;
            const rootOrigin = params?.originalFromScreen || origin;
            const roomId = params?.roomId;

            if ((origin === 'ChatRoom' || rootOrigin === 'ChatRoom') && roomId) {
                navigation.navigate('ChatRoom', { roomId });
            } else if (origin === 'ChatList' || rootOrigin === 'ChatList') {
                navigation.navigate('ChatList');
            } else {
                dispatchGoBackSafe(navigation);
            }

            setTimeout(() => { isNavigatingRef.current = false; }, 200);
        } catch (error) {
            console.error('ProductDetailScreen: Critical error:', error);
            isNavigatingRef.current = false;
        }
    }, [dispatch, fromScreen, navigation, params]);

    const handleSupplierPress = useCallback((productId, supplierId) => {
        if (supplierId) {
            navigation.navigate('SupplierScreen', {
                supplierId,
                fromScreen: 'ProductDetail',
                previousProductId: productId
            });
        }
    }, [navigation]);

    /**
     * Переход к похожему товару через replace — стек не растёт.
     * Текущий productId добавляется в productHistory, чтобы кнопка «Назад»
     * могла вернуться к нему.
     */
    const handleSimilarProductPress = useCallback((similarProductId, currentProductId) => {
        if (!similarProductId) return;

        const now = Date.now();
        if (now - lastNavigationTimeRef.current < 400) {
            return;
        }
        lastNavigationTimeRef.current = now;

        if (isNavigatingRef.current) {
            return;
        }

        isNavigatingRef.current = true;

        const nextId = Number(similarProductId);
        const originalFrom = params?.originalFromScreen || params?.fromScreen || fromScreen;
        const currentHistory = Array.isArray(params?.productHistory) ? params.productHistory : [];

        // Добавляем текущий товар в историю для возможности вернуться назад
        const updatedHistory = [...currentHistory, Number(currentProductId)];

        navigation.replace('ProductDetail', {
            productId: nextId,
            fromScreen: 'ProductDetail',
            originalFromScreen: originalFrom,
            roomId: params?.roomId,
            productHistory: updatedHistory,
        });

        setTimeout(() => {
            isNavigatingRef.current = false;
        }, 320);
    }, [navigation, params, fromScreen]);

    return {
        handleGoBack,
        handleSupplierPress,
        handleSimilarProductPress,
        isNavigatingRef
    };
};
