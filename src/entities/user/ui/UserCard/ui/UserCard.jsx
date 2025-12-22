import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import IconAdmin from '@shared/ui/Icon/IconAdmin';
import IconUser from '@shared/ui/Icon/Profile/IconPersona';
import IconEdit from '@shared/ui/Icon/Profile/IconEdit';
import IconDelete from '@shared/ui/Icon/Profile/IconDelete';
import IconSettings from '@shared/ui/Icon/Profile/IconSettings';
import { USER_ROLES_DISPLAY, USER_CARD_COLORS } from '@entities/user/model/constants';

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
        return { backgroundColor: USER_CARD_COLORS[user.role] || Color.colorLightMode };
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
                        <IconUser width={24} height={24} color={Color.blue2} />
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
                {/*    <IconEdit width={18} height={18} color={Color.blue2} />*/}
                {/*    <Text style={styles.actionText}>Изменить</Text>*/}
                {/*</TouchableOpacity>*/}
                
                {/* Кнопка изменения роли - только для суперадминов */}
                {canChangeRole && (
                    <TouchableOpacity style={styles.actionButton} onPress={() => onRoleChange(user)}>
                        <IconAdmin width={18} height={18} color={Color.blue2} />
                        <Text style={styles.actionText}>Роль</Text>
                    </TouchableOpacity>
                )}
                
                {/* Кнопка назначения должности обработки - только для суперадминов и только для сотрудников */}
                {canAssignProcessingRole && onProcessingRoleChange && (
                    <TouchableOpacity style={styles.actionButton} onPress={() => onProcessingRoleChange(user)}>
                        <IconSettings width={18} height={18} color={Color.orange} />
                        <Text style={[styles.actionText, { color: Color.orange }]}>Должность</Text>
                    </TouchableOpacity>
                )}
                
                {/* Кнопка удаления - только для суперадминов */}
                {canDeleteUser && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => onDelete && onDelete(user)}
                    >
                        <IconDelete width={18} height={18} color="red" />
                        <Text style={[styles.actionText, { color: 'red' }]}>Удалить</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    userCard: {
        borderRadius: Border.radius.medium,
        backgroundColor: Color.colorLightMode,
        padding: normalize(12),
        ...Shadow.light,
    },
    userCardHeader: {
        flexDirection: 'row',
    },
    userAvatar: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        backgroundColor: Color.colorLightMode,
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
        color: Color.textPrimary,
    },
    userEmail: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginBottom: normalize(4),
    },
    userRole: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.blue2,
        fontWeight: '500',
        marginBottom: normalize(2),
    },
    userAdditionalInfo: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
    },
    userCardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: normalize(12),
        paddingTop: normalize(8),
        borderTopWidth: 1,
        borderTopColor: Color.border,
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
        color: Color.blue2,
        marginLeft: normalize(4),
    },
});

export default UserCard;