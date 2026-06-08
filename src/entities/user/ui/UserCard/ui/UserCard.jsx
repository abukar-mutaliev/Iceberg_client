import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import IconAdmin from '@shared/ui/Icon/IconAdmin';
import IconUser from '@shared/ui/Icon/Profile/IconPersona';
import IconEdit from '@shared/ui/Icon/Profile/IconEdit';
import IconDelete from '@shared/ui/Icon/Profile/IconDelete';
import IconSettings from '@shared/ui/Icon/Profile/IconSettings';
import { USER_ROLES_DISPLAY, USER_CARD_COLORS } from '@entities/user/model/constants';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

// Пытаемся импортировать константы должностей с фолбэком
let PROCESSING_ROLE_LABELS = {};
try {
    const { PROCESSING_ROLE_LABELS: importedLabels } = require('@entities/admin/lib/constants');
    PROCESSING_ROLE_LABELS = importedLabels || {};
} catch (error) {
    console.warn('Failed to import PROCESSING_ROLE_LABELS:', error);
    PROCESSING_ROLE_LABELS = {
        'PICKER': 'Сборщик',
        'PACKER': 'Упаковщик',
        'QUALITY_CHECKER': 'Контролер качества',
        'COURIER': 'Курьер',
        'SUPERVISOR': 'Начальник смены'
    };
}

export const UserCard = ({ user, onEdit, onDelete, onRoleChange, onProcessingRoleChange, currentUser }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const getUserName = () => {
        if (!user.profile) return 'Неизвестный пользователь';

        switch (user.role) {
            case 'ADMIN':
                return user.profile.name || 'Администратор';
            case 'CLIENT':
                return user.profile.name || 'Клиент';
            case 'EMPLOYEE':
                return user.profile.name || 'Сотрудник';
            case 'SUPPLIER':
                return user.profile.companyName || 'Поставщик';
            case 'DRIVER':
                return user.profile.name || 'Водитель';
            default:
                return 'Неизвестный пользователь';
        }
    };

    // Получаем дополнительную информацию в зависимости от роли
    const getUserInfo = () => {
        if (!user.profile) return '';

        switch (user.role) {
            case 'ADMIN':
                const isUserSuperAdmin = user.profile?.isSuperAdmin || user.admin?.isSuperAdmin || user.isSuperAdmin;
                return isUserSuperAdmin ? 'Супер-администратор' : 'Администратор';
            case 'CLIENT':
                return user.profile.district?.name || 'Район не указан';
            case 'EMPLOYEE':
                const position = user.profile.position || 'Должность не указана';
                let processingRoleText = 'Должность обработки не назначена';
                
                if (user.profile.processingRole && PROCESSING_ROLE_LABELS[user.profile.processingRole]) {
                    processingRoleText = PROCESSING_ROLE_LABELS[user.profile.processingRole];
                } else if (user.profile.processingRole) {
                    processingRoleText = user.profile.processingRole; // fallback to raw value
                }
                
                return `${position} • ${processingRoleText}`;
            case 'SUPPLIER':
                return user.profile.contactPerson || '';
            case 'DRIVER':
                return user.profile.districts?.map(d => d.name).join(', ') || 'Районы не назначены';
            default:
                return '';
        }
    };

    // Получаем цвет карточки в зависимости от роли
    const getCardColor = () => {
        const roleColor = USER_CARD_COLORS[user.role] || colors.primary;
        return isDark
            ? { borderLeftColor: roleColor }
            : { backgroundColor: roleColor };
    };

    // Получаем отображаемое название роли на русском
    const getRoleDisplay = () => {
        return USER_ROLES_DISPLAY[user.role] || user.role;
    };

    // Проверяем, является ли текущий пользователь администратором
    const isAdmin = currentUser?.role === 'ADMIN';
    // Проверяем isSuperAdmin в разных возможных местах структуры данных
    const isSuperAdmin = currentUser?.role === 'ADMIN' && (
        currentUser?.admin?.isSuperAdmin || 
        currentUser?.profile?.isSuperAdmin || 
        currentUser?.isSuperAdmin
    );
    
    // Проверяем, можно ли изменять роль пользователя
    // Разрешаем только суперадминам изменять роли
    const canChangeRole = isSuperAdmin;
    
    // Проверяем, можно ли назначать должности обработки для данного пользователя
    // Разрешаем только суперадминам назначать должности
    const canAssignProcessingRole = isSuperAdmin && user.role === 'EMPLOYEE';
    
    // Проверяем, можно ли удалять пользователя
    // Разрешаем только суперадминам удалять пользователей
    // Также проверяем, что удаляемый пользователь не является суперадмином
    const targetIsSuperAdmin = user.role === 'ADMIN' && (
        user.profile?.isSuperAdmin || 
        user.admin?.isSuperAdmin || 
        user.isSuperAdmin
    );
    const canDeleteUser = isSuperAdmin && !targetIsSuperAdmin;

    return (
        <View style={[styles.userCard, getCardColor()]}>
            <View style={styles.userCardHeader}>
                <View style={styles.userAvatar}>
                    {user.avatar ? (
                        <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                    ) : (
                        <IconUser width={24} height={24} color={colors.primary} />
                    )}
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{getUserName()}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <Text style={styles.userRole}>{getRoleDisplay()}</Text>
                    <Text style={styles.userAdditionalInfo}>{getUserInfo()}</Text>
                </View>
            </View>
            <View style={styles.userCardActions}>
                {/* Добавить экран редактирования пользователя если нужно*/}
                {/*<TouchableOpacity style={styles.actionButton} onPress={() => onEdit(user)}>*/}
                {/*    <IconEdit width={18} height={18} color={colors.primary} />*/}
                {/*    <Text style={styles.actionText}>Изменить</Text>*/}
                {/*</TouchableOpacity>*/}
                
                {/* Кнопка изменения роли - только для суперадминов */}
                {canChangeRole && (
                    <TouchableOpacity style={styles.actionButton} onPress={() => onRoleChange(user)}>
                        <IconAdmin width={18} height={18} color={colors.primary} />
                        <Text style={styles.actionText}>{user.role === 'ADMIN' ? 'Права' : 'Роль'}</Text>
                    </TouchableOpacity>
                )}
                
                {/* Кнопка назначения должности обработки - только для суперадминов и только для сотрудников */}
                {canAssignProcessingRole && onProcessingRoleChange && (
                    <TouchableOpacity style={styles.actionButton} onPress={() => onProcessingRoleChange(user)}>
                        <IconSettings width={18} height={18} color={colors.warning} />
                        <Text style={[styles.actionText, { color: colors.warning }]}>Должность</Text>
                    </TouchableOpacity>
                )}
                
                {/* Кнопка удаления - только для суперадминов */}
                {canDeleteUser && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => onDelete && onDelete(user)}
                    >
                        <IconDelete width={18} height={18} color={colors.error} />
                        <Text style={[styles.actionText, { color: colors.error }]}>Удалить</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    userCard: {
        borderRadius: Border.radius.medium,
        backgroundColor: colors.cardBackground,
        padding: normalize(12),
        borderWidth: 1,
        borderLeftWidth: isDark ? 4 : 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.25 : Shadow.light.shadowOpacity,
        shadowRadius: isDark ? 6 : Shadow.light.shadowRadius,
        elevation: isDark ? 2 : Shadow.light.elevation,
    },
    userCardHeader: {
        flexDirection: 'row',
    },
    userAvatar: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        backgroundColor: colors.surfaceSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: normalize(12),
    },
    avatarImage: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    userEmail: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: colors.textSecondary,
        marginBottom: normalize(4),
    },
    userRole: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: colors.primary,
        fontWeight: '500',
        marginBottom: normalize(2),
    },
    userAdditionalInfo: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: colors.textSecondary,
    },
    userCardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: normalize(12),
        paddingTop: normalize(8),
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(4),
        marginLeft: normalize(8),
    },
    actionText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: colors.primary,
        marginLeft: normalize(4),
    },
});

export default UserCard;