import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SupplierContent } from '@screens/supplier/ui/SupplierContent';
import { ErrorState } from '@shared/ui/states/ErrorState';
import { Loader } from '@shared/ui/Loader/ui/Loader';
import { StaticBackgroundGradient } from '@shared/ui/BackgroundGradient';
import { useSupplierData } from '@entities/supplier';
import { Color } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

/**
 * Оптимизированный контейнер экрана поставщика с минимизацией рендеров
 * и правильной передачей отзывов
 */
const SupplierScreenContainer = React.memo(({ supplierId, navigation, route }) => {
    const params = route?.params || {};
    const fromScreen = params?.fromScreen;
    const previousProductId = params?.previousProductId;
    const validSupplierId = supplierId ? Number(supplierId) : null;

    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const loaderColor = isDark ? colors.primary : Color.purpleSoft;

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

    // Полноэкранный лоадер — только когда нет закешированных данных
    if (isInitialLoading) {
        return (
            <View style={styles.container}>
                <StaticBackgroundGradient />
                <View style={styles.loaderContainer}>
                    <Loader 
                        type="youtube" 
                        color={loaderColor}
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
                        color={loaderColor}
                        text="Загружаем информацию о поставщике..."
                    />
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
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

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        backgroundColor: isDark ? colors.background : 'transparent',
    },
    safeArea: {
        flex: 1,
        width: '100%',
        backgroundColor: isDark ? colors.background : 'transparent',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});



export { SupplierScreenContainer };