import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useProcessingRoles } from '@entities/admin/hooks/useProcessingRoles';
import { ProcessingRoleAssignment } from '@entities/admin/ui/ProcessingRoleAssignment';
import {
  PROCESSING_ROLE_LABELS,
  PROCESSING_ROLE_COLORS,
  PROCESSING_ROLE_ICONS
} from '@entities/admin/lib/constants';
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';

export const ProcessingRolesScreen = () => {
  const { showAlert } = useCustomAlert();
  const {
    employees,
    loading,
    error,
    total,
    page,
    pages,
    filters,
    roleStatistics,
    accessRights,
    loadEmployees,
    assignRole,
    setFilter,
    clearAllFilters,
    clearErrors
  } = useProcessingRoles();

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Загрузка данных при монтировании
  useEffect(() => {
    if (accessRights.canViewProcessingRoles) {
      loadEmployees();
    }
  }, [accessRights.canViewProcessingRoles]);

  // Обработка ошибок
  useEffect(() => {
    if (error) {
      showAlert({
        type: 'error',
        title: 'Ошибка',
        message: error,
        buttons: [
          {
            text: 'OK',
            style: 'primary'
          }
        ]
      });
      clearErrors();
    }
  }, [error, clearErrors, showAlert]);

  // Обработка поиска
  const handleSearch = useCallback((text) => {
    setSearchQuery(text);
    setFilter({ search: text });
  }, [setFilter]);

  // Обработка обновления
  const handleRefresh = useCallback(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Обработка назначения должности
  const handleAssignRole = useCallback(async (employeeId, processingRole) => {
    try {
      const result = await assignRole(employeeId, processingRole);
      if (result.success) {
        showAlert({
          type: 'success',
          title: 'Готово',
          message: 'Должность успешно назначена',
          autoClose: true,
          autoCloseDuration: 2000
        });
        setShowAssignmentModal(false);
        setSelectedEmployee(null);
      } else {
        showAlert({
          type: 'error',
          title: 'Ошибка',
          message: result.error,
          buttons: [
            {
              text: 'OK',
              style: 'primary'
            }
          ]
        });
      }
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Ошибка',
        message: 'Не удалось назначить должность',
        buttons: [
          {
            text: 'OK',
            style: 'primary'
          }
        ]
      });
    }
  }, [assignRole, showAlert]);

  // Открытие модального окна назначения
  const handleOpenAssignment = useCallback((employee) => {
    setSelectedEmployee(employee);
    setShowAssignmentModal(true);
  }, []);

  // Закрытие модального окна
  const handleCloseAssignment = useCallback(() => {
    setShowAssignmentModal(false);
    setSelectedEmployee(null);
  }, []);

  // Рендер статистики
  const renderStatistics = () => (
    <View style={styles.statisticsContainer}>
      <Text style={styles.statisticsTitle}>Статистика по должностям</Text>
      <View style={styles.statisticsGrid}>
        {Object.entries(roleStatistics).map(([role, count]) => (
          <View key={role} style={styles.statisticItem}>
            <Text style={styles.statisticIcon}>
              {role === 'UNASSIGNED' ? '❓' : PROCESSING_ROLE_ICONS[role]}
            </Text>
            <Text style={styles.statisticLabel}>
              {role === 'UNASSIGNED' ? 'Не назначены' : PROCESSING_ROLE_LABELS[role]}
            </Text>
            <Text style={styles.statisticCount}>{count}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  // Рендер сотрудника
  const renderEmployee = ({ item: employee }) => {
    const roleLabel = employee.processingRole 
      ? PROCESSING_ROLE_LABELS[employee.processingRole]
      : 'Не назначена';
    const roleColor = employee.processingRole 
      ? PROCESSING_ROLE_COLORS[employee.processingRole]
      : '#6c757d';
    const roleIcon = employee.processingRole 
      ? PROCESSING_ROLE_ICONS[employee.processingRole]
      : '❓';

    return (
      <View style={styles.employeeCard}>
        <View style={styles.employeeHeader}>
          <View style={styles.employeeInfo}>
            <Text style={styles.employeeName}>{employee.name}</Text>
            <Text style={styles.employeeEmail}>{employee.user?.email}</Text>
            {employee.position && (
              <Text style={styles.employeePosition}>{employee.position}</Text>
            )}
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleIcon}>{roleIcon}</Text>
            <Text style={[styles.roleLabel, { color: roleColor }]}>
              {roleLabel}
            </Text>
          </View>
        </View>
        
        {employee.warehouse && (
          <View style={styles.warehouseInfo}>
            <Text style={styles.warehouseLabel}>Склад:</Text>
            <Text style={styles.warehouseName}>{employee.warehouse.name}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.assignButton}
          onPress={() => handleOpenAssignment(employee)}
        >
          <Text style={styles.assignButtonText}>
            {employee.processingRole ? 'Изменить должность' : 'Назначить должность'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Рендер пустого состояния
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>👥</Text>
      <Text style={styles.emptyTitle}>Сотрудники не найдены</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Попробуйте изменить параметры поиска'
          : 'Сотрудники появятся здесь после добавления'
        }
      </Text>
    </View>
  );

  // Рендер заголовка списка
  const renderListHeader = () => (
    <>
      {/* Заголовок */}
      <View style={styles.header}>
        <Text style={styles.title}>Должности сотрудников</Text>
        <Text style={styles.subtitle}>
          Управление должностями обработки заказов
        </Text>
      </View>

      {/* Поиск */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по имени или email..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => handleSearch('')}
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Статистика */}
      {renderStatistics()}
    </>
  );

  if (!accessRights.canViewProcessingRoles) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Text style={styles.accessDeniedText}>
          У вас нет прав для просмотра должностей сотрудников
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Список сотрудников */}
      <FlatList
        data={employees}
        renderItem={renderEmployee}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyComponent}
        showsVerticalScrollIndicator={false}
      />

      {/* Модальное окно назначения должности */}
      <ProcessingRoleAssignment
        employee={selectedEmployee}
        onAssign={handleAssignRole}
        onCancel={handleCloseAssignment}
        visible={showAssignmentModal}
        loading={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingBottom: 30
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    marginBottom: 0
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#666'
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  clearSearchButton: {
    marginLeft: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center'
  },
  clearSearchText: {
    fontSize: 16,
    color: '#666'
  },
  statisticsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8
  },
  statisticsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  statisticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  statisticItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  statisticIcon: {
    fontSize: 24,
    marginBottom: 4
  },
  statisticLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4
  },
  statisticCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  listContainer: {
    padding: 16,
    paddingTop: 0
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  employeeInfo: {
    flex: 1
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  employeeEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2
  },
  employeePosition: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic'
  },
  roleBadge: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    minWidth: 80
  },
  roleIcon: {
    fontSize: 20,
    marginBottom: 2
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center'
  },
  warehouseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  warehouseLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 4
  },
  warehouseName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  assignButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center'
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  }
}); 