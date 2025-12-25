import React from 'react';
import { View, StyleSheet, Pressable, Text, ScrollView, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import {
    selectCategories,
    selectCategoriesLoading,
    selectCategoriesError
} from '@entities/category/model/selectors';
import { CategoryIcon } from '@entities/category/ui/CategoryIcon';
import { Color, Padding, Gap, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { AndroidShadow } from "@shared/ui/Shadow";
import { useNavigation } from '@react-navigation/native';
import {normalize} from "@shared/lib/normalize";

const CATEGORY_ICON_MAP = {
    'Стаканчик': 'стаканчик',
    'Эскимо': 'эскимо',
    'Рожок': 'рожок',
    'Рожки': 'рожок',
    'Килограммовые': 'килограммовое',
    'Брикеты': 'брикеты',
    'Брикет': 'брикеты',
    'Фруктовый лед': 'фруктовый лед',
    'Фруктовый лёд': 'фруктовый лед',
    'Рыба': 'рыба',
    'Стандартный': 'стандартный'
};

// Порядок отображения категорий
const CATEGORY_ORDER = [
    'Стаканчик',
    'Эскимо',
    'Рожки',
    'Рожок',
    'Брикеты',
    'Брикет',
    'Килограммовые',
    'Фруктовый лед',
    'Рыба'
];

export const CategoriesBar = ({ hideLoader = true }) => {
    const categories = useSelector(selectCategories);
    const isLoading = useSelector(selectCategoriesLoading);
    const error = useSelector(selectCategoriesError);
    const navigation = useNavigation();

    // Показываем скелетон загрузки
    if (isLoading && !hideLoader && categories.length === 0) {
        return (
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
            >
                {[...Array(6)].map((_, index) => (
                    <View key={`skeleton-${index}`} style={styles.categoryItem}>
                        <View style={styles.skeletonButton} />
                        <View style={styles.skeletonText} />
                    </View>
                ))}
            </ScrollView>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Ошибка загрузки категорий</Text>
            </View>
        );
    }

    const handleCategoryPress = (category) => {
        if (category.isCategoriesLink) {
            navigation.navigate('Categories');
        } else {
            navigation.navigate('ProductsByCategory', {
                categoryId: category.id,
                categoryName: category.name,
                categoryDescription: category.description
            });
        }
    };

    // Фильтруем категорию "Набор" и сортируем категории в нужном порядке
    const filteredCategories = categories.filter(category => category.name !== 'Набор');
    const sortedCategories = [...filteredCategories].sort((a, b) => {
        const indexA = CATEGORY_ORDER.indexOf(a.name);
        const indexB = CATEGORY_ORDER.indexOf(b.name);
        
        // Если категория не найдена в порядке, помещаем её в конец
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        
        return indexA - indexB;
    });

    const categoriesWithLink = [
        ...sortedCategories,
        { id: 'categories-link', name: 'Categories', isCategoriesLink: true }
    ];

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
        >
            {categoriesWithLink.map((category) => {
                const iconType = category.isCategoriesLink
                    ? 'categories-menu'
                    : (CATEGORY_ICON_MAP[category.name] || 'стандартный');

                return (
                    <Pressable
                        key={category.id}
                        style={styles.categoryItem}
                        onPress={() => handleCategoryPress(category)}
                    >
                        <View style={getButtonStyle(iconType)}>
                            {Platform.OS === 'ios' ? (
                                <View style={[styles.iconContainer, styles.iosShadow]}>
                                    <View style={styles.iconWrapper}>
                                        <CategoryIcon
                                            type={iconType}
                                            style={iconType === 'рожок' || iconType === 'эскимо'
                                                ? styles.smallIcon
                                                : styles.largeIcon}
                                        />
                                    </View>
                                </View>
                            ) : (
                                <AndroidShadow
                                    style={styles.iconContainer}
                                    shadowColor="rgba(51, 57, 176, 0.05)"
                                    shadowConfig={{
                                        offsetX: -9,
                                        offsetY: 0,
                                        elevation: 14,
                                        radius: 19,
                                        opacity: 0.4
                                    }}
                                >
                                    <View style={styles.iconWrapper}>
                                        <CategoryIcon
                                            type={iconType}
                                            style={iconType === 'рожок' || iconType === 'эскимо'
                                                ? styles.smallIcon
                                                : styles.largeIcon}
                                        />
                                    </View>
                                </AndroidShadow>
                            )}
                        </View>
                        {category.isCategoriesLink ? (
                            <Text style={styles.categoryName} numberOfLines={2}>
                                Все
                            </Text>
                        ) : (
                            <Text style={styles.categoryName} numberOfLines={2}>
                                {category.name}
                            </Text>
                        )}
                    </Pressable>
                );
            })}
        </ScrollView>
    );
};

const getButtonStyle = (iconType) => {
    const baseStyle = [styles.buttonBase];

    if (iconType === 'рожок' || iconType === 'эскимо') {
        baseStyle.push(styles.buttonSmall);
    } else {
        baseStyle.push(styles.buttonLarge);
    }

    return baseStyle;
};

const styles = StyleSheet.create({
    scrollContainer: {
        marginTop: normalize(10),
        paddingVertical: Padding.p_9xs,
        paddingHorizontal: 6,
        paddingBottom: Padding.p_3xs,
    },
    loaderContainer: {
        height: 57,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 6,
    },
    errorContainer: {
        height: 57,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 16,
    },
    errorText: {
        color: 'red',
        fontSize: FontSize.size_xs,
        fontFamily: FontFamily.sFProText,
    },
    categoryItem: {
        alignItems: 'center',
        marginRight: 5,
        width: 85,
    },
    buttonBase: {
        paddingVertical: Padding.p_9xs,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Gap.gap_lg,
        flexDirection: 'row',
    },
    buttonSmall: {
        paddingHorizontal: Padding.p_12xl,
        height: 57,
        width: 85,
    },
    buttonLarge: {
        paddingHorizontal: Padding.p_2xl,
        height: 57,
        width: 85,
    },
    iconContainer: {
        position: 'relative',
        height: 57,
        width: 65,
        borderRadius: 19,
        backgroundColor: '#fff',
    },
    iosShadow: {
        shadowColor: 'rgba(51, 57, 176, 0.25)',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.6,
        shadowRadius: 8,
    },
    iconWrapper: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    smallIcon: {
        zIndex: 1,
    },
    largeIcon: {
        zIndex: 1,
    },
    categoryName: {
        marginTop: normalize(6),
        fontSize: FontSize.size_xs,
        fontFamily: FontFamily.sFProText,
        color: Color.colorDarkslategray,
        textAlign: 'center',
        maxWidth: 85,
    },
    // Стили для скелетона
    skeletonButton: {
        height: 57,
        width: 65,
        borderRadius: 19,
        backgroundColor: '#f0f0f0',
    },
    skeletonText: {
        marginTop: normalize(6),
        height: 12,
        width: 60,
        borderRadius: 6,
        backgroundColor: '#f0f0f0',
    },
});