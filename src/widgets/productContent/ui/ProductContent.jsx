import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ProductInfo } from '@/entities/product/ui/ProductInfo';
import { ProductRating } from '@/entities/product/ui/ProductRating';
import { ProductPrice } from '@/entities/product/ui/ProductPrice';
import { QuantityControl } from '@/features/productQuantity/ui/QuantityControl';
import { TabsContainer } from '@/features/tabs/ui/TabsContainer';
import { ProductDescription } from '@/entities/product/ui/ProductDescription';
import { FeedbacksList } from '@entities/feedback/ui/FeedbacksList';
import { FeedbackAvatars } from '@/entities/feedback/ui/FeedbackAvatars'; // Импортируем новый компонент
import { Border } from '@/app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ScrollableBackgroundGradient } from "@shared/ui/BackgroundGradient";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ProductContent = React.memo(({
                                              product,
                                              feedbacks,
                                              feedbackLoading,
                                              feedbackError,
                                              isFeedbacksLoaded,
                                              quantity,
                                              activeTab,
                                              onQuantityChange,
                                              onTabChange,
                                              onRefreshFeedbacks,
                                          }) => {
    const { colors } = useTheme();
    const [feedbacksHeight, setFeedbacksHeight] = useState(500);

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
    }), [product]);

    console.log("ProductContent feedback", feedbacks);

    const tabs = useMemo(() => [
        { id: 'description', title: 'Описание' },
        { id: 'reviews', title: `Отзывы (${safeProduct.feedbackCount})` },
    ], [safeProduct.feedbackCount]);

    const handleFeedbacksLayout = (event) => {
        const { height } = event.nativeEvent.layout;
        setFeedbacksHeight(height);
    };

    return (
        <View style={[styles.containerWrapper, { width: SCREEN_WIDTH }]}>
            <View style={[styles.container, { backgroundColor: 'white' }]}>
                <View style={styles.typeContainer}>
                    <ProductInfo type={safeProduct.type} name={safeProduct.name} category={safeProduct.categories} />
                </View>

                <View style={styles.priceContainer}>
                    <ProductPrice price={safeProduct.price} weight={safeProduct.weight} />
                    <QuantityControl
                        quantity={quantity}
                        onQuantityChange={onQuantityChange}
                        style={styles.quantityControl}
                    />
                </View>

                <View style={styles.ratingContainer}>
                    <ProductRating
                        rating={safeProduct.averageRating}
                        feedbackCount={safeProduct.feedbackCount}
                        feedbacks={feedbacks}
                        productId={safeProduct.id}
                        canRate={true}
                    />
                    <View style={styles.avatarsContainer}>
                        <FeedbackAvatars feedbacks={feedbacks} maxAvatars={3} />
                    </View>
                </View>

                <TabsContainer
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={onTabChange}
                />

                {activeTab === 'description' ? (
                    <View style={styles.descriptionContainer}>
                        <ProductDescription
                            shortDescription={safeProduct.name}
                            fullDescription={safeProduct.description}
                            style={styles.description}
                        />
                    </View>
                ) : (
                    safeProduct.id ? (
                        <View
                            style={styles.feedbacksContainer}
                            onLayout={handleFeedbacksLayout}
                        >
                            <View style={styles.gradientContainer}>
                                <ScrollableBackgroundGradient contentHeight={feedbacksHeight} />
                            </View>

                            <FeedbacksList
                                productId={safeProduct.id}
                                feedbacks={feedbacks}
                                isLoading={feedbackLoading}
                                error={feedbackError}
                                isDataLoaded={isFeedbacksLoaded}
                                onRefresh={onRefreshFeedbacks}
                                style={styles.feedbacks}
                            />
                        </View>
                    ) : null
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    containerWrapper: {
        position: 'relative',
        marginTop: -10,
        zIndex: 10,
    },
    container: {
        borderBottomRightRadius: Border.br_xl,
        borderBottomLeftRadius: Border.br_xl,
        paddingHorizontal: 16,
        paddingBottom: 0,
        shadowColor: 'transparent',
        shadowRadius: 0,
        overflow: 'hidden',
    },
    descriptionContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
    },
    description: {
        backgroundColor: 'white',
    },
    feedbacksContainer: {
        position: 'relative',
        marginLeft: -16,
        marginRight: -16,
        paddingBottom: 0,
        overflow: 'hidden',
    },
    gradientContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: 0,
        width: SCREEN_WIDTH,
    },
    feedbacks: {
        position: 'relative',
        zIndex: 1,
        paddingBottom: 0,
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
});