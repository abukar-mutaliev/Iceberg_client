import { CONSTANTS } from './constants';

export const orderStateHelpers = {
    canTakeOrder(order, localAction, currentUser) {
        // Защитные проверки
        if (!order || !currentUser) {
            return false;
        }

        if (!Array.isArray(CONSTANTS.COMPLETED_STATUSES)) {
            return false;
        }

        if (CONSTANTS.COMPLETED_STATUSES.includes(order.status)) {
            return false;
        }

        const wasRecentlyCleared = localAction?.timestamp &&
            (Date.now() - localAction.timestamp) < CONSTANTS.RECENT_ACTION_THRESHOLD;

        // Если заказ был недавно снят с работы, он доступен для взятия
        const wasRecentlyReleased = localAction?.released && localAction?.timestamp &&
            (Date.now() - localAction.timestamp) < CONSTANTS.RECENT_ACTION_THRESHOLD;

        // Отладка
        if (order.id === 11) { // Замените на ID проблемного заказа для отладки
            console.log('🔍 canTakeOrder debug for order', order.id, {
                assignedTo: order.assignedTo,
                localAction,
                wasRecentlyCleared,
                wasRecentlyReleased,
                canTakeBasedOnAssignment: !(order.assignedTo && order.assignedTo.id !== currentUser?.employee?.id && !wasRecentlyCleared && !wasRecentlyReleased)
            });
        }

        if (order.assignedTo && order.assignedTo.id !== currentUser?.employee?.id && !wasRecentlyCleared && !wasRecentlyReleased) {
            return false;
        }

        // Проверка истории работы с заказом
        if (Array.isArray(order.statusHistory) && !wasRecentlyCleared) {
            const hasWorkedOnOrder = order.statusHistory.some(historyItem => {
                if (!historyItem?.comment) return false;

                const hasEmployeeName = currentUser?.employee?.name &&
                    historyItem.comment.includes(currentUser.employee.name);
                const hasEmployeePosition = currentUser?.employee?.position &&
                    historyItem.comment.includes(currentUser.employee.position);

                return hasEmployeeName || hasEmployeePosition;
            });

            if (hasWorkedOnOrder) {
                return false;
            }
        }

        return !this.getEffectiveAssignedTo(order, localAction, currentUser);
    },

    isTakenByCurrentUser(order, localAction, currentUser) {
        // Защитные проверки
        if (!order || !currentUser) {
            return false;
        }

        // Отладка
        if (order.id === 11) {
            console.log('🔍 isTakenByCurrentUser debug for order', order.id, {
                localAction,
                orderAssignedTo: order.assignedTo,
                currentUserEmployeeId: currentUser?.employee?.id,
                localActionTaken: localAction?.taken
            });
        }

        if (localAction?.taken) {
            return true;
        }

        const effectiveAssignedTo = this.getEffectiveAssignedTo(order, localAction, currentUser);
        return Boolean(effectiveAssignedTo?.id &&
            currentUser?.employee?.id &&
            effectiveAssignedTo.id === currentUser.employee.id);
    },

    getEffectiveAssignedTo(order, localAction, currentUser) {
        // Защитные проверки
        if (!order || !currentUser) {
            return null;
        }

        const wasRecentlyTaken = localAction?.taken && !localAction?.released;
        const wasRecentlyReleased = localAction?.released && localAction?.timestamp &&
            (Date.now() - localAction.timestamp) < CONSTANTS.RECENT_ACTION_THRESHOLD;
        const wasRecentlyCleared = localAction?.timestamp &&
            (Date.now() - localAction.timestamp) < CONSTANTS.RECENT_ACTION_THRESHOLD;

        if (wasRecentlyTaken) {
            return { id: currentUser?.employee?.id };
        } else if (wasRecentlyReleased) {
            return null; // Заказ был снят с работы, доступен для взятия
        } else if (wasRecentlyCleared) {
            return null;
        } else {
            return order.assignedTo;
        }
    }
};
