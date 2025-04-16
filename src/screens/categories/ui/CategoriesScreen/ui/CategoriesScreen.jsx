import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
    ActivityIndicator,
    Dimensions,
    PixelRatio,
    SafeAreaView
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories } from '@entities/category/model/slice';
import {
    selectCategories,
    selectCategoriesLoading,
    selectCategoriesError
} from '@entities/category/model/selectors';
import { Color, Padding, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { CategoryCard } from '@entities/category/ui/CategoryCard';
import { BackButton } from "@shared/ui/Button/BackButton";

// Адаптация размеров
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const CategoriesScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const categories = useSelector(selectCategories);
    const isLoading = useSelector(selectCategoriesLoading);
    const error = useSelector(selectCategoriesError);

    useEffect(() => {
        if (!categories?.length && !isLoading) {
            dispatch(fetchCategories());
        }
    }, [dispatch, categories, isLoading]);

    const handleCategoryPress = (category) => {
        navigation.navigate('ProductsByCategory', {
            categoryId: category.id,
            categoryName: category.name,
            categoryDescription: category.description || 'Описание отсутствует',
        });
    };

    const handleBackPress = () => {
        navigation.goBack();
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={Color.colorMediumslateblue} />
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Ошибка загрузки категорий</Text>
                </View>
            );
        }

        const chunkedCategories = [];
        for (let i = 0; i < categories.length; i += 3) {
            chunkedCategories.push(categories.slice(i, i + 3));
        }

        return (
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {chunkedCategories.map((row, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={styles.categoryRow}>
                        {row.map((category) => (
                            <CategoryCard
                                key={category.id}
                                category={category}
                                onPress={() => handleCategoryPress(category)}
                            />
                        ))}
                        {row.length < 3 && Array(3 - row.length).fill().map((_, i) => (
                            <View key={`placeholder-${i}`} style={styles.placeholderCard} />
                        ))}
                    </View>
                ))}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="transparent" barStyle="dark-content" />

            <View style={styles.header}>
                <BackButton onPress={handleBackPress} style={styles.backButton} />
                <Text style={styles.headerTitle}>Категории</Text>
            </View>

            {renderContent()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    header: {
        height: normalize(100),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: normalize(16),
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: normalize(16),
        top: normalize(40),
    },
    headerTitle: {
        fontSize: normalize(18),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        color: Color.dark,
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: normalize(16),
        paddingBottom: normalize(16),
        paddingTop: normalize(10),
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: normalize(16),
    },
    placeholderCard: {
        width: '32.43%',
        aspectRatio: 0.75,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: normalize(Padding.p_3xs),
    },
    errorText: {
        fontSize: normalize(FontSize.size_md),
        color: 'red',
        textAlign: 'center',
        fontFamily: FontFamily.sFProText,
    },
});