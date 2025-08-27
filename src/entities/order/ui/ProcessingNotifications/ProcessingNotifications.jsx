import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useProcessingNotifications } from '../../hooks/useProcessingNotifications';
import { 
  PROCESSING_NOTIFICATION_TYPES,
  PROCESSING_STAGE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS
} from '../../lib/constants';

export const ProcessingNotifications = ({ 
  showUnreadOnly = false,
  maxHeight = 400,
  onNotificationPress,
  style = {}
}) => {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    getSortedNotifications,
    getNotificationStats
  } = useProcessingNotifications();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadNotifications(showUnreadOnly);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleNotificationPress = async (notification) => {
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    
    onNotificationPress?.(notification);
  };

  const handleMarkAllAsRead = async () => {
    Alert.alert(
      'Отметить все как прочитанные',
      'Вы уверены, что хотите отметить все уведомления как прочитанные?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Да',
          onPress: async () => {
            try {
              await markAllAsRead();
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось отметить уведомления как прочитанные');
            }
          }
        }
      ]
    );
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case PROCESSING_NOTIFICATION_TYPES.ORDER_ASSIGNMENT:
        return '📋';
      case PROCESSING_NOTIFICATION_TYPES.STAGE_COMPLETION:
        return '✅';
      case PROCESSING_NOTIFICATION_TYPES.ORDER_DELAYED:
        return '⚠️';
      case PROCESSING_NOTIFICATION_TYPES.STAGE_STARTED:
        return '🚀';
      case PROCESSING_NOTIFICATION_TYPES.MANUAL:
        return '💬';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type, priority) => {
    if (priority === 'URGENT') return '#dc3545';
    if (priority === 'HIGH') return '#fd7e14';
    
    switch (type) {
      case PROCESSING_NOTIFICATION_TYPES.ORDER_DELAYED:
        return '#dc3545';
      case PROCESSING_NOTIFICATION_TYPES.STAGE_COMPLETION:
        return '#28a745';
      case PROCESSING_NOTIFICATION_TYPES.STAGE_STARTED:
        return '#007bff';
      default:
        return '#6c757d';
    }
  };

  const renderNotification = ({ item: notification }) => {
    const isUnread = !notification.isRead;
    const icon = getNotificationIcon(notification.type);
    const color = getNotificationColor(notification.type, notification.priority);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          isUnread && styles.unreadNotification,
          { borderLeftColor: color }
        ]}
        onPress={() => handleNotificationPress(notification)}
      >
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationIcon}>{icon}</Text>
          <View style={styles.notificationContent}>
            <Text style={[
              styles.notificationTitle,
              isUnread && styles.unreadText
            ]}>
              {notification.title}
            </Text>
            <Text style={styles.notificationMessage}>
              {notification.message}
            </Text>
          </View>
          <View style={styles.notificationMeta}>
            {notification.priority && (
              <View style={[
                styles.priorityBadge,
                { backgroundColor: PRIORITY_COLORS[notification.priority] }
              ]}>
                <Text style={styles.priorityText}>
                  {PRIORITY_LABELS[notification.priority]}
                </Text>
              </View>
            )}
            {isUnread && (
              <View style={styles.unreadIndicator}>
                <Text style={styles.unreadDot}>●</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.notificationDetails}>
          {notification.stage && (
            <Text style={styles.notificationDetail}>
              📋 Этап: {PROCESSING_STAGE_LABELS[notification.stage]}
            </Text>
          )}
          {notification.orderId && (
            <Text style={styles.notificationDetail}>
              🛒 Заказ: #{notification.orderId}
            </Text>
          )}
          {notification.employeeName && (
            <Text style={styles.notificationDetail}>
              👤 Сотрудник: {notification.employeeName}
            </Text>
          )}
          <Text style={styles.notificationTime}>
            🕐 {new Date(notification.createdAt).toLocaleString()}
          </Text>
        </View>

        {notification.isDelayed && (
          <View style={styles.delayContainer}>
            <Text style={styles.delayText}>
              ⚠️ Задержка: {notification.delayReason || 'Превышено время обработки'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.emptyText}>Загрузка уведомлений...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📢</Text>
        <Text style={styles.emptyText}>
          {showUnreadOnly ? 'Нет непрочитанных уведомлений' : 'Нет уведомлений'}
        </Text>
      </View>
    );
  };

  const renderHeader = () => {
    const stats = getNotificationStats();
    
    return (
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Уведомления обработки</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerStats}>
          <Text style={styles.statsText}>
            Всего: {stats.total} | Непрочитанных: {stats.unread}
          </Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllAsRead}>
              <Text style={styles.markAllReadText}>Отметить все как прочитанные</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (loading && notifications.length > 0) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color="#007bff" />
          <Text style={styles.footerText}>Загрузка...</Text>
        </View>
      );
    }
    return null;
  };

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorText}>Ошибка загрузки уведомлений</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const sortedNotifications = getSortedNotifications();
  const filteredNotifications = showUnreadOnly 
    ? sortedNotifications.filter(n => !n.isRead)
    : sortedNotifications;

  return (
    <View style={[styles.container, style]}>
      {renderHeader()}
      
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        style={[styles.notificationsList, { maxHeight }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007bff']}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 8
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  unreadBadge: {
    backgroundColor: '#dc3545',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center'
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statsText: {
    fontSize: 12,
    color: '#666'
  },
  markAllReadText: {
    fontSize: 12,
    color: '#007bff',
    textDecorationLine: 'underline'
  },
  notificationsList: {
    paddingHorizontal: 16
  },
  notificationItem: {
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6c757d',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff'
  },
  unreadNotification: {
    backgroundColor: '#f8f9fa'
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2
  },
  notificationContent: {
    flex: 1
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333'
  },
  unreadText: {
    fontWeight: 'bold'
  },
  notificationMessage: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16
  },
  notificationMeta: {
    alignItems: 'flex-end'
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4
  },
  priorityText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500'
  },
  unreadIndicator: {
    marginTop: 2
  },
  unreadDot: {
    fontSize: 12,
    color: '#007bff'
  },
  notificationDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  notificationDetail: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2
  },
  notificationTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 4
  },
  delayContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff5f5',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#dc3545'
  },
  delayText: {
    fontSize: 11,
    color: '#dc3545',
    fontWeight: '500'
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center'
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center'
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center'
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  errorText: {
    fontSize: 14,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007bff',
    borderRadius: 6
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500'
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  footerText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666'
  }
}); 