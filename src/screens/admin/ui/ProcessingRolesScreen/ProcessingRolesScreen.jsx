import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  StatusBar,
} from 'react-native';
import { enableLayoutAnimationExperimentalAndroid } from '@shared/lib/enableLayoutAnimationAndroid';
import { useProcessingRoles } from '@entities/admin/hooks/useProcessingRoles';
import { ProcessingRoleAssignment } from '@entities/admin/ui/ProcessingRoleAssignment';
import {
  PROCESSING_ROLE_LABELS,
  PROCESSING_ROLE_COLORS,
  PROCESSING_ROLE_ICONS
} from '@entities/admin/lib/constants';
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';
import { HeaderWithBackButton } from '@shared/ui/HeaderWithBackButton';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

enableLayoutAnimationExperimentalAndroid();

export const ProcessingRolesScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
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
  const [showStatistics, setShowStatistics] = useState(false);
  const debounceTimer = useRef(null);

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

  // Локальная фильтрация сотрудников по поисковому запросу
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const query = searchQuery.toLowerCase();
    return employees.filter(employee =>
      employee.name?.toLowerCase().includes(query) ||
      employee.user?.email?.toLowerCase().includes(query) ||
      employee.position?.toLowerCase().includes(query)
    );
  }, [employees, searchQuery]);

  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setFilter({ search: text });
    }, 500);
  }, [setFilter]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    setFilter({ search: '' });
  }, [setFilter]);

  const handleToggleStatistics = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowStatistics(prev => !prev);
  }, []);

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

  // Рендер сотрудника
  const renderEmployee = ({ item: employee }) => {
    const employeeWarehouses = employee.warehouses?.length
      ? employee.warehouses
      : (employee.warehouse ? [employee.warehouse] : []);
    const roleLabel = employee.processingRole 
      ? PROCESSING_ROLE_LABELS[employee.processingRole]
      : 'Не назначена';
    const roleColor = employee.processingRole 
      ? PROCESSING_ROLE_COLORS[employee.processingRole]
      : colors.textSecondary;
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
        
        {employeeWarehouses.length > 0 && (
          <View style={styles.warehouseInfo}>
            <Text style={styles.warehouseLabel}>
              {employeeWarehouses.length > 1 ? 'Склады:' : 'Склад:'}
            </Text>
            <View style={styles.warehouseList}>
              {employeeWarehouses.map((warehouse) => (
                <View key={warehouse.id} style={styles.warehouseChip}>
                  <Text style={styles.warehouseName}>{warehouse.name}</Text>
                </View>
              ))}
            </View>
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

  if (!accessRights.canViewProcessingRoles) {
    return (
      <View style={styles.accessDeniedContainer}>
        <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
        <Text style={styles.accessDeniedText}>
          Только суперадминистратор может просматривать и назначать должности сотрудников
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
      <HeaderWithBackButton title="Должности сотрудников" />

      {/* Заголовок + поиск вынесены из FlatList чтобы TextInput не терял фокус */}
      <View style={styles.header}>
        <Text style={styles.subtitle}>
          Управление должностями обработки заказов
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по имени или email..."
          placeholderTextColor={colors.textTertiary}
          keyboardAppearance={colors.keyboardAppearance}
          value={searchQuery}
          onChangeText={handleSearchChange}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={handleClearSearch}
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Раскрывающаяся статистика */}
      <TouchableOpacity
        style={styles.statisticsToggle}
        onPress={handleToggleStatistics}
        activeOpacity={0.7}
      >
        <Text style={styles.statisticsToggleText}>Статистика по должностям</Text>
        <Icon
          name={showStatistics ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={24}
          color={colors.textPrimary}
        />
      </TouchableOpacity>

      {showStatistics && (
        <View style={styles.statisticsContainer}>
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
      )}

      {/* Список сотрудников */}
      <FlatList
        data={filteredEmployees}
        renderItem={renderEmployee}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListEmptyComponent={renderEmptyComponent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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

const createStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingBottom: 30
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary
  },
  searchContainer: {
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: colors.inputBackground,
    color: colors.textPrimary
  },
  clearSearchButton: {
    marginLeft: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  clearSearchText: {
    fontSize: 16,
    color: colors.textSecondary
  },
  statisticsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statisticsToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statisticsContainer: {
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statisticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  statisticItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.border
  },
  statisticIcon: {
    fontSize: 24,
    marginBottom: 4
  },
  statisticLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4
  },
  statisticCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary
  },
  listContainer: {
    padding: 16,
    paddingTop: 0
  },
  employeeCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.25 : 0.1,
    shadowRadius: isDark ? 6 : 4,
    elevation: isDark ? 2 : 3,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.border
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
    color: colors.textPrimary,
    marginBottom: 4
  },
  employeeEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2
  },
  employeePosition: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic'
  },
  roleBadge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    padding: 8,
    minWidth: 80,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.border
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
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  warehouseLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 8,
    marginTop: 4
  },
  warehouseList: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  warehouseChip: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  warehouseName: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500'
  },
  assignButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center'
  },
  assignButtonText: {
    color: colors.textInverse,
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
    color: colors.textPrimary,
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    textAlign: 'center'
  }
}); 