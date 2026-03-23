import React, {useEffect, useMemo, useRef} from 'react';
import {View, Text, StyleSheet, Dimensions, TouchableOpacity, FlatList} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BackButton } from '@shared/ui/Button/BackButton';
import { ProductImage } from '@entities/product/ui/ProductImage';
import { Color } from '@app/styles/GlobalStyles';
import { ProductFavoriteButton } from "@features/productFavorite";
import {checkIsFavorite} from "@entities/favorites";
import {useDispatch} from "react-redux";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ProductHeader = React.memo(({ product, onGoBack, onSharePress, isAuthenticated, onImagePress, shareDisabled }) => {
    const dispatch = useDispatch();
    const checkedFavoriteRef = useRef(false);


    const productId = useMemo(() => product?.id || 0, [product?.id]);

    useEffect(() => {
        if (productId && !checkedFavoriteRef.current) {
            checkedFavoriteRef.current = true;
            dispatch(checkIsFavorite(productId));
        }

        return () => {
            if (productId) {
                checkedFavoriteRef.current = false;
            }
        };
    }, [dispatch, productId]);


    const safeProduct = useMemo(() => ({
        ...product,
        feedbackCount: product?.feedbackCount || 0,
        type: product?.type || '',
        name: product?.name || '',
        price: product?.price || 0,
        weight: product?.weight || '',
        averageRating: product?.averageRating || 0,
        description: product?.description || '',
        id: productId,
        categories: product?.categories || [],
    }), [product, productId]);

    const prepareImages = useMemo(() => {
        if (!product) return [];

        // Сначала проверяем массив images
        if (product.images) {
            if (Array.isArray(product.images) && product.images.length > 0) {
                return product.images.filter(img => img && typeof img === 'string' && img.trim() !== '');
            } else if (typeof product.images === 'string' && product.images.trim() !== '') {
                return [product.images];
            }
        }

        // Затем проверяем поле image
        if (product.image) {
            if (Array.isArray(product.image) && product.image.length > 0) {
                return product.image.filter(img => img && typeof img === 'string' && img.trim() !== '');
            } else if (typeof product.image === 'string' && product.image.trim() !== '') {
                return [product.image];
            } else if (product.image.uri && typeof product.image.uri === 'string') {
                return [product.image.uri];
            }
        }

        // Если ничего не найдено, используем пустой массив - изображение-заполнитель будет показано в ProductImage
        return [];
    }, [product]);

    const productImages = prepareImages;

    const uniqueCategories = useMemo(() => {
        const list = safeProduct.categories || [];
        const seen = new Set();
        return list.filter((category) => {
            const key = category?.id != null ? `id-${category.id}` : `name-${category?.name ?? ''}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [safeProduct.categories]);

    return (
        <View style={styles.container}>
            <ProductImage
                images={productImages}
                style={styles.productImage}
                onImagePress={onImagePress}
            />

            <View style={styles.overlayGradient}>
                <View style={styles.categoriesClip}>
                    <FlatList
                        data={uniqueCategories}
                        keyExtractor={(item, index) => `category-${item?.id ?? index}`}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        bounces={false}
                        style={styles.categoriesList}
                        contentContainerStyle={styles.categoriesContainer}
                        renderItem={({ item: category }) => (
                            <View style={styles.categoryItem}>
                                <Text style={styles.categoryTitle} numberOfLines={1}>
                                    {category?.name}
                                </Text>
                            </View>
                        )}
                    />
                </View>
            </View>

            <BackButton
                onPress={onGoBack}
                style={styles.backButton}
            />

            <View style={styles.rightButtonsContainer}>
                {/* Иконка "Поделиться" - только для авторизованных пользователей */}
                {isAuthenticated && onSharePress && (
                    <TouchableOpacity
                        style={[styles.shareButton, shareDisabled && styles.shareButtonDisabled]}
                        onPress={onSharePress}
                        activeOpacity={0.7}
                    >
                        <Icon name="share" size={24} color={shareDisabled ? 'rgba(145,158,238,0.45)' : Color.purpleSoft} />
                    </TouchableOpacity>
                )}
                
                {/* Кнопка избранного */}
                <ProductFavoriteButton
                    productId={productId}
                />
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        width: SCREEN_WIDTH,
        height: 350,
    },
    backButton: {
        position: 'absolute',
        top: 25,
        left: 16,
        zIndex: 10,
        padding: 10,
    },
    rightButtonsContainer: {
        position: 'absolute',
        top: 25,
        right: 16,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    shareButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareButtonDisabled: {
        opacity: 0.55,
    },
    productImage: {
        width: SCREEN_WIDTH,
        height: 360,
    },
    overlayGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        zIndex: 5,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    categoriesClip: {
        height: 50,
        width: SCREEN_WIDTH,
        overflow: 'hidden',
    },
    categoriesList: {
        flexGrow: 0,
        height: 50,
        maxHeight: 50,
    },
    categoriesContainer: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        alignItems: 'center',
        paddingHorizontal: 5,
        paddingVertical: 10,
        minHeight: 30,
    },
    categoryItem: {
        marginRight: 8,
        paddingHorizontal: 10,
        maxHeight: 30,
        justifyContent: 'center',
        flexShrink: 0,
    },
    categoryTitle: {
        color: "#919eee",
        fontSize: 14,
        fontWeight: '500',
    },
});

export default React.memo(ProductHeader);