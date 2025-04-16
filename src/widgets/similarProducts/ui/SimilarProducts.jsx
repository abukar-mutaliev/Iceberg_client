import React, {useMemo} from 'react';
import {FontFamily, FontSize, Color, Border} from '@/app/styles/GlobalStyles';
import {ProductTile} from "@entities/product";
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const SimilarProducts = ({products}) => {

    const validProducts = useMemo(() => {
        return products?.filter(p => p && p.id) || [];

    }, [products]);

    const renderItem = ({item}) => {
        return (
            <View style={styles.productCardContainer}>
                <ProductTile product={item}/>
            </View>
        );
    };


    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                Похожие товары
            </Text>

            {validProducts && validProducts.length > 0 ? (
                <FlatList
                    data={validProducts}
                    renderItem={renderItem}
                    keyExtractor={(item) => String(item.id)}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                    contentContainerStyle={styles.listContentContainer}
                />
            ) : (
                <View style={[styles.emptyContainer, {
                    backgroundColor: 'rgba(51, 57, 176, 0.05)'
                }]}>
                    <Text style={[styles.emptyText, {color: Color.colorSilver_100}]}>
                        Похожие товары не найдены
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 30,
        marginHorizontal: 15,
    },
    title: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_lg,
        fontWeight: '600',
        marginBottom: 16,
        color: "#000",
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    productCardContainer: {
        width: normalize(192),
        height: normalize(269),
        marginBottom: normalize(20),
        borderRadius: normalize(Border.br_xl),
        overflow: 'hidden',
    },
    emptyContainer: {
        borderRadius: Border.br_xl,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        textAlign: 'center',
    },
    listContentContainer: {
        paddingBottom: 0,
    }
});