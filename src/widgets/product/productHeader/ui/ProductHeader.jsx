import React, {useMemo} from 'react';
import {View, Animated, Text, StyleSheet, Dimensions, ScrollView} from 'react-native';
import { BackButton } from '@shared/ui/Button/BackButton';
import { ProductImage } from '@entities/product/ui/ProductImage';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { ProductFavoriteButton } from "@features/productFavorite";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ProductHeader = ({ product, scrollY, onGoBack, isFavorite, onToggleFavorite }) => {
    const { colors } = useTheme();

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 200],
        outputRange: [0, 1],
        extrapolate: 'clamp'
    });

    const safeProduct = useMemo(() => ({
        ...product,
        feedbackCount: product?.feedbackCount || 0,
        type: product?.type || '',
        name: product?.name || '',
        price: product?.price || 0,
        weight: product?.weight || '',
        averageRating: product?.averageRating || 0,
        description: product?.description || '',
        id: product?.id || null,
        categories: product?.categories || [],
    }), [product]);

    const prepareImages = () => {
        if (!product) return [];

        if (Array.isArray(product.images) && product.images.length > 0) {
            return product.images;
        }

        if (typeof product.images === 'string') {
            return [product.images];
        }

        if (product.image) {
            if (Array.isArray(product.image)) {
                return product.image;
            }
            return [product.image];
        }

        return [];
    };

    const productImages = prepareImages();

    return (
        <View style={styles.container}>
            <ProductImage
                images={productImages}
                style={styles.productImage}
            />

            <View style={styles.overlayGradient} >
                <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
            >
                {safeProduct.categories.map((category, index) => (
                    <View key={`category-${category.id || index}`} style={styles.categoryItem}>
                        <Text style={styles.categoryTitle}>
                            {category.name}
                        </Text>
                    </View>
                ))}
            </ScrollView>
            </View>

            <BackButton
                onPress={onGoBack}
                style={styles.backButton}
            />

            <View style={styles.favoriteButtonContainer}>
                <ProductFavoriteButton
                    isFavorite={isFavorite}
                    onToggleFavorite={onToggleFavorite}
                />
            </View>
            <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
                <Text style={[styles.floatingTitle, {
                    color: colors.text,
                    backgroundColor: colors.theme === 'light'
                        ? 'rgba(255, 255, 255, 0.8)'
                        : 'rgba(30, 30, 30, 0.8)'
                }]}>
                    {product.name}
                </Text>
            </Animated.View>
        </View>
    );
};

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
    favoriteButtonContainer: {
        position: 'absolute',
        top: 25,
        right: 16,
        zIndex: 10,
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
    },
    categoriesContainer: {
        flexDirection: 'row',
        paddingLeft: 5,
    },
    categoryItem: {
        marginRight: 8,
        paddingHorizontal: 10,
        paddingTop: 10
    },
    categoryTitle: {
        color: "#919eee",
        fontSize: 14,
        fontWeight: '500',
    },
    floatingHeader: {
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 5,
    },
    floatingTitle: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_sm,
        fontWeight: '600',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
});