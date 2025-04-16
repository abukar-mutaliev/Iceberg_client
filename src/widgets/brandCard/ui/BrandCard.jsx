import React from 'react';
import { StyleSheet, View, Image, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/app/providers/themeProvider/ThemeProvider';
import { ProductRating } from '@/entities/product/ui/ProductRating';
import ArrowIcons from '@/shared/ui/Icon/DetailScreenIcons/ArrowIcon';
import { FontFamily, FontSize } from "@app/styles/GlobalStyles";

export const BrandCard = ({ supplier, rating, onSupplierPress }) => {
    const { colors } = useTheme();

    if (!supplier) return null;

    const companyName = supplier.supplier?.companyName || supplier.companyName || supplier.email || 'Название компании';
    const logo = supplier.avatar;
    const ratingValue = rating || 0;
    const placeholderImage = require('@/assets/images/placeholder.png');

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onSupplierPress}
            activeOpacity={0.8}
        >
            <LinearGradient
                style={styles.gradient}
                locations={[0, 0.99]}
                colors={['rgba(250, 254, 252, 0)', 'rgba(51, 57, 176, 0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            />

            <View style={styles.brandNameContainer}>
                <Text style={[styles.brandName, { color: colors.text }]}>
                    {companyName}
                </Text>
            </View>

            <View style={styles.ratingContainer}>
                <ProductRating
                    rating={ratingValue}
                    canRate={false}
                />
            </View>

            <Image
                style={styles.brandLogo}
                resizeMode="cover"
                source={logo ? { uri: logo } : placeholderImage}
            />

            <ArrowIcons style={styles.arrow} width={165} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderStyle: 'solid',
        borderColor: '#c1fff4',
        borderTopWidth: 1,
        borderRightWidth: 0.2,
        borderBottomWidth: 1,
        borderLeftWidth: 0.2,
        width: '100%',
        overflow: 'hidden',
        height: 118,
        marginVertical: 5,
        position: 'relative',
    },
    gradient: {
        top: 0,
        left: 0,
        width: '100%',
        position: 'absolute',
        height: '100%',
    },
    arrow: {
        position: 'absolute',
        top: 90,
        left: 147,
    },
    brandNameContainer: {
        top: 12,
        width: 200,
        height: 29,
        left: 165,
        position: 'absolute',
    },
    brandName: {
        fontFamily: FontFamily.SFProDisplayMedium,
        fontSize: FontSize.size_md,
        fontWeight: '500',
        color: '#000',
    },
    ratingContainer: {
        position: 'absolute',
        top: '43%',
        left: '43.69%',
    },
    brandLogo: {
        marginTop: -41,
        top: '50%',
        left: 16,
        width: 115,
        height: 82,
        position: 'absolute',
        borderRadius: 10,
    },
});