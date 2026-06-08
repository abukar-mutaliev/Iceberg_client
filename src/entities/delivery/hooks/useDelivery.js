import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    calculateDeliveryFee,
    fetchActiveTariff,
    fetchFreeDeliveryInfo,
    setDeliveryType,
    clearDeliveryCalculation,
    clearDeliveryError,
    resetDeliveryState
} from '../model/slice';
import {
    selectDeliveryType,
    selectDeliveryCost,
    selectDeliveryCalculating,
    selectDeliveryError,
    selectTotalWithDelivery,
    selectDeliveryMessage,
    selectIsPickup,
    selectIsDelivery,
    selectCurrentDeliveryFee,
    selectDeliveryDistance,
    selectIsFreeDelivery,
    selectWarehouseName,
    selectDeliveryAddress,
    selectActiveTariff,
    selectFreeDeliveryInfo,
    selectMultipleDeliveryOptions,
    selectDeliveryLoading,
    selectTariffLoading,
    selectLastCalculation,
    selectIsCalculationValid
} from '../model/selectors';

/**
 * Хук работы с доставкой.
 * Стоимость и тариф приходят с сервера (DeliveryFeeService).
 */
export const useDelivery = () => {
    const dispatch = useDispatch();

    const deliveryType = useSelector(selectDeliveryType);
    const deliveryCost = useSelector(selectDeliveryCost);
    const calculating = useSelector(selectDeliveryCalculating);
    const error = useSelector(selectDeliveryError);
    const totalWithDelivery = useSelector(selectTotalWithDelivery);
    const deliveryMessage = useSelector(selectDeliveryMessage);
    const isPickup = useSelector(selectIsPickup);
    const isDelivery = useSelector(selectIsDelivery);
    const currentDeliveryFee = useSelector(selectCurrentDeliveryFee);
    const deliveryDistance = useSelector(selectDeliveryDistance);
    const isFreeDelivery = useSelector(selectIsFreeDelivery);
    const warehouseName = useSelector(selectWarehouseName);
    const deliveryAddress = useSelector(selectDeliveryAddress);
    const activeTariff = useSelector(selectActiveTariff);
    const freeDeliveryInfo = useSelector(selectFreeDeliveryInfo);
    const multipleDeliveryOptions = useSelector(selectMultipleDeliveryOptions);
    const loading = useSelector(selectDeliveryLoading);
    const tariffLoading = useSelector(selectTariffLoading);
    const lastCalculation = useSelector(selectLastCalculation);
    const isCalculationValid = useSelector(selectIsCalculationValid);

    const handleCalculateDeliveryFee = useCallback(
        (deliveryTypeArg) =>
            dispatch(
                calculateDeliveryFee({ deliveryType: deliveryTypeArg || deliveryType })
            ).unwrap(),
        [dispatch, deliveryType]
    );

    const handleFetchActiveTariff = useCallback(
        () => dispatch(fetchActiveTariff()).unwrap(),
        [dispatch]
    );

    const handleFetchFreeDeliveryInfo = useCallback(
        () => dispatch(fetchFreeDeliveryInfo()).unwrap(),
        [dispatch]
    );

    const handleSetDeliveryType = useCallback(
        (type) => dispatch(setDeliveryType(type)),
        [dispatch]
    );

    const handleClearDeliveryCalculation = useCallback(
        () => dispatch(clearDeliveryCalculation()),
        [dispatch]
    );

    const handleClearDeliveryError = useCallback(
        () => dispatch(clearDeliveryError()),
        [dispatch]
    );

    const handleResetDeliveryState = useCallback(
        () => dispatch(resetDeliveryState()),
        [dispatch]
    );

    return {
        deliveryType,
        deliveryCost,
        calculating,
        error,
        totalWithDelivery,
        deliveryMessage,
        isPickup,
        isDelivery,
        currentDeliveryFee,
        deliveryDistance,
        isFreeDelivery,
        warehouseName,
        deliveryAddress,
        activeTariff,
        freeDeliveryInfo,
        multipleDeliveryOptions,
        loading,
        tariffLoading,
        lastCalculation,
        isCalculationValid,
        calculateDeliveryFee: handleCalculateDeliveryFee,
        fetchActiveTariff: handleFetchActiveTariff,
        fetchFreeDeliveryInfo: handleFetchFreeDeliveryInfo,
        setDeliveryType: handleSetDeliveryType,
        clearDeliveryCalculation: handleClearDeliveryCalculation,
        clearDeliveryError: handleClearDeliveryError,
        resetDeliveryState: handleResetDeliveryState
    };
};
