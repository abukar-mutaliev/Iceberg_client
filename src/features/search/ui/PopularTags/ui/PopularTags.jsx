import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, PixelRatio } from 'react-native';
import { Color, FontFamily, FontSize, Border } from '@/app/styles/GlobalStyles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const normalizeFont = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const PopularTags = ({ tags, onTagPress }) => {
    const getTagWidth = (text) => {
        const charWidth = normalize(8);
        const padding = normalize(32);
        const calculatedWidth = text.length * charWidth + padding;

        const minWidth = normalize(66);
        const maxWidth = normalize(230);

        return Math.min(Math.max(calculatedWidth, minWidth), maxWidth);
    };

    if (!tags || tags.length === 0) {
        return null;
    }

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
        >
            <View style={styles.titleContainer}>
                <Text style={styles.title}>Популярные товары</Text>
            </View>
            <View style={styles.container}>
                <View style={styles.tagsWrapper}>
                    {tags.map((tag, index) => {
                        const tagWidth = getTagWidth(tag);

                        return (
                            <TouchableOpacity
                                key={index}
                                style={[styles.tagBase, { width: tagWidth }]}
                                onPress={() => onTagPress(tag)}
                            >
                                <View style={styles.tagBackground} />
                                <Text style={styles.tagText} numberOfLines={1} ellipsizeMode="tail">
                                    {tag}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: normalize(40)
    },
    container: {
        marginTop: normalize(10)
    },
    titleContainer: {
        marginTop: normalize(20),
        marginLeft: normalize(16),
        marginBottom: normalize(10)
    },
    title: {
        fontSize: normalizeFont(FontSize.size_md),
        textAlign: "left",
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        fontWeight: "600"
    },
    tagsWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: normalize(16),
    },
    tagBackground: {
        borderRadius: normalize(Border.br_base),
        backgroundColor: Color.colorBlue,
        right: "0%",
        width: "100%",
        bottom: "0%",
        left: "0%",
        top: "0%",
        height: "100%",
        position: "absolute"
    },
    tagBase: {
        height: normalize(40),
        marginVertical: normalize(5),
        marginHorizontal: normalize(5),
        position: "relative",
    },
    tagText: {
        color: Color.colorLightMode,
        fontSize: normalizeFont(FontSize.size_md),
        fontWeight: "500",
        textAlign: "center",
        fontFamily: FontFamily.sFProText,
        position: "absolute",
        top: "50%",
        marginTop: normalize(-10),
        left: normalize(10),
        right: normalize(10),
    }
});