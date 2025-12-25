// ==========================================
// PaymentScreen/hooks/usePaymentState.js
// Управление состоянием платежа
// ==========================================

import { useState, useMemo } from 'react';

export const usePaymentState = (params = {}) => {
    const {
        orderId,
        orderNumber,
        totalAmount,
        isSplitOrder,
        waitingOrderId,
        waitingOrderNumber,
        waitingOrderAmount,
        checkoutData,
        usePreauthorization: routeUsePreauthorization
    } = params;

    // Основное состояние
    const [paymentUrl, setPaymentUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [paymentCompleted, setPaymentCompleted] = useState(false);
    const [webViewLoading, setWebViewLoading] = useState(true);
    const [createdOrderId, setCreatedOrderId] = useState(null);
    const [paymentId, setPaymentId] = useState(null);

    // Состояние для разделенного заказа
    const [currentPaymentStep, setCurrentPaymentStep] = useState(1);
    const [firstPaymentCompleted, setFirstPaymentCompleted] = useState(false);
    const [secondPaymentId, setSecondPaymentId] = useState(null);

    // Вычисляемые значения
    const currentPaymentId = useMemo(() => {
        return isSplitOrder && currentPaymentStep === 2 ? secondPaymentId : paymentId;
    }, [isSplitOrder, currentPaymentStep, secondPaymentId, paymentId]);

    const currentOrderInfo = useMemo(() => {
        if (isSplitOrder && currentPaymentStep === 2) {
            return {
                id: waitingOrderId,
                number: waitingOrderNumber,
                amount: waitingOrderAmount
            };
        }
        return {
            id: orderId,
            number: orderNumber,
            amount: totalAmount
        };
    }, [isSplitOrder, currentPaymentStep, orderId, orderNumber, totalAmount,
        waitingOrderId, waitingOrderNumber, waitingOrderAmount]);

    // Действия для изменения состояния
    const actions = {
        setPaymentUrl,
        setLoading,
        setError,
        setPaymentCompleted,
        setWebViewLoading,
        setCreatedOrderId,
        setPaymentId,
        setCurrentPaymentStep,
        setFirstPaymentCompleted,
        setSecondPaymentId
    };

    return {
        state: {
            paymentUrl,
            loading,
            error,
            paymentCompleted,
            webViewLoading,
            createdOrderId,
            paymentId,
            currentPaymentStep,
            firstPaymentCompleted,
            secondPaymentId,
            currentPaymentId,
            isSplitOrder,
            waitingOrderAmount,
            checkoutData,
            usePreauthorization: routeUsePreauthorization
        },
        actions,
        currentOrderInfo
    };
};


