/**
 * Селекторы для delivery entity
 */

// Базовые селекторы
export const selectDeliveryState = (state) => state.delivery;

export const selectDeliveryType = (state) => state.delivery?.selectedDeliveryType || 'DELIVERY';

export const selectCurrentDeliveryFee = (state) => state.delivery?.currentDeliveryFee;

export const selectDeliveryCost = (state) => state.delivery?.deliveryCost || 0;

export const selectDeliveryDistance = (state) => state.delivery?.deliveryDistance;

export const selectIsFreeDelivery = (state) => state.delivery?.isFreeDelivery || false;

export const selectWarehouseName = (state) => state.delivery?.warehouseName;

export const selectDeliveryAddress = (state) => state.delivery?.deliveryAddress;

// Активный тариф
export const selectActiveTariff = (state) => state.delivery?.activeTariff;

// Информация о бесплатной доставке
export const selectFreeDeliveryInfo = (state) => state.delivery?.freeDeliveryInfo;

// Множественные варианты доставки
export const selectMultipleDeliveryOptions = (state) => state.delivery?.multipleDeliveryOptions || [];

// Состояния загрузки
export const selectDeliveryLoading = (state) => state.delivery?.loading || false;

export const selectDeliveryCalculating = (state) => state.delivery?.calculating || false;

export const selectTariffLoading = (state) => state.delivery?.tariffLoading || false;

// Ошибки
export const selectDeliveryError = (state) => state.delivery?.error;

// Последний расчет
export const selectLastCalculation = (state) => state.delivery?.lastCalculation;

export const selectLastCalculationTime = (state) => state.delivery?.lastCalculationTime;

// Сложные селекторы
export const selectIsPickup = (state) => state.delivery?.selectedDeliveryType === 'PICKUP';

export const selectIsDelivery = (state) => state.delivery?.selectedDeliveryType === 'DELIVERY';

/**
 * Проверяет, актуален ли текущий расчет доставки (не старше 5 минут)
 */
export const selectIsCalculationValid = (state) => {
    const lastTime = state.delivery?.lastCalculationTime;
    if (!lastTime) return false;
    
    const FIVE_MINUTES = 5 * 60 * 1000;
    return Date.now() - lastTime < FIVE_MINUTES;
};

/**
 * Получить итоговую стоимость с учетом доставки
 */
export const selectTotalWithDelivery = (state) => {
    const cartTotal = state.cart?.totalAmount || 0;
    const deliveryCost = state.delivery?.deliveryCost || 0;
    const isPickup = state.delivery?.selectedDeliveryType === 'PICKUP';
    
    return cartTotal + (isPickup ? 0 : deliveryCost);
};

/**
 * Получить сообщение о доставке для UI
 */
export const selectDeliveryMessage = (state) => {
    const deliveryType = state.delivery?.selectedDeliveryType;
    const isFreeDelivery = state.delivery?.isFreeDelivery;
    const deliveryCost = state.delivery?.deliveryCost;
    const distance = state.delivery?.deliveryDistance;
    
    if (deliveryType === 'PICKUP') {
        return 'Самовывоз - бесплатно';
    }
    
    if (isFreeDelivery) {
        return distance 
            ? `Бесплатная доставка (${distance.toFixed(1)} км)` 
            : 'Бесплатная доставка';
    }
    
    if (deliveryCost > 0) {
        return distance 
            ? `Доставка: ${deliveryCost}₽ (${distance.toFixed(1)} км)` 
            : `Доставка: ${deliveryCost}₽`;
    }
    
    return 'Доставка';
};

