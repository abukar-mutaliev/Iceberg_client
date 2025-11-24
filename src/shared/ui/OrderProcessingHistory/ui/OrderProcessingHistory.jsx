import React, { useCallback, useMemo } from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUS_ICONS, EMPLOYEE_ROLE_LABELS } from '@shared/lib/orderConstants';
import { canViewProcessingHistory, formatDate } from '@shared/lib/orderUtils';
import { createOrderDetailsStyles } from '@shared/ui/OrderDetailsStyles';

const styles = createOrderDetailsStyles();

export const OrderProcessingHistory = ({ order, userRole, temporarySteps = [] }) => {
    const canView = canViewProcessingHistory(userRole);

    const getProcessingHistory = useCallback(() => {
        if (!order?.statusHistory || order.statusHistory.length === 0) return [];

        const processingSteps = [];
        
        // Кэш для хранения последних известных сотрудников по ролям
        // Используется для заполнения информации в старых записях без имени
        const lastKnownEmployees = {
            PICKER: { name: '', position: '' },
            PACKER: { name: '', position: '' },
            COURIER: { name: '', position: '' }
        };

        // Анализируем каждый статус в истории
        order.statusHistory.forEach((historyItem, index) => {
            const { status, comment, createdAt } = historyItem;

            // Пропускаем PENDING статус, если это не этап "взял в работу"
            if (status === 'PENDING') {
                const lowerComment = comment ? comment.toLowerCase() : '';
                if (lowerComment.includes('взял заказ в работу') ||
                    lowerComment.includes('взял в работу')) {
                    // Продолжаем обработку для этого комментария
                } else {
                    return;
                }
            }

            // Определяем роль сотрудника и этап по комментарию и статусу
            let role = '';
            let roleLabel = '';
            let stepType = '';
            let actualStatus = status;

            if (comment) {
                const lowerComment = comment.toLowerCase();

                // Сначала проверяем завершение этапов
                if (lowerComment.includes('сборка завершена')) {
                    role = 'PICKER';
                    roleLabel = 'Сборщик';
                    stepType = 'completed';
                    actualStatus = 'CONFIRMED';
                } else if (lowerComment.includes('упаковка завершена')) {
                    role = 'PACKER';
                    roleLabel = 'Упаковщик';
                    stepType = 'completed';
                    actualStatus = 'PACKING_COMPLETED';
                } else if (lowerComment.includes('доставка завершена')) {
                    role = 'COURIER';
                    roleLabel = 'Курьер';
                    stepType = 'completed';
                    actualStatus = 'DELIVERED';
                }
                // Проверяем снятие заказа с работы
                else if (lowerComment.includes('снят с работы') ||
                         lowerComment.includes('снята с работы') ||
                         lowerComment.includes('снят с работы сотрудником')) {
                    stepType = 'released';

                    // Определяем роль по содержимому комментария
                    if (lowerComment.includes('сборщик') ||
                        lowerComment.includes('сборщиком')) {
                        role = 'PICKER';
                        roleLabel = 'Сборщик';
                        actualStatus = 'PENDING';
                    } else if (lowerComment.includes('упаковщик') ||
                              lowerComment.includes('упаковщиком')) {
                        role = 'PACKER';
                        roleLabel = 'Упаковщик';
                        actualStatus = 'CONFIRMED';
                    } else if (lowerComment.includes('курьер') ||
                              lowerComment.includes('курьером')) {
                        role = 'COURIER';
                        roleLabel = 'Курьер';
                        actualStatus = 'IN_DELIVERY';
                    } else {
                        // Если роль не указана явно, определяем по текущему статусу
                        if (status === 'PENDING') {
                            role = 'PICKER';
                            roleLabel = 'Сборщик';
                            actualStatus = 'PENDING';
                        } else if (status === 'CONFIRMED') {
                            role = 'PACKER';
                            roleLabel = 'Упаковщик';
                            actualStatus = 'CONFIRMED';
                        } else if (status === 'IN_DELIVERY') {
                            role = 'COURIER';
                            roleLabel = 'Курьер';
                            actualStatus = 'IN_DELIVERY';
                        }
                    }
                }
                // Затем проверяем взятие в работу
                else if (lowerComment.includes('взял заказ в работу') ||
                         (lowerComment.includes('назначен сотруднику') && lowerComment.includes('взял заказ в работу'))) {
                    stepType = 'started';

                    // Определяем роль по содержимому комментария
                    if (lowerComment.includes('сборщик') ||
                        lowerComment.includes('сборщик заказов') ||
                        lowerComment.includes('сборщиком')) {
                        role = 'PICKER';
                        roleLabel = 'Сборщик';
                        actualStatus = 'PICKING';
                    } else if (lowerComment.includes('упаковщик') ||
                              lowerComment.includes('упаковщиком')) {
                        role = 'PACKER';
                        roleLabel = 'Упаковщик';
                        actualStatus = 'PACKING';
                    } else if (lowerComment.includes('курьер') ||
                              lowerComment.includes('курьером')) {
                        role = 'COURIER';
                        roleLabel = 'Курьер';
                        actualStatus = 'IN_DELIVERY';
                    } else {
                        // Если роль не указана явно, определяем по статусу
                        if (status === 'PENDING') {
                            role = 'PICKER';
                            roleLabel = 'Сборщик';
                            actualStatus = 'PICKING';
                        } else if (status === 'CONFIRMED') {
                            role = 'PACKER';
                            roleLabel = 'Упаковщик';
                            actualStatus = 'PACKING';
                        } else if (status === 'IN_DELIVERY') {
                            role = 'COURIER';
                            roleLabel = 'Курьер';
                            actualStatus = 'IN_DELIVERY';
                        }
                    }
                }
            } else {
                // Fallback для записей без комментария
                switch (status) {
                    case 'CONFIRMED':
                        role = 'PICKER';
                        roleLabel = 'Сборщик';
                        stepType = 'completed';
                        actualStatus = 'CONFIRMED';
                        break;
                    case 'IN_DELIVERY':
                        role = 'PACKER';
                        roleLabel = 'Упаковщик';
                        stepType = 'completed';
                        actualStatus = 'PACKING_COMPLETED';
                        break;
                    case 'DELIVERED':
                        role = 'COURIER';
                        roleLabel = 'Курьер';
                        stepType = 'completed';
                        actualStatus = 'DELIVERED';
                        break;
                    default:
                        return;
                }
            }

            if (!role || !stepType) return;

            // Извлекаем информацию о сотруднике из комментария
            let employeeName = '';
            let employeePosition = '';

            if (comment) {
                // Сначала удаляем маркер employee_id из комментария для правильного парсинга
                const cleanComment = comment.replace(/\[employee_id:\d+\]/g, '').trim();
                
                const specialPatterns = [
                    // Паттерны для комментариев завершения этапов (новый формат)
                    /завершена\. обработано сотрудником (.+?) \((.+?)\)/i,
                    /завершен\. обработано сотрудником (.+?) \((.+?)\)/i,
                    /обработано сотрудником (.+?) \((.+?)\)/i,
                    // Паттерны для комментариев взятия в работу
                    /заказ назначен сотруднику (.+?) \((.+?)\)\. взял заказ в работу/i,
                    /(.+?) \((.+?)\) взял заказ в работу/i,
                    /заказ назначен сотруднику (.+?) \((.+?)\)/i,
                    /автоматически назначен сотруднику (.+?) \((.+?)\)/i,
                    /заказ переназначен сотруднику (.+?) \((.+?)\)/i,
                    // Паттерны для снятия с работы
                    /заказ снят с работы сотрудником (.+?) \((.+?)\)/i,
                    /заказ снят с работы сотрудником (.+?)$/i,
                ];

                let foundMatch = false;
                for (const pattern of specialPatterns) {
                    const match = cleanComment.match(pattern);
                    if (match && match[1]) {
                        employeeName = match[1].trim();
                        if (match[2]) {
                            employeePosition = match[2].trim();
                        }
                        foundMatch = true;
                        break;
                    }
                }

                if (!foundMatch) {
                    const generalPatterns = [
                        /назначен сотруднику (.+?)\./i,
                        /назначен сотруднику (.+?)$/i,
                        /принят сотрудником (.+?) на склад/i,
                        /(.+?) взял заказ в работу/i,
                        /(.+?) взял в работу/i,
                        /(.+?) \((.+?)\)/i
                    ];

                    for (const pattern of generalPatterns) {
                        const match = cleanComment.match(pattern);
                        if (match) {
                            if (match[2]) {
                                employeeName = match[1].trim();
                                employeePosition = match[2].trim();
                                if (!['Сборщик', 'Упаковщик', 'Курьер'].includes(employeePosition)) {
                                    // Оставляем должность как есть
                                } else {
                                    employeePosition = '';
                                }
                            } else if (match[1]) {
                                employeeName = match[1].trim();
                            }
                            break;
                        }
                    }
                }

                // Очистка имени от лишних слов
                if (employeeName) {
                    employeeName = employeeName
                        .replace(/^(заказ|сотруднику|сотрудником)/i, '')
                        .replace(/(заказ|сотруднику|сотрудником)$/i, '')
                        .trim();

                    if (['сотруднику', 'сотрудником', 'заказ', 'работу', 'взял'].includes(employeeName.toLowerCase())) {
                        employeeName = '';
                        employeePosition = '';
                    }
                }
            }

            // Если нашли имя сотрудника, сохраняем его в кэш для этой роли
            if (employeeName && role) {
                lastKnownEmployees[role] = {
                    name: employeeName,
                    position: employeePosition
                };
            }
            
            // Если имя не найдено, но есть роль - пытаемся использовать последнего известного сотрудника
            if (!employeeName && role && lastKnownEmployees[role]?.name) {
                employeeName = lastKnownEmployees[role].name;
                employeePosition = lastKnownEmployees[role].position;
            }

            const stepData = {
                status: actualStatus,
                role,
                roleLabel,
                stepType,
                employeeName,
                employeePosition,
                comment: comment ? comment.replace(/\[employee_id:\d+\]/g, '').trim() : comment, // Удаляем маркер из отображаемого комментария
                createdAt,
                originalStatus: status
            };

            processingSteps.push(stepData);
        });

        // Сортируем по времени создания
        processingSteps.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        // Пост-обработка: добавляем недостающие этапы
        const enhancedSteps = [];
        let lastPickerCompleted = false;
        let lastPackerCompleted = false;

        for (let i = 0; i < processingSteps.length; i++) {
            const step = processingSteps[i];

            // Добавляем текущий этап
            enhancedSteps.push(step);

            // Отслеживаем завершенные этапы
            if (step.role === 'PICKER' && step.stepType === 'completed') {
                lastPickerCompleted = true;
            }
            if (step.role === 'PACKER' && step.stepType === 'completed') {
                lastPackerCompleted = true;
            }

            // Если мы видим курьера, но упаковщик не завершил свой этап,
            // добавляем виртуальный этап завершения упаковки
            if (step.role === 'COURIER' && step.stepType === 'started' &&
                lastPickerCompleted && !lastPackerCompleted) {

                const packingCompletedStep = {
                    status: 'PACKING_COMPLETED',
                    role: 'PACKER',
                    roleLabel: 'Упаковщик',
                    stepType: 'completed',
                    employeeName: '',
                    employeePosition: '',
                    comment: 'Упаковка завершена',
                    createdAt: new Date(step.createdAt).getTime() - 1,
                    originalStatus: 'IN_DELIVERY',
                    isVirtual: true
                };

                enhancedSteps.splice(enhancedSteps.length - 1, 0, packingCompletedStep);
                lastPackerCompleted = true;
            }
        }

        return enhancedSteps;
    }, [order?.statusHistory]);

    const processingSteps = useMemo(() => {
        let allSteps = getProcessingHistory();

        // Всегда добавляем временные этапы, если они есть
        if (temporarySteps && temporarySteps.length > 0) {
            // Фильтруем временные этапы, чтобы избежать дубликатов
            const filteredTempSteps = temporarySteps.filter(tempStep => {
                const duplicateFound = allSteps.some(realStep =>
                    realStep.role === tempStep.role &&
                    realStep.stepType === tempStep.stepType &&
                    realStep.employeeName === tempStep.employeeName
                );
                return !duplicateFound;
            });

            // Добавляем отфильтрованные временные этапы в начало
            allSteps = [...filteredTempSteps, ...allSteps];
        }

        return allSteps;
    }, [getProcessingHistory, temporarySteps]);

    if (!canView || processingSteps.length === 0) {
        return null;
    }

    return (
        <View style={styles.modernCard}>
            <View style={styles.cardHeader}>
                <Icon name="people" size={24} color="#667eea" />
                <Text style={styles.cardTitle}>История обработки заказа</Text>
            </View>

            <View style={styles.processingStepsContainer}>
                {processingSteps.map((step, index) => {
                    // Формируем правильный заголовок этапа
                    let stepTitle = '';
                    if (step.stepType === 'started') {
                        stepTitle = `${step.roleLabel} взял в работу`;
                    } else if (step.stepType === 'released') {
                        stepTitle = `${step.roleLabel} снял с работы`;
                    } else if (step.stepType === 'completed') {
                        switch (step.role) {
                            case 'PICKER':
                                stepTitle = 'Сборка завершена';
                                break;
                            case 'PACKER':
                                stepTitle = 'Упаковка завершена';
                                break;
                            case 'COURIER':
                                stepTitle = 'Доставка завершена';
                                break;
                            default:
                                stepTitle = ORDER_STATUS_LABELS[step.status] || 'Этап завершен';
                        }
                    } else {
                        stepTitle = ORDER_STATUS_LABELS[step.status] || step.roleLabel;
                    }

                    return (
                        <View key={`${index}-${step.status}-${step.stepType}`} style={[
                            styles.processingStep,
                            index === processingSteps.length - 1 && styles.lastProcessingStep,
                            step.isVirtual && styles.virtualStep,
                            step.isTemporary && styles.temporaryStep
                        ]}>
                            <View style={styles.stepHeader}>
                                <View style={styles.stepRole}>
                                    <View style={[styles.roleBadge, { backgroundColor: ORDER_STATUS_COLORS[step.status] }]}>
                                        <Icon name={ORDER_STATUS_ICONS[step.status]} size={16} color="#fff" />
                                        <Text style={styles.roleLabel}>{step.roleLabel}</Text>
                                    </View>
                                    <Text style={styles.stepStatus}>
                                        {stepTitle}
                                    </Text>
                                </View>
                                <Text style={styles.stepDate}>
                                    {step.isVirtual ?
                                        'Автоматически' :
                                        step.isTemporary ?
                                            'Только что' :
                                            new Date(step.createdAt).toLocaleString('ru-RU')
                                    }
                                </Text>
                            </View>

                            {step.employeeName && (
                                <View style={styles.stepEmployee}>
                                    <Icon name="person" size={16} color="#667eea" />
                                    <View style={styles.employeeInfo}>
                                        <Text style={styles.employeeName}>
                                            {step.employeeName}
                                        </Text>
                                        {step.employeePosition && (
                                            <Text style={styles.employeePosition}>
                                                {step.employeePosition}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            )}

                            {step.comment && !step.isVirtual && (
                                <View style={styles.stepComment}>
                                    <Icon name="comment" size={14} color="#718096" />
                                    <Text style={styles.commentText}>
                                        {step.comment}
                                    </Text>
                                </View>
                            )}

                            {step.isVirtual && (
                                <View style={styles.stepComment}>
                                    <Icon name="info" size={14} color="#718096" />
                                    <Text style={[styles.commentText, styles.virtualComment]}>
                                        Этап завершен автоматически при переходе к доставке
                                    </Text>
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>
        </View>
    );
};


