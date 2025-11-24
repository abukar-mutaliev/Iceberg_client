import React from 'react';
import { StyleSheet, View, Image, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import ArrowIcons from '@shared/ui/Icon/DetailScreenIcons/ArrowIcon';
import { FontFamily, FontSize } from "@app/styles/GlobalStyles";
import { normalize, normalizeFont } from '@shared/lib/normalize';
import {SupplierRatingFromRedux} from "@entities/supplier";
import {Colors} from "react-native/Libraries/NewAppScreen";

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

    // Получаем первую букву названия компании для placeholder
    const firstLetter = companyName ? companyName.charAt(0).toUpperCase() : '?';

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
                    <Text style={styles.placeholderText}>{firstLetter}</Text>
                </View>
            ) : (
                <Image
                    style={styles.brandLogo}
                    resizeMode="cover"
                    source={{ uri: logo }}
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
        position: 'absolute',
        top: '50%',
        marginTop: normalize(-41), // Половина высоты (82/2 = 41)
        left: normalize(16),
        width: normalize(145),
        height: normalize(82),
        borderRadius: normalize(10),
    },
    // Стили специально для placeholder'а
    placeholderContainer: {
        position: 'absolute',
        top: '50%',
        marginTop: normalize(-41), // Половина высоты (82/2 = 41) для центрирования
        left: normalize(16),
        width: normalize(145),
        height: normalize(82),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E8F4FF',
        borderRadius: normalize(10),
        borderWidth: 2,
        borderColor: '#C1E7FF',
    },
    placeholderText: {
        fontSize: normalizeFont(48),
        fontWeight: '700',
        color: '#5E9FD8',
        fontFamily: FontFamily.SFProDisplayBold,
    },
});

export default BrandCard;