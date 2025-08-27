import React, { useState, useEffect } from 'react';
import { Alert, SafeAreaView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Color } from '@app/styles/GlobalStyles';
import IconUser from '@shared/ui/Icon/Profile/IconPersona';

import { useAuth } from "@entities/auth/hooks/useAuth";
import { useAdmin } from "@entities/admin";
import { useProcessingRoles } from "@entities/admin/hooks/useProcessingRoles";
import { AdminHeader } from "@widgets/admin/AdminHeader";
import { SearchBar } from "@features/userManagement/userSearch/ui/SearchBar";
import { RoleFilter } from "@features/userManagement/userFilter/ui/RoleFilter";
import { UserList } from "@widgets/userList/ui/UserList";
import { EmptyUserList } from "@widgets/userList/ui/EmptyUserList";
import { ChangeRoleModal } from "@features/userManagement/userRole/ui/ChangeRoleModal";
import { ProcessingRoleAssignment } from "@entities/admin/ui/ProcessingRoleAssignment/ProcessingRoleAssignment";
import {UserStats} from "@widgets/userManagement/UserStats";
import {AddUserButton} from "@widgets/userActions";

export const UsersManagementScreen = () => {
    const navigation = useNavigation();
    const { currentUser, hasPermission } = useAuth();
    const {
        users: { items, total, page, pages, limit, isLoading, error },
        loadAllUsers,
        updateUserRole,
        deleteStaff,
        deleteAdmin,
        operation: { success, error: operationError, isLoading: operationLoading },
        clearOperation,
        clearUsers
    } = useAdmin();

    // Хук для управления должностями
    const { assignRole, loading: processingRoleLoading } = useProcessingRoles();

    // Состояние для поиска и фильтрации
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Состояние для пагинации
    const [currentPage, setCurrentPage] = useState(1);

    // Состояние для модальных окон
    const [roleModalVisible, setRoleModalVisible] = useState(false);
    const [processingRoleModalVisible, setProcessingRoleModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Загрузка пользователей при монтировании компонента
    useEffect(() => {
        loadUsers();
    }, [currentPage, selectedRole, searchQuery]);

    // Проверяем права доступа
    useEffect(() => {
        // Проверка, является ли пользователь админом или имеет ли права на управление пользователями
        const isAdmin = currentUser?.role === 'ADMIN';
        const hasManageUsersPermission = hasPermission('manage:users');

        // Разрешаем доступ, если пользователь админ ИЛИ имеет права на управление пользователями
        const hasAccess = isAdmin || hasManageUsersPermission;

        if (!hasAccess) {
            Alert.alert(
                'Доступ запрещен',
                'У вас нет прав для доступа к этому разделу',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        }
    }, [currentUser, hasPermission, navigation]);

    // Обработка сообщений об успехе или ошибке операции
    useEffect(() => {
        if (success) {
            Alert.alert('Успешно', success);
            loadUsers();
            clearOperation();
        }

        if (operationError) {
            Alert.alert('Ошибка', operationError);
            clearOperation();
        }
    }, [success, operationError]);

    // Функция для загрузки пользователей
    const loadUsers = () => {
        loadAllUsers({
            page: currentPage,
            limit,
            search: searchQuery,
            role: selectedRole || undefined
        });
    };

    // Обработчик обновления списка при Pull-to-refresh
    const handleRefresh = () => {
        setRefreshing(true);
        setCurrentPage(1);
        clearUsers(); // Очищаем накопленные данные пагинации
        loadAllUsers({
            page: 1,
            limit,
            search: searchQuery,
            role: selectedRole || undefined
        }).finally(() => {
            setRefreshing(false);
        });
    };

    // Обработчик загрузки следующей страницы
    const handleLoadMore = () => {
        if (page < pages && !isLoading) {
            setCurrentPage(prevPage => prevPage + 1);
        }
    };

    // Обработчик поиска
    const handleSearch = () => {
        setCurrentPage(1);
        clearUsers(); // Очищаем накопленные данные пагинации
        loadAllUsers({
            page: 1,
            limit,
            search: searchQuery,
            role: selectedRole || undefined
        });
    };

    // Обработчик изменения роли
    const handleRoleChange = (user) => {
        setSelectedUser(user);
        setRoleModalVisible(true);
    };

    // Обработчик отправки формы изменения роли
    const handleRoleSubmit = (userId, newRole, userData) => {
        updateUserRole(userId, { newRole, ...userData })
            .then(() => {
                setRoleModalVisible(false);
                setSelectedUser(null);
            });
    };

    // Обработчик назначения должности обработки
    const handleProcessingRoleChange = (user) => {
        setSelectedUser(user);
        setProcessingRoleModalVisible(true);
    };

    // Обработчик назначения должности обработки
    const handleProcessingRoleAssign = async (employeeId, processingRole) => {
        try {
            const result = await assignRole(employeeId, processingRole);
            if (result.success) {
                Alert.alert('Успех', 'Должность успешно назначена');
                setProcessingRoleModalVisible(false);
                setSelectedUser(null);
                // Принудительно перезагружаем список пользователей для немедленного отображения изменений
                clearUsers();
                loadUsers();
            } else {
                Alert.alert('Ошибка', result.error || 'Не удалось назначить должность');
            }
        } catch (error) {
            console.error('Ошибка назначения должности:', error);
            Alert.alert('Ошибка', 'Произошла ошибка при назначении должности');
        }
    };

    // Обработчик редактирования пользователя
    const handleEditUser = (user) => {
        // Переход на экран редактирования пользователя
        navigation.navigate('UserEdit', { userId: user.id });
    };

    // Обработчик удаления пользователя
    const handleDeleteUser = (user) => {
        Alert.alert(
            'Подтверждение',
            `Вы уверены, что хотите удалить пользователя "${user.email}"?`,
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: () => {
                        if (user.role === 'ADMIN') {
                            deleteAdmin(user.id);
                        } else {
                            deleteStaff(user.id);
                        }
                    }
                }
            ]
        );
    };

    // Компонент пустого списка для передачи в UserList
    const renderEmptyList = () => (
        <EmptyUserList
            searchQuery={searchQuery}
            selectedRole={selectedRole}
            onRefresh={handleRefresh}
        />
    );

    return (
        <SafeAreaView style={styles.container}>
            <AdminHeader
                title="Управление пользователями"
                icon={<IconUser width={24} height={24} color={Color.blue2} />}
                onBackPress={() => navigation.goBack()}
            />

            <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleSearch={handleSearch}
            />

            <RoleFilter
                selectedRole={selectedRole}
                onRoleChange={(role) => {
                    setSelectedRole(role);
                    setCurrentPage(1);
                    clearUsers(); // Очищаем накопленные данные пагинации
                }}
            />

            <UserStats
                total={total}
                page={page}
                pages={pages}
            />

            <UserList
                items={items}
                isLoading={isLoading}
                error={error}
                refreshing={refreshing}
                handleRefresh={handleRefresh}
                handleLoadMore={handleLoadMore}
                renderEmptyList={renderEmptyList}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
                onRoleChange={handleRoleChange}
                onProcessingRoleChange={handleProcessingRoleChange}
                currentUser={currentUser}
            />

            <AddUserButton
                onPress={() => navigation.navigate('UserAdd')}
            />

            <ChangeRoleModal
                visible={roleModalVisible}
                user={selectedUser}
                onClose={() => {
                    setRoleModalVisible(false);
                    setSelectedUser(null);
                }}
                onSubmit={handleRoleSubmit}
            />

            <ProcessingRoleAssignment
                employee={selectedUser}
                onAssign={handleProcessingRoleAssign}
                onCancel={() => {
                    setProcessingRoleModalVisible(false);
                    setSelectedUser(null);
                }}
                visible={processingRoleModalVisible}
                loading={processingRoleLoading}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
});

export default UsersManagementScreen;