import React, { useState, useEffect, useRef, memo } from 'react';
import { TouchableOpacity, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { useFavoriteStatus } from '@entities/favorites';

import FavoriteButtonSvg from "@shared/ui/Icon/productDetailScreen/ButtonFavorite";

export const ProductFavoriteButton = memo(({
                                               productId,
                                               style,
                                               width = 90,
                                               height = 52
                                           }) => {
    const { colors } = useTheme();
    const { isAuthenticated, authDialog } = useAuth();
    const navigation = useNavigation();

    const [localFavorite, setLocalFavorite] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const { isFavorite, isLoading, toggleFavorite } = useFavoriteStatus(productId);

    useEffect(() => {
        setLocalFavorite(!!isFavorite);
    }, [isFavorite]);

    // Функция для запуска анимации
    const runAnimation = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 1.3,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            })
        ]).start();
    };

    // Обработчик нажатия
    const handleToggleFavorite = async () => {
        // Проверка авторизации
        if (!isAuthenticated) {
            if (authDialog?.show) {
                authDialog.show();
            } else {
                navigation.navigate('Auth');
            }
            return;
        }

        // Запускаем анимацию
        runAnimation();

        // Вызываем функцию переключения из хука
        await toggleFavorite();
    };

    // Определяем цвет иконки
    const iconColor = '#3339b0';

    // Не отображаем кнопку, если нет ID продукта
    if (!productId) {
        return null;
    }

    return (
        <TouchableOpacity
            style={[styles.button, style]}
            onPress={handleToggleFavorite}
            activeOpacity={0.7}
            disabled={isLoading}
        >
            {isLoading ? (
                <ActivityIndicator size="small" color={iconColor} />
            ) : (
                <Animated.View
                    style={{
                        transform: [{ scale: scaleAnim }],
                    }}
                >
                    <FavoriteButtonSvg
                        width={width}
                        height={height}
                        color={iconColor}
                        filled={localFavorite}
                    />
                </Animated.View>
            )}
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    button: {
        width: 90,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 15,
    }
});

export default ProductFavoriteButton;