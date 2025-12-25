import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import {
  PROCESSING_ROLES,
  PROCESSING_ROLE_LABELS,
  PROCESSING_ROLE_COLORS,
  PROCESSING_ROLE_ICONS,
  PROCESSING_ROLE_DESCRIPTIONS
} from '../../lib/constants';
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';

export const ProcessingRoleAssignment = ({ 
  employee, 
  onAssign, 
  onCancel, 
  visible, 
  loading = false 
}) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const { showAlert } = useCustomAlert();

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  const handleConfirm = () => {
    if (!selectedRole) {
      showAlert({
        type: 'warning',
        title: 'Ошибка',
        message: 'Пожалуйста, выберите должность',
        buttons: [
          {
            text: 'OK',
            style: 'primary'
          }
        ]
      });
      return;
    }

    showAlert({
      type: 'confirm',
      title: 'Подтверждение',
      message: `Назначить сотруднику ${employee.profile?.name || employee.name} должность "${PROCESSING_ROLE_LABELS[selectedRole]}"?`,
      buttons: [
        {
          text: 'Отмена',
          style: 'cancel'
        },
        {
          text: 'Назначить',
          style: 'primary',
          onPress: () => {
            onAssign(employee.profile?.id || employee.id, selectedRole);
            setSelectedRole(null);
          }
        }
      ]
    });
  };

  const handleCancel = () => {
    setSelectedRole(null);
    onCancel();
  };

  const renderRoleOption = (role, index) => {
    const isSelected = selectedRole === role;
    const label = PROCESSING_ROLE_LABELS[role];
    const icon = PROCESSING_ROLE_ICONS[role];
    const color = PROCESSING_ROLE_COLORS[role];
    const description = PROCESSING_ROLE_DESCRIPTIONS[role];

    return (
      <TouchableOpacity
        key={`role-option-${index}`}
        style={[
          styles.roleOption,
          isSelected && styles.selectedRoleOption,
          { borderColor: color }
        ]}
        onPress={() => handleRoleSelect(role)}
      >
        <View style={styles.roleHeader}>
          <Text style={styles.roleIcon}>{icon}</Text>
          <View style={styles.roleInfo}>
            <Text style={[styles.roleLabel, isSelected && styles.selectedRoleText]}>
              {label}
            </Text>
            <Text style={[styles.roleDescription, isSelected && styles.selectedRoleText]}>
              {description}
            </Text>
          </View>
        </View>
        {isSelected && (
          <View style={[styles.selectedIndicator, { backgroundColor: color }]} />
        )}
      </TouchableOpacity>
    );
  };

  if (!employee) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={handleCancel}
      >
        <TouchableOpacity 
          style={styles.modalContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Назначение должности</Text>
            <Text style={styles.subtitle}>
              Выберите должность для сотрудника
            </Text>
            <Text style={styles.employeeName}>{employee.profile?.name || employee.name}</Text>
            <Text style={styles.employeeEmail}>{employee.email}</Text>
          </View>

          <ScrollView 
            style={styles.rolesContainer}
            contentContainerStyle={styles.rolesScrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {Object.values(PROCESSING_ROLES)
              .filter(role => role !== 'QUALITY_CHECKER') // Убираем контроллера качества
              .map((role, index) => renderRoleOption(role, index))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.confirmButton,
                !selectedRole && styles.confirmButtonDisabled
              ]}
              onPress={handleConfirm}
              disabled={!selectedRole || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Назначить</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    minHeight: 500,
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center'
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    textAlign: 'center'
  },
  employeeEmail: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center'
  },
  rolesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    minHeight: 200
  },
  rolesScrollContent: {
    paddingVertical: 16,
    paddingBottom: 20
  },
  roleOption: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  selectedRoleOption: {
    backgroundColor: '#fef3f2',
    borderColor: '#fd7e14',
    shadowColor: '#fd7e14',
    shadowOpacity: 0.15,
    elevation: 4
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4
  },
  roleInfo: {
    flex: 1,
    marginLeft: 12
  },
  roleIcon: {
    fontSize: 24,
    width: 32,
    height: 32,
    textAlign: 'center',
    lineHeight: 32
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4
  },
  roleDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20
  },
  selectedRoleText: {
    color: '#fd7e14'
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
    justifyContent: 'space-between'
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280'
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#fd7e14',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fd7e14',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3
  },
  confirmButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
}); 