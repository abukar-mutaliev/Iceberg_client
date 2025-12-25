import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { ReturnStatusBadge } from './ReturnStatusBadge';
import { formatReturnNumber, formatDate } from '../lib/utils';
import { Color, FontFamily, FontSize, Border, Shadow, Padding } from '@app/styles/GlobalStyles';

/**
 * Карточка возврата товара
 * @param {Object} props
 * @param {Object} props.returnItem - Данные возврата
 * @param {Function} [props.onPress] - Обработчик нажатия
 */
export const ProductReturnCard = React.memo(({ 
  returnItem, 
  onPress,
}) => {
  const {
    id,
    product,
    supplier,
    warehouse,
    quantity,
    status,
    requestedAt,
    daysSinceLastSale,
  } = returnItem;

  const handlePress = () => {
    if (onPress) {
      onPress(returnItem);
    }
  };

  const returnNumber = formatReturnNumber(id);
  const requestDate = formatDate(requestedAt);

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
      android_ripple={{ color: Color.purpleLight }}
    >
      {/* Изображение товара */}
      {product?.image && (
        <Image
          source={{ uri: product.image }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {/* Контент */}
      <View style={styles.content}>
        {/* Заголовок: номер возврата и статус */}
        <View style={styles.header}>
          <Text style={styles.returnNumber}>{returnNumber}</Text>
          <ReturnStatusBadge status={status} size="small" />
        </View>

        {/* Название товара */}
        {product?.name && (
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
        )}

        {/* Информация */}
        <View style={styles.infoContainer}>
          {supplier?.companyName && (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🏢</Text>
              <Text style={styles.infoText} numberOfLines={1}>
                {supplier.companyName}
              </Text>
            </View>
          )}
          {warehouse?.name && (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📦</Text>
              <Text style={styles.infoText} numberOfLines={1}>
                {warehouse.name}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <Text style={styles.infoText}>{requestDate}</Text>
          </View>
        </View>

        {/* Нижняя часть: статистика */}
        <View style={styles.footer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{quantity}</Text>
            <Text style={styles.statLabel}>коробок</Text>
          </View>
          {daysSinceLastSale !== null && (
            <>
              <View style={styles.divider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{daysSinceLastSale}</Text>
                <Text style={styles.statLabel}>дней без продаж</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}, (prevProps, nextProps) => {
  // Оптимизация ререндера
  return (
    prevProps.returnItem.id === nextProps.returnItem.id &&
    prevProps.returnItem.status === nextProps.returnItem.status &&
    prevProps.returnItem.quantity === nextProps.returnItem.quantity
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Color.colorLightMode,
    borderRadius: Border.br_base,
    padding: Padding.medium,
    marginBottom: 12,
    ...Shadow.card,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: Border.radius.large,
    backgroundColor: Color.secondary,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  returnNumber: {
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Color.purpleSoft,
  },
  productName: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: Color.textPrimary,
    marginBottom: 8,
  },
  infoContainer: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.size_xs,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Color.secondary,
    borderRadius: Border.radius.medium,
    padding: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: Color.border,
  },
  statValue: {
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Color.purpleSoft,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FontSize.size_5xs,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
    textAlign: 'center',
  },
});

