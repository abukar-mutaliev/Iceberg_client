import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { normalize, normalizeFont } from '@/shared/lib/normalize';

export const ProfileSaveButton = ({ onPress, isSaving }) => {
    return (
        <View style={[styles.saveButtonContainer, { marginHorizontal: normalize(40), marginTop: normalize(20) }]}>
            <TouchableOpacity
                style={[styles.saveButton, { height: normalize(50) }]}
                onPress={onPress}
                disabled={isSaving}
            >
                <Text style={[styles.saveButtonText, { fontSize: normalizeFont(16) }]}>
                    {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    saveButtonContainer: {
        marginHorizontal: 40,
        marginTop: 20,
    },
    saveButton: {
        backgroundColor: '#007AFF',
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});