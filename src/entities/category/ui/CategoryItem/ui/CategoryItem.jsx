import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Color } from '@app/styles/GlobalStyles';

export const CategoryItem = ({ category, onPress }) => {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <Text style={styles.name}>{category.name}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    name: {
        fontSize: 16,
        color: Color.blue2,
    },
});

