import { createProtectedRequest, createPublicRequest } from "@shared/api/api";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const OrderApi = {
    // ===== ПОЛУЧЕНИЕ ЗАКАЗОВ =====

    // Получить мои заказы (для клиентов)
    getMyOrders: (params = {}) => {
        const queryParams = {
            page: params.page || 1,
            limit: params.limit || 10,
            status: params.status,
            sortBy: params.sortBy || 'createdAt',
            sortOrder: params.sortOrder || 'desc',
            _t: Date.now()
        };

        // Фильтруем undefined значения
        const filteredParams = Object.fromEntries(
            Object.entries(queryParams).filter(([key, value]) => value !== undefined)
        );

        const queryString = new URLSearchParams(filteredParams).toString();
        const url = `/api/orders/my${queryString ? `?${queryString}` : ''}`;

        return createProtectedRequest('GET', url, null, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    },

    // Получить заказы (для персонала)
    getOrders: (params = {}) => {
        const queryParams = {
            page: params.page || 1,
            limit: params.limit || 20,
            status: params.status,
            warehouseId: params.warehouseId,
            assignedToMe: params.assignedToMe,
            districtId: params.districtId,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            sortBy: params.sortBy || 'createdAt',
            sortOrder: params.sortOrder || 'desc',
            priority: params.priority,
            includeNearbyDistricts: params.includeNearbyDistricts || false,
            availableForPickup: params.availableForPickup || false,
            _t: Date.now()
        };

        // Фильтруем undefined значения
        const filteredParams = Object.fromEntries(
            Object.entries(queryParams).filter(([key, value]) => value !== undefined)
        );

        const queryString = new URLSearchParams(filteredParams).toString();
        const url = `/api/orders${queryString ? `?${queryString}` : ''}`;

        console.log('OrderApi: getOrders вызван', {
            url,
            params: filteredParams,
            timestamp: new Date().toISOString()
        });

        return createProtectedRequest('GET', url, null, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        }).then(response => {
            console.log('OrderApi: getOrders ответ получен', {
                url,
                status: response.status,
                dataLength: response.data?.data?.length || 0,
                timestamp: new Date().toISOString()
            });

            // Логируем статусы заказов для отладки
            if (response.data?.data) {
                const statusStats = response.data.data.reduce((acc, order) => {
                    acc[order.status] = (acc[order.status] || 0) + 1;
                    return acc;
                }, {});
                console.log('OrderApi: статусы заказов в ответе', statusStats);
            }

            return response;
        });
    },

    // Получить конкретный заказ по ID
    getOrderById: (orderId) => {
        const url = `/api/orders/${orderId}?_t=${Date.now()}`;
        return createProtectedRequest('GET', url, null, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    },

    // ===== УПРАВЛЕНИЕ ЗАКАЗАМИ =====

    // Обновить статус заказа
    updateOrderStatus: (orderId, statusData) => {
        const url = `/api/orders/${orderId}/status`;
        const data = {
            status: statusData.status,
            comment: statusData.comment,
            notifyClient: statusData.notifyClient !== false // по умолчанию true
        };
        return createProtectedRequest('PATCH', url, data);
    },

    // Назначить заказ сотруднику
    assignOrder: (orderId, assignmentData) => {
        const url = `/api/orders/${orderId}/assign`;
        const data = {
            assignedToId: assignmentData.assignedToId,
            reason: assignmentData.reason
        };
        return createProtectedRequest('PATCH', url, data);
    },

    // Завершить этап обработки заказа (с автоматическим переходом к следующему этапу)
    completeOrderStage: async (orderId, comment = null) => {
        const url = `/api/orders/${orderId}/complete-stage`;
        const data = comment ? { comment } : {};

        const response = await createProtectedRequest('PATCH', url, data);

        return response;
    },

    // Взять заказ в работу (самоназначение)
    takeOrder: (orderId, reason = null) => {
        const url = `/api/orders/${orderId}/take`;
        const data = reason ? { reason } : {};
        return createProtectedRequest('PATCH', url, data);
    },

    // Снять заказ с работы (отменить самоназначение)
    releaseOrder: (orderId, reason = null) => {
        const url = `/api/orders/${orderId}/release`;
        const data = reason ? { reason } : {};
        return createProtectedRequest('PATCH', url, data);
    },

    // Принять заказ из соседнего района
    pickupOrder: (orderId, pickupData) => {
        const url = `/api/orders/${orderId}/pickup`;
        const data = {
            newWarehouseId: pickupData.newWarehouseId,
            reason: pickupData.reason || 'Обработка заказа из соседнего района'
        };
        return createProtectedRequest('PATCH', url, data);
    },

    // Получить доступные заказы для перехвата
    getAvailableOrdersForPickup: (params = {}) => {
        const queryParams = {
            warehouseId: params.warehouseId,
            districtId: params.districtId,
            productIds: params.productIds,
            _t: Date.now()
        };

        const filteredParams = Object.fromEntries(
            Object.entries(queryParams).filter(([key, value]) => value !== undefined)
        );

        const queryString = new URLSearchParams(filteredParams).toString();
        const url = `/api/orders/available-for-pickup${queryString ? `?${queryString}` : ''}`;

        return createProtectedRequest('GET', url, null, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    },

    // Отменить заказ
    cancelOrder: (orderId, cancellationData) => {
        const url = `/api/orders/${orderId}/cancel`;
        const data = {
            reason: cancellationData.reason,
            refundAmount: cancellationData.refundAmount
        };
        return createProtectedRequest('PATCH', url, data);
    },

    // Отменить свой заказ (для клиентов)
    cancelMyOrder: (orderId, reason) => {
        const url = `/api/orders/my/${orderId}/cancel`;
        const data = { reason };
        return createProtectedRequest('PATCH', url, data);
    },

    // ===== СОЗДАНИЕ ЗАКАЗОВ =====

    // Создать заказ для клиента (персоналом)
    createOrderForClient: (orderData) => {
        const url = '/api/orders/create';
        const data = {
            clientId: orderData.clientId,
            items: orderData.items,
            deliveryAddress: orderData.deliveryAddress,
            comment: orderData.comment,
            expectedDeliveryDate: orderData.expectedDeliveryDate,
            warehouseId: orderData.warehouseId
        };
        return createProtectedRequest('POST', url, data);
    },

    // ===== МАССОВЫЕ ОПЕРАЦИИ =====

    // Массовое обновление заказов
    bulkUpdateOrders: (bulkData) => {
        const url = '/api/orders/bulk';
        const data = {
            orderIds: bulkData.orderIds,
            action: bulkData.action,
            data: bulkData.data
        };
        return createProtectedRequest('PATCH', url, data);
    },

    // ===== СТАТИСТИКА И ЭКСПОРТ =====

    // Получить статистику заказов
    getOrdersStats: (params = {}) => {
        const queryParams = {
            period: params.period || 'week',
            warehouseId: params.warehouseId,
            employeeId: params.employeeId,
            _t: Date.now()
        };

        // Фильтруем undefined значения
        const filteredParams = Object.fromEntries(
            Object.entries(queryParams).filter(([key, value]) => value !== undefined)
        );

        const queryString = new URLSearchParams(filteredParams).toString();
        const url = `/api/orders/stats${queryString ? `?${queryString}` : ''}`;

        return createProtectedRequest('GET', url, null, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    },

    // Экспорт заказов
    exportOrders: (exportData) => {
        const url = '/api/orders/export';
        const data = {
            format: exportData.format || 'excel',
            filters: exportData.filters || {},
            fields: exportData.fields || []
        };
        return createProtectedRequest('POST', url, data, {
            responseType: 'blob'
        });
    },

    // Скачать накладную заказа в PDF
    downloadInvoice: (orderId) => {
        const url = `/api/orders/${orderId}/invoice`;
        return createProtectedRequest('GET', url, null, {
            responseType: 'blob',
            headers: {
                'Accept': 'application/pdf'
            }
        });
    },

    // Альтернативный метод скачивания через fetch API
    downloadInvoiceDirect: async (orderId) => {
        const baseUrl = process.env.NODE_ENV === 'development'
            ? (Platform.OS === 'android' ? 'http://192.168.1.226:5000' : 'http://localhost:5000')
            : 'http://212.67.11.134:5000';

        const url = `${baseUrl}/api/orders/${orderId}/invoice`;

        // Получаем токен из AsyncStorage
        const tokens = await AsyncStorage.getItem('tokens');
        const parsedTokens = tokens ? JSON.parse(tokens) : null;

        if (!parsedTokens?.accessToken) {
            throw new Error('Токен авторизации не найден');
        }

        console.log('downloadInvoiceDirect: начинаем fetch запрос', {
            url,
            orderId,
            hasToken: !!parsedTokens.accessToken
        });

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${parsedTokens.accessToken}`,
                'Accept': 'application/pdf',
                'Content-Type': 'application/json'
            }
        });

        console.log('downloadInvoiceDirect: получен response', {
            status: response.status,
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length')
        });

        if (!response.ok) {
            console.error('downloadInvoiceDirect: ошибка response', response.status);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Проверяем Content-Type
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.includes('application/pdf')) {
            console.warn('downloadInvoiceDirect: неожиданный Content-Type:', contentType);
            throw new Error(`Сервер вернул ${contentType} вместо application/pdf`);
        }

        const blob = await response.blob();
        console.log('downloadInvoiceDirect: создан blob', {
            size: blob.size,
            type: blob.type
        });

        return blob;
    },

    // ===== ДОПОЛНИТЕЛЬНЫЕ УТИЛИТЫ =====

    // Получить возможные статусы для заказа
    getAvailableStatuses: (currentStatus) => {
        const statusTransitions = {
            'PENDING': [
                { value: 'CONFIRMED', label: 'Подтвердить', color: '#28a745' },
                { value: 'CANCELLED', label: 'Отменить', color: '#dc3545' }
            ],
            'CONFIRMED': [
                { value: 'IN_DELIVERY', label: 'В доставку', color: '#fd7e14' },
                { value: 'CANCELLED', label: 'Отменить', color: '#dc3545' }
            ],
            'IN_DELIVERY': [
                { value: 'DELIVERED', label: 'Доставлено', color: '#28a745' },
                { value: 'CANCELLED', label: 'Отменить', color: '#dc3545' }
            ],
            'DELIVERED': [
                { value: 'RETURNED', label: 'Вернуть', color: '#6c757d' }
            ],
            'CANCELLED': [],
            'RETURNED': []
        };

        return statusTransitions[currentStatus] || [];
    },

    // Получить локализованное название статуса
    getStatusLabel: (status) => {
        const statusLabels = {
            'PENDING': 'Ожидает обработки',
            'CONFIRMED': 'Подтвержден',
            'WAITING_STOCK': 'Ожидает товар',
            'IN_DELIVERY': 'В доставке',
            'DELIVERED': 'Доставлен',
            'CANCELLED': 'Отменен',
            'RETURNED': 'Возвращен'
        };

        return statusLabels[status] || status;
    },

    // Получить цвет статуса
    getStatusColor: (status) => {
        const statusColors = {
            'PENDING': '#ffc107',
            'CONFIRMED': '#17a2b8',
            'IN_DELIVERY': '#007bff',
            'DELIVERED': '#28a745',
            'CANCELLED': '#dc3545',
            'RETURNED': '#6c757d'
        };

        return statusColors[status] || '#6c757d';
    },

    // Проверить, можно ли отменить заказ
    canCancelOrder: (status, userRole = 'CLIENT') => {
        if (userRole === 'CLIENT') {
            return status === 'PENDING';
        }

        return ['PENDING', 'CONFIRMED', 'IN_DELIVERY'].includes(status);
    },

    // Проверить, можно ли оставить отзыв на заказ
    canLeaveReview: (status) => {
        return status === 'DELIVERED';
    },

    // Форматировать номер заказа для отображения
    formatOrderNumber: (orderNumber) => {
        if (!orderNumber) return '';

        // Если номер содержит префикс ORD-, оставляем как есть
        if (orderNumber.startsWith('ORD-')) {
            return orderNumber;
        }

        // Иначе добавляем префикс №
        return `№${orderNumber}`;
    },

    // Вычислить примерное время доставки
    calculateEstimatedDelivery: (orderData) => {
        const now = new Date();
        const estimatedDays = 1; // базовое время доставки

        // Добавляем время в зависимости от количества поставщиков
        const uniqueSuppliers = new Set(
            (orderData.items || []).map(item => item.product?.supplier?.id)
        ).size;

        const additionalDays = Math.max(0, uniqueSuppliers - 1);

        const deliveryDate = new Date(now);
        deliveryDate.setDate(deliveryDate.getDate() + estimatedDays + additionalDays);

        return deliveryDate;
    },

    // ===== РАЗДЕЛЕНИЕ ЗАКАЗОВ =====

    // Получить информацию о разделенных заказах по номеру оригинального заказа
    getSplitOrderInfo: (originalOrderNumber) => {
        const url = `/api/order-alternatives/split-orders/${originalOrderNumber}?_t=${Date.now()}`;
        return createProtectedRequest('GET', url, null, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    },

    // Проверить возможность разделения заказа
    checkOrderSplitPossibility: (orderId) => {
        const url = `/api/order-alternatives/orders/${orderId}/split-possibility?_t=${Date.now()}`;
        return createProtectedRequest('GET', url, null, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    }
};

export default OrderApi;