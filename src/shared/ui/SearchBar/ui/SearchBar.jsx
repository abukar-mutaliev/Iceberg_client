import React, { useMemo } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { SearchIcon } from '@shared/ui/Icon/SearchIcon';
import CloseIcon from '@shared/ui/Icon/Profile/CloseIcon';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const SearchBar = ({ 
    placeholder = "Поиск...",
    value = "",
    onChangeText,
    onClear,
    onSubmitEditing,
    showSearchButton = false,
    onSearchPress,
    containerStyle,
    inputStyle
}) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const handleClear = () => {
        onChangeText && onChangeText('');
        onClear && onClear();
    };

    const handleSubmit = () => {
        onSubmitEditing && onSubmitEditing();
        onSearchPress && onSearchPress();
    };

    return (
        <View style={[styles.searchContainer, containerStyle]}>
            <View style={styles.searchInputContainer}>
                <SearchIcon width={20} height={20} color={colors.textTertiary} />
                <TextInput
                    style={[styles.searchInput, inputStyle]}
                    placeholder={placeholder}
                    value={value}
                    onChangeText={onChangeText}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="search"
                    placeholderTextColor={colors.textTertiary}
                    keyboardAppearance={colors.keyboardAppearance}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {value ? (
                    <TouchableOpacity
                        onPress={handleClear}
                        style={styles.clearButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <CloseIcon width={16} height={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                ) : null}
            </View>
            {showSearchButton && (
                <TouchableOpacity 
                    style={styles.searchButton} 
                    onPress={handleSubmit}
                >
                    <Text style={styles.searchButtonText}>Найти</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const createStyles = (colors) => StyleSheet.create({
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(12),
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.inputBackground,
        borderRadius: Border.radius.medium,
        paddingHorizontal: normalize(12),
        marginRight: normalize(8),
        height: normalize(44),
    },
    searchInput: {
        flex: 1,
        paddingHorizontal: normalize(8),
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: colors.textPrimary,
        height: '100%',
    },
    clearButton: {
        padding: normalize(4),
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchButton: {
        backgroundColor: colors.primary,
        borderRadius: Border.radius.medium,
        paddingHorizontal: normalize(16),
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: normalize(60),
    },
    searchButtonText: {
        color: colors.textInverse,
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
    },
});

export default SearchBar; 