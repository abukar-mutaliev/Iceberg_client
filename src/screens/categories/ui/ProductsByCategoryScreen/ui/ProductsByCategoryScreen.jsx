import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    StatusBar,
    Dimensions,
    PixelRatio
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {Color, Padding, FontFamily, FontSize, Border} from '@app/styles/GlobalStyles';
import { BackButton } from "@shared/ui/Button/BackButton";
import {
    selectProductsByCategory,
    selectProductsByCategoryLoading,
    selectProductsByCategoryError
} from "@entities/category/model/selectors";
import { fetchProductsByCategory } from "@entities/category";
import { ProductTile } from "@entities/product";

// Адаптация размеров
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const normalizeFont = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const ProductsByCategoryScreen = ({ route, navigation }) => {
    const { categoryId, categoryDescription } = route.params;
    const dispatch = useDispatch();

    const products = useSelector((state) => selectProductsByCategory(state, categoryId));
    const isLoading = useSelector(selectProductsByCategoryLoading);
    const error = useSelector(selectProductsByCategoryError);

    useEffect(() => {
        dispatch(fetchProductsByCategory({ categoryId, params: {} }));
    }, [dispatch, categoryId]);

    const handleProductPress = (productId) => {
        navigation.navigate('ProductDetail', {
            productId,
            fromScreen: 'ProductsByCategory'
        });
    };

    const handleBackPress = () => {
        navigation.goBack();
    };

    const renderProductItem = ({ item }) => (
        <View style={styles.productCardContainer}>
            <ProductTile
                product={{
                    ...item,
                    category: item.categories?.[0]?.description
                }}
                onPress={() => handleProductPress(item.id)}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <BackButton onPress={handleBackPress} style={styles.backButton} />
                <Text style={styles.headerTitle}>{categoryDescription}</Text>
                <View style={styles.headerSpacer} />
            </View>

            {isLoading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={Color.purpleSoft} />
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : products.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>В этой категории нет продуктов</Text>
                </View>
            ) : (
                <FlatList
                    data={products}
                    renderItem={renderProductItem}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.productsList}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    header: {
        height: normalize(56),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: normalize(Padding.p_9xs),
    },
    backButton: {
        left: normalize(16),
        position: 'absolute',
        alignItems: 'center',
        top: normalize(25),
    },
    headerTitle: {
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        color: Color.dark,
        textAlign: 'center',
        position: 'absolute',
        left: '50%',
        marginLeft: normalize(-84),
        width: normalize(168),
        top: normalize(25),
    },
    headerSpacer: {
        width: normalize(40),
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: normalize(Padding.p_base),
    },
    errorText: {
        fontSize: normalizeFont(FontSize.size_base),
        color: 'red',
        textAlign: 'center',
        fontFamily: FontFamily.sFProText,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: normalize(Padding.p_base),
    },
    emptyText: {
        fontSize: normalizeFont(FontSize.size_base),
        color: Color.dark,
        textAlign: 'center',
        fontFamily: FontFamily.sFProText,
    },
    productsList: {
        paddingHorizontal: normalize(16),
        paddingTop: normalize(46),
        paddingBottom: normalize(100),
    },
    productCardContainer: {
        width: normalize(192),
        height: normalize(269),
        marginBottom: normalize(20),
        borderRadius: normalize(Border.br_xl),
        overflow: 'hidden',
    },
    row: {
        justifyContent: 'space-between',
    },
});

export default ProductsByCategoryScreen;