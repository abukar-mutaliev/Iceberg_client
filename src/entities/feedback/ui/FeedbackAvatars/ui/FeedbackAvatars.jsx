import React from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import AvatarPlaceholder from "@shared/ui/Icon/DetailScreenIcons/AvatarPlaceholder";
import {Color} from "@app/styles/GlobalStyles";

export const FeedbackAvatars = React.memo(({ feedbacks, maxAvatars = 3 }) => {
    if (!feedbacks || feedbacks.length === 0) {
        return null;
    }

    const displayFeedbacks = feedbacks.slice(0, maxAvatars);

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };
    return (
        <View style={styles.container}>
            {displayFeedbacks.map((feedback, index) => {
                const hasAvatar = feedback.avatar || feedback.avatar;
                const avatarUrl = hasAvatar
                    ? { uri: feedback.avatar || feedback.avatar }
                    : null;

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