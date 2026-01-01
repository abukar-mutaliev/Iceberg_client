import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Linking
} from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import Icon from 'react-native-vector-icons/MaterialIcons';

/**
 * Компонент детального отображения обращения
 */
export const SupportTicketItem = ({ ticket }) => {
    if (!ticket) return null;

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
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleAttachmentPress = (url) => {
        Linking.openURL(url).catch(err => {
            console.error('Ошибка при открытии файла:', err);
        });
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.subject}>{ticket.subject}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(ticket.status)}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Сообщение</Text>
                <Text style={styles.message}>{ticket.message}</Text>
            </View>

            {ticket.attachments && ticket.attachments.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Вложения ({ticket.attachments.length})</Text>
                    <View style={styles.attachmentsContainer}>
                        {ticket.attachments.map((url, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.attachmentItem}
                                onPress={() => handleAttachmentPress(url)}
                                activeOpacity={0.7}
                            >
                                <Image
                                    source={{ uri: url }}
                                    style={styles.attachmentImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.attachmentOverlay}>
                                    <Icon name="open-in-new" size={20} color="#fff" />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {ticket.response && (
                <View style={[styles.section, styles.responseSection]}>
                    <Text style={styles.sectionTitle}>Ответ разработчика</Text>
                    <Text style={styles.response}>{ticket.response}</Text>
                    {ticket.respondedAt && (
                        <Text style={styles.responseDate}>
                            {formatDate(ticket.respondedAt)}
                        </Text>
                    )}
                </View>
            )}

            <View style={styles.footer}>
                <Text style={styles.dateText}>
                    Создано: {formatDate(ticket.createdAt)}
                </Text>
                {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
                    <Text style={styles.dateText}>
                        Обновлено: {formatDate(ticket.updatedAt)}
                    </Text>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: normalize(20),
    },
    header: {
        marginBottom: normalize(20),
    },
    subject: {
        fontSize: normalizeFont(20),
        fontWeight: '600',
        color: Color.colorGray_100,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(12),
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(6),
        borderRadius: normalize(8),
    },
    statusText: {
        fontSize: normalizeFont(13),
        fontWeight: '600',
        color: '#fff',
        fontFamily: FontFamily.sFProText,
    },
    section: {
        marginBottom: normalize(24),
    },
    sectionTitle: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: Color.colorGray_100,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(12),
    },
    message: {
        fontSize: normalizeFont(15),
        color: Color.colorGray_100,
        fontFamily: FontFamily.sFProText,
        lineHeight: normalizeFont(22),
    },
    attachmentsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: normalize(12),
    },
    attachmentItem: {
        width: normalize(100),
        height: normalize(100),
        borderRadius: normalize(8),
        overflow: 'hidden',
        position: 'relative',
    },
    attachmentImage: {
        width: '100%',
        height: '100%',
    },
    attachmentOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    responseSection: {
        backgroundColor: Color.colorLavender || '#f5f5f5',
        borderRadius: normalize(12),
        padding: normalize(16),
    },
    response: {
        fontSize: normalizeFont(15),
        color: Color.colorGray_100,
        fontFamily: FontFamily.sFProText,
        lineHeight: normalizeFont(22),
        marginBottom: normalize(8),
    },
    responseDate: {
        fontSize: normalizeFont(12),
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProText,
    },
    footer: {
        marginTop: normalize(20),
        paddingTop: normalize(20),
        borderTopWidth: 1,
        borderTopColor: Color.colorGainsboro,
    },
    dateText: {
        fontSize: normalizeFont(12),
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(4),
    },
});


