import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Color, FontFamily, FontSize, Border, Padding } from '@app/styles/GlobalStyles';

/**
 * Компонент предупреждения о залежавшемся товаре
 * @param {Object} props
 * @param {Array} props.warehousesData - Данные о складах с залежавшимися товарами
 */
export const StagnantProductWarning = ({ warehousesData }) => {
  if (!warehousesData || warehousesData.length === 0) {
    return null;
  }

  // Находим максимальное количество дней без продаж
  const maxDays = Math.max(...warehousesData.map(w => w.daysSinceLastSale || 0));
  
  // Определяем уровень критичности
  let urgencyColor = Color.orange;
  let urgencyText = '⚠️ Товар залежался';
  
  if (maxDays >= 30) {
    urgencyColor = Color.colorCrimson;
    urgencyText = '🔴 КРИТИЧНО: Товар залежался';
  } else if (maxDays >= 21) {
    urgencyColor = Color.orange;
    urgencyText = '🟠 ВНИМАНИЕ: Товар залежался';
  }

  return (
    <View style={[styles.container, { borderLeftColor: urgencyColor }]}>
      <Text style={styles.title}>{urgencyText}</Text>
      <Text style={styles.subtitle}>
        Товар не продается {maxDays} {maxDays === 1 ? 'день' : maxDays < 5 ? 'дня' : 'дней'}
      </Text>
      
      {warehousesData.length > 0 && (
        <View style={styles.warehousesList}>
          <Text style={styles.warehousesTitle}>Залежался на складах:</Text>
          {warehousesData.map((warehouse, index) => (
            <View key={warehouse.id || index} style={styles.warehouseItem}>
              <Text style={styles.warehouseDot}>•</Text>
              <View style={styles.warehouseDetails}>
                <Text style={styles.warehouseName}>{warehouse.name || 'Неизвестный склад'}</Text>
                <View style={styles.warehouseStats}>
                  <Text style={styles.warehouseQuantity}>
                    {warehouse.quantity || 0} шт
                  </Text>
                  <Text style={styles.warehouseDays}>
                    {warehouse.daysSinceLastSale || 0} дней
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
      
      <Text style={styles.recommendation}>
        💡 Рекомендуется создать запрос на возврат поставщику
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF9E6',
    borderRadius: Border.br_base,
    padding: Padding.medium,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  title: {
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Color.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
    marginBottom: 12,
  },
  warehousesList: {
    marginBottom: 12,
  },
  warehousesTitle: {
    fontSize: FontSize.size_xs,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: Color.textPrimary,
    marginBottom: 6,
  },
  warehouseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    paddingLeft: 8,
  },
  warehouseDot: {
    fontSize: FontSize.size_xs,
    color: Color.orange,
    marginRight: 6,
    fontWeight: '700',
    marginTop: 2,
  },
  warehouseDetails: {
    flex: 1,
  },
  warehouseName: {
    fontSize: FontSize.size_xs,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: Color.textPrimary,
    marginBottom: 2,
  },
  warehouseStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warehouseQuantity: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Color.purpleSoft,
    marginRight: 12,
  },
  warehouseDays: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Color.orange,
  },
  recommendation: {
    fontSize: FontSize.size_xs,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
    fontStyle: 'italic',
  },
});

