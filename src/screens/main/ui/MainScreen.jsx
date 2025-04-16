import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, Animated } from 'react-native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from '@app/store/store';
import { fetchProducts } from '@entities/product/model/slice';
import { selectProducts, selectProductsLoading } from '@entities/product/model/selectors';
import { fetchBanners, selectActiveMainBanners, selectBannerStatus } from '@/entities/banner';
import { fetchCategories } from '@entities/category/model/slice';

import { Color } from '@app/styles/GlobalStyles';
import { Header } from "@widgets/header";
import { PromoBanner } from "@widgets/promoSlider";
import { CategoriesBar } from "@widgets/categoriesBar";
import { ProductsList } from "@widgets/productsList";
import { CatalogButton } from "@features/catalogRedirect";
import {selectCategories, selectCategoriesLoading} from "@entities/category";

export const MainScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const products = useSelector(selectProducts);
    const isProductsLoading = useSelector(selectProductsLoading);
    const activeBanners = useSelector(selectActiveMainBanners);
    const bannerStatus = useSelector(selectBannerStatus);
    const categories = useSelector(selectCategories);
    const isCategoriesLoading = useSelector(selectCategoriesLoading);

    const [showButton, setShowButton] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef(null);

    useEffect(() => {
        if (!products?.length && !isProductsLoading) {
            dispatch(fetchProducts());
        }
        if (!activeBanners?.length && bannerStatus !== 'loading') {
            dispatch(fetchBanners({ type: 'MAIN', active: true }));
        }
        if (!categories?.length && !isCategoriesLoading) {
            dispatch(fetchCategories());
        }
    }, [
        dispatch,
        products,
        isProductsLoading,
        activeBanners,
        bannerStatus,
        categories,
        isCategoriesLoading
    ]);
    const handleScroll = ({ nativeEvent }) => {
        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;

        const isCloseToBottom = layoutMeasurement.height + contentOffset.y >=
            contentSize.height - (contentSize.height * 0.2);

        if (isCloseToBottom && !showButton) {
            setShowButton(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true
            }).start();
        } else if (!isCloseToBottom && showButton) {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true
            }).start(() => setShowButton(false));
        }
    };
    const handleProductPress = (productId) => {
        navigation.navigate('ProductDetail', {
            productId,
            fromScreen: 'MainTab'
        });
    };
    const handleCatalogPress = () => {
        console.log('Переход в каталог');
        navigation.navigate('Catalog');
    };


    return (
        <Provider store={store}>
            <View style={styles.container}>
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                >
                    <Header />
                    <PromoBanner />
                    <CategoriesBar />
                    <ProductsList onProductPress={handleProductPress} fromScreen="MainTab" />
                    <View style={styles.bottomSpacer} />
                </ScrollView>

                {showButton && (
                    <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim }]}>
                        <CatalogButton onPress={handleCatalogPress} />
                    </Animated.View>
                )}
            </View>
        </Provider>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    scrollView: {
        flex: 1,
    },
    bottomSpacer: {
        height: 60,
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    }
});