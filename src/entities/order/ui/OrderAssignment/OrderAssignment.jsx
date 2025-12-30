import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import {PROCESSING_ROLE_LABELS} from "@entities/order/lib/constants";
import {useOrderProcessing} from "@entities/order/hooks/useOrderProcessing";
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';

export const OrderAssignment = ({ orderId, stage, onAssignmentComplete }) => {
  const { assignOrder, accessRights, loadAvailableEmployees, availableEmployees, loadingEmployees } = useOrderProcessing();
  const { showError, showSuccess } = useCustomAlert();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (stage) {
      loadAvailableEmployees(stage);
    }
  }, [stage, loadAvailableEmployees]);

  const handleAssignOrder = async (employeeId) => {
    if (!accessRights.canAssignOrders) {
      showError('Ошибка', 'У вас нет прав для назначения заказов');
      return;
    }

    try {
      setLoading(true);
      const result = await assignOrder(orderId, stage, employeeId, 'MEDIUM');
      if (result.success) {
        showSuccess('Готово', 'Заказ успешно назначен');
        onAssignmentComplete?.(result.data);
      } else {
        showError('Ошибка', result.error);
      }
    } catch (error) {
      showError('Ошибка', 'Не удалось назначить заказ');
    } finally {
      setLoading(false);
    }
  };

  const renderEmployeeItem = (employee) => {
    const isOverloaded = employee.currentWorkload >= employee.maxOrdersPerDay;
    const workloadPercentage = Math.round((employee.currentWorkload / employee.maxOrdersPerDay) * 100);

    return (
      <TouchableOpacity
        key={employee.id}
        style={[
          styles.employeeItem,
          isOverloaded && styles.overloadedEmployee
        ]}
        onPress={() => !isOverloaded && handleAssignOrder(employee.id)}
        disabled={isOverloaded || loading}
      >
        <View style={styles.employeeHeader}>
          <Text style={styles.employeeName}>{employee.user.name}</Text>
          <Text style={styles.employeeRole}>
            {PROCESSING_ROLE_LABELS[employee.processingRole]}
          </Text>
        </View>
        
        <View style={styles.workloadContainer}>
          <Text style={styles.workloadText}>
            Загруженность: {employee.currentWorkload}/{employee.maxOrdersPerDay}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${workloadPercentage}%`,
                  backgroundColor: isOverloaded ? '#dc3545' : '#28a745'
                }
              ]} 
            />
          </View>
        </View>

        {isOverloaded && (
          <Text style={styles.overloadedText}>Перегружен</Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loadingEmployees) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Загрузка доступных сотрудников...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Назначить заказ</Text>
      <Text style={styles.subtitle}>Выберите сотрудника для этапа: {stage}</Text>
      
      <ScrollView style={styles.employeesList}>
        {availableEmployees.length === 0 ? (
          <Text style={styles.noEmployees}>Нет доступных сотрудников</Text>
        ) : (
          availableEmployees.map(renderEmployeeItem)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 8
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic'
  },
  employeesList: {
    maxHeight: 300
  },
  noEmployees: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20
  },
  employeeItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: '#fff'
  },
  overloadedEmployee: {
    opacity: 0.6,
    backgroundColor: '#f8f9fa'
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  employeeRole: {
    fontSize: 14,
    color: '#666'
  },
  workloadContainer: {
    marginBottom: 4
  },
  workloadText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 2
  },
  overloadedText: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '600'
  }
}); 