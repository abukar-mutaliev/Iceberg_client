import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { IconEdit, IconDelete } from '@shared/ui/Icon/ProductManagement';
import {CategoryIcon} from "@entities/category/ui/CategoryIcon";

// Объект для соответствия имени категории и типа иконки
const CATEGORY_ICON_MAP = {
    'Рожок': 'рожок',
    'Стаканчик': 'стаканчик',
    'Эскимо': 'эскимо',
    'Набор': 'набор',
    'Стандартный': 'стандартный'
};

export const CategoryListItem = ({ category, products, onEdit, onDelete }) => {
    const productCount = useMemo(() => {
        if (!products || !products.length) return 0;

        return products.filter(product => {
            if (!product.categories || !product.categories.length) return false;

            return product.categories.some(cat => {
                const catId = typeof cat === 'object' ? cat.id : cat;
                return catId === category.id;
            });
        }).length;
    }, [category.id, products]);

    const hasProducts = productCount > 0;

    const getBadgeColor = () => {
        if (productCount > 10) return Color.green;
        if (productCount > 0) return Color.blue2;
        return Color.grey7D7D7D;
    };

    // Определяем тип иконки на основе имени категории
    const getIconType = () => {
        if (category.name && CATEGORY_ICON_MAP[category.name]) {
            return CATEGORY_ICON_MAP[category.name];
        }
        return 'стандартный';
    };

    return (
        <Animated.View style={styles.container}>
            <View style={styles.leftContent}>
                <View style={styles.iconContainer}>
                    <CategoryIcon 
                        type={getIconType()} 
                        style={styles.categoryIcon}
                        size={24} 
                        color={Color.blue2} 
                    />
                </View>
            </View>

            <View style={styles.infoContainer}>
                <View style={styles.headerContainer}>
                    <Text style={styles.name} numberOfLines={1}>{category.name}</Text>

                    <View style={[styles.badgeContainer, { backgroundColor: getBadgeColor() }]}>
                        <Text style={styles.badgeText}>{productCount}</Text>
                    </View>
                </View>


            </View>

            <View style={styles.actionsContainer}>
                <TouchableOpacity
                    style={styles.actionButton}
                    activeOpacity={0.7}
                    onPress={onEdit}
                >
                    <IconEdit width={18} height={18} color={Color.blue2} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    activeOpacity={0.7}
                    onPress={onDelete}
                >
                    <IconDelete width={18} height={18} color={Color.colorRed} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: normalize(12),
        backgroundColor: Color.colorLightMode,
        borderRadius: normalize(20),
        padding: normalize(16),
        marginBottom: normalize(12),
        marginHorizontal: normalize(2),
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    leftContent: {
        marginRight: normalize(12),
    },
    iconContainer: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryIcon: {
        zIndex: 1,
    },
    infoContainer: {
        flex: 1,
        marginRight: normalize(8),
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(4),
    },
    name: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
        flex: 1,
    },
    badgeContainer: {
        paddingHorizontal: normalize(6),
        paddingVertical: normalize(2),
        borderRadius: normalize(12),
        marginLeft: normalize(8),
        minWidth: normalize(22),
        alignItems: 'center',
    },
    badgeText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        color: Color.colorLightMode,
    },
    description: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        lineHeight: normalizeFont(FontSize.size_xs) * 1.4,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        width: normalize(36),
        height: normalize(36),
        borderRadius: normalize(18),
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: normalize(8),
    },
});