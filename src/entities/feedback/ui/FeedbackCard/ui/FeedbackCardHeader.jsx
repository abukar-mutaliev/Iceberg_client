import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { FontFamily } from '@app/styles/GlobalStyles';
import { RatingStarIcon, AvatarPlaceholder } from '@shared/ui/Icon/DetailScreenIcons';
import { formatFeedbackDate, fixAvatarUrl } from '../../../model';

/**
 * Компонент заголовка карточки отзыва
 *
 * @param {Object} props
 * @param {Object} props.feedback - Данные отзыва
 * @param {Object} props.currentUser - Текущий пользователь
 */
export const FeedbackCardHeader = React.memo(({ feedback, currentUser }) => {
    const { colors } = useTheme();

    const {
        client,
        clientId,
        createdAt,
        rating = 0,
        avatar,
    } = feedback;

    // Определение имени клиента (мемоизировано для предотвращения ререндеров)
    const clientName = React.useMemo(() => {
        let name = 'Анонимный клиент';

        // Проверяем, является ли это текущий пользователь
        if (clientId && currentUser && currentUser.profile && currentUser.profile.id === clientId) {
            name = 'Вы';
        }
        // Проверяем различные варианты получения имени
        else if (client) {
            // Основной вариант: client.name
            const nameFromClient = client.name;
            if (nameFromClient && String(nameFromClient).trim()) {
                name = String(nameFromClient).trim();
            }
            // Альтернативный вариант: client.user.name (если имя хранится там)
            else if (client.user) {
                const nameFromUser = client.user.name;
                if (nameFromUser && String(nameFromUser).trim()) {
                    name = String(nameFromUser).trim();
                }
                // Fallback: используем email как имя
                else if (client.user.email && String(client.user.email).trim()) {
                    const email = String(client.user.email).trim();
                    // Извлекаем часть до @ как имя
                    const emailName = email.split('@')[0];
                    if (emailName) {
                        name = emailName;
                    }
                }
            }
            // Последний fallback: используем clientId
            if (name === 'Анонимный клиент' && clientId) {
                name = `Клиент #${clientId}`;
            }
        }
        // Если client отсутствует, но есть clientId
        else if (clientId) {
            name = `Клиент #${clientId}`;
        }

        return name;
    }, [client, clientId, currentUser]);

    const formattedDate = formatFeedbackDate(createdAt);

    // Безопасное получение URL аватара
    const rawAvatarUrl = avatar || (client?.user?.avatar) || null;
    const fixedAvatarUrl = rawAvatarUrl ? fixAvatarUrl(rawAvatarUrl) : null;

    // Логируем для отладки (только в dev режиме)
    React.useEffect(() => {
        if (__DEV__ && rawAvatarUrl && !fixedAvatarUrl) {
            console.log('FeedbackCardHeader - URL аватара был отфильтрован:', {
                rawAvatarUrl,
                fixedAvatarUrl,
                feedbackId: feedback.id
            });
        }
    }, [rawAvatarUrl, fixedAvatarUrl, feedback.id]);

    // Проверяем, что URL валидный (не содержит placeholder или неверные пути)
    // Но не блокируем URL, если он просто не начинается с http - возможно это относительный путь
    const isValidUrl = fixedAvatarUrl && 
        !fixedAvatarUrl.includes('placeholder') && 
        !fixedAvatarUrl.includes('path/to');

    const [avatarError, setAvatarError] = React.useState(false);

    return (
        <View style={styles.header}>
            {/* Аватар пользователя */}
            <View style={styles.avatarContainer}>
                {isValidUrl && !avatarError ? (
                    <Image
                        source={{ uri: fixedAvatarUrl }}
                        style={styles.avatarImage}
                        resizeMode="cover"
                        onError={(e) => {
                            if (__DEV__) {
                                console.log('Ошибка загрузки аватара:', e.nativeEvent.error);
                            }
                            setAvatarError(true);
                        }}
                    />
                ) : (
                    <AvatarPlaceholder width={40} height={40} color="#BEBEBE" />
                )}
            </View>

            {/* Информация о пользователе */}
            <View style={styles.userInfo}>
                <Text 
                    style={styles.userName}
                    numberOfLines={1}
                    allowFontScaling={true}
                >
                    {clientName || 'Анонимный клиент'}
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
});

FeedbackCardHeader.displayName = 'FeedbackCardHeader';

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
        color: '#000000', // Темный цвет для читаемости на светлом фоне карточки
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