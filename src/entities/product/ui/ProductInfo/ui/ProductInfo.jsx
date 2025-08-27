import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import {Color as colors, FontFamily, FontSize} from '@app/styles/GlobalStyles';

export const ProductInfo = ({ type, name, category }) => {
    const { colors } = useTheme();

    // Формируем строку категорий для отображения
    const categoryText = React.useMemo(() => {
        if (!category) return null;
        
        if (Array.isArray(category)) {
            if (category.length === 0) return null;
            
            const categoryNames = category.map(cat => {
                if (typeof cat === 'string') return cat;
                if (typeof cat === 'object' && cat.name) return cat.name;
                if (typeof cat === 'number') return `Категория ${cat}`;
                return null;
            }).filter(Boolean);
            
            return categoryNames.length > 0 ? categoryNames.join(', ') : null;
        }
        
        if (typeof category === 'string') return category;
        if (typeof category === 'object' && category.name) return category.name;
        if (typeof category === 'number') return `Категория ${category}`;
        
        return null;
    }, [category]);

    return (
        <View style={styles.container}>
            {categoryText && (
                <View style={styles.categoryContainer}>
                    <Text style={styles.categoryText}>
                        {categoryText}
                    </Text>
                </View>
            )}
            <View style={styles.typeContainer}>
                <Text style={styles.typeText}>
                    {type}
                </Text>
            </View>
            <View style={styles.titleContainer}>
                <Text style={styles.titleText}>
                    {name}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
        marginTop: -35
    },
    categoryContainer: {
        marginBottom: 6,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: "500",
        fontFamily: FontFamily.sFProText,
        color: "#919eee",
        textAlign: "left"
    },
    typeContainer: {
        marginBottom: 4,
    },
    typeText: {
        fontSize: 20,
        fontWeight: "600",
        fontFamily: FontFamily.sFProText,
        textAlign: "left"
    },
    titleContainer: {
        marginBottom: 10,
    },
    titleText: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xl,
        fontWeight: '600',
        color: colors.blue2,
    },
});
