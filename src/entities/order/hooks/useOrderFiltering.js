import { useMemo } from 'react';

export const useOrderFiltering = (staffOrders, filters, canViewAllOrders, actualProcessingRole, relevantStatuses, historyStatuses, showHistory, showWaitingStock = false) => {
    return useMemo(() => {
        // Защищаем от undefined значений
        if (!Array.isArray(staffOrders)) {
            console.warn('useOrderFiltering: staffOrders не является массивом', { staffOrders, type: typeof staffOrders });
            return [];
        }

        // Временное логирование для отладки проблем с вкладками
        if (showWaitingStock || showHistory) {
            console.log('🔍 useOrderFiltering: начало фильтрации', {
                staffOrdersLength: staffOrders.length,
                showWaitingStock,
                showHistory,
                firstOrderStatus: staffOrders[0]?.status,
                statuses: staffOrders.slice(0, 5).map(o => o.status)
            });
        }

        let filtered = [...staffOrders];

        // Фильтрация по режимам просмотра (для всех сотрудников и админов)
        if (showWaitingStock && !showHistory) {
            // В режиме "Ожидают поставки" фильтруем ТОЛЬКО заказы со статусом WAITING_STOCK
            // Дополнительная защита на клиенте для случаев когда сервер вернул не те данные
            filtered = filtered.filter(order => order.status === 'WAITING_STOCK');
            
            // console.log('✅ useOrderFiltering: режим WAITING_STOCK - фильтруем по статусу', {
            //     totalOrders: staffOrders.length,
            //     waitingStockOrders: filtered.length
            // });
        } else if (showHistory && !showWaitingStock) {
            // В режиме "История" сервер уже загрузил все завершенные заказы
            // Не применяем дополнительную фильтрацию на клиенте - показываем все что пришло
            // Это позволяет видеть все завершенные заказы (DELIVERED, CANCELLED, RETURNED)
            // которые вернул сервер через параметр history=true
            
            // ПРИМЕЧАНИЕ: Клиентская фильтрация отключена для истории
            // так как сервер уже вернул нужные данные через параметр history=true
            // console.log('✅ useOrderFiltering: режим История - показываем все заказы с сервера', {
            //     ordersCount: filtered.length
            // });
        } else if (!showHistory && !showWaitingStock) {
            // В режиме "Активные" показываем заказы
            const excludedStatuses = ['DELIVERED', 'CANCELLED', 'RETURNED', 'WAITING_STOCK'];
            
            if (canViewAllOrders) {
                // Админы и обычные сотрудники видят ВСЕ заказы (включая доставленные)
                // Никакой дополнительной фильтрации не применяем
                // console.log('✅ useOrderFiltering: Админ/обычный сотрудник - показываем все заказы', {
                //     totalOrders: filtered.length
                // });
            } else if (actualProcessingRole) {
                // Для ограниченных ролей применяем специфичную фильтрацию
                const restrictedRoles = ['PICKER', 'PACKER', 'COURIER'];
                if (restrictedRoles.includes(actualProcessingRole)) {
                    // Сервер уже отфильтровал по статусам (PICKER: PENDING+CONFIRMED, COURIER: IN_DELIVERY)
                    // Но мы дополнительно проверяем на клиенте для защиты
                    const roleStatusMapping = {
                        'PICKER': ['PENDING', 'CONFIRMED'],
                        'COURIER': ['IN_DELIVERY'],
                        'PACKER': []
                    };
                    const allowedStatuses = roleStatusMapping[actualProcessingRole];
                    if (allowedStatuses && allowedStatuses.length > 0) {
                        filtered = filtered.filter(order => allowedStatuses.includes(order.status));
                    }
                } else {
                    // Для обычных сотрудников - исключаем завершенные и ожидающие
                    filtered = filtered.filter(order => !excludedStatuses.includes(order.status));
                }
            }
        }

        // Поиск
        if (filters?.search && typeof filters.search === 'string') {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(order =>
                order?.orderNumber?.toLowerCase().includes(searchLower) ||
                order?.client?.name?.toLowerCase().includes(searchLower) ||
                order?.client?.phone?.toLowerCase().includes(searchLower) ||
                order?.deliveryAddress?.toLowerCase().includes(searchLower) ||
                order?.comment?.toLowerCase().includes(searchLower) ||
                // Поиск по названиям товаров в заказе
                order?.orderItems?.some(item =>
                    item?.product?.name?.toLowerCase().includes(searchLower)
                )
            );
        }

        // Остальные фильтры
        if (filters?.status && filters.status !== 'all') {
            filtered = filtered.filter(order => order?.status === filters.status);
        }

        if (filters?.priority && filters.priority !== 'all') {
            filtered = filtered.filter(order => order?.priority === filters.priority);
        }

        // Фильтрация по складу (для персонала)
        if (filters?.warehouseId) {
            const warehouseId = parseInt(filters.warehouseId);
            if (!isNaN(warehouseId)) {
                filtered = filtered.filter(order => order?.warehouseId === warehouseId);
            }
        }

        // Фильтрация по району (для персонала)
        if (filters?.districtId) {
            const districtId = parseInt(filters.districtId);
            if (!isNaN(districtId)) {
                filtered = filtered.filter(order => order?.districtId === districtId);
            }
        }

        // Фильтрация по диапазону дат
        if (filters?.dateFrom || filters?.dateTo) {
            try {
                let startDate = null;
                let endDate = null;

                if (filters.dateFrom) {
                    startDate = new Date(filters.dateFrom);
                    startDate.setHours(0, 0, 0, 0);
                }

                if (filters.dateTo) {
                    endDate = new Date(filters.dateTo);
                    endDate.setHours(23, 59, 59, 999);
                }

                filtered = filtered.filter(order => {
                    if (!order?.createdAt) return false;
                    const orderDate = new Date(order.createdAt);

                    // Проверяем нижнюю границу
                    if (startDate && orderDate < startDate) return false;

                    // Проверяем верхнюю границу
                    if (endDate && orderDate > endDate) return false;

                    return true;
                });
            } catch (error) {
                console.warn('Error filtering by date range:', error);
            }
        }

        // Фильтрация по диапазону суммы
        if (filters?.minAmount || filters?.maxAmount) {
            try {
                const minAmount = filters.minAmount ? parseFloat(filters.minAmount) : null;
                const maxAmount = filters.maxAmount ? parseFloat(filters.maxAmount) : null;

                filtered = filtered.filter(order => {
                    const orderAmount = order?.totalAmount;
                    if (typeof orderAmount !== 'number') return false;

                    // Проверяем нижнюю границу
                    if (minAmount !== null && orderAmount < minAmount) return false;

                    // Проверяем верхнюю границу
                    if (maxAmount !== null && orderAmount > maxAmount) return false;

                    return true;
                });
            } catch (error) {
                console.warn('Error filtering by amount range:', error);
            }
        }

        // Логируем только если результат пустой для диагностики
        if (filtered.length === 0 && staffOrders.length > 0) {
            console.log('⚠️ useOrderFiltering: фильтрация не дала результатов', {
                initialCount: staffOrders.length,
                showHistory,
                showWaitingStock
            });
        }

        return filtered;
    }, [staffOrders, filters, canViewAllOrders, actualProcessingRole, relevantStatuses, historyStatuses, showHistory, showWaitingStock]);
};
