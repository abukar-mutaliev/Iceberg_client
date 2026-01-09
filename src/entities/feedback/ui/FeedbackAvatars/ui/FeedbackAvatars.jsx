import React, { useMemo } from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import AvatarPlaceholder from "@shared/ui/Icon/DetailScreenIcons/AvatarPlaceholder";
import {Color} from "@app/styles/GlobalStyles";
import { getImageUrl } from '@shared/api/api';

export const FeedbackAvatars = React.memo(({ feedbacks = [], maxAvatars = 3 }) => {
    if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
        return null;
    }

    const displayFeedbacks = feedbacks.slice(0, maxAvatars);

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };
    
    // Нормализуем URL аватаров для всех отзывов
    const normalizedFeedbacks = useMemo(() => {
        return displayFeedbacks.map(feedback => {
            if (!feedback) return null;
            const rawAvatar = feedback.avatar || feedback.client?.avatar;
            const normalizedAvatarUrl = rawAvatar ? getImageUrl(rawAvatar) : null;
            return {
                ...feedback,
                normalizedAvatarUrl
            };
        });
    }, [displayFeedbacks]);
    
    return (
        <View style={styles.container}>
            {normalizedFeedbacks.map((feedback, index) => {
                if (!feedback) return null;

                const hasAvatar = !!feedback.normalizedAvatarUrl;
                const avatarUrl = hasAvatar ? { uri: feedback.normalizedAvatarUrl } : null;

                const userName = feedback.client?.name || '';
                const initials = getInitials(userName);

                return (
                    <View
                        key={feedback.id || index}
                        style={[
                            styles.avatarContainer,
                            { zIndex: displayFeedbacks.length - index, marginLeft: index > 0 ? -12 : 0 }
                        ]}
                    >
                        {hasAvatar ? (
                            <Image
                                source={avatarUrl}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <AvatarPlaceholder width={30} height={30} initials={initials} />
                        )}
                    </View>
                );
            })}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        borderWidth: 2,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
        borderColor: Color.blue2,
    },
    avatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderColor: Color.blue2,
    },
    defaultAvatar: {
        backgroundColor: '#6B7280',
        justifyContent: 'center',
        alignItems: 'center',
    },
    initialsText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
});