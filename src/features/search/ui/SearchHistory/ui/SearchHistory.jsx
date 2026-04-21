import React, {useCallback, useMemo} from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, PixelRatio } from 'react-native';
import { Clock, X } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { removeSearchQuery, selectSearchHistoryItems } from "@entities/search";

const { width: SCREEN_WIDTH } = Dimensions.get('window');
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
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

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
            keyboardShouldPersistTaps="always"
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
                        <Clock size={normalize(18)} color={colors.textSecondary} style={styles.historyIcon} />
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
                            <X size={normalize(18)} color={colors.primary} />
                        </View>
                    </TouchableOpacity>
                </View>
            ))}
        </ScrollView>
    );
};

const createStyles = (colors) => StyleSheet.create({
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
        color: colors.textTertiary,
        textAlign: 'center',
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: normalize(5),
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    historyItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    historyIcon: {
        marginRight: normalize(16),
    },
    historyText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(FontSize.size_md),
        color: colors.textSecondary,
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
