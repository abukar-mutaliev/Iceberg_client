import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    calculateDeliveryFee,
    calculateMultipleDeliveryFees,
    fetchFreeDeliveryInfo,
    fetchActiveTariff,
    setDeliveryType,
    clearDeliveryCalculation,
    clearDeliveryError,
    resetDeliveryState,
} from '../model/slice';
import {
    selectDeliveryType,
    selectCurrentDeliveryFee,
    selectDeliveryCost,
    selectDeliveryDistance,
    selectIsFreeDelivery,
    selectWarehouseName,
    selectDeliveryAddress,
    selectActiveTariff,
    selectFreeDeliveryInfo,
    selectMultipleDeliveryOptions,
    selectDeliveryLoading,
    selectDeliveryCalculating,
    selectTariffLoading,
    selectDeliveryError,
    selectLastCalculation,
    selectIsCalculationValid,
    selectTotalWithDelivery,
    selectDeliveryMessage,
    selectIsPickup,
    selectIsDelivery,
} from '../model/selectors';

/**
 * Хук для работы с доставкой
 */
export const useDelivery = () => {
    const dispatch = useDispatch();

    // Селекторы
    const deliveryType = useSelector(selectDeliveryType);
    const currentDeliveryFee = useSelector(selectCurrentDeliveryFee);
    const deliveryCost = useSelector(selectDeliveryCost);
    const deliveryDistance = useSelector(selectDeliveryDistance);
    const isFreeDelivery = useSelector(selectIsFreeDelivery);
    const warehouseName = useSelector(selectWarehouseName);
    const deliveryAddress = useSelector(selectDeliveryAddress);
    const activeTariff = useSelector(selectActiveTariff);
    const freeDeliveryInfo = useSelector(selectFreeDeliveryInfo);
    const multipleDeliveryOptions = useSelector(selectMultipleDeliveryOptions);
    const loading = useSelector(selectDeliveryLoading);
    const calculating = useSelector(selectDeliveryCalculating);
    const tariffLoading = useSelector(selectTariffLoading);
    const error = useSelector(selectDeliveryError);
    const lastCalculation = useSelector(selectLastCalculation);
    const isCalculationValid = useSelector(selectIsCalculationValid);
    const totalWithDelivery = useSelector(selectTotalWithDelivery);
    const deliveryMessage = useSelector(selectDeliveryMessage);
    const isPickup = useSelector(selectIsPickup);
    const isDelivery = useSelector(selectIsDelivery);

    // Действия
    const handleCalculateDeliveryFee = useCallback(
        (warehouseId, deliveryAddressId, orderAmount) => {
            return dispatch(
                calculateDeliveryFee({ warehouseId, deliveryAddressId, orderAmount })
            ).unwrap();
        },
        [dispatch]
    );

    const handleCalculateMultipleDeliveryFees = useCallback(
        (warehouseIds, deliveryAddressId, orderAmount) => {
            return dispatch(
                calculateMultipleDeliveryFees({ warehouseIds, deliveryAddressId, orderAmount })
            ).unwrap();
        },
        [dispatch]
    );

    const handleFetchFreeDeliveryInfo = useCallback(
        (distance, orderAmount) => {
            return dispatch(
                fetchFreeDeliveryInfo({ distance, orderAmount })
            ).unwrap();
        },
        [dispatch]
    );

    const handleFetchActiveTariff = useCallback(
        () => {
            return dispatch(fetchActiveTariff()).unwrap();
        },
        [dispatch]
    );

    const handleSetDeliveryType = useCallback(
        (type) => {
            dispatch(setDeliveryType(type));
        },
        [dispatch]
    );

    const handleClearDeliveryCalculation = useCallback(
        () => {
            dispatch(clearDeliveryCalculation());
        },
        [dispatch]
    );

    const handleClearDeliveryError = useCallback(
        () => {
            dispatch(clearDeliveryError());
        },
        [dispatch]
    );

    const handleResetDeliveryState = useCallback(
        () => {
            dispatch(resetDeliveryState());
        },
        [dispatch]
    );

    return {
        // Данные
        deliveryType,
        currentDeliveryFee,
        deliveryCost,
        deliveryDistance,
        isFreeDelivery,
        warehouseName,
        deliveryAddress,
        activeTariff,
        freeDeliveryInfo,
        multipleDeliveryOptions,
        lastCalculation,
        isCalculationValid,
        totalWithDelivery,
        deliveryMessage,
        isPickup,
        isDelivery,

        // Состояния
        loading,
        calculating,
        tariffLoading,
        error,

        // Действия
        calculateDeliveryFee: handleCalculateDeliveryFee,
        calculateMultipleDeliveryFees: handleCalculateMultipleDeliveryFees,
        fetchFreeDeliveryInfo: handleFetchFreeDeliveryInfo,
        fetchActiveTariff: handleFetchActiveTariff,
        setDeliveryType: handleSetDeliveryType,
        clearDeliveryCalculation: handleClearDeliveryCalculation,
        clearDeliveryError: handleClearDeliveryError,
        resetDeliveryState: handleResetDeliveryState,
    };
};

