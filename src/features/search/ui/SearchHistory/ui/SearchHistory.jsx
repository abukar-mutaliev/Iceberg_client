import React, {useCallback} from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, PixelRatio, Keyboard, Platform } from 'react-native';
import { Clock, X } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { removeSearchQuery, selectSearchHistoryItems } from "@entities/search";

// Настройка масштабирования для адаптивности
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

export const SearchHistory = ({ onItemPress, searchInputRef }) => {
    const dispatch = useDispatch();
    const historyItems = useSelector(selectSearchHistoryItems);

    const handleItemPress = (item) => {
        if (onItemPress) {
            onItemPress(item);
        }
    };

    const handleRemoveItem = useCallback((item, event) => {
        event.stopPropagation();
        dispatch(removeSearchQuery(item));

        setTimeout(() => {
            searchInputRef.current?.focus();
        }, 0);
    }, [dispatch, searchInputRef]);

    if (historyItems.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>История поиска пуста</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always" // Важно для сохранения клавиатуры
        >
            {historyItems.map((item, index) => (
                <View
                    key={index}
                    style={styles.historyItem}
                >
                    <TouchableOpacity
                        style={styles.historyItemLeft}
                        onPress={() => handleItemPress(item)}
                        activeOpacity={0.7}
                    >
                        <Clock size={normalize(18)} style={styles.historyIcon} />
                        <Text style={styles.historyText}>{item}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={(event) => handleRemoveItem(item, event)}
                        hitSlop={{
                            top: normalize(15),
                            bottom: normalize(15),
                            left: normalize(15),
                            right: normalize(15)
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={styles.removeIconContainer}>
                            <X size={normalize(18)} color={Color.blue2} />
                        </View>
                    </TouchableOpacity>
                </View>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: normalize(15),
        paddingHorizontal: normalize(30),

    },
    emptyContainer: {
        marginTop: normalize(30),
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(FontSize.size_md),
        color: Color.gray,
        textAlign: 'center',
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: normalize(5),
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    historyItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        color: "#86868a",

    },
    historyIcon: {
        marginRight: normalize(16),
        color: "#86868a",
    },
    historyText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(FontSize.size_md),
        color: "#86868a",
    },
    removeButton: {
        padding: normalize(10),
    },
    removeIconContainer: {
        width: normalize(24),
        height: normalize(24),
        justifyContent: 'center',
        alignItems: 'center',
    },
});