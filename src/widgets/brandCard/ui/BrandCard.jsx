import React from 'react';
import { StyleSheet, View, Image, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import ArrowIcons from '@shared/ui/Icon/DetailScreenIcons/ArrowIcon';
import { FontFamily, FontSize } from "@app/styles/GlobalStyles";
import { normalize, normalizeFont } from '@shared/lib/normalize';
import {SupplierRatingFromRedux} from "@entities/supplier";
import {Colors} from "react-native/Libraries/NewAppScreen";

// Заменяем изображение на простой серый блок
const placeholderImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };

export const BrandCard = ({ supplier, onSupplierPress }) => {

    // Проверка на существование supplier и его полей
    if (!supplier) {
        return null;
    }

    // Определяем эффективный ID поставщика (используем любой доступный ID)
    const supplierId = supplier.id || (supplier.supplier?.id);

    // Логика получения названия компании
    const companyName = supplier.companyName ||
        supplier.supplier?.companyName ||
        supplier.email ||
        'Название компании';

    // Логика получения логотипа поставщика
    const logo = supplier.user?.avatar ||
        supplier.avatar ||
        supplier.supplier?.avatar ||
        supplier.logo ||
        supplier.supplier?.logo ||
        (supplier.images && supplier.images[0]) ||
        (supplier.supplier?.images && supplier.supplier.images[0]);


    // Определяем, является ли изображение placeholder'ом
    const isPlaceholder = !logo;

    // Выбираем стили в зависимости от типа изображения
    const imageStyles = isPlaceholder
        ? [styles.brandLogo, styles.placeholderLogo]
        : styles.brandLogo;

    const imageSource = logo ? { uri: logo } : placeholderImage;

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
                <Text style={[styles.brandName, { color: Colors.purpleSoft }]} numberOfLines={1} ellipsizeMode="tail">
                    {companyName}
                </Text>
            </View>

            {/* Используем компонент рейтинга только если есть ID поставщика */}
            <View style={styles.ratingContainer}>
                {supplierId ? (
                    <SupplierRatingFromRedux
                        supplierId={supplierId}
                        showCount={false}
                        starSize={16}
                        style={styles.ratingComponent}
                    />
                ) : null}
            </View>

            {isPlaceholder ? (
                <View style={styles.placeholderContainer}>
                    <Image
                        style={imageStyles}
                        resizeMode="contain"
                        source={imageSource}
                    />
                </View>
            ) : (
                <Image
                    style={imageStyles}
                    resizeMode="cover"
                    source={imageSource}
                />
            )}

            <ArrowIcons style={styles.arrow} width={normalize(185)} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: normalize(20),
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderStyle: 'solid',
        borderColor: '#c1fff4',
        borderTopWidth: 1,
        borderRightWidth: 0.2,
        borderBottomWidth: 1,
        borderLeftWidth: 0.2,
        width: '100%',
        overflow: 'hidden',
        height: normalize(118),
        marginVertical: normalize(5),
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
        top: normalize(90),
        left: normalize(177),
    },
    brandNameContainer: {
        top: normalize(12),
        width: normalize(200),
        height: normalize(29),
        left: normalize(185),
        position: 'absolute',
    },
    brandName: {
        fontFamily: FontFamily.SFProDisplayMedium,
        fontSize: normalizeFont(FontSize.size_md),
        fontWeight: '500',
        color: '#000',
    },
    ratingContainer: {
        position: 'absolute',
        top: 50, // Исправлено с '43%' на числовое значение
        left: normalize(185),
    },
    brandLogo: {
        marginTop: normalize(-41),
        top: 59, // Исправлено с '50%' на числовое значение (50% от высоты 118px)
        left: normalize(16),
        width: normalize(145),
        height: normalize(82),
        position: 'absolute',
        borderRadius: normalize(10),
    },
    // Стили специально для placeholder'а
    placeholderContainer: {
        position: 'absolute',
        marginTop: normalize(-41),
        top: 59, // Исправлено с '50%' на числовое значение (50% от высоты 118px)
        left: normalize(16),
        width: normalize(145),
        height: normalize(82),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(240, 240, 240, 0.3)',
        borderRadius: normalize(10),
    },
    placeholderLogo: {
        width: normalize(70),
        height: normalize(70),
        position: 'relative',
        top: 0,
        left: 0,
        marginTop: 0,
        opacity: 0.6,
        tintColor: '#999',
    },
});

export default BrandCard;