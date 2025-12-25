// API
export { default as DeliveryService } from './api/deliveryApi';

// Redux
export { default as deliveryReducer } from './model/slice';
export {
    calculateDeliveryFee,
    calculateMultipleDeliveryFees,
    fetchFreeDeliveryInfo,
    fetchActiveTariff,
    setDeliveryType,
    clearDeliveryCalculation,
    clearDeliveryError,
    resetDeliveryState,
} from './model/slice';

// Selectors
export * from './model/selectors';

// Hooks
export { useDelivery } from './hooks/useDelivery';

// UI Components
export { DeliveryTypeSelector } from './ui/DeliveryTypeSelector/ui/DeliveryTypeSelector';
export { DeliveryInfo } from './ui/DeliveryInfo/ui/DeliveryInfo';

