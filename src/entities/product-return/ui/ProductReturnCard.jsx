import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ReturnStatusBadge } from './ReturnStatusBadge';
import { formatReturnNumber, formatDate } from '../lib/utils';
import { FontFamily, FontSize, Border, Shadow, Padding } from '@app/styles/GlobalStyles';
import { ReliableImage, Placeholder as ImagePlaceholder } from '@shared/ui/ReliableImage';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

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
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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
  const imageSource = product?.image || product?.imageUrl || product?.images || null;

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
      android_ripple={{ color: colors.primarySoft }}
    >
      {/* Изображение товара */}
      {imageSource ? (
        <ReliableImage
          source={imageSource}
          style={styles.image}
          resizeMode="cover"
          placeholderIconSize={22}
          placeholderText="Нет фото"
        />
      ) : (
        <ImagePlaceholder style={styles.image} iconSize={22} text="Нет фото" />
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

const createStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: Border.br_base,
    padding: Padding.medium,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...(isDark ? {} : Shadow.card),
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: Border.radius.large,
    backgroundColor: colors.surfaceSecondary,
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
    color: colors.primary,
  },
  productName: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: colors.textPrimary,
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
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
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
    backgroundColor: colors.divider,
  },
  statValue: {
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FontSize.size_5xs,
    fontFamily: FontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

