import React, { useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, Image, Text, Pressable } from 'react-native';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import { ProductActions } from '@widgets/product/ProductActions';

const defaultProductImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };

export const ProductManagementCard = ({ product, onViewProduct }) => {
    if (!product || !product.id) {
        return null;
    }

    const isNavigatingRef = useRef(false);

    const imageSource = useMemo(() => {
        return product.images && product.images.length > 0
            ? { uri: product.images[0] }
            : defaultProductImage;
    }, [product.images]);

    // Расчет коробочной информации
    const boxInfo = useMemo(() => {
        const itemsPerBox = product.itemsPerBox || 1;
        const pricePerItem = product.price || 0;
        const boxPrice = product.boxPrice || (pricePerItem * itemsPerBox);
        const stockBoxes = product.stockQuantity || 0;
        const totalItems = stockBoxes * itemsPerBox;

        return {
            itemsPerBox,
            boxPrice,
            stockBoxes,
            totalItems,
            pricePerItem
        };
    }, [product]);

    const handlePress = useCallback(() => {
        if (isNavigatingRef.current) {
            return;
        }

        if (onViewProduct && product.id) {
            isNavigatingRef.current = true;
            console.log('ProductManagementCard: Переход к продукту:', product.id);

            onViewProduct(product.id, 'ProductManagement');

            setTimeout(() => {
                isNavigatingRef.current = false;
            }, 100);
        }
    }, [onViewProduct, product.id]);

    return (
        <Pressable
            style={styles.container}
            onPress={handlePress}
            disabled={false}
            android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        >
            <Image
                source={imageSource}
                style={styles.productImage}
                resizeMode="cover"
                onError={() => {}}
            />

            <View style={styles.contentContainer}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                        {product.name || 'Без названия'}
                    </Text>
                </View>

                <View style={styles.descriptionContainer}>
                    {/* Цена за штуку */}
                    <Text style={styles.priceInfo} numberOfLines={1}>
                        {boxInfo.pricePerItem.toFixed(0)} ₽/шт.
                    </Text>

                    {/* Цена за коробку (если товар продается коробками) */}
                    {boxInfo.itemsPerBox > 1 && (
                        <Text style={styles.boxPriceInfo} numberOfLines={1}>
                            {boxInfo.boxPrice.toFixed(0)} ₽/коробка ({boxInfo.itemsPerBox} шт.)
                        </Text>
                    )}

                    {/* Информация о складе */}
                    <Text style={styles.stockInfo} numberOfLines={1}>
                        На складе: {boxInfo.stockBoxes} {boxInfo.itemsPerBox > 1 ? 'коробок' : 'шт.'}
                        {boxInfo.itemsPerBox > 1 && ` (${boxInfo.totalItems} шт.)`}
                    </Text>

                    {/* Описание товара */}
                    <Text style={styles.description} numberOfLines={1} ellipsizeMode="tail">
                        {product.description || 'Без описания'}
                    </Text>

                </View>
            </View>

            <View style={styles.actionsButtonContainer} pointerEvents="box-none">
                <ProductActions
                    product={product}
                    compact={true}
                    style={styles.actionsStyle}
                    buttonStyle={styles.actionButtonStyle}
                    textStyle={styles.actionTextStyle}
                    allowEdit={true}
                />
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 152,
        borderWidth: 0.5,
        borderColor: Color.purpleSoft,
        borderStyle: 'solid',
        borderRadius: Border.br_xl,
        backgroundColor: Color.colorLightMode,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 20,
        marginHorizontal: 5,
        ...Shadow.light,
    },
    productImage: {
        width: 120,
        height: '100%',
        left: 0,
        bottom: 0,
        top: 0,
        position: 'absolute',
        borderTopLeftRadius: Border.br_xl,
        borderBottomLeftRadius: Border.br_xl,
    },
    contentContainer: {
        marginLeft: 128,
        width: '65%',
        flex: 1,
        paddingTop: 15,
        paddingRight: 16,
    },
    titleContainer: {
        height: 20,
        width: "100%",
    },
    title: {
        fontFamily: FontFamily.sFProDisplay,
        fontSize: FontSize.size_sm,
        fontWeight: '600',
        color: Color.purpleSoft,
        textAlign: 'left',
    },
    descriptionContainer: {
        marginTop: 5,
        height: 63,
        width: "100%",
    },
    priceInfo: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        fontWeight: '600',
        color: Color.purpleSoft,
        textAlign: 'left',
        marginBottom: 2,
    },
    boxPriceInfo: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        fontWeight: '500',
        color: Color.purpleSoft,
        textAlign: 'left',
        marginBottom: 2,
    },
    stockInfo: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        color: Color.textSecondary,
        textAlign: 'left',
        marginBottom: 2,
    },
    description: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        fontWeight: '400',
        color: Color.textSecondary,
        textAlign: 'left',
        marginBottom: 2,
    },
    supplier: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        color: Color.textSecondary,
        marginTop: 4,
        fontStyle: 'italic',
        width: '100%',
    },
    actionsButtonContainer: {
        position: 'absolute',
        right: 8,
        bottom: 8,
        flexDirection: 'row',
    },
    actionsStyle: {
        marginTop: 0,
        marginBottom: 0,
        paddingHorizontal: 0,
    },
    actionButtonStyle: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    actionTextStyle: {
        fontSize: 18,
    }
});