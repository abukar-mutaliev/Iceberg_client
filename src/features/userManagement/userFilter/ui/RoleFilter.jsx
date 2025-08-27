import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { USER_ROLES, USER_ROLES_DISPLAY } from '@entities/user/model/constants';

export const RoleFilter = ({ selectedRole, onRoleChange }) => {
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

const styles = StyleSheet.create({
    roleFilterContainer: {
        paddingVertical: normalize(8),
        paddingHorizontal: normalize(16),
        backgroundColor: Color.colorLightMode,
    },
    roleFilterItem: {
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(6),
        marginRight: normalize(8),
        borderRadius: Border.radius.medium,
        backgroundColor: Color.colorLightMode,
        borderWidth: 1,
        borderColor: Color.border,
    },
    roleFilterItemSelected: {
        backgroundColor: Color.blue2,
        borderColor: Color.blue2,
    },
    roleFilterText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.textPrimary,
    },
    roleFilterTextSelected: {
        color: Color.colorLightMode,
        fontWeight: '500',
    },
});

export default RoleFilter;