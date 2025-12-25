// Обновленный SupplierScreenContainer
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { SupplierContent } from '@screens/supplier/ui/SupplierContent';
import { ErrorState } from '@shared/ui/states/ErrorState';
import { LoadingState } from '@shared/ui/states/LoadingState';
import { StaticBackgroundGradient } from '@shared/ui/BackgroundGradient';
import { useSupplierData } from '@entities/supplier';

/**
 * Оптимизированный контейнер экрана поставщика с минимизацией рендеров
 * и правильной передачей отзывов
 */
const SupplierScreenContainer = React.memo(({ supplierId, navigation, route }) => {
    // Получаем параметры навигации
    const params = route?.params || {};
    const fromScreen = params?.fromScreen;
    const previousProductId = params?.previousProductId;
    const validSupplierId = supplierId ? Number(supplierId) : null;

    // Отслеживаем количество рендеров для отладки
    const renderCount = useRef(0);

    // Используем хук для управления данными поставщика
    const {
        supplier,
        supplierProducts,
        allFeedbacks,
        isInitialLoading,
        isRefreshing,
        suppliersError,
        hasError,
        hasInvalidSupplierType,
        handleRefresh
    } = useSupplierData(validSupplierId);

    // Отображаем параметры навигации в консоли для отладки
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            renderCount.current += 1;
            console.log('SupplierScreenContainer - Параметры навигации:', {
                supplierId: validSupplierId,
                fromScreen,
                previousProductId,
                renderCount: renderCount.current
            });
        }
    }, [validSupplierId, fromScreen, previousProductId]);

    // Отображаем ошибку если ID не указан
    if (!validSupplierId) {
        return (
            <View style={styles.container}>
                <StaticBackgroundGradient />
                <ErrorState
                    message="Ошибка: ID поставщика не указан"
                    onRetry={() => navigation.goBack()}
                    buttonText="Вернуться назад"
                />
            </View>
        );
    }

    // Показываем загрузку только при первой загрузке
    if (isInitialLoading) {
        return (
            <View style={styles.container}>
                <StaticBackgroundGradient />
                <LoadingState />
            </View>
        );
    }

    // Показываем ошибку если есть ошибка или нет данных поставщика
    if (hasError) {
        return (
            <View style={styles.container}>
                <StaticBackgroundGradient />
                <ErrorState
                    message={suppliersError || 'Поставщик не найден'}
                    error={suppliersError}
                    onRetry={handleRefresh}
                />
            </View>
        );
    }

    // Проверяем, что пользователь является поставщиком
    if (hasInvalidSupplierType) {
        return (
            <View style={styles.container}>
                <StaticBackgroundGradient />
                <ErrorState
                    message="Пользователь не является поставщиком"
                    onRetry={() => navigation.goBack()}
                    buttonText="Вернуться назад"
                />
            </View>
        );
    }

    // Проверка на существование данных поставщика
    if (!supplier) {
        return (
            <View style={styles.container}>
                <StaticBackgroundGradient />
                <LoadingState />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <SupplierContent
                supplierId={validSupplierId}
                supplier={supplier}
                supplierProducts={supplierProducts}
                feedbacks={allFeedbacks}
                navigation={navigation}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                fromScreen={fromScreen}
                previousProductId={previousProductId}
            />
        </SafeAreaView>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    safeArea: {
        flex: 1,
        width: '100%',
    },
});



export { SupplierScreenContainer };