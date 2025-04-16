import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useTheme } from '@/app/providers/themeProvider/ThemeProvider';
import Text from '@/shared/ui/Text/Text';
import { AvatarPlaceholder } from "@shared/ui/Icon/DetailScreenIcons";
import RatingStarSvg from "@shared/ui/Icon/SupplierScreenIcons/RatingStarSvg";
import BackArrowIcon from "@shared/ui/Icon/BackArrowIcon/BackArrowIcon";
import {Color as colors, Color, FontFamily, FontSize} from "@app/styles/GlobalStyles";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AVATAR_WIDTH = SCREEN_WIDTH * 0.3;
const AVATAR_HEIGHT = (AVATAR_WIDTH * 64) / 113;

export const SupplierHeader = ({
                                   supplier,
                                   supplierRating,
                                   onGoBack,
                                   supplierProducts
                               }) => {
    const { colors } = useTheme();

    if (!supplier) return null;

    const supplierName = supplier.supplier && supplier.supplier.companyName
        ? supplier.supplier.companyName
        : supplier.companyName || supplier.email || 'Неизвестный поставщик';

    const supplierAvatar = supplier.avatar;
    const productsCount = supplierProducts ? supplierProducts.length : 0;

    console.log('SupplierHeader получил данные:', {
        supplierName,
        hasAvatar: !!supplierAvatar,
        productsCount
    });

    return (
        <View style={styles.container}>
            <View style={styles.headerWrapper}>
                <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
                    <BackArrowIcon width={45} size={25} />
                </TouchableOpacity>

                <View style={styles.supplierInfoContainer}>
                    <Text style={styles.supplierName}>{supplierName}</Text>
                    <View style={styles.ratingContainer}>
                        <RatingStarSvg
                            filled={true}
                            rating={supplierRating}
                            width={SCREEN_WIDTH * 0.055}
                        />
                        <Text style={styles.ratingText}>
                            {supplierRating.toFixed(1)}
                        </Text>
                        <Text style={styles.productsText}>
                            {productsCount} {getProductsCountText(productsCount)}
                        </Text>
                    </View>
                </View>

                {supplierAvatar ? (
                    <Image
                        source={{ uri: supplierAvatar }}
                        style={[
                            styles.avatarImage,
                            { width: AVATAR_WIDTH, height: AVATAR_HEIGHT }
                        ]}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.avatarImage, { width: AVATAR_WIDTH, height: AVATAR_HEIGHT }]}>
                        <AvatarPlaceholder width="100%" height="100%" />
                    </View>
                )}
            </View>
        </View>
    );
};

const getProductsCountText = (count) => {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'товаров';
    if (lastDigit === 1) return 'товар';
    if (lastDigit >= 2 && lastDigit <= 4) return 'товара';
    return 'товаров';
};

const styles = StyleSheet.create({
    container: {
        padding: SCREEN_WIDTH * 0.017,
        borderRadius: 0,
        marginHorizontal: 0,
        marginBottom: SCREEN_WIDTH * 0.023,
    },
    headerWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: SCREEN_WIDTH * 0.023,
    },
    backButton: {
        marginRight: SCREEN_WIDTH * 0.035,
        marginBottom: SCREEN_WIDTH * 0.070,
        padding: 1
    },
    supplierInfoContainer: {
        flex: 1,
        marginRight: SCREEN_WIDTH * 0.29,
    },
    supplierName: {
        fontSize: 24,
        fontWeight: '500',
        color: colors.dark,
        fontFamily: FontFamily.SFProDisplay,
        marginBottom: 8,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        marginLeft: SCREEN_WIDTH * 0.023,
        fontSize: FontSize.size_lg,
        fontWeight: '500',
        color: "#5e00ff",
        marginRight: SCREEN_WIDTH * 0.02,
    },
    productsText: {
        fontSize: 14,
        fontWeight: "500",
        fontFamily: FontFamily.sFProText,
        color: Color.grayDarker,
    },
    avatarImage: {
        borderRadius: 8,
        overflow: 'hidden', // Для сохранения скругленных углов
    },
});