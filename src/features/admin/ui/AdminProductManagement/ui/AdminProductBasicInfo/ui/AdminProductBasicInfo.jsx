import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, Border, Shadow } from '@app/styles/GlobalStyles';
import {InfoCard} from "@shared/ui/Admin/AdminProduct";

export const AdminProductBasicInfo = ({
                                     product,
                                     displayData,
                                     showAdditionalInfo = false,
                                     supplier = null
                                 }) => {
    const moderationStatus = product?.moderationStatus || 'APPROVED';
    const moderationLabel = moderationStatus === 'PENDING'
        ? 'На модерации'
        : moderationStatus === 'REJECTED'
            ? 'Отклонен'
            : 'Одобрен';

    return (
        <View style={styles.container}>
            {/* Основная информация */}
            <View style={styles.mainInfoContainer}>
                <Text style={styles.productName}>{product.name}</Text>

                {product.description && (
                    <Text style={styles.productDescription}>{product.description}</Text>
                )}
            </View>

            {/* Информационные карточки */}
            <View style={styles.infoCardsContainer}>
                {/* Первый ряд - Цена за коробку и Количество коробок */}
                <View style={styles.infoCardsRow}>
                    <InfoCard
                        icon="💰"
                        title="Цена за коробку"
                        value={displayData?.boxPrice || 'Не указана'}
                        subtitle={product.itemsPerBox > 1 ? `${product.itemsPerBox} шт. в коробке` : 'Поштучно'}
                    />
                    <InfoCard
                        icon="₽"
                        title="Цена за штуку"
                        value={displayData?.pricePerItem || 'Не указана'}
                    />
                </View>

                {/* Второй ряд - Цена за штуку и Вес */}
                <View style={styles.infoCardsRow}>

                    <InfoCard
                        icon="⚖️"
                        title="Вес"
                        value={displayData?.weight || 'Не указан'}
                    />
                    <InfoCard
                        icon="📂"
                        title="Категории"
                        value={displayData?.categoryNames || 'Без категорий'}
                        fullWidth={true}
                    />
                </View>

                {/* Четвертый ряд - Поставщик */}
                <View style={styles.infoCardsRow}>
                    <InfoCard
                        icon="🏢"
                        title="Поставщик"
                        value={displayData?.supplierName || 'Не указан'}
                        fullWidth={true}
                    />
                </View>

                {/* Статус товара */}
                <View style={styles.infoCardsRow}>
                    <InfoCard
                        icon="📊"
                        title="Статус"
                        value={product.isActive !== false ? 'Активен' : 'Неактивен'}
                        subtitle={product.isActive !== false ? 'Товар доступен для продажи' : 'Товар скрыт от покупателей'}
                        fullWidth={true}
                    />
                </View>
                <View style={styles.infoCardsRow}>
                    <InfoCard
                        icon="🛡️"
                        title="Модерация"
                        value={moderationLabel}
                        subtitle={product?.moderationReason || 'Без комментария модератора'}
                        fullWidth={true}
                    />
                </View>
                {(product?.supplierProposedPrice || product?.supplierProposedBoxPrice) && (
                    <View style={styles.infoCardsRow}>
                        <InfoCard
                            icon="💬"
                            title="Предложение поставщика"
                            value={
                                product?.supplierProposedPrice
                                    ? `${Number(product.supplierProposedPrice).toFixed(0)} ₽/шт`
                                    : 'Без цены за штуку'
                            }
                            subtitle={
                                product?.supplierProposedBoxPrice
                                    ? `${Number(product.supplierProposedBoxPrice).toFixed(0)} ₽/коробка`
                                    : 'Без цены за коробку'
                            }
                            fullWidth={true}
                        />
                    </View>
                )}
            </View>

            {/* Дополнительная информация (опционально) */}
            {showAdditionalInfo && (
                <View style={styles.additionalInfoContainer}>
                    <Text style={styles.sectionTitle}>Дополнительная информация</Text>

                    <View style={styles.additionalInfoItem}>
                        <Text style={styles.additionalInfoLabel}>ID продукта:</Text>
                        <Text style={styles.additionalInfoValue}>{product.id}</Text>
                    </View>

                    {product.sku && (
                        <View style={styles.additionalInfoItem}>
                            <Text style={styles.additionalInfoLabel}>Артикул (SKU):</Text>
                            <Text style={styles.additionalInfoValue}>{product.sku}</Text>
                        </View>
                    )}

                    {product.createdAt && (
                        <View style={styles.additionalInfoItem}>
                            <Text style={styles.additionalInfoLabel}>Дата создания:</Text>
                            <Text style={styles.additionalInfoValue}>
                                {new Date(product.createdAt).toLocaleDateString('ru-RU')}
                            </Text>
                        </View>
                    )}

                    {product.updatedAt && (
                        <View style={styles.additionalInfoItem}>
                            <Text style={styles.additionalInfoLabel}>Последнее обновление:</Text>
                            <Text style={styles.additionalInfoValue}>
                                {new Date(product.updatedAt).toLocaleDateString('ru-RU')}
                            </Text>
                        </View>
                    )}

                    {/* Информация о поставщике если загружена */}
                    {supplier && (
                        <>
                            <View style={styles.additionalInfoItem}>
                                <Text style={styles.additionalInfoLabel}>Поставщик (детали):</Text>
                                <Text style={styles.additionalInfoValue}>
                                    {supplier.companyName || supplier.name}
                                </Text>
                            </View>
                            {supplier.email && (
                                <View style={styles.additionalInfoItem}>
                                    <Text style={styles.additionalInfoLabel}>Email поставщика:</Text>
                                    <Text style={styles.additionalInfoValue}>{supplier.email}</Text>
                                </View>
                            )}
                            {supplier.phone && (
                                <View style={styles.additionalInfoItem}>
                                    <Text style={styles.additionalInfoLabel}>Телефон поставщика:</Text>
                                    <Text style={styles.additionalInfoValue}>{supplier.phone}</Text>
                                </View>
                            )}
                        </>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mainInfoContainer: {
        padding: normalize(20),
        backgroundColor: Color.colorLightMode,
    },
    productName: {
        fontSize: normalizeFont(24),
        fontWeight: '700',
        color: Color.dark,
        marginBottom: normalize(8),
        fontFamily: FontFamily.sFProDisplay,
    },
    productDescription: {
        fontSize: normalizeFont(16),
        color: Color.textSecondary,
        lineHeight: normalize(22),
        fontFamily: FontFamily.sFProText,
    },
    infoCardsContainer: {
        padding: normalize(16),
        paddingTop: 0,
    },
    infoCardsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: normalize(12),
    },
    additionalInfoContainer: {
        margin: normalize(16),
        backgroundColor: Color.colorLightMode,
        borderRadius: Border.radius.medium,
        padding: normalize(16),
        ...Shadow.light,
    },
    sectionTitle: {
        fontSize: normalizeFont(18),
        fontWeight: '600',
        color: Color.dark,
        marginBottom: normalize(16),
        fontFamily: FontFamily.sFProDisplay,
    },
    additionalInfoItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(8),
        borderBottomWidth: 0.5,
        borderBottomColor: Color.border,
    },
    additionalInfoLabel: {
        fontSize: normalizeFont(14),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        flex: 1,
    },
    additionalInfoValue: {
        fontSize: normalizeFont(14),
        fontWeight: '500',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        textAlign: 'right',
        flex: 1,
    },
});

export default AdminProductBasicInfo;