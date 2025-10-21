import React, {useState} from 'react';
import {View, Text, Pressable, StyleSheet, ActivityIndicator, TouchableOpacity} from 'react-native';
import {AndroidShadow} from '@shared/ui/Shadow';
import {MinusIcon, PlusIcon} from '@shared/ui/Icon/DetailScreenIcons';
import {FontFamily, FontSize, Border, Color} from '@app/styles/GlobalStyles';
import {useTheme} from "@app/providers/themeProvider/ThemeProvider";
import {useAuth} from '@entities/auth/hooks/useAuth';
import {useCartAvailability} from '@entities/cart';
import {useToast} from '@shared/ui/Toast';
import {HighlightChange} from '@shared/ui/HighlightChange/HighlightChange';
import {RepostIcon} from "@shared/ui/Icon/Repost";

export const QuantityControl = ({
                                    quantity,
                                    onQuantityChange,
                                    style,
                                    isUpdating = false,
                                    disabled = false,
                                    maxQuantity = 999,
                                    minQuantity = 1,
                                    isInCart = false,
                                    onAddToCart,
                                    onUpdateQuantity,
                                    onRemoveFromCart,
                                    autoCartManagement = false
                                }) => {
    const {colors} = useTheme();
    const {isAuthenticated, currentUser} = useAuth();
    const {isCartAvailable} = useCartAvailability();
    const {showWarning, showError} = useToast();

    const handleChange = async (value) => {
        const currentQuantity = autoCartManagement && !isInCart ? 0 : quantity;
        const newQuantity = Math.max(0, Math.min(maxQuantity, currentQuantity + value));

        if (disabled || isUpdating) return;

        if (autoCartManagement) {
            // Проверяем доступность корзины для текущего пользователя
            if (!isCartAvailable) {
                const userRole = currentUser?.role || 'неизвестна';
                showWarning(
                    `Только клиенты могут добавлять товары в корзину.`,
                    {
                        duration: 4000,
                        position: 'top'
                    }
                );
                return;
            }

            try {
                if (newQuantity === 0 && isInCart) {
                    if (onRemoveFromCart) {
                        await onRemoveFromCart();
                    }
                } else if (newQuantity > 0 && !isInCart) {
                    if (onAddToCart) {
                        await onAddToCart(newQuantity);
                    }
                } else if (newQuantity > 0 && isInCart) {
                    if (onUpdateQuantity) {
                        await onUpdateQuantity(newQuantity);
                    }
                }
            } catch (error) {
                console.error('Ошибка при управлении корзиной:', error);
                
                // Показываем информативное сообщение об ошибке
                if (error.message && error.message.includes('403')) {
                    showError(
                        'Доступ к корзине ограничен. Только клиенты могут добавлять товары.',
                        {
                            duration: 4000,
                            position: 'top'
                        }
                    );
                } else {
                    showError(
                        `Ошибка при работе с корзиной: ${error.message || 'Неизвестная ошибка'}`,
                        {
                            duration: 3000,
                            position: 'top'
                        }
                    );
                }
            }
        } else {
            if (newQuantity !== quantity && newQuantity >= minQuantity) {
                onQuantityChange(newQuantity);
            }
        }
    };

    // Определяем отображаемое количество
    const displayQuantity = autoCartManagement && !isInCart ? 0 : quantity;

    // Учитываем доступность корзины при определении возможности взаимодействия
    const isCartControlAvailable = !autoCartManagement || isCartAvailable;
    const canDecrease = displayQuantity > (autoCartManagement ? 0 : minQuantity) && !disabled && !isUpdating && isCartControlAvailable;
    const canIncrease = displayQuantity < maxQuantity && !disabled && !isUpdating && isCartControlAvailable;

    return (
        <View style={[styles.container, style]}>
            <AndroidShadow
                style={[
                    styles.control,
                    disabled && styles.disabledControl
                ]}
                shadowColor="rgba(51, 57, 176, 0.05)"
                borderRadius={Border.br_3xs}
            >
                <View style={[
                    styles.controlInner,
                    {
                        borderColor: disabled || !isCartControlAvailable ? Color.colorSilver_100 : Color.primary,
                        backgroundColor: disabled || !isCartControlAvailable ? Color.colorSilver_200 : Color.card,
                        opacity: disabled || !isCartControlAvailable ? 0.6 : 1
                    }
                ]}>
                    <Pressable
                        style={[
                            styles.button,
                            !canDecrease && styles.disabledButton
                        ]}
                        onPress={() => handleChange(-1)}
                        disabled={!canDecrease}
                    >
                        {isUpdating ? (
                            <ActivityIndicator
                                size="small"
                                color={colors.primary}
                            />
                        ) : (
                            <MinusIcon
                                color={canDecrease ? colors.primary : Color.colorSilver_100}
                            />
                        )}
                    </Pressable>

                    <View style={styles.quantityContainer}>
                        <HighlightChange value={displayQuantity}>
                            <Text style={[
                                styles.quantityText,
                                {
                                    color: disabled ? Color.colorSilver_100 : colors.primary
                                }
                            ]}>
                                {displayQuantity}
                            </Text>
                        </HighlightChange>
                        {isUpdating && (
                            <View style={styles.updatingIndicator}>
                                <ActivityIndicator
                                    size="small"
                                    color={colors.primary}
                                />
                            </View>
                        )}
                    </View>

                    <Pressable
                        style={[
                            styles.button,
                            !canIncrease && styles.disabledButton
                        ]}
                        onPress={() => handleChange(1)}
                        disabled={!canIncrease}
                    >
                        <PlusIcon
                            color={canIncrease ? colors.primary : Color.colorSilver_100}
                        />
                    </Pressable>

                </View>

            </AndroidShadow>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {},
    control: {
        width: 112,
        height: 52,
    },
    disabledControl: {
        opacity: 0.6,
    },
    controlInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        borderWidth: 1,
        borderRadius: Border.br_3xs,
    },
    button: {
        width: 30,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledButton: {
        opacity: 0.5,
    },
    quantityContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 40,
    },
    quantityText: {
        fontFamily: FontFamily.montserratMedium,
        fontSize: FontSize.size_md,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    updatingIndicator: {
        position: 'absolute',
        top: -2,
        right: -8,
    },
});