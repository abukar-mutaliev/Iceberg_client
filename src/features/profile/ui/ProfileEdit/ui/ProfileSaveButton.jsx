import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const ProfileSaveButton = ({ onPress, isSaving }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={[styles.saveButtonContainer, { marginHorizontal: normalize(40), marginTop: normalize(20) }]}>
            <TouchableOpacity
                style={[
                    styles.saveButton,
                    { height: normalize(50) },
                    isSaving && styles.saveButtonDisabled,
                ]}
                onPress={onPress}
                disabled={isSaving}
            >
                <Text style={[styles.saveButtonText, { fontSize: normalizeFont(16) }]}>
                    {isSaving ? 'Сохранение...' : 'Готово'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const createStyles = (colors) => StyleSheet.create({
    saveButtonContainer: {
        alignItems: 'center',
        marginHorizontal: 40,
        marginTop: 20,
    },
    saveButton: {
        backgroundColor: colors.primary,
        width: '75%',
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: colors.menuItemActiveText,
        fontSize: 16,
        fontWeight: '600',
    },
});
