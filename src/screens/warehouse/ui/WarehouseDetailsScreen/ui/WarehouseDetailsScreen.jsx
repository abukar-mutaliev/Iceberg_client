import React, { useEffect, useState } from 'react';
import { StyleSheet} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { useWarehouseDetail } from '@entities/warehouse/hooks/useWarehouseDetail';
import { WarehouseDetailsContent } from './WarehouseDetailsContent';
import { LoadingState } from '@shared/ui/states/LoadingState';
import { ErrorState } from '@shared/ui/states/ErrorState';
import { fetchWarehouses } from '@entities/warehouse/model/slice';

export const WarehouseDetailsScreen = ({ navigation }) => {
    const route = useRoute();
    const dispatch = useDispatch();
    const { warehouseId } = route.params || {};

    const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    // Используем хук для получения данных склада
    const {
        warehouse,
        warehouseProducts,
        loading: warehouseLoading,
        productsLoading,
        error: warehouseError,
        productsError,
        loadWarehouse,
        loadWarehouseProducts,
        refreshWarehouse
    } = useWarehouseDetail(warehouseId, {
        autoLoad: true,
        loadProducts: true
    });

    // Функция для ручной загрузки данных
    const loadWarehousesData = React.useCallback(async () => {
        setIsLoadingWarehouses(true);
        try {
            await dispatch(fetchWarehouses(true)).unwrap();
            setRetryCount(0);
        } catch (error) {
            setRetryCount(prev => prev + 1);
        } finally {
            setIsLoadingWarehouses(false);
        }
    }, [dispatch]);

    // Загрузка данных при монтировании только если склада нет
    useEffect(() => {
        const loadWarehousesImmediately = async () => {
            if (!warehouseId) {
                return;
            }

            if (warehouse) {
                return;
            }
            await loadWarehousesData();
        };

        loadWarehousesImmediately();
    }, [warehouseId, warehouse, loadWarehousesData]);

    // Фокус на экране - дополнительная проверка и перезагрузка
    useFocusEffect(
        React.useCallback(() => {
            // Загружаем данные только если склад не найден и данных нет
            if (!warehouse && warehouseId && !isLoadingWarehouses) {
                loadWarehousesData();
            }
        }, [warehouseId, warehouse, isLoadingWarehouses, loadWarehousesData])
    );

    const handleRetry = () => {
        setRetryCount(0);
        loadWarehousesData();
        if (warehouseId) {
            refreshWarehouse();
        }
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

    // Показываем загрузку если данные загружаются
    if (warehouseLoading || isLoadingWarehouses) {
        return <LoadingState />;
    }

    // Если нет warehouseId в параметрах
    if (!warehouseId) {
        return (
            <ErrorState
                message="Не указан идентификатор склада"
                onRetry={handleGoBack}
                buttonText="Вернуться назад"
            />
        );
    }

    // Если склад все еще не найден после загрузки
    if (!warehouse && warehouseId) {
        const errorMessage = "Не удалось загрузить данные склада";

        return (
            <ErrorState
                message={errorMessage}
                onRetry={handleRetry}
                buttonText={retryCount < 3 ? "Повторить загрузку" : "Обновить данные"}
            />
        );
    }

    // Если есть общая ошибка
    if (warehouseError) {
        return (
            <ErrorState
                message={warehouseError}
                onRetry={handleGoBack}
                buttonText="Вернуться назад"
            />
        );
    }

    // Показываем контент склада
    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <WarehouseDetailsContent 
                warehouse={warehouse} 
                warehouseProducts={warehouseProducts}
                productsLoading={productsLoading}
                navigation={navigation}
                onRefresh={refreshWarehouse}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});
