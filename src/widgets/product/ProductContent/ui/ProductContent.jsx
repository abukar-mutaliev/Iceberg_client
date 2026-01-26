import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ProductInfo } from '@entities/product/ui/ProductInfo';
import { ProductRating } from '@entities/product/ui/ProductRating';
import { ProductPrice } from '@entities/product/ui/ProductPrice';
import { QuantityControl } from '@features/productQuantity/ui/QuantityControl';
import { TabsContainer } from '@features/tabs/ui/TabsContainer';
import { ProductDescription } from '@entities/product/ui/ProductDescription';
import { FeedbackAvatars } from '@entities/feedback/ui/FeedbackAvatars';
import { Border } from '@app/styles/GlobalStyles';
import { HighlightChange } from "@shared/ui/HighlightChange/HighlightChange";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ProductContent = React.memo(({
                                              product,
                                              feedbacks,
                                              quantity,
                                              activeTab,
                                              onQuantityChange,
                                              onTabChange,
                                              isUpdatingQuantity = false,
                                              maxQuantity,
                                              isInCart = false,
                                              onAddToCart,
                                              onUpdateQuantity,
                                              onRemoveFromCart,
                                              autoCartManagement = false,
                                              currentUser,
                                          }) => {
    const safeFeedbacks = useMemo(() => {
        return Array.isArray(feedbacks) ? feedbacks : [];
    }, [feedbacks]);

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
        supplierId: product?.supplierId || null,
        supplier: product?.supplier || null,
        stockQuantity: product?.stockQuantity || 0,
        availableQuantity: product?.availableQuantity || product?.stockQuantity || 0,
    }), [product]);

    const effectiveMaxQuantity = useMemo(() => {
        if (maxQuantity !== undefined) return maxQuantity;
        return safeProduct.availableQuantity > 0 ? safeProduct.availableQuantity : 999;
    }, [maxQuantity, safeProduct.availableQuantity]);

    const tabs = useMemo(() => [
        { id: 'description', title: 'Описание' },
        { id: 'reviews', title: `Отзывы (${safeProduct.feedbackCount})` },
    ], [safeProduct.feedbackCount]);

    return (
        <View style={styles.mainContainer}>

            <View style={[styles.containerWrapper, { width: SCREEN_WIDTH }]}>

                <View style={[
                    styles.container,
                    {
                        backgroundColor: 'white',
                        paddingBottom: activeTab === 'description' ? 16 : 0
                    }
                ]}>
                    <View style={styles.typeContainer}>
                        <HighlightChange value={safeProduct.name}>
                            <ProductInfo type={safeProduct.type} name={safeProduct.name} category={safeProduct.categories} />
                        </HighlightChange>
                    </View>

                    <View style={styles.priceContainer}>
                        <ProductPrice price={safeProduct.price} product={safeProduct} weight={safeProduct.weight} />

                        {/* ВРЕМЕННО СКРЫТО: Контроль количества для корзины
                            TODO: Вернуть когда функциональность заказа будет готова
                        <QuantityControl
                            quantity={quantity}
                            onQuantityChange={onQuantityChange}
                            style={styles.quantityControl}
                            isUpdating={isUpdatingQuantity}
                            maxQuantity={effectiveMaxQuantity}
                            disabled={safeProduct.availableQuantity <= 0}
                            isInCart={isInCart}
                            onAddToCart={onAddToCart}
                            onUpdateQuantity={onUpdateQuantity}
                            onRemoveFromCart={onRemoveFromCart}
                            autoCartManagement={autoCartManagement}
                        />
                        */}
                       
                    </View>

                    <View style={styles.ratingContainer}>
                        <HighlightChange value={safeProduct.averageRating}>
                            <ProductRating
                                rating={safeProduct.averageRating}
                                feedbackCount={safeProduct.feedbackCount}
                                feedbacks={safeFeedbacks}
                                productId={safeProduct.id}
                                canRate={true}
                            />

                        </HighlightChange>

                        <View style={styles.avatarsContainer}>
                            <FeedbackAvatars feedbacks={safeFeedbacks} maxAvatars={3} />
                        </View>
                    </View>

                    <TabsContainer
                        tabs={tabs}
                        activeTab={activeTab}
                        onTabChange={onTabChange}
                    />

                    <View style={styles.descriptionContainer}>
                        <ProductDescription
                            shortDescription={safeProduct.name}
                            fullDescription={safeProduct.description}
                            style={styles.description}
                        />
                    </View>
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },
    containerWrapper: {
        position: 'relative',
        marginTop: -10,
        zIndex: 10,
    },
    container: {
        borderBottomRightRadius: Border.br_xl,
        borderBottomLeftRadius: Border.br_xl,
        paddingHorizontal: 16,
        paddingBottom: 16,
        shadowColor: 'transparent',
        shadowRadius: 0,
        overflow: 'hidden',
    },
    descriptionContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: 16,
    },
    description: {
        backgroundColor: 'white',
    },
    ratingContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    priceContainer: {
        marginBottom: 8,
        position: 'relative',
    },
    quantityControl: {
        position: 'absolute',
        top: 6,
        right: 5,
    },
    avatarsContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingRight: 16,
        bottom: 8,
    },
    typeContainer: {
        position: 'relative',
    },
});