import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { ProfileAvatar } from '@entities/profile/ui/ProfileAvatar';
import { getImageUrl } from '@shared/api/api';
import { PROCESSING_ROLE_LABELS } from '@entities/admin/lib/constants';

export const WarehouseEmployeesList = ({ warehouseId, employees, loading, error }) => {
    const navigation = useNavigation();
    
    // Логирование для отладки
    useEffect(() => {
        if (__DEV__ && employees && employees.length > 0) {
            console.log('📋 WarehouseEmployeesList received:', {
                warehouseId,
                employeesCount: employees.length,
                employees: employees.map(emp => ({
                    id: emp.id,
                    name: emp.name,
                    hasUser: !!emp.user,
                    userId: emp.user?.id,
                    userAvatar: emp.user?.avatar ? emp.user.avatar.substring(0, 80) + '...' : null,
                    userEmail: emp.user?.email
                }))
            });
        }
    }, [warehouseId, employees]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Color.blue2} />
                <Text style={styles.loadingText}>Загрузка сотрудников...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Сотрудники склада</Text>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            </View>
        );
    }

    if (!employees || employees.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Сотрудники склада</Text>
                <Text style={styles.hint}>
                    На этом складе пока нет сотрудников
                </Text>
            </View>
        );
    }

    const handleEmployeePress = (employee) => {
        if (employee?.user?.id) {
            navigation.navigate('UserPublicProfile', {
                userId: employee.user.id
            });
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Сотрудники склада</Text>
            <View style={styles.employeesContainer}>
                {employees.map((employee) => {
                    // Получаем имя сотрудника (как в UserPublicProfileScreen)
                    const userName = employee.name || employee.user?.email || 'Сотрудник';
                    
                    // Получаем телефон (как в UserPublicProfileScreen)
                    const userPhone = employee.phone || employee.user?.phone || null;
                    
                    // Получаем аватар сотрудника
                    // Важно: аватар уже приходит с сервера как полный URL
                    // ProfileAvatar ожидает profile с полем avatar или user.avatar
                    const avatarRaw = employee.user?.avatar || employee.user?.image || null;
                    
                    // Проверяем, что аватар не является изображением склада (защита от ошибок)
                    const isWarehouseImage = avatarRaw && (
                        avatarRaw.includes('/warehouses/') || 
                        avatarRaw.includes('warehouse') && !avatarRaw.includes('avatar') && !avatarRaw.includes('avatars')
                    );
                    
                    // Если аватар оказался изображением склада, сбрасываем его
                    const safeAvatarRaw = isWarehouseImage ? null : avatarRaw;
                    
                    // Логирование для отладки
                    if (__DEV__ && employee.id) {
                        console.log(`👤 Employee ${employee.id} avatar data:`, {
                            employeeId: employee.id,
                            employeeName: userName,
                            avatarRaw,
                            safeAvatarRaw,
                            isWarehouseImage,
                            hasUser: !!employee.user,
                            userId: employee.user?.id,
                            userEmail: employee.user?.email,
                            userAvatarPath: employee.user?.avatar
                        });
                    }
                    
                    // Получаем должность (как в UserPublicProfileScreen)
                    const processingRole = employee.processingRole || employee.user?.employee?.processingRole || employee.user?.profile?.processingRole;
                    const position = processingRole && PROCESSING_ROLE_LABELS[processingRole]
                        ? PROCESSING_ROLE_LABELS[processingRole]
                        : processingRole || employee.position || 'Сотрудник';

                    return (
                        <TouchableOpacity
                            key={`employee-${employee.id}`}
                            style={styles.employeeItem}
                            onPress={() => handleEmployeePress(employee)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.employeeAvatarContainer}>
                                <ProfileAvatar
                                    profile={{ 
                                        avatar: safeAvatarRaw, // Используем безопасный аватар (не изображение склада)
                                        user: employee.user ? {
                                            id: employee.user.id,
                                            email: employee.user.email,
                                            avatar: safeAvatarRaw // Используем безопасный аватар
                                        } : null
                                    }}
                                    size={48}
                                    useCurrentUserFallback={false}
                                />
                            </View>
                            <View style={styles.employeeInfo}>
                                <Text style={styles.employeeName}>{userName}</Text>
                                <Text style={styles.employeePosition}>{position}</Text>
                                {userPhone && (
                                    <Text style={styles.employeePhone}>{userPhone}</Text>
                                )}
                            </View>
                            <Icon name="chevron-right" size={24} color={Color.blue2} />
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: normalize(16),
        marginBottom: normalize(16),
    },
    title: {
        fontSize: normalizeFont(18),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.dark,
        marginBottom: normalize(12),
    },
    hint: {
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.sFProText,
        color: Color.gray,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: normalize(16),
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: normalize(20),
    },
    loadingText: {
        marginLeft: normalize(8),
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.sFProText,
        color: Color.gray,
    },
    errorContainer: {
        paddingVertical: normalize(16),
    },
    errorText: {
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.sFProText,
        color: Color.error || '#ff0000',
        textAlign: 'center',
    },
    employeesContainer: {
        gap: normalize(12),
    },
    employeeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: normalize(16),
        borderWidth: 1,
        borderColor: '#E8EAED',
    },
    employeeAvatarContainer: {
        marginRight: normalize(12),
    },
    employeeInfo: {
        flex: 1,
    },
    employeeName: {
        fontSize: normalizeFont(16),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.dark,
        marginBottom: normalize(4),
    },
    employeePosition: {
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.sFProText,
        color: Color.blue2,
        marginBottom: normalize(2),
    },
    employeePhone: {
        fontSize: normalizeFont(13),
        fontFamily: FontFamily.sFProText,
        color: '#666',
    },
});
