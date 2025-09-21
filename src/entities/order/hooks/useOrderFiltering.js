import { useMemo } from 'react';

export const useOrderFiltering = (staffOrders, filters, canViewAllOrders, actualProcessingRole, relevantStatuses, historyStatuses, showHistory) => {
    return useMemo(() => {
        // Защищаем от undefined значений
        if (!Array.isArray(staffOrders)) {
            console.log('❌ useOrderFiltering: staffOrders не является массивом', { staffOrders, type: typeof staffOrders });
            return [];
        }

        console.log('🔍 useOrderFiltering: начало фильтрации', {
            staffOrdersLength: staffOrders.length,
            canViewAllOrders,
            actualProcessingRole,
            showHistory,
            relevantStatuses,
            historyStatuses,
            filters
        });

        let filtered = [...staffOrders];

        // Фильтрация по ролям
        if (!canViewAllOrders && actualProcessingRole) {
            const targetStatuses = showHistory ? historyStatuses : relevantStatuses;
            console.log('🎯 useOrderFiltering: фильтрация по ролям', {
                showHistory,
                targetStatuses,
                relevantStatusesLength: relevantStatuses.length,
                historyStatusesLength: historyStatuses.length,
                actualProcessingRole
            });

            if (targetStatuses && targetStatuses.length > 0) {
                filtered = filtered.filter(order => {
                    const includes = targetStatuses.includes(order.status);
                    if (!includes) {
                        console.log('❌ useOrderFiltering: заказ отфильтрован', {
                            orderId: order.id,
                            orderStatus: order.status,
                            targetStatuses
                        });
                    }
                    return includes;
                });
            } else {
                console.log('⚠️ useOrderFiltering: targetStatuses пустой или undefined', {
                    targetStatuses,
                    showHistory,
                    relevantStatuses,
                    historyStatuses
                });

                // Если targetStatuses пустой, показываем заказы в зависимости от роли
                if (!showHistory) {
                    // Для активных заказов показываем заказы, которые можно взять в работу
                    switch (actualProcessingRole) {
                        case 'PICKER':
                            filtered = filtered.filter(order => order.status === 'PENDING');
                            break;
                        case 'PACKER':
                            // Этап упаковки убран - PACKER больше не фильтрует заказы
                            // Сборщик сразу передает заказы курьерам
                            filtered = [];
                            break;
                        case 'COURIER':
                            filtered = filtered.filter(order => order.status === 'IN_DELIVERY');
                            break;
                        default:
                            // Для неизвестных ролей показываем все заказы, кроме завершенных
                            filtered = filtered.filter(order =>
                                !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.status)
                            );
                    }
                } else {
                    // Для истории показываем заказы согласно роли сотрудника
                    if (historyStatuses && historyStatuses.length > 0) {
                        filtered = filtered.filter(order => historyStatuses.includes(order.status));
                    } else {
                        // Fallback: показываем завершенные заказы
                        filtered = filtered.filter(order =>
                            ['DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.status)
                        );
                    }
                }
                console.log('✅ useOrderFiltering: применена fallback фильтрация', {
                    actualProcessingRole,
                    showHistory,
                    filteredLength: filtered.length
                });
            }
        } else {
            console.log('🔄 useOrderFiltering: пропускаем фильтрацию по ролям', {
                canViewAllOrders,
                actualProcessingRole,
                relevantStatusesType: typeof relevantStatuses,
                historyStatusesType: typeof historyStatuses
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

                console.log('📅 useOrderFiltering: фильтрация по диапазону дат', {
                    dateFrom: filters.dateFrom,
                    dateTo: filters.dateTo,
                    startDate: startDate?.toISOString(),
                    endDate: endDate?.toISOString(),
                    ordersBeforeFiltering: filtered.length
                });

                filtered = filtered.filter(order => {
                    if (!order?.createdAt) return false;
                    const orderDate = new Date(order.createdAt);

                    // Проверяем нижнюю границу
                    if (startDate && orderDate < startDate) return false;

                    // Проверяем верхнюю границу
                    if (endDate && orderDate > endDate) return false;

                    return true;
                });

                console.log('📅 useOrderFiltering: результат фильтрации по дате', {
                    ordersAfterFiltering: filtered.length,
                    showHistory
                });
            } catch (error) {
                console.warn('Error filtering by date range:', error);
            }
        }

        console.log('✅ useOrderFiltering: результат фильтрации', {
            originalLength: staffOrders.length,
            filteredLength: filtered.length,
            showHistory
        });

        return filtered;
    }, [staffOrders, filters, canViewAllOrders, actualProcessingRole, relevantStatuses, historyStatuses, showHistory]);
};
