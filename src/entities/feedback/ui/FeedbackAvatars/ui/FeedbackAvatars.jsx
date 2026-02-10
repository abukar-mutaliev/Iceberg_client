import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Text, TouchableOpacity, Animated } from 'react-native';
import AvatarPlaceholder from "@shared/ui/Icon/DetailScreenIcons/AvatarPlaceholder";
import { Color } from "@app/styles/GlobalStyles";

const EXPAND_DURATION = 300;
const STAGGER_DELAY = 50;
const EXPAND_OFFSET_Y = -16;
const COLLAPSED_OVERLAP = -10;
const EXPANDED_GAP = 14;
const AVATAR_SIZE = 40;
const EXPANDED_SCALE = 1.15;

export const FeedbackAvatars = React.memo(({ 
    feedbacks = [], 
    isExpanded = false,
    onToggle,
    onAvatarPress
}) => {
    const expandAnim = useRef(new Animated.Value(0)).current;
    const prevExpandedRef = useRef(false);
    const [renderAll, setRenderAll] = useState(isExpanded);

    const safeFeedbacks = Array.isArray(feedbacks) ? feedbacks : [];
    const collapsedCount = Math.min(3, safeFeedbacks.length);
    const hasMore = safeFeedbacks.length > collapsedCount;
    const displayFeedbacks = renderAll ? safeFeedbacks : safeFeedbacks.slice(0, collapsedCount);

    useEffect(() => {
        if (isExpanded === prevExpandedRef.current) return;
        prevExpandedRef.current = isExpanded;

        if (isExpanded) {
            setRenderAll(true);
            expandAnim.setValue(0);
            Animated.spring(expandAnim, {
                toValue: 1,
                friction: 6,
                tension: 45,
                useNativeDriver: false,
            }).start();
        } else {
            Animated.timing(expandAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: false,
            }).start(({ finished }) => {
                if (finished) setRenderAll(false);
            });
        }
    }, [isExpanded, expandAnim]);

    if (safeFeedbacks.length === 0) return null;

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getFirstName = (name) => {
        if (!name) return '';
        return name.split(' ')[0];
    };

    const totalCount = displayFeedbacks.length;
    const totalAnimDuration = EXPAND_DURATION + totalCount * STAGGER_DELAY;

    const renderAvatar = (feedback, index) => {
        if (!feedback) return null;

        const hasAvatar = feedback.avatar || feedback.client?.avatar;
        const avatarUrl = hasAvatar
            ? { uri: feedback.avatar || feedback.client?.avatar }
            : null;
        const userName = feedback.client?.name || '';
        const initials = getInitials(userName);
        const firstName = getFirstName(userName);

        const isExtra = index >= collapsedCount;
        const staggerStart = Math.min((index * STAGGER_DELAY) / totalAnimDuration, 0.85);
        const staggerEnd = Math.min(staggerStart + EXPAND_DURATION / totalAnimDuration, 1);

        // MarginLeft: overlap when collapsed, gap when expanded
        const marginLeft = index === 0
            ? 0
            : expandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [COLLAPSED_OVERLAP, EXPANDED_GAP],
            });

        // Scale with stagger
        const scale = expandAnim.interpolate({
            inputRange: [staggerStart, staggerEnd],
            outputRange: [isExtra ? 0.3 : 1, EXPANDED_SCALE],
            extrapolate: 'clamp',
        });

        // TranslateY with stagger
        const translateY = expandAnim.interpolate({
            inputRange: [staggerStart, staggerEnd],
            outputRange: [0, EXPAND_OFFSET_Y],
            extrapolate: 'clamp',
        });

        // Opacity for extra avatars
        const opacity = isExtra
            ? expandAnim.interpolate({
                inputRange: [staggerStart, Math.min(staggerStart + 0.2, staggerEnd)],
                outputRange: [0, 1],
                extrapolate: 'clamp',
            })
            : 1;

        // Name opacity (appears after avatar animation progresses)
        const nameOpacity = expandAnim.interpolate({
            inputRange: [Math.max(staggerEnd * 0.6, staggerStart), staggerEnd],
            outputRange: [0, 1],
            extrapolate: 'clamp',
        });

        // Name translateY (subtle slide up)
        const nameTranslateY = expandAnim.interpolate({
            inputRange: [Math.max(staggerEnd * 0.6, staggerStart), staggerEnd],
            outputRange: [8, 0],
            extrapolate: 'clamp',
        });

        const content = hasAvatar ? (
            <Image source={avatarUrl} style={styles.avatarImage} />
        ) : initials && initials !== '?' ? (
            <View style={styles.initialsCircle}>
                <Text style={styles.initialsText}>{initials}</Text>
            </View>
        ) : (
            <AvatarPlaceholder width={34} height={34} />
        );

        return (
            <Animated.View
                key={feedback.id || `avatar-${index}`}
                style={[
                    styles.avatarWrapper,
                    {
                        marginLeft: index > 0 ? marginLeft : 0,
                        opacity,
                        zIndex: totalCount - index,
                    },
                ]}
            >
                <Animated.View style={{ transform: [{ scale }, { translateY }] }}>
                    <TouchableOpacity
                        onPress={() => {
                            if (!isExpanded) {
                                onToggle?.();
                            } else {
                                // Только User.id — экран UserPublicProfile вызывает getUserById(userId)
                                const authorUserId = feedback.userId
                                    ?? feedback.client?.user?.id
                                    ?? feedback.client?.userId;
                                if (authorUserId != null && authorUserId !== '') {
                                    onAvatarPress?.(authorUserId);
                                }
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={styles.avatarCircle}>
                            {content}
                        </View>
                    </TouchableOpacity>
                </Animated.View>
                <Animated.View
                    style={[
                        styles.nameContainer,
                        {
                            opacity: nameOpacity,
                            transform: [{ translateY: nameTranslateY }],
                        },
                    ]}
                    pointerEvents="none"
                >
                    <Text style={styles.nameText} numberOfLines={1}>
                        {firstName}
                    </Text>
                </Animated.View>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            {displayFeedbacks.map((fb, i) => renderAvatar(fb, i))}
            {hasMore && !renderAll && (
                <View style={[styles.avatarWrapper, { marginLeft: COLLAPSED_OVERLAP, zIndex: 0 }]}>
                    <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
                        <View style={[styles.avatarCircle, styles.moreIndicator]}>
                            <Text style={styles.moreText}>
                                +{safeFeedbacks.length - collapsedCount}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingBottom: 4,
    },
    avatarWrapper: {
        alignItems: 'center',
    },
    avatarCircle: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        borderWidth: 2,
        borderColor: Color.blue2,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    avatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    initialsCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E5E5EA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    initialsText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666666',
    },
    nameContainer: {
        marginTop: 4,
        maxWidth: 54,
        alignItems: 'center',
    },
    nameText: {
        fontSize: 10,
        color: Color.grey7D7D7D,
        fontWeight: '500',
        textAlign: 'center',
    },
    moreIndicator: {
        backgroundColor: Color.blue2,
    },
    moreText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
});
