import PushNotification from 'react-native-push-notification';
import { OrderAlternativesApi } from '@entities/order';

/**
 * Сервис для обработки push-уведомлений о предложениях выбора
 */
class OrderChoiceNotificationsService {
    /**
     * Обработка входящего push-уведомления о предложении выбора
     * @param {Object} notificationData - Данные уведомления
     */
    static handleChoiceNotification(notificationData) {
        try {
            const { choiceId, orderId, choiceType, title, message, expiresAt } = notificationData;

            console.log('📱 OrderChoiceNotifications: Получено уведомление о предложении', {
                choiceId,
                orderId,
                choiceType,
                title
            });

            // Создаем локальное уведомление
            PushNotification.localNotification({
                id: `choice_${choiceId}`,
                title: title || 'Требуется ваш выбор',
                message: message || 'По вашему заказу требуется принять решение',
                priority: 'high',
                importance: 'high',
                vibrate: true,
                playSound: true,
                soundName: 'default',
                actions: ['Посмотреть', 'Позже'],
                invokeApp: true,
                userInfo: {
                    type: 'ORDER_CHOICE',
                    choiceId,
                    orderId,
                    choiceType,
                    expiresAt
                },
                // Для срочных уведомлений добавляем расписание повтора
                ...(this.isUrgentChoice(expiresAt) && {
                    repeatType: 'time',
                    repeatTime: 30 * 60 * 1000 // Повтор через 30 минут для срочных
                })
            });

            // Обновляем badge приложения
            this.updateChoicesBadge();

        } catch (error) {
            console.error('❌ OrderChoiceNotifications: Ошибка обработки уведомления', error);
        }
    }

    /**
     * Проверяет, является ли предложение срочным
     */
    static isUrgentChoice(expiresAt) {
        if (!expiresAt) return false;
        const timeLeft = new Date(expiresAt) - new Date();
        return timeLeft > 0 && timeLeft <= 2 * 60 * 60 * 1000; // Менее 2 часов
    }

    /**
     * Обновляет badge приложения с количеством активных предложений
     */
    static async updateChoicesBadge() {
        try {
            const result = await OrderAlternativesApi.getMyChoices();
            
            if (result.success) {
                const activeChoicesCount = result.data?.length || 0;
                
                PushNotification.setApplicationIconBadgeNumber(activeChoicesCount);
                
                console.log('📱 OrderChoiceNotifications: Badge обновлен', {
                    activeChoicesCount
                });
            }
        } catch (error) {
            console.error('❌ OrderChoiceNotifications: Ошибка обновления badge', error);
        }
    }

    /**
     * Очистка уведомлений при ответе на предложение
     */
    static clearChoiceNotification(choiceId) {
        try {
            PushNotification.cancelLocalNotifications({
                id: `choice_${choiceId}`
            });

            console.log('📱 OrderChoiceNotifications: Уведомление очищено', { choiceId });
        } catch (error) {
            console.error('❌ OrderChoiceNotifications: Ошибка очистки уведомления', error);
        }
    }

    /**
     * Настройка обработчиков действий уведомлений
     */
    static setupNotificationHandlers(navigation) {
        // Обработка нажатия на уведомление
        PushNotification.configure({
            onNotification: function(notification) {
                console.log('📱 OrderChoiceNotifications: Нажатие на уведомление', notification);

                if (notification.userInfo?.type === 'ORDER_CHOICE') {
                    const { choiceId, orderId } = notification.userInfo;

                    if (notification.userInteraction) {
                        // Переходим к экрану выбора
                        navigation.navigate('OrderChoice', {
                            choiceId,
                            orderId,
                            fromNotification: true
                        });
                    }
                }
            },

            onAction: function(notification, action) {
                console.log('📱 OrderChoiceNotifications: Действие уведомления', {
                    action,
                    notification: notification.userInfo
                });

                if (notification.userInfo?.type === 'ORDER_CHOICE') {
                    const { choiceId, orderId } = notification.userInfo;

                    switch (action) {
                        case 'Посмотреть':
                            navigation.navigate('OrderChoice', {
                                choiceId,
                                orderId,
                                fromNotification: true
                            });
                            break;
                        case 'Позже':
                            // Просто закрываем уведомление
                            break;
                    }
                }
            },

            requestPermissions: Platform.OS === 'ios',
        });
    }

    /**
     * Планирование напоминания о срочных предложениях
     */
    static scheduleUrgentReminder(choiceId, orderId, expiresAt) {
        try {
            if (!expiresAt) return;

            const expiryTime = new Date(expiresAt);
            const reminderTime = new Date(expiryTime.getTime() - 30 * 60 * 1000); // За 30 минут до истечения

            if (reminderTime > new Date()) {
                PushNotification.localNotificationSchedule({
                    id: `reminder_${choiceId}`,
                    title: '⏰ Время выбора истекает!',
                    message: 'У вас осталось 30 минут для принятия решения по заказу',
                    date: reminderTime,
                    priority: 'high',
                    importance: 'high',
                    vibrate: true,
                    playSound: true,
                    soundName: 'default',
                    userInfo: {
                        type: 'ORDER_CHOICE_REMINDER',
                        choiceId,
                        orderId
                    }
                });

                console.log('📱 OrderChoiceNotifications: Напоминание запланировано', {
                    choiceId,
                    reminderTime
                });
            }
        } catch (error) {
            console.error('❌ OrderChoiceNotifications: Ошибка планирования напоминания', error);
        }
    }

    /**
     * Отмена всех уведомлений для предложения
     */
    static cancelAllChoiceNotifications(choiceId) {
        try {
            PushNotification.cancelLocalNotifications({
                id: `choice_${choiceId}`
            });
            
            PushNotification.cancelLocalNotifications({
                id: `reminder_${choiceId}`
            });

            console.log('📱 OrderChoiceNotifications: Все уведомления отменены', { choiceId });
        } catch (error) {
            console.error('❌ OrderChoiceNotifications: Ошибка отмены уведомлений', error);
        }
    }
}

export default OrderChoiceNotificationsService;
