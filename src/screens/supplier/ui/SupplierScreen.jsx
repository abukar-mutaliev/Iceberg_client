import React from 'react';
import { SupplierScreenContainer } from '@/screens/supplier/ui/SupplierScreenContainer';
import { useSelector } from 'react-redux';
import { selectCurrentSupplierId, selectCurrentUserSupplierId } from '@/entities/supplier';

const SupplierScreen = ({ route, navigation }) => {
    const params = route?.params || {};
    const routeSupplierId = params?.supplierId;
    const reduxSupplierId = useSelector(selectCurrentSupplierId);
    const userSupplierId = useSelector(selectCurrentUserSupplierId);

    const supplierId = routeSupplierId || reduxSupplierId || userSupplierId;

    return (
        <SupplierScreenContainer
            supplierId={supplierId}
            navigation={navigation}
        />
    );
};

export { SupplierScreen };
export default SupplierScreen;