import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import Text from '@shared/ui/Text/Text';
import { AvatarPlaceholder } from "@shared/ui/Icon/DetailScreenIcons";
import { SupplierRatingFromRedux } from '@entities/supplier';
import { Color, FontFamily, FontSize } from "@app/styles/GlobalStyles";
import { useImageViewer } from '@shared/lib/hooks/useImageViewer';
import { SupplierAvatarViewer } from '@features/supplier/ui/SupplierAvatarViewer/SupplierAvatarViewer';
import {BackButton} from "@shared/ui/Button/BackButton";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AVATAR_WIDTH = SCREEN_WIDTH * 0.24;
const AVATAR_HEIGHT = (AVATAR_WIDTH * 64) / 113;

/**
 * Получить текст для количества товаров с правильным склонением
 * @param {number} count - количество товаров
 * @returns {string} - правильно склоненное слово "товар"
 */
const getProductsCountText = (count) => {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'товаров';
    if (lastDigit === 1) return 'товар';
    if (lastDigit >= 2 && lastDigit <= 4) return 'товара';
    return 'товаров';
};

/**
 * Оптимизированный компонент заголовка поставщика
 * - Использует мемоизацию для всех вычисляемых значений
 * - Оптимизированная обработка изображений
 * - Поддержка просмотра аватара в модальном окне
 */
export const SupplierHeader = React.memo(({
                                              supplier,
                                              onGoBack,
                                              supplierProducts
                                          }) => {
    const { colors } = useTheme();
    const { isVisible, openImage, closeImage } = useImageViewer();

    if (!supplier) return null;

    // Мемоизируем название поставщика
    const supplierName = useMemo(() => {
        return supplier.supplier && supplier.supplier.companyName
            ? supplier.supplier.companyName
            : supplier.companyName || supplier.email || 'Неизвестный поставщик';
    }, [supplier]);

    // Мемоизируем путь к аватару поставщика
    const supplierAvatar = useMemo(() => {
        // Проверяем все возможные пути к аватару
        return supplier.user?.avatar ||
            supplier.avatar ||
            supplier.supplier?.avatar ||
            (supplier.images && supplier.images[0]);
    }, [supplier]);

    // Мемоизируем количество продуктов
    const productsCount = useMemo(() => {
        if (typeof supplierProducts === 'number') return supplierProducts;
        return Array.isArray(supplierProducts) ? supplierProducts.length : 0;
    }, [supplierProducts]);

    // Мемоизируем текст с количеством продуктов
    const productsCountText = useMemo(() => {
        return `${productsCount} ${getProductsCountText(productsCount)}`;
    }, [productsCount]);

    // Мемоизируем стили для аватара
    const avatarStyle = useMemo(() => [
        styles.avatarImage,
        { width: AVATAR_WIDTH, height: AVATAR_HEIGHT }
    ], []);

    // Обработчик нажатия на аватар
    const handleAvatarPress = () => {
        if (supplierAvatar) {
            openImage(supplierAvatar, supplierName);
        }
    };

    // Оптимизированное отображение компонента
    return (
        <View style={styles.container}>
            <View style={styles.headerWrapper}>
                <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
                    <BackButton onPress={onGoBack} />
                </TouchableOpacity>

                <View style={styles.supplierInfoContainer}>
                    <Text style={styles.supplierName} numberOfLines={2} ellipsizeMode="tail">
                        {supplierName}
                    </Text>
                    <View style={styles.ratingContainer}>
                        <SupplierRatingFromRedux
                            supplierId={supplier.id}
                            showCount={false}
                            starSize={SCREEN_WIDTH * 0.015}
                            textColor="#5e00ff"
                            textStyle={styles.ratingText}
                        />

                        <Text style={styles.productsText}>
                            {productsCountText}
                        </Text>
                    </View>
                </View>

                {/* Аватар с возможностью просмотра */}
                <TouchableOpacity
                    style={avatarStyle}
                    onPress={handleAvatarPress}
                    activeOpacity={supplierAvatar ? 0.8 : 1}
                    disabled={!supplierAvatar}
                >
                    {supplierAvatar ? (
                        <Image
                            source={{ uri: supplierAvatar }}
                            style={styles.avatarImageInner}
                            resizeMode="cover"
                            cachePolicy="memory-disk"
                            loadPriority="high"
                        />
                    ) : (
                        <AvatarPlaceholder width="100%" height="100%" />
                    )}

                    {/* Индикатор того, что на аватар можно нажать */}
                    {supplierAvatar && (
                        <View style={styles.avatarOverlay}>
                            <View style={styles.viewIndicator} />
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Модальное окно для просмотра аватара */}
            <SupplierAvatarViewer
                visible={isVisible}
                supplier={supplier}
                onClose={closeImage}
            />
        </View>
    );
});

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
        padding: 15,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    supplierInfoContainer: {
        flex: 1,
        marginRight: SCREEN_WIDTH * 0.1,
    },
    supplierName: {
        fontSize: 22,
        fontWeight: '500',
        color: Color.dark,
        fontFamily: FontFamily.SFProDisplay,
        marginBottom: 8,
        textAlign: 'left',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        marginLeft: SCREEN_WIDTH * 0.001,
        fontSize: FontSize.size_md,
        fontWeight: '500',
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
        overflow: 'hidden',
        top: 3,
        right: 8,
        position: 'relative',
    },
    avatarImageInner: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    avatarOverlay: {
        position: 'absolute',
        bottom: 2,
        top: 1,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
    },
});

SupplierHeader.displayName = 'SupplierHeader';