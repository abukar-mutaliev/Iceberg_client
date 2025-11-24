import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProductReturnStatus } from '../lib/constants';
import { getReturnStatusLabel, getReturnStatusColor } from '../lib/utils';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';

/**
 * Компонент бейджа статуса возврата
 * @param {Object} props
 * @param {string} props.status - Статус возврата (ProductReturnStatus)
 * @param {boolean} [props.showIcon=true] - Показывать ли иконку
 * @param {'small'|'medium'|'large'} [props.size='medium'] - Размер бейджа
 */
export const ReturnStatusBadge = ({
  status,
  showIcon = true,
  size = 'medium',
}) => {
  const label = getReturnStatusLabel(status);
  const color = getReturnStatusColor(status);
  
  // Иконки для статусов
  const getStatusIcon = () => {
    switch (status) {
      case ProductReturnStatus.PENDING:
        return '⏳';
      case ProductReturnStatus.APPROVED:
        return '✅';
      case ProductReturnStatus.IN_PROGRESS:
        return '🔄';
      case ProductReturnStatus.COMPLETED:
        return '✨';
      case ProductReturnStatus.REJECTED:
        return '❌';
      case ProductReturnStatus.CANCELLED:
        return '🚫';
      default:
        return '•';
    }
  };

  // Фоновый цвет с прозрачностью
  const getBackgroundColor = () => {
    switch (status) {
      case ProductReturnStatus.PENDING:
        return 'rgba(0, 122, 255, 0.1)'; // blue
      case ProductReturnStatus.APPROVED:
        return 'rgba(52, 199, 89, 0.1)'; // success
      case ProductReturnStatus.IN_PROGRESS:
        return 'rgba(255, 204, 0, 0.1)'; // warning
      case ProductReturnStatus.COMPLETED:
        return 'rgba(106, 90, 224, 0.1)'; // purpleSoft
      case ProductReturnStatus.REJECTED:
        return 'rgba(255, 59, 48, 0.1)'; // error
      case ProductReturnStatus.CANCELLED:
        return 'rgba(142, 142, 147, 0.1)'; // gray
      default:
        return Color.secondary;
    }
  };

  const icon = getStatusIcon();

  const containerStyle = [
    styles.container,
    { backgroundColor: getBackgroundColor() },
    size === 'small' && styles.containerSmall,
    size === 'large' && styles.containerLarge,
  ];

  const iconStyle = [
    styles.icon,
    size === 'small' && styles.iconSmall,
    size === 'large' && styles.iconLarge,
  ];

  const labelStyle = [
    styles.label,
    { color },
    size === 'small' && styles.labelSmall,
    size === 'large' && styles.labelLarge,
  ];

  return (
    <View style={containerStyle}>
      {showIcon && (
        <Text style={iconStyle}>{icon}</Text>
      )}
      <Text style={labelStyle}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Border.radius.large,
    alignSelf: 'flex-start',
  },
  containerSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Border.radius.medium,
  },
  containerLarge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  icon: {
    fontSize: 14,
    marginRight: 6,
  },
  iconSmall: {
    fontSize: 12,
    marginRight: 4,
  },
  iconLarge: {
    fontSize: 16,
    marginRight: 7,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.size_sm,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: FontSize.size_xs,
    fontWeight: '500',
  },
  labelLarge: {
    fontSize: FontSize.size_md,
    fontWeight: '700',
  },
});

