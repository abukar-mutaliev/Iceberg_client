import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UrgencyLevel } from '../lib/constants';
import { getUrgencyLevelLabel, getUrgencyLevelColor, getUrgencyLevelIcon } from '../lib/utils';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';

/**
 * Компонент бейджа уровня срочности для залежавшихся товаров
 * @param {Object} props
 * @param {string} props.level - Уровень срочности (UrgencyLevel)
 * @param {boolean} [props.showLabel=true] - Показывать ли текстовый лейбл
 * @param {boolean} [props.showIcon=true] - Показывать ли иконку
 * @param {'small'|'medium'|'large'} [props.size='medium'] - Размер бейджа
 */
export const UrgencyLevelBadge = ({
  level,
  showLabel = true,
  showIcon = true,
  size = 'medium',
}) => {
  const label = getUrgencyLevelLabel(level);
  const color = getUrgencyLevelColor(level);
  const icon = getUrgencyLevelIcon(level);
  
  // Определяем фоновый цвет с прозрачностью
  const getBackgroundColor = () => {
    switch (level) {
      case UrgencyLevel.CRITICAL:
        return 'rgba(255, 59, 48, 0.1)'; // error с прозрачностью
      case UrgencyLevel.HIGH:
        return 'rgba(255, 204, 0, 0.15)'; // warning с прозрачностью
      case UrgencyLevel.MEDIUM:
        return 'rgba(253, 126, 20, 0.1)'; // orange с прозрачностью
      case UrgencyLevel.LOW:
        return 'rgba(52, 199, 89, 0.1)'; // success с прозрачностью
      default:
        return Color.secondary;
    }
  };

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
      {showLabel && (
        <Text style={labelStyle}>{label}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Border.radius.medium,
    alignSelf: 'flex-start',
  },
  containerSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Border.radius.small,
  },
  containerLarge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Border.radius.large,
  },
  icon: {
    fontSize: 14,
    marginRight: 4,
  },
  iconSmall: {
    fontSize: 12,
    marginRight: 3,
  },
  iconLarge: {
    fontSize: 16,
    marginRight: 5,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.size_sm,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: FontSize.size_xs,
  },
  labelLarge: {
    fontSize: FontSize.size_md,
  },
});

