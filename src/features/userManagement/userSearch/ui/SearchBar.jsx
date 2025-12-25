import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { SearchIcon } from '@shared/ui/Icon/SearchIcon';

export const SearchBar = ({ searchQuery, setSearchQuery, handleSearch }) => {
    return (
        <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
                <SearchIcon width={20} height={20} color={Color.grey7D7D7D} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Поиск по имени, email..."
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

const styles = StyleSheet.create({
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(8),
        backgroundColor: Color.colorLightMode,
        borderBottomWidth: 1,
        borderBottomColor: Color.border,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Color.colorLightMode,
        borderRadius: Border.radius.medium,
        paddingHorizontal: normalize(10),
        marginRight: normalize(8),
    },
    searchInput: {
        flex: 1,
        height: normalize(40),
        paddingHorizontal: normalize(8),
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textPrimary,
    },
    clearButton: {
        padding: normalize(5),
    },
    clearButtonText: {
        fontSize: normalizeFont(14),
        color: Color.grey7D7D7D,
    },
    searchButton: {
        backgroundColor: Color.blue2,
        borderRadius: Border.radius.medium,
        paddingHorizontal: normalize(12),
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchButtonText: {
        color: Color.colorLightMode,
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
});

export default SearchBar;