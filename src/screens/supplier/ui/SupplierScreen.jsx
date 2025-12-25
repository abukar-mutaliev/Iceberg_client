import React from 'react';
import { SupplierScreenContainer } from '@screens/supplier/ui/SupplierScreenContainer';
import { useSelector } from 'react-redux';
import {
    selectCurrentSupplierId,
    selectCurrentUserSupplierId,
    selectSupplierById
} from '@entities/supplier';


const SupplierScreen = React.memo(({ route, navigation }) => {
    // Извлекаем ID поставщика из всех возможных источников
    const params = route?.params || {};
    const routeSupplierId = params?.supplierId;
    const fromScreen = params?.fromScreen;
    const reduxSupplierId = useSelector(selectCurrentSupplierId);
    const userSupplierId = useSelector(selectCurrentUserSupplierId);

    // Определяем приоритет источников ID
    const supplierId = routeSupplierId || reduxSupplierId || userSupplierId;

    // Проверяем данные поставщика из Redux если есть ID
    const supplier = useSelector(state =>
        supplierId ? selectSupplierById(state, supplierId) : null
    );

    // Для отладки выводим инфо в консоль только в режиме разработки
    if (process.env.NODE_ENV === 'development') {
        console.log('SupplierScreen - выбранный supplierId:', {
            fromRoute: routeSupplierId,
            fromRedux: reduxSupplierId,
            fromUser: userSupplierId,
            finalId: supplierId,
            fromScreen: fromScreen,
            hasSupplier: !!supplier
        });

        if (supplier) {
            console.log('SupplierScreen - данные поставщика:', {
                id: supplier.id,
                hasUserProperty: !!supplier.user,
                userAvatar: supplier.user?.avatar,
                directAvatar: supplier.avatar,
                nestedSupplier: !!supplier.supplier
            });
        }
    }

    // Простой рендер без дополнительных вычислений
    return (
        <SupplierScreenContainer
            supplierId={supplierId}
            navigation={navigation}
            route={route}
        />
    );
});

// Добавляем displayName для удобства отладки
SupplierScreen.displayName = 'SupplierScreen';

export { SupplierScreen };
export default SupplierScreen;