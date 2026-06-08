import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { USER_ROLES } from '@entities/user/model/constants';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const RoleFilter = ({ selectedRole, onRoleChange }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const roles = [
        { value: '', label: 'Все' },
        { value: USER_ROLES.ADMIN, label: 'Админы' },
        { value: USER_ROLES.CLIENT, label: 'Клиенты' },
        { value: USER_ROLES.EMPLOYEE, label: 'Сотрудники' },
        { value: USER_ROLES.SUPPLIER, label: 'Поставщики' },
        { value: USER_ROLES.DRIVER, label: 'Водители' }
    ];

    return (
        <View style={styles.roleFilterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {roles.map(role => (
                    <TouchableOpacity
                        key={role.value}
                        style={[
                            styles.roleFilterItem,
                            selectedRole === role.value && styles.roleFilterItemSelected
                        ]}
                        onPress={() => onRoleChange(role.value)}
                    >
                        <Text style={[
                            styles.roleFilterText,
                            selectedRole === role.value && styles.roleFilterTextSelected
                        ]}>
                            {role.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const createStyles = (colors) => StyleSheet.create({
    roleFilterContainer: {
        paddingVertical: normalize(8),
        paddingHorizontal: normalize(16),
        backgroundColor: colors.surface,
    },
    roleFilterItem: {
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(6),
        marginRight: normalize(8),
        borderRadius: Border.radius.medium,
        backgroundColor: colors.cardBackground,
        borderWidth: 1,
        borderColor: colors.border,
    },
    roleFilterItemSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    roleFilterText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: colors.textPrimary,
    },
    roleFilterTextSelected: {
        color: colors.textInverse,
        fontWeight: '500',
    },
});

export default RoleFilter;