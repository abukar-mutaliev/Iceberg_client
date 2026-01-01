// Обновленный SupplierScreenContainer
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { SupplierContent } from '@screens/supplier/ui/SupplierContent';
import { ErrorState } from '@shared/ui/states/ErrorState';
import { Loader } from '@shared/ui/Loader/ui/Loader';
import { StaticBackgroundGradient } from '@shared/ui/BackgroundGradient';
import { useSupplierData } from '@entities/supplier';
import { Color } from '@app/styles/GlobalStyles';

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
        isLoading,
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
            console.log('SupplierScreenContainer - Данные:', {
                supplierId: validSupplierId,
                fromScreen,
                previousProductId,
                renderCount: renderCount.current,
                hasSupplier: !!supplier,
                supplierProductsType: typeof supplierProducts,
                supplierProductsIsArray: Array.isArray(supplierProducts),
                supplierProductsLength: supplierProducts?.length || 0,
                allFeedbacksLength: allFeedbacks?.length || 0
            });
        }
    }, [validSupplierId, fromScreen, previousProductId, supplier, supplierProducts, allFeedbacks]);

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

    // Показываем загрузку при первой загрузке или во время загрузки данных
    if (isInitialLoading || isLoading) {
        return (
            <View style={styles.container}>
                <StaticBackgroundGradient />
                <View style={styles.loaderContainer}>
                    <Loader 
                        type="youtube" 
                        color={Color.purpleSoft}
                        text="Загружаем данные поставщика..."
                    />
                </View>
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
                <View style={styles.loaderContainer}>
                    <Loader 
                        type="youtube" 
                        color={Color.purpleSoft}
                        text="Загружаем информацию о поставщике..."
                    />
                </View>
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
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});



export { SupplierScreenContainer };