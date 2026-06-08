import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BackButton } from '@shared/ui/Button/BackButton';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import {ActionButton} from "@shared/ui/Admin/AdminProduct";
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const AdminProductHeader = ({
                                       title,
                                       onBack,
                                       canEdit = false,
                                       canDelete = false,
                                       isEditMode = false,
                                       isSaving = false,
                                       isDeleting = false,
                                       onEdit,
                                       onSave,
                                       onCancel,
                                       onDelete
                                   }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    return (
        <View style={styles.header}>
            <BackButton onPress={onBack} style={styles.backButton} />

            <Text style={styles.headerTitle} numberOfLines={1}>
                {title || 'Управление продуктом'}
            </Text>

            <View style={styles.headerActions}>
                {canEdit && (
                    <>
                        {isEditMode ? (
                            <>
                                <ActionButton
                                    type="save"
                                    onPress={onSave}
                                    disabled={isSaving}
                                    loading={isSaving}
                                />
                                <ActionButton
                                    type="cancel"
                                    onPress={onCancel}
                                    disabled={isSaving}
                                />
                            </>
                        ) : (
                            <ActionButton
                                type="edit"
                                onPress={onEdit}
                            />
                        )}
                    </>
                )}
                {canDelete && !isEditMode && (
                    <ActionButton
                        type="delete"
                        onPress={onDelete}
                        loading={isDeleting}
                        disabled={isDeleting || isSaving}
                    />
                )}
            </View>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(12),
        borderBottomWidth: 0.5,
        borderBottomColor: isDark ? colors.border : Color.border,
        backgroundColor: isDark ? colors.surface : Color.colorLightMode,
        minHeight: normalize(60),
    },
    backButton: {
        marginRight: normalize(8),
    },
    headerTitle: {
        flex: 1,
        fontSize: normalizeFont(18),
        fontWeight: '600',
        color: isDark ? colors.textPrimary : Color.dark,
        fontFamily: FontFamily.sFProDisplay,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(8),
    },
});