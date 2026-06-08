import React, { useMemo } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { SearchIcon } from '@shared/ui/Icon/SearchIcon';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const SearchBar = ({ searchQuery, setSearchQuery, handleSearch }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
                <SearchIcon width={20} height={20} color={colors.textTertiary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Поиск по имени, email, району..."
                    placeholderTextColor={colors.textTertiary}
                    keyboardAppearance={colors.keyboardAppearance}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
                {searchQuery ? (
                    <TouchableOpacity
                        onPress={() => {
                            setSearchQuery('');
                            handleSearch();
                        }}
                        style={styles.clearButton}
                    >
                        <Text style={styles.clearButtonText}>✕</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                <Text style={styles.searchButtonText}>Найти</Text>
            </TouchableOpacity>
        </View>
    );
};

const createStyles = (colors) => StyleSheet.create({
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(8),
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.inputBackground,
        borderRadius: Border.radius.medium,
        paddingHorizontal: normalize(10),
        marginRight: normalize(8),
        borderWidth: 1,
        borderColor: colors.inputBorder,
    },
    searchInput: {
        flex: 1,
        height: normalize(40),
        paddingHorizontal: normalize(8),
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: colors.textPrimary,
    },
    clearButton: {
        padding: normalize(5),
    },
    clearButtonText: {
        fontSize: normalizeFont(14),
        color: colors.textTertiary,
    },
    searchButton: {
        backgroundColor: colors.primary,
        borderRadius: Border.radius.medium,
        paddingHorizontal: normalize(12),
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchButtonText: {
        color: colors.textInverse,
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
});

export default SearchBar;