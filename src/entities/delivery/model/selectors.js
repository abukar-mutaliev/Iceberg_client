import { createSelector } from '@reduxjs/toolkit';

const EMPTY_DELIVERY_OPTIONS = Object.freeze([]);
const DEFAULT_FREE_DELIVERY_INFO = Object.freeze({
    hasFreeDelivery: false,
    enabled: false,
    message: ''
});
const DEFAULT_TARIFF = Object.freeze({
    fixedFee: null,
    freeDelivery: false,
    name: ''
});

export const selectDeliveryState = (state) => state.delivery;

export const selectDeliveryType = (state) =>
    state.delivery?.selectedDeliveryType || 'DELIVERY';

export const selectActiveTariff = (state) =>
    state.delivery?.activeTariff ?? DEFAULT_TARIFF;

export const selectFreeDeliveryInfo = (state) =>
    state.delivery?.freeDeliveryInfo ?? DEFAULT_FREE_DELIVERY_INFO;

export const selectLastCalculation = (state) => state.delivery?.lastCalculation ?? null;

export const selectDeliveryCalculating = (state) =>
    Boolean(state.delivery?.calculating);

export const selectDeliveryError = (state) => state.delivery?.error ?? null;

export const selectTariffLoading = (state) =>
    Boolean(state.delivery?.tariffLoading);

export const selectIsPickup = (state) =>
    state.delivery?.selectedDeliveryType === 'PICKUP';

export const selectIsDelivery = (state) =>
    state.delivery?.selectedDeliveryType === 'DELIVERY';

export const selectDeliveryCost = createSelector(
    [selectDeliveryState, selectActiveTariff, selectIsPickup],
    (delivery, tariff, isPickup) => {
        if (isPickup) {
            return 0;
        }

        if (delivery?.deliveryCost != null) {
            return delivery.deliveryCost;
        }

        if (tariff?.fixedFee != null) {
            return tariff.fixedFee;
        }

        return 0;
    }
);

export const selectTotalWithDelivery = createSelector(
    [(state) => state.cart?.totalAmount || 0, selectDeliveryCost, selectIsPickup],
    (cartTotal, deliveryCost, isPickup) => cartTotal + (isPickup ? 0 : deliveryCost)
);

export const selectDeliveryMessage = createSelector(
    [selectIsPickup, selectDeliveryCost],
    (isPickup, deliveryCost) => {
        if (isPickup) {
            return 'Самовывоз — бесплатно';
        }
        return `Доставка: ${deliveryCost} ₽`;
    }
);

export const selectIsFreeDelivery = createSelector(
    [selectLastCalculation, selectFreeDeliveryInfo],
    (lastCalculation, freeDeliveryInfo) =>
        Boolean(lastCalculation?.isFreeDelivery || freeDeliveryInfo?.hasFreeDelivery)
);

export const selectDeliveryDistance = createSelector(
    [selectLastCalculation],
    (lastCalculation) => lastCalculation?.distance ?? null
);

export const selectIsCalculationValid = createSelector(
    [selectLastCalculation, selectIsPickup],
    (lastCalculation, isPickup) => isPickup || lastCalculation != null
);

// Deprecated aliases — читают из того же state, без новых объектов на каждый вызов.
export const selectCurrentDeliveryFee = selectDeliveryCost;
export const selectWarehouseName = () => null;
export const selectDeliveryAddress = () => null;
export const selectMultipleDeliveryOptions = () => EMPTY_DELIVERY_OPTIONS;
export const selectDeliveryLoading = selectDeliveryCalculating;
export const selectLastCalculationTime = () => null;
