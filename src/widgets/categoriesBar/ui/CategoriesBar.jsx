import React from 'react';
import { View, StyleSheet, Pressable, Text, ScrollView } from 'react-native';
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
    'Рожок': 'рожок',
    'Стаканчик': 'стаканчик',
    'Эскимо': 'эскимо',
    'Набор': 'набор',
    'Стандартный': 'стандартный'
};

export const CategoriesBar = ({ hideLoader = true }) => {
    const categories = useSelector(selectCategories);
    const isLoading = useSelector(selectCategoriesLoading);
    const error = useSelector(selectCategoriesError);
    const navigation = useNavigation();

    // Не показываем спиннер — просто вернём пустое место, если нет категорий

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

    const categoriesWithLink = [
        ...categories,
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
                    : (CATEGORY_ICON_MAP[category.name]);

                return (
                    <Pressable
                        key={category.id}
                        style={getButtonStyle(iconType)}
                        onPress={() => handleCategoryPress(category)}
                    >
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
    buttonBase: {
        paddingVertical: Padding.p_9xs,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Gap.gap_lg,
        flexDirection: 'row',
        marginRight: 5,
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
    }
});