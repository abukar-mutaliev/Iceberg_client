import React, { useEffect, useCallback, useState } from 'react';
import { View, ScrollView, RefreshControl, BackHandler } from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { HeaderWithBackButton } from '@/shared/ui/HeaderWithBackButton';
import { styles } from './styles/EmployeeRewardsScreen.styles';
import {
    useEmployeeRewardsData,
    useEmployeeRewardsNavigation,
    useEmployeeRewardsSearch
} from './hooks';
import {
    LoadingState,
    ErrorState,
    EmptyState,
    StatisticsView,
    RewardsListView,
    MonthSelector,
    MonthlySummaryCard
} from './components';
import { useAuth } from '@entities/auth/hooks/useAuth';

export const EmployeeRewardsScreen = React.memo(({ navigation }) => {
    const route = useRoute();
    const [refreshing, setRefreshing] = useState(false);
    const { currentUser: user } = useAuth();

    // Получаем параметры из route с безопасной обработкой
    const routeParams = route.params || {};
    const {
        viewMode = 'statistics',
        employeeId = null
    } = routeParams;



    // Проверяем права доступа
    const isAdmin = user?.role === 'ADMIN';
    const isEmployee = user?.role === 'EMPLOYEE';
    const hasAccess = isAdmin || isEmployee;

    // Кастомные хуки
    const dataHook = useEmployeeRewardsData(viewMode, employeeId);
    const navigationHook = useEmployeeRewardsNavigation(navigation, route.params);
    
    // Деструктурируем дополнительные поля для фильтра по месяцам
    const {
        selectedMonth,
        selectedYear,
        handleMonthChange,
        employeeStatistics
    } = dataHook;

    // Получаем данные в зависимости от режима
    const currentData = React.useMemo(() => {
        // Для сотрудников в режиме employee показываем их вознаграждения
        if (viewMode === 'employee' && user?.role === 'EMPLOYEE') {
            return dataHook.rewards || [];
        }
        
        if (dataHook.isViewingSpecificEmployee) return dataHook.rewards;
        if (dataHook.isViewingPending) return dataHook.allPendingRewards;
        if (dataHook.isStatisticsMode) return dataHook.allEmployeesStats;
        return [];
    }, [
        viewMode,
        user?.role,
        dataHook.isViewingSpecificEmployee,
        dataHook.isViewingPending,
        dataHook.isStatisticsMode,
        dataHook.rewards,
        dataHook.allPendingRewards,
        dataHook.allEmployeesStats
    ]);

    const searchHook = useEmployeeRewardsSearch(currentData, viewMode);

    // Обработчики
    const handleRefresh = useCallback(async () => {
        try {
            if (!hasAccess) return;

            setRefreshing(true);
            await dataHook.loadData(true);
        } catch (error) {
            console.error('Error in EmployeeRewardsScreen handleRefresh:', error);
        } finally {
            setRefreshing(false);
        }
    }, [dataHook, hasAccess, user?.role]);

    const handleRetry = useCallback(() => {
        try {
            if (!hasAccess) return;
            dataHook.loadData(true);
        } catch (error) {
            console.error('Error in EmployeeRewardsScreen handleRetry:', error);
        }
    }, [dataHook, hasAccess, user?.role]);

    // Эффекты
    useFocusEffect(
        useCallback(() => {
            try {
                if (hasAccess) {
                    dataHook.loadData();
                }
            } catch (error) {
                console.error('Error in EmployeeRewardsScreen useFocusEffect:', error);
            }
        }, [dataHook.loadData, hasAccess, user?.role])
    );

    // Обработка аппаратной кнопки назад
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                navigationHook.handleBackNavigation();
                return true;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [navigationHook.handleBackNavigation])
    );

    // Эффект для перезагрузки данных при изменении выбранного месяца
    useEffect(() => {
        if (hasAccess) {
            dataHook.loadData();
        }
    }, [selectedMonth, selectedYear]);

    // Эффект для очистки данных при размонтировании
    useEffect(() => {
        return () => {
            dataHook.clearData();
        };
    }, [dataHook.clearData]);

    // Рендер содержимого
    const renderContent = () => {
        try {
            // Проверка прав доступа
            if (!hasAccess) {
                return (
                    <>
                        <MonthSelector
                            selectedMonth={selectedMonth}
                            selectedYear={selectedYear}
                            onMonthChange={handleMonthChange}
                        />
                        <View style={styles.contentContainer}>
                            <ErrorState
                                onRetry={() => {}}
                                errorMessage="Недостаточно прав для просмотра вознаграждений"
                            />
                        </View>
                    </>
                );
            }

            // Загрузка (показываем ТОЛЬКО при первой загрузке, не при смене месяца)
            if (dataHook.loadingStates.isAnyLoading && !refreshing && currentData.length === 0) {
                return (
                    <>
                        <MonthSelector
                            selectedMonth={selectedMonth}
                            selectedYear={selectedYear}
                            onMonthChange={handleMonthChange}
                        />
                        <LoadingState />
                    </>
                );
            }

            // Ошибка
            if (dataHook.hasErrors) {
                return (
                    <>
                        {/* Фильтр остается видимым даже при ошибке */}
                        <MonthSelector
                            selectedMonth={selectedMonth}
                            selectedYear={selectedYear}
                            onMonthChange={handleMonthChange}
                        />
                        <ErrorState onRetry={handleRetry} />
                    </>
                );
            }

            return (
                <>
                    {/* Фильтр по месяцам - ВСЕГДА ПОКАЗЫВАЕМ */}
                    <MonthSelector
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        onMonthChange={handleMonthChange}
                    />

                    {/* Итоговая карточка для режима просмотра вознаграждений сотрудника */}
                    {(dataHook.isViewingSpecificEmployee || (isEmployee && viewMode === 'employee')) && employeeStatistics && dataHook.hasDataToShow && (
                        <MonthlySummaryCard
                            statistics={employeeStatistics}
                            selectedMonth={selectedMonth}
                            selectedYear={selectedYear}
                            isEmployee={isEmployee}
                            alwaysShow={false}
                        />
                    )}

                    {/* Пустое состояние для режима списка */}
                    {!dataHook.hasDataToShow && !dataHook.loadingStates.isAnyLoading && !dataHook.isStatisticsMode && (
                        <EmptyState 
                            selectedMonth={selectedMonth}
                            selectedYear={selectedYear}
                            viewMode={viewMode}
                        />
                    )}

                    {/* Режим статистики для админов */}
                    {dataHook.isStatisticsMode && (
                        <>
                            {navigationHook.isAdminMode ? (
                                <>
                                    {dataHook.hasDataToShow ? (
                                        <StatisticsView
                                            totalStats={dataHook.totalStats}
                                            filteredData={searchHook.filteredData}
                                            searchQuery={searchHook.searchQuery}
                                            searchPlaceholder={searchHook.searchPlaceholder}
                                            onSearchChange={searchHook.setSearchQuery}
                                            onPendingCardClick={navigationHook.handlePendingCardClick}
                                            onViewEmployeeRewards={navigationHook.handleViewEmployeeRewards}
                                        />
                                    ) : !dataHook.loadingStates.isAnyLoading && (
                                        <EmptyState 
                                            selectedMonth={selectedMonth}
                                            selectedYear={selectedYear}
                                            viewMode={viewMode}
                                        />
                                    )}
                                </>
                            ) : (
                                // Сотрудники видят пустое состояние в режиме статистики
                                <EmptyState 
                                    selectedMonth={selectedMonth}
                                    selectedYear={selectedYear}
                                    viewMode={viewMode}
                                />
                            )}
                        </>
                    )}

                    {/* Режим списка вознаграждений */}
                    {!dataHook.isStatisticsMode && dataHook.hasDataToShow && (
                        <RewardsListView
                            filteredData={searchHook.filteredData}
                            searchQuery={searchHook.searchQuery}
                            searchPlaceholder={searchHook.searchPlaceholder}
                            showEmployee={dataHook.isViewingPending}
                            onSearchChange={searchHook.setSearchQuery}
                            onProcessReward={dataHook.handleProcessReward}
                        />
                    )}
                </>
            );
        } catch (error) {
            console.error('Error in EmployeeRewardsScreen renderContent:', error);
            return <ErrorState onRetry={handleRetry} />;
        }
    };

    try {
        return (
            <View style={styles.screen}>
                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            progressViewOffset={60}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <HeaderWithBackButton
                        title={navigationHook.screenTitle}
                        onBackPress={navigationHook.handleBackNavigation}
                        showBackButton={true}
                    />

                    <View style={styles.contentContainer}>
                        {renderContent()}
                    </View>
                </ScrollView>
            </View>
        );
    } catch (error) {
        console.error('Critical error in EmployeeRewardsScreen render:', error);
        return (
            <View style={styles.screen}>
                <HeaderWithBackButton
                    title="Ошибка"
                    onBackPress={navigationHook.handleBackNavigation}
                    showBackButton={true}
                />
                <View style={styles.contentContainer}>
                    <ErrorState
                        onRetry={handleRetry}
                        errorMessage="Произошла критическая ошибка"
                    />
                </View>
            </View>
        );
    }
});

EmployeeRewardsScreen.displayName = 'EmployeeRewardsScreen';