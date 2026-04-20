import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { BackButton } from "@shared/ui/Button/BackButton";
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const ProfileHeader = ({ title, onGoBack, onSave, isSaving = false }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.header}>
            <View style={styles.sideContainerLeft}>
                {onGoBack ? (
                    <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
                        <BackButton />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.placeholder} />
                )}
            </View>
            <View style={styles.titleContainer}>
                <Text style={styles.title} numberOfLines={1}>
                    {title}
                </Text>
            </View>
            <View style={styles.sideContainerRight}>
                {onSave ? (
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={onSave}
                        disabled={isSaving}
                    >
                        <Ionicons
                            name="checkmark-sharp"
                            size={normalize(28)}
                            color={isSaving ? colors.textTertiary : colors.primary}
                        />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.placeholder} />
                )}
            </View>
        </View>
    );
};

const createStyles = (colors) => StyleSheet.create({
    header: {
        height: normalize(76),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: normalize(10),
        backgroundColor: colors.background,
        borderBottomColor: colors.borderSubtle,
        paddingTop: normalize(25),
    },
    sideContainerLeft: {
        width: normalize(72),
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    sideContainerRight: {
        width: normalize(72),
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    backButton: {
        padding: normalize(4),
    },
    saveButton: {
        padding: normalize(4),
        paddingRight: normalize(6),
        alignItems: 'center',
    },
    placeholder: {
        width: normalize(32),
    },
    titleContainer: {
        flex: 1,
        paddingHorizontal: normalize(6),
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: normalizeFont(18),
        fontWeight: '500',
        color: colors.textPrimary,
        textAlign: 'center',
    },
    saveText: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: colors.primary,
    },
    saveTextDisabled: {
        color: colors.textTertiary,
    },
});

export default ProfileHeader;
