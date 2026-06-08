import React, { useMemo, useState } from 'react';
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
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const ProcessingRoleAssignment = ({ 
  employee, 
  onAssign, 
  onCancel, 
  visible, 
  loading = false,
  roleOptions = null
}) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const { showAlert } = useCustomAlert();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const resolvedRoleOptions = Array.isArray(roleOptions) && roleOptions.length > 0
    ? roleOptions
    : Object.values(PROCESSING_ROLES)
        .filter(role => role !== 'QUALITY_CHECKER')
        .map((role) => ({
          value: role,
          label: PROCESSING_ROLE_LABELS[role],
          description: PROCESSING_ROLE_DESCRIPTIONS[role]
        }));

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

  const renderRoleOption = (roleOption, index) => {
    const role = roleOption?.value;
    const isSelected = selectedRole === role;
    const label = roleOption?.label || PROCESSING_ROLE_LABELS[role] || role;
    const icon = PROCESSING_ROLE_ICONS[role] || '👤';
    const color = PROCESSING_ROLE_COLORS[role] || '#007bff';
    const description = roleOption?.description || PROCESSING_ROLE_DESCRIPTIONS[role] || '';

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
            {resolvedRoleOptions.map((roleOption, index) => renderRoleOption(roleOption, index))}
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
                <ActivityIndicator color={colors.textInverse} size="small" />
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

const createStyles = (colors, isDark) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
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
    borderBottomColor: colors.border
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center'
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center'
  },
  employeeEmail: {
    fontSize: 14,
    color: colors.textSecondary,
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
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: isDark ? 0.25 : 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  selectedRoleOption: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.warning,
    shadowColor: colors.warning,
    shadowOpacity: isDark ? 0.25 : 0.15,
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
    color: colors.textPrimary,
    marginBottom: 4
  },
  roleDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20
  },
  selectedRoleText: {
    color: colors.warning
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
    borderTopColor: colors.border,
    gap: 12,
    justifyContent: 'space-between'
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.warning,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.warning,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3
  },
  confirmButtonDisabled: {
    backgroundColor: colors.surfaceSecondary,
    shadowOpacity: 0
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textInverse
  }
}); 