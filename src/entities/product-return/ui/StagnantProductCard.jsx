import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { UrgencyLevelBadge } from './UrgencyLevelBadge';
import { FontFamily, FontSize, Border, Shadow, Padding } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ReliableImage, Placeholder as ImagePlaceholder } from '@shared/ui/ReliableImage';

/**
 * Карточка зalежавшегося товара
 * @param {Object} props
 * @param {Object} props.product - Данные зalежавшегося товара
 * @param {Function} [props.onPress] - Обработчик нажатия
 * @param {Function} [props.onCreateReturn] - Обработчик создания возврата
 */
export const StagnantProductCard = React.memo(({
  product,
  onPress,
  onCreateReturn,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const {
    productName,
    supplierName,
    warehouseName,
    quantity,
    daysSinceLastSale,
    urgencyLevel,
    warehouses = [],
  } = product;

  const imageArray = useMemo(() => {
    let images = [];

    if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
      images = product.images.filter((item) => {
        if (!item) return false;
        if (typeof item === 'string') return item.trim() !== '';
        if (item.uri || item.url || item.path || item.src) return true;
        return false;
      });
    } else if (product?.originalData?.images && Array.isArray(product.originalData.images) && product.originalData.images.length > 0) {
      images = product.originalData.images.filter((item) => {
        if (!item) return false;
        if (typeof item === 'string') return item.trim() !== '';
        if (item.uri || item.url || item.path || item.src) return true;
        return false;
      });
    } else if (product?.image) {
      images = [product.image];
    }

    return images.length > 0 ? images : [];
  }, [product?.images, product?.originalData?.images, product?.image]);

  const handlePress = () => {
    if (onPress) {
      onPress(product);
    }
  };

  const handleCreateReturn = () => {
    if (onCreateReturn) {
      onCreateReturn(product);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
      android_ripple={{ color: colors.primarySoft }}
    >
      {imageArray.length > 0 ? (
        <ReliableImage
          source={imageArray[0]}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <ImagePlaceholder style={styles.image} iconSize={24} text="Нет фото" />
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.productName} numberOfLines={2}>
            {productName}
          </Text>
          <UrgencyLevelBadge level={urgencyLevel} size="small" />
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Поставщик:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {supplierName}
            </Text>
          </View>

          {warehouses.length > 0 ? (
            <View style={styles.warehousesContainer}>
              <Text style={styles.infoLabel}>
                {warehouses.length > 1
                  ? `Склады (${warehouses.length}):`
                  : 'Склад:'}
              </Text>
              {warehouses.map((warehouse, index) => (
                <View key={warehouse.id || index} style={styles.warehouseItem}>
                  <Text style={styles.warehouseDot}>•</Text>
                  <Text style={styles.warehouseName} numberOfLines={1}>
                    {warehouse.name}
                  </Text>
                  <Text style={styles.warehouseQuantity}>
                    ({warehouse.quantity} шт, {warehouse.daysSinceLastSale} дн.)
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Склад:</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {warehouseName}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{quantity}</Text>
              <Text style={styles.statLabel}>коробок</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{daysSinceLastSale}</Text>
              <Text style={styles.statLabel}>дней без продаж</Text>
            </View>
          </View>

          {onCreateReturn && (
            <Pressable
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.createButtonPressed,
              ]}
              onPress={handleCreateReturn}
              android_ripple={{ color: colors.textInverse, radius: 20 }}
            >
              <Text style={styles.createButtonText}>Создать возврат</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}, (prevProps, nextProps) => (
  prevProps.product.productId === nextProps.product.productId &&
  prevProps.product.daysSinceLastSale === nextProps.product.daysSinceLastSale &&
  prevProps.product.quantity === nextProps.product.quantity &&
  prevProps.product.urgencyLevel === nextProps.product.urgencyLevel &&
  prevProps.product.images === nextProps.product.images &&
  prevProps.product.image === nextProps.product.image &&
  prevProps.product.originalData?.images === nextProps.product.originalData?.images
));

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
    width: 80,
    height: 80,
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    flex: 1,
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: 8,
  },
  infoContainer: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: FontSize.size_xs,
    fontFamily: FontFamily.regular,
    color: colors.textSecondary,
    marginRight: 6,
  },
  infoValue: {
    flex: 1,
    fontSize: FontSize.size_xs,
    fontFamily: FontFamily.medium,
    color: colors.textPrimary,
  },
  warehousesContainer: {
    marginTop: 4,
  },
  warehouseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    paddingLeft: 8,
  },
  warehouseDot: {
    fontSize: FontSize.size_xs,
    color: colors.primary,
    marginRight: 4,
    fontWeight: '700',
  },
  warehouseName: {
    flex: 1,
    fontSize: FontSize.size_5xs,
    fontFamily: FontFamily.regular,
    color: colors.textPrimary,
  },
  warehouseQuantity: {
    fontSize: FontSize.size_5xs,
    fontFamily: FontFamily.regular,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  footer: {
    marginTop: 'auto',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: Border.radius.medium,
    padding: 8,
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.divider,
  },
  statValue: {
    fontSize: FontSize.size_lg,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FontSize.size_5xs,
    fontFamily: FontFamily.regular,
    color: colors.textSecondary,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: Border.radius.medium,
    paddingVertical: 8,
    alignItems: 'center',
    ...(isDark ? {} : Shadow.button),
  },
  createButtonPressed: {
    backgroundColor: colors.accentPressed,
    opacity: 0.9,
  },
  createButtonText: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
