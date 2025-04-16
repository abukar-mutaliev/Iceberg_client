import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '@/app/providers/themeProvider/ThemeProvider';
import { FontFamily } from '@/app/styles/GlobalStyles';
import { RatingStarIcon, AvatarPlaceholder } from '@/shared/ui/Icon/DetailScreenIcons';
import { formatFeedbackDate, fixAvatarUrl } from '../../../model';

/**
 * Компонент заголовка карточки отзыва
 *
 * @param {Object} props
 * @param {Object} props.feedback - Данные отзыва
 * @param {Object} props.currentUser - Текущий пользователь
 */
export const FeedbackCardHeader = ({ feedback, currentUser }) => {
    const { colors } = useTheme();

    const {
        client = {},
        clientId,
        createdAt,
        rating = 0,
        avatar,
    } = feedback;

    // Определение имени клиента
    let clientName = 'Анонимный клиент';

    if (client && client.name) {
        clientName = client.name;
    }
    else if (clientId && currentUser && currentUser.profile && currentUser.profile.id === clientId) {
        clientName = 'Вы';
    }

    const formattedDate = formatFeedbackDate(createdAt);

    const rawAvatarUrl = avatar || (client && client.user ? client.user.avatar : null);
    const fixedAvatarUrl = rawAvatarUrl ? fixAvatarUrl(rawAvatarUrl) : null;

    const hasValidAvatarUrl = !!fixedAvatarUrl;

    return (
        <View style={styles.header}>
            {/* Аватар пользователя */}
            <View style={styles.avatarContainer}>
                {hasValidAvatarUrl ? (
                    <Image
                        source={{ uri: fixedAvatarUrl }}
                        style={styles.avatarImage}
                        resizeMode="cover"
                        onError={(e) => console.log('Ошибка загрузки аватара:', e.nativeEvent.error)}
                    />
                ) : (
                    <AvatarPlaceholder width={40} height={40} color="#BEBEBE" />
                )}
            </View>

            {/* Информация о пользователе */}
            <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>
                    {clientName}
                </Text>
                <Text style={styles.dateText}>
                    {formattedDate}
                </Text>
            </View>

            {/* Рейтинг */}
            <View style={styles.rating}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <RatingStarIcon
                        key={star}
                        filled={star <= rating}
                        width={14}
                        height={14}
                        color="#6B4EFF"
                    />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        paddingTop: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    userInfo: {
        marginLeft: 12,
        justifyContent: 'center',
        flex: 1,
    },
    userName: {
        fontSize: 13,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    dateText: {
        fontSize: 11,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        color: '#8E8E8E',
        marginTop: 2,
    },
    rating: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});