import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchSupplierWithProducts,
    selectSupplierById,
    selectSuppliersLoading,
    selectSuppliersError,
    selectSupplierProductsBySupplierId
} from '@/entities/supplier';
import { SupplierContent } from '@/screens/supplier/ui/SupplierContent';
import { ErrorState } from '@shared/ui/states/ErrorState';
import { LoadingState } from '@shared/ui/states/LoadingState';

const SupplierScreenContainer = ({ supplierId, navigation }) => {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const supplier = useSelector((state) => selectSupplierById(state, supplierId));
    const suppliersLoading = useSelector(selectSuppliersLoading);
    const suppliersError = useSelector(selectSuppliersError);
    const supplierProducts = useSelector((state) => selectSupplierProductsBySupplierId(state, supplierId));

    if (!supplierId) {
        return (
            <ErrorState
                message="Ошибка: ID поставщика не указан"
                onRetry={() => navigation.goBack()}
                buttonText="Вернуться назад"
            />
        );
    }

    useEffect(() => {
        const loadSupplierData = async () => {
            setLoading(true);
            setError(null);

            try {
                await dispatch(fetchSupplierWithProducts(supplierId)).unwrap();
            } catch (err) {
                console.error('Ошибка загрузки данных поставщика:', err);
                setError(err.message || 'Произошла ошибка при загрузке данных');
            } finally {
                setLoading(false);
            }
        };

        loadSupplierData();
    }, [dispatch, supplierId]);

    const handleRefresh = async () => {
        setLoading(true);
        setError(null);

        try {
            await dispatch(fetchSupplierWithProducts(supplierId)).unwrap();
        } catch (err) {
            console.error('Ошибка обновления данных:', err);
            setError(err.message || 'Произошла ошибка при обновлении данных');
        } finally {
            setLoading(false);
        }
    };

    const isLoading = loading || suppliersLoading;
    const hasError = error || suppliersError;

    const hasValidSupplier = supplier && (
        supplier.role === 'SUPPLIER' ||
        (supplier.supplier && supplier.supplier.companyName)
    );

    if (isLoading && (!hasValidSupplier || supplierProducts.length === 0)) {
        return <LoadingState />;
    }

    if (hasError || (!supplier && !isLoading)) {
        return (
            <ErrorState
                message={hasError || 'Поставщик не найден'}
                error={hasError}
                onRetry={handleRefresh}
            />
        );
    }

    if (supplier && !supplier.supplier && supplier.role !== 'SUPPLIER') {
        return (
            <ErrorState
                message={`Пользователь не является поставщиком`}
                onRetry={() => navigation.goBack()}
                buttonText="Вернуться назад"
            />
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <SupplierContent
                supplierId={supplierId}
                supplier={supplier}
                navigation={navigation}
                onRefresh={handleRefresh}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        width: '100%',
    },
});

export { SupplierScreenContainer };