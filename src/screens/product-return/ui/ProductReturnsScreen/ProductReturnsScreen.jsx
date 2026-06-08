import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { FontFamily, FontSize, Border, Shadow, Padding } from '@app/styles/GlobalStyles';
import { normalize } from '@shared/lib/normalize';
import { HeaderWithBackButton } from '@shared/ui/HeaderWithBackButton';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import {
  useProductReturns,
  useReturnPermissions,
  ProductReturnCard,
  ProductReturnStatus,
} from '@entities/product-return';

/**
 * Экран списка возвратов товаров
 * Доступен для: ADMIN, EMPLOYEE, SUPPLIER
 */
export const ProductReturnsScreen = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { isAdmin, isEmployee, canView } = useReturnPermissions();

  // Состояние фильтров
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Хук для работы со списком возвратов
  const {
    returns,
    loading,
    error,
    refresh,
    loadMore,
    applyFilters,
    counts,
    isEmpty,
    hasMore,
    canLoadMore,
    hasPending,
  } = useProductReturns({
    autoLoad: true, // Автоматическая загрузка с кэшированием
    forceRefresh: false,
  });

  // Обработчик фильтра по статусу
  const handleFilterPress = useCallback((status) => {
    if (selectedStatus === status) {
      // Сброс фильтра
      setSelectedStatus(null);
      applyFilters({ status: undefined });
    } else {
      // Применение фильтра
      setSelectedStatus(status);
      applyFilters({ status });
    }
  }, [selectedStatus, applyFilters]);

  // Обработчик фильтра "только активные"
  const handleActiveFilterPress = useCallback(() => {
    const newValue = !showActiveOnly;
    setShowActiveOnly(newValue);
    if (newValue) {
      applyFilters({
        status: [
          ProductReturnStatus.PENDING,
          ProductReturnStatus.APPROVED,
          ProductReturnStatus.IN_PROGRESS,
        ],
      });
    } else {
      applyFilters({ status: undefined });
    }
  }, [showActiveOnly, applyFilters]);

  // Обработчик нажатия на возврат
  const handleReturnPress = useCallback((returnItem) => {
    navigation.navigate('ProductReturnDetail', { returnId: returnItem.id });
  }, [navigation]);

  // Обработчик загрузки следующей страницы
  const handleLoadMore = useCallback(() => {
    if (canLoadMore && !loading) {
      loadMore();
    }
  }, [canLoadMore, loading, loadMore]);

  // Рендер заголовка со статистикой
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.subtitle}>
        Управление процессом возврата залежавшихся товаров
      </Text>

      {/* Статистика */}
      {counts.total > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{counts.total}</Text>
            <Text style={styles.statLabel}>Всего</Text>
          </View>
          {hasPending && (
            <View style={[styles.statCard, styles.statPending]}>
              <Text style={[styles.statValue, styles.statValuePending]}>
                {counts.pending}
              </Text>
              <Text style={styles.statLabel}>Ожидают</Text>
            </View>
          )}
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{counts.inProgress}</Text>
            <Text style={styles.statLabel}>В работе</Text>
          </View>
        </View>
      )}

      {/* Быстрый фильтр: только активные */}
      <Pressable
        style={({ pressed }) => [
          styles.quickFilter,
          showActiveOnly && styles.quickFilterActive,
          pressed && styles.quickFilterPressed,
        ]}
        onPress={handleActiveFilterPress}
        android_ripple={{ color: colors.primarySoft }}
      >
        <Text style={[styles.quickFilterText, showActiveOnly && styles.quickFilterTextActive]}>
          {showActiveOnly ? '✓ ' : ''}Показать только активные
        </Text>
      </Pressable>

      {/* Фильтры по статусу */}
      {(isAdmin || isEmployee) && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersLabel}>Фильтр по статусу:</Text>
          <View style={styles.filterButtons}>
            <StatusFilterButton
              styles={styles}
              colors={colors}
              label="Ожидают"
              status={ProductReturnStatus.PENDING}
              count={counts.pending}
              active={selectedStatus === ProductReturnStatus.PENDING}
              onPress={() => handleFilterPress(ProductReturnStatus.PENDING)}
            />
            <StatusFilterButton
              styles={styles}
              colors={colors}
              label="Одобрены"
              status={ProductReturnStatus.APPROVED}
              count={counts.approved}
              active={selectedStatus === ProductReturnStatus.APPROVED}
              onPress={() => handleFilterPress(ProductReturnStatus.APPROVED)}
            />
            <StatusFilterButton
              styles={styles}
              colors={colors}
              label="Завершены"
              status={ProductReturnStatus.COMPLETED}
              count={counts.completed}
              active={selectedStatus === ProductReturnStatus.COMPLETED}
              onPress={() => handleFilterPress(ProductReturnStatus.COMPLETED)}
            />
          </View>
        </View>
      )}
    </View>
  );

  // Рендер пустого состояния
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📦</Text>
      <Text style={styles.emptyTitle}>Возвратов нет</Text>
      <Text style={styles.emptyText}>
        {showActiveOnly || selectedStatus
          ? 'По выбранным фильтрам возвраты не найдены'
          : 'Пока нет созданных возвратов товаров'}
      </Text>
    </View>
  );

  // Рендер футера (индикатор загрузки следующей страницы)
  const renderFooter = () => {
    if (!loading || !canLoadMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerLoaderText}>Загрузка...</Text>
      </View>
    );
  };

  // Рендер ошибки
  if (error && !loading && isEmpty) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
        <HeaderWithBackButton title="Возвраты товаров" />
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
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
      <HeaderWithBackButton title="Возвраты товаров" />
      <FlatList
        data={returns}
        keyExtractor={(item) => `return-${item.id}`}
        renderItem={({ item }) => (
          <ProductReturnCard
            returnItem={item}
            onPress={handleReturnPress}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmpty : null}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading && returns.length === 0}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

/**
 * Компонент кнопки фильтра по статусу
 */
const StatusFilterButton = ({ styles, colors, label, status, count, active, onPress }) => (
  <Pressable
    style={({ pressed }) => [
      styles.filterButton,
      active && styles.filterButtonActive,
      pressed && styles.filterButtonPressed,
    ]}
    onPress={onPress}
    android_ripple={{ color: colors.primarySoft }}
  >
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

const createStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: Padding.medium,
    paddingBottom: Padding.large,
  },
  header: {
    marginBottom: Padding.large,
  },
  title: {
    fontSize: FontSize.xxxlarge,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.regular,
    color: colors.textSecondary,
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
    backgroundColor: colors.surfaceSecondary,
    borderRadius: Border.radius.large,
    padding: Padding.medium,
    alignItems: 'center',
  },
  statPending: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  statValue: {
    fontSize: FontSize.xxxlarge,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statValuePending: {
    color: colors.primary,
  },
  statLabel: {
    fontSize: FontSize.size_xs,
    fontFamily: FontFamily.regular,
    color: colors.textSecondary,
  },

  // Быстрый фильтр
  quickFilter: {
    backgroundColor: colors.cardBackground,
    borderRadius: Border.radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: Padding.medium,
    marginBottom: Padding.medium,
    ...(isDark ? {} : Shadow.light),
  },
  quickFilterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickFilterPressed: {
    opacity: 0.8,
  },
  quickFilterText: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  quickFilterTextActive: {
    color: '#FFFFFF',
  },

  // Фильтры
  filtersContainer: {
    marginBottom: Padding.small,
  },
  filtersLabel: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: colors.textPrimary,
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
    backgroundColor: colors.cardBackground,
    borderRadius: Border.radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 8,
    ...(isDark ? {} : Shadow.light),
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonPressed: {
    opacity: 0.8,
  },
  filterLabel: {
    fontSize: FontSize.size_xs,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  filterLabelActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  filterBadgeText: {
    fontSize: FontSize.size_5xs,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterBadgeTextActive: {
    color: colors.primary,
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
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Футер загрузки
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Padding.medium,
  },
  footerLoaderText: {
    marginLeft: 8,
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.regular,
    color: colors.textSecondary,
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
    color: colors.textPrimary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: Padding.large,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: Border.radius.medium,
    paddingVertical: 12,
    paddingHorizontal: 24,
    ...(isDark ? {} : Shadow.button),
  },
  retryButtonText: {
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

