import { useMemo } from 'react';

export const useOrderFiltering = (staffOrders, filters, canViewAllOrders, actualProcessingRole, relevantStatuses, historyStatuses, showHistory, showWaitingStock = false) => {
    return useMemo(() => {
        // Защищаем от undefined значений
        if (!Array.isArray(staffOrders)) {
            console.warn('useOrderFiltering: staffOrders не является массивом', { staffOrders, type: typeof staffOrders });
            return [];
        }

        console.log('🔍 useOrderFiltering START:', {
            inputCount: staffOrders.length,
            showWaitingStock,
            showHistory,
            statusesSample: staffOrders.slice(0, 3).map(o => ({ id: o.id, status: o.status }))
        });

        let filtered = [...staffOrders];

        // КРИТИЧНО: Фильтрация по режимам просмотра
        if (showWaitingStock && !showHistory) {
            // Режим "Ожидают поставки" - ТОЛЬКО WAITING_STOCK
            filtered = filtered.filter(order => order.status === 'WAITING_STOCK');
            
            console.log('✅ useOrderFiltering: WAITING_STOCK режим', {
                inputCount: staffOrders.length,
                outputCount: filtered.length
            });
        } else if (showHistory && !showWaitingStock) {
            // Режим "История" - только завершенные заказы
            let historicalStatuses;
            
            if (actualProcessingRole === 'PICKER') {
                // Для сборщика: IN_DELIVERY - это уже история (передал курьеру)
                historicalStatuses = ['IN_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'];
            } else if (actualProcessingRole === 'COURIER') {
                // Для курьера: только полностью завершенные
                historicalStatuses = ['DELIVERED', 'CANCELLED', 'RETURNED'];
            } else {
                // Для админов и других: стандартные завершенные
                historicalStatuses = ['DELIVERED', 'CANCELLED', 'RETURNED'];
            }
            
            filtered = filtered.filter(order => historicalStatuses.includes(order.status));
            
            console.log('✅ useOrderFiltering: История', {
                role: actualProcessingRole || 'admin',
                historicalStatuses,
                inputCount: staffOrders.length,
                outputCount: filtered.length
            });
        } else if (!showHistory && !showWaitingStock) {
            // Режим "Активные" - исключаем историю и WAITING_STOCK
            const excludedStatuses = ['DELIVERED', 'CANCELLED', 'RETURNED', 'WAITING_STOCK'];
            
            if (canViewAllOrders) {
                // Админы видят активные заказы (без истории и WAITING_STOCK)
                filtered = filtered.filter(order => !excludedStatuses.includes(order.status));
            } else if (actualProcessingRole) {
                // Для ограниченных ролей - специфичная фильтрация
                const restrictedRoles = ['PICKER', 'PACKER', 'COURIER'];
                
                if (restrictedRoles.includes(actualProcessingRole)) {
                    // Роли с жесткой фильтрацией по статусам
                    const roleStatusMapping = {
                        'PICKER': ['PENDING', 'CONFIRMED'], // Сборщик: ожидающие и подтвержденные
                        'COURIER': ['IN_DELIVERY'], // Курьер: только в доставке
                        'PACKER': [] // Упаковщик - пока не используется
                    };
                    
                    const allowedStatuses = roleStatusMapping[actualProcessingRole];
                    if (allowedStatuses && allowedStatuses.length > 0) {
                        filtered = filtered.filter(order => allowedStatuses.includes(order.status));
                    }
                } else {
                    // Обычные сотрудники - исключаем только завершенные и WAITING_STOCK
                    filtered = filtered.filter(order => !excludedStatuses.includes(order.status));
                }
            }
            
            console.log('✅ useOrderFiltering: Активные', {
                role: actualProcessingRole || (canViewAllOrders ? 'admin' : 'employee'),
                inputCount: staffOrders.length,
                outputCount: filtered.length
            });
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
                order?.orderItems?.some(item =>
                    item?.product?.name?.toLowerCase().includes(searchLower)
                )
            );
        }

        // Фильтр по статусу
        if (filters?.status && filters.status !== 'all') {
            filtered = filtered.filter(order => order?.status === filters.status);
        }

        // Фильтр по приоритету
        if (filters?.priority && filters.priority !== 'all') {
            filtered = filtered.filter(order => order?.priority === filters.priority);
        }

        // Фильтр по складу
        if (filters?.warehouseId) {
            const warehouseId = parseInt(filters.warehouseId);
            if (!isNaN(warehouseId)) {
                filtered = filtered.filter(order => order?.warehouseId === warehouseId);
            }
        }

        // Фильтр по району
        if (filters?.districtId) {
            const districtId = parseInt(filters.districtId);
            if (!isNaN(districtId)) {
                filtered = filtered.filter(order => order?.districtId === districtId);
            }
        }

        // Фильтр по диапазону дат
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

                    if (startDate && orderDate < startDate) return false;
                    if (endDate && orderDate > endDate) return false;

                    return true;
                });
            } catch (error) {
                console.warn('Error filtering by date range:', error);
            }
        }

        // Фильтр по диапазону суммы
        if (filters?.minAmount || filters?.maxAmount) {
            try {
                const minAmount = filters.minAmount ? parseFloat(filters.minAmount) : null;
                const maxAmount = filters.maxAmount ? parseFloat(filters.maxAmount) : null;

                filtered = filtered.filter(order => {
                    const orderAmount = order?.totalAmount;
                    if (typeof orderAmount !== 'number') return false;

                    if (minAmount !== null && orderAmount < minAmount) return false;
                    if (maxAmount !== null && orderAmount > maxAmount) return false;

                    return true;
                });
            } catch (error) {
                console.warn('Error filtering by amount range:', error);
            }
        }

        console.log('🎯 useOrderFiltering RESULT:', {
            finalCount: filtered.length,
            showWaitingStock,
            showHistory
        });

        // Предупреждение только если результат пустой
        if (filtered.length === 0 && staffOrders.length > 0) {
            console.warn('⚠️ useOrderFiltering: все заказы отфильтрованы!', {
                initialCount: staffOrders.length,
                showHistory,
                showWaitingStock,
                initialStatusesSample: staffOrders.slice(0, 5).map(o => ({ id: o.id, status: o.status }))
            });
        }

        return filtered;
    }, [staffOrders, filters, canViewAllOrders, actualProcessingRole, relevantStatuses, historyStatuses, showHistory, showWaitingStock]);
};