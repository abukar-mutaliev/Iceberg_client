import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

/**
 * Безопасный возврат с экрана ИИ-помощника: кнопка «Назад», swipe-back и hardware back.
 * Если в стеке нет предыдущего экрана — переход по fromScreen.
 */
export const useAssistantChatNavigation = (fromScreen, product) => {
    const navigation = useNavigation();
    const isNavigatingRef = useRef(false);

    const handleGoBack = useCallback(() => {
        if (isNavigatingRef.current) {
            isNavigatingRef.current = false;
        }
        isNavigatingRef.current = true;

        try {
            if (navigation.canGoBack()) {
                navigation.goBack();
                return;
            }

            let nav = navigation;
            for (let depth = 0; depth < 8 && nav; depth += 1) {
                const parent = nav.getParent?.();
                if (parent?.canGoBack?.()) {
                    parent.goBack();
                    return;
                }
                nav = parent;
            }

            switch (fromScreen) {
                case 'HelpCenter':
                    navigation.navigate('Main', {
                        screen: 'ProfileTab',
                        params: { screen: 'HelpCenter' },
                    });
                    break;
                case 'ProductDetail':
                    if (product?.id) {
                        navigation.navigate('ProductDetail', { productId: product.id, fromScreen: 'AssistantChat' });
                    } else {
                        navigation.navigate('Main');
                    }
                    break;
                case 'ChatRoom':
                    navigation.navigate('ChatMain');
                    break;
                default:
                    navigation.navigate('ChatMain');
                    break;
            }
        } finally {
            setTimeout(() => {
                isNavigatingRef.current = false;
            }, 200);
        }
    }, [navigation, fromScreen, product?.id]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (navigation.canGoBack()) {
                return;
            }

            const actionType = e.data?.action?.type;
            if (actionType !== 'GO_BACK' && actionType !== 'POP') {
                return;
            }

            e.preventDefault();
            handleGoBack();
        });

        return unsubscribe;
    }, [navigation, handleGoBack]);

    useFocusEffect(
        useCallback(() => {
            const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
                handleGoBack();
                return true;
            });
            return () => subscription.remove();
        }, [handleGoBack])
    );

    return { handleGoBack };
};
