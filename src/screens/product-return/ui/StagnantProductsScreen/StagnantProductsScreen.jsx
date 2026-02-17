import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Color, FontFamily, FontSize, Border, Shadow, Padding } from '@app/styles/GlobalStyles';
import { normalize } from '@shared/lib/normalize';
import { BackButton } from '@shared/ui/Button/BackButton';
import {
  useStagnantProducts,
  useReturnPermissions,
  useCreateReturn,
  StagnantProductCard,
  UrgencyLevel,
} from '@entities/product-return';
import { GlobalAlert } from '@shared/ui/CustomAlert';

/**
 * Экран списка залежавшихся товаров
 * Доступен для: ADMIN, EMPLOYEE, SUPPLIER
 */
export const StagnantProductsScreen = () => {
  const navigation = useNavigation();
  const { canCreate, isSupplier } = useReturnPermissions();
  const { createReturn, isCreating } = useCreateReturn();
  const screenTitle = isSupplier ? 'Мои залежавшиеся товары' : 'Залежавшиеся товары';

  // Состояние фильтров
  const [selectedUrgency, setSelectedUrgency] = useState(null);

  // Хук для работы с залежавшимися товарами
  const {
    products,
    loading,
    error,
    refresh,
    applyFilters,
    counts,
    hasCritical,
    isEmpty,
  } = useStagnantProducts({
    autoLoad: true, // Автоматическая загрузка с кэшированием
    forceRefresh: false,
  });

  // Обработчик фильтра по уровню срочности
  const handleFilterPress = useCallback((urgency) => {
    if (selectedUrgency === urgency) {
      // Сброс фильтра
      setSelectedUrgency(null);
      applyFilters({ urgencyLevel: undefined });
    } else {
      // Применение фильтра
      setSelectedUrgency(urgency);
      applyFilters({ urgencyLevel: urgency });
    }
  }, [selectedUrgency, applyFilters]);

  // Обработчик нажатия на товар - открываем детальный экран
  const handleProductPress = useCallback((product) => {
    // Переходим на экран деталей продукта
    // Для админов и сотрудников - AdminProductDetail
    // Для поставщиков - тоже AdminProductDetail (они могут просматривать свои товары)
    if (canCreate || isSupplier) {
      navigation.navigate('AdminProductDetail', { 
        productId: product.productId,
        fromScreen: 'StagnantProducts',
        // Передаем информацию о складах для отображения
        warehousesData: product.warehouses,
      });
    }
  }, [navigation, isSupplier, canCreate]);

  // Обработчик создания возврата (только для админов и сотрудников)
  const handleCreateReturn = useCallback(async (product) => {
    if (!canCreate || isSupplier) {
      GlobalAlert.showError(
        'Нет прав', 
        'Только администраторы и сотрудники могут создавать возвраты'
      );
      return;
    }

    // Открываем модальное окно для создания возврата
    navigation.navigate('CreateReturnModal', { product });
  }, [canCreate, isSupplier, navigation]);

  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Main');
  }, [navigation]);

  const renderScreenHeader = () => (
    <View style={styles.screenHeader}>
      <BackButton onPress={handleBackPress} />
      <Text style={styles.screenHeaderTitle}>{screenTitle}</Text>
      <View style={styles.screenHeaderPlaceholder} />
    </View>
  );

  // Рендер заголовка со статистикой
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.subtitle}>
        {isSupplier 
          ? 'Товары без продаж более 3 недель. Администрация может инициировать возврат.'
          : 'Товары без продаж более 3 недель'
        }
      </Text>

      {/* Статистика */}
      {counts.total > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{counts.total}</Text>
            <Text style={styles.statLabel}>Всего</Text>
          </View>
          <View style={[styles.statCard, styles.statCritical]}>
            <Text style={[styles.statValue, styles.statValueCritical]}>
              {counts.critical}
            </Text>
            <Text style={styles.statLabel}>Критично</Text>
          </View>
          <View style={[styles.statCard, styles.statHigh]}>
            <Text style={[styles.statValue, styles.statValueHigh]}>
              {counts.high}
            </Text>
            <Text style={styles.statLabel}>Высокий</Text>
          </View>
        </View>
      )}

      {/* Фильтры по срочности */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filtersLabel}>Фильтр по срочности:</Text>
        <View style={styles.filterButtons}>
          <FilterButton
            label="Критично"
            emoji="🔴"
            count={counts.critical}
            active={selectedUrgency === UrgencyLevel.CRITICAL}
            onPress={() => handleFilterPress(UrgencyLevel.CRITICAL)}
          />
          <FilterButton
            label="Высокий"
            emoji="🟠"
            count={counts.high}
            active={selectedUrgency === UrgencyLevel.HIGH}
            onPress={() => handleFilterPress(UrgencyLevel.HIGH)}
          />
          <FilterButton
            label="Средний"
            emoji="🟡"
            count={counts.medium}
            active={selectedUrgency === UrgencyLevel.MEDIUM}
            onPress={() => handleFilterPress(UrgencyLevel.MEDIUM)}
          />
        </View>
      </View>
    </View>
  );

  // Рендер пустого состояния
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>✨</Text>
      <Text style={styles.emptyTitle}>Залежавшихся товаров нет!</Text>
      <Text style={styles.emptyText}>
        Все товары активно продаются. Отличная работа!
      </Text>
    </View>
  );

  // Рендер ошибки
  if (error && !loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        {renderScreenHeader()}
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Ошибка загрузки</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Попробовать снова</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {renderScreenHeader()}
      <FlatList
        data={products}
        keyExtractor={(item, index) => `stagnant-${item.productId}-${item.warehouseId || item.id || index}`}
        renderItem={({ item }) => (
          <StagnantProductCard
            product={item}
            onPress={handleProductPress}
            onCreateReturn={canCreate && !isSupplier ? handleCreateReturn : null}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmpty : null}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={Color.purpleSoft}
            colors={[Color.purpleSoft]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Индикатор создания возврата */}
      {isCreating && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Color.purpleSoft} />
          <Text style={styles.loadingText}>Создание возврата...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

/**
 * Компонент кнопки фильтра
 */
const FilterButton = ({ label, emoji, count, active, onPress }) => (
  <Pressable
    style={({ pressed }) => [
      styles.filterButton,
      active && styles.filterButtonActive,
      pressed && styles.filterButtonPressed,
    ]}
    onPress={onPress}
    android_ripple={{ color: Color.purpleLight }}
  >
    <Text style={styles.filterEmoji}>{emoji}</Text>
    <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
      {label}
    </Text>
    {count > 0 && (
      <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
        <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>
          {count}
        </Text>
      </View>
    )}
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: Color.colorWhite,
    borderBottomWidth: 1,
    borderBottomColor: Color.border,
  },
  screenHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.size_lg,
    fontFamily: FontFamily.sFProDisplay,
    fontWeight: '600',
    color: Color.textPrimary,
  },
  screenHeaderPlaceholder: {
    width: 50,
  },
  listContent: {
    padding: Padding.medium,
    paddingBottom: Padding.large,
  },
  header: {
    marginBottom: Padding.large,
  },
  subtitle: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
    marginBottom: Padding.medium,
  },
  
  // Статистика
  statsContainer: {
    flexDirection: 'row',
    marginBottom: Padding.medium,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Color.secondary,
    borderRadius: Border.radius.large,
    padding: Padding.medium,
    alignItems: 'center',
  },
  statCritical: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  statHigh: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
  },
  statValue: {
    fontSize: FontSize.xxxlarge,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Color.purpleSoft,
    marginBottom: 4,
  },
  statValueCritical: {
    color: Color.error,
  },
  statValueHigh: {
    color: Color.orange,
  },
  statLabel: {
    fontSize: FontSize.size_xs,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
  },

  // Фильтры
  filtersContainer: {
    marginBottom: Padding.small,
  },
  filtersLabel: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: Color.textPrimary,
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Color.colorLightMode,
    borderRadius: Border.radius.medium,
    borderWidth: 1,
    borderColor: Color.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
    ...Shadow.light,
  },
  filterButtonActive: {
    backgroundColor: Color.purpleSoft,
    borderColor: Color.purpleSoft,
  },
  filterButtonPressed: {
    opacity: 0.8,
  },
  filterEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  filterLabel: {
    fontSize: FontSize.size_xs,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: Color.textPrimary,
  },
  filterLabelActive: {
    color: Color.colorLightMode,
  },
  filterBadge: {
    backgroundColor: Color.purpleSoft,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: Color.colorLightMode,
  },
  filterBadgeText: {
    fontSize: FontSize.size_5xs,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Color.colorLightMode,
  },
  filterBadgeTextActive: {
    color: Color.purpleSoft,
  },

  // Пустое состояние
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: normalize(60),
    paddingHorizontal: Padding.large,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Padding.medium,
  },
  emptyTitle: {
    fontSize: FontSize.size_lg,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Color.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Ошибка
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Padding.large,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: Padding.medium,
  },
  errorTitle: {
    fontSize: FontSize.size_lg,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Color.textPrimary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.regular,
    color: Color.textSecondary,
    textAlign: 'center',
    marginBottom: Padding.large,
  },
  retryButton: {
    backgroundColor: Color.purpleSoft,
    borderRadius: Border.radius.medium,
    paddingVertical: 12,
    paddingHorizontal: 24,
    ...Shadow.button,
  },
  retryButtonText: {
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: Color.colorLightMode,
  },

  // Overlay загрузки
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Padding.medium,
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: Color.colorLightMode,
  },
});

