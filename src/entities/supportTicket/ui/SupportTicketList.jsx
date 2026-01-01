import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import Icon from 'react-native-vector-icons/MaterialIcons';

/**
 * Компонент списка обращений
 */
export const SupportTicketList = ({ 
    tickets, 
    loading, 
    onRefresh, 
    onLoadMore,
    onTicketPress,
    pagination 
}) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'OPEN':
                return Color.blue2;
            case 'IN_PROGRESS':
                return Color.orange || '#fd7e14';
            case 'RESOLVED':
                return Color.success || '#34C759';
            case 'CLOSED':
                return Color.grey7D7D7D;
            default:
                return Color.grey7D7D7D;
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'OPEN':
                return 'Открыто';
            case 'IN_PROGRESS':
                return 'В работе';
            case 'RESOLVED':
                return 'Решено';
            case 'CLOSED':
                return 'Закрыто';
            default:
                return status;
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderTicket = ({ item }) => (
        <TouchableOpacity
            style={styles.ticketItem}
            onPress={() => onTicketPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.ticketHeader}>
                <View style={styles.ticketTitleContainer}>
                    <Text style={styles.ticketSubject} numberOfLines={2}>
                        {item.subject}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                    </View>
                </View>
                {item.response && (
                    <Icon name="check-circle" size={20} color={Color.success || '#34C759'} />
                )}
            </View>
            <Text style={styles.ticketMessage} numberOfLines={2}>
                {item.message}
            </Text>
            {item.attachments && item.attachments.length > 0 && (
                <View style={styles.attachmentsInfo}>
                    <Icon name="attach-file" size={16} color={Color.grey7D7D7D} />
                    <Text style={styles.attachmentsText}>
                        {item.attachments.length} файл{item.attachments.length > 1 ? 'ов' : ''}
                    </Text>
                </View>
            )}
            <Text style={styles.ticketDate}>{formatDate(item.createdAt)}</Text>
        </TouchableOpacity>
    );

    const renderFooter = () => {
        if (!loading || !pagination?.hasMore) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color={Color.blue2} />
            </View>
        );
    };

    if (loading && tickets.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Color.blue2} />
                <Text style={styles.loadingText}>Загрузка обращений...</Text>
            </View>
        );
    }

    if (tickets.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Icon name="inbox" size={48} color={Color.grey7D7D7D} />
                <Text style={styles.emptyText}>У вас пока нет обращений</Text>
                <Text style={styles.emptySubtext}>
                    Создайте обращение, если у вас есть вопросы или проблемы
                </Text>
            </View>
        );
    }

    return (
        <FlatList
            data={tickets}
            renderItem={renderTicket}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            refreshControl={
                <RefreshControl
                    refreshing={loading && tickets.length > 0}
                    onRefresh={onRefresh}
                    colors={[Color.blue2]}
                />
            }
            onEndReached={() => {
                if (pagination?.hasMore && !loading) {
                    onLoadMore();
                }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
        />
    );
};

const styles = StyleSheet.create({
    listContainer: {
        padding: normalize(20),
    },
    ticketItem: {
        backgroundColor: Color.colorLavender || '#f5f5f5',
        borderRadius: normalize(12),
        padding: normalize(16),
        marginBottom: normalize(12),
    },
    ticketHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: normalize(8),
    },
    ticketTitleContainer: {
        flex: 1,
        marginRight: normalize(8),
    },
    ticketSubject: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: Color.colorGray_100,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(6),
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(4),
        borderRadius: normalize(6),
    },
    statusText: {
        fontSize: normalizeFont(12),
        fontWeight: '600',
        color: '#fff',
        fontFamily: FontFamily.sFProText,
    },
    ticketMessage: {
        fontSize: normalizeFont(14),
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(8),
        lineHeight: normalizeFont(20),
    },
    attachmentsInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(8),
        gap: normalize(4),
    },
    attachmentsText: {
        fontSize: normalizeFont(12),
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProText,
    },
    ticketDate: {
        fontSize: normalizeFont(12),
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProText,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(40),
    },
    loadingText: {
        fontSize: normalizeFont(16),
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(12),
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(40),
    },
    emptyText: {
        fontSize: normalizeFont(18),
        fontWeight: '600',
        color: Color.colorGray_100,
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(16),
        marginBottom: normalize(8),
    },
    emptySubtext: {
        fontSize: normalizeFont(14),
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        lineHeight: normalizeFont(20),
    },
    footer: {
        padding: normalize(20),
        alignItems: 'center',
    },
});


