import React, { useMemo, useRef, useState, useCallback } from 'react';
import { View, Image, StyleSheet, Text, Animated, Pressable, Modal, Dimensions } from 'react-native';
import AvatarPlaceholder from "@shared/ui/Icon/DetailScreenIcons/AvatarPlaceholder";
import {Color} from "@app/styles/GlobalStyles";
import { getImageUrl } from '@shared/api/api';
import { useNavigation } from '@react-navigation/native';

export const FeedbackAvatars = React.memo(({ feedbacks = [], maxAvatars = 3 }) => {
    if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
        return null;
    }

    const navigation = useNavigation();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [anchorY, setAnchorY] = useState(0);
    const [anchorX, setAnchorX] = useState(0);
    const [anchorWidth, setAnchorWidth] = useState(0);
    const containerRef = useRef(null);
    const animationProgress = useRef(new Animated.Value(0)).current;
    const { width: screenWidth } = Dimensions.get('window');

    const displayFeedbacks = feedbacks.slice(0, maxAvatars);

    const getDisplayName = (feedback) => {
        return (
            feedback?.userName ||
            feedback?.client?.name ||
            feedback?.client?.user?.name ||
            feedback?.clientName ||
            'Пользователь'
        );
    };

    const getUserId = (feedback) => {
        return (
            feedback?.client?.user?.id ||
            feedback?.client?.userId ||
            feedback?.client?.id ||
            feedback?.userId ||
            feedback?.user?.id ||
            null
        );
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

    const openExpanded = useCallback(() => {
        if (isExpanded) return;
        containerRef.current?.measureInWindow?.((x, y, width) => {
            setAnchorY(y);
            setAnchorX(x);
            setAnchorWidth(width);
            setIsModalVisible(true);
            setIsExpanded(true);
            Animated.spring(animationProgress, {
                toValue: 1,
                useNativeDriver: true,
                friction: 7,
                tension: 70,
            }).start();
        });
    }, [animationProgress, isExpanded]);

    const closeExpanded = useCallback(() => {
        Animated.timing(animationProgress, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setIsExpanded(false);
            setIsModalVisible(false);
        });
    }, [animationProgress]);

    const handleAvatarPress = useCallback((feedback) => {
        if (!isExpanded) {
            openExpanded();
            return;
        }

        const userId = getUserId(feedback);
        if (!userId) return;

        closeExpanded();
        setTimeout(() => {
            navigation.navigate('UserPublicProfile', {
                userId,
                fromScreen: 'ProductDetail',
            });
        }, 180);
    }, [isExpanded, navigation, openExpanded, closeExpanded]);
    
    const renderAvatarItems = (expanded = false) => {
        return normalizedFeedbacks.map((feedback, index) => {
            if (!feedback) return null;

            const hasAvatar = !!feedback.normalizedAvatarUrl;
            const avatarUrl = hasAvatar ? { uri: feedback.normalizedAvatarUrl } : null;
            const userName = getDisplayName(feedback);

            const scale = expanded
                ? animationProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.4],
                })
                : 1;
            const translateX = expanded
                ? animationProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, index > 0 ? 18 : 0],
                })
                : 0;
            const translateY = expanded
                ? animationProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -14],
                })
                : 0;

            const nameOpacity = expanded
                ? animationProgress.interpolate({
                    inputRange: [0.6, 1],
                    outputRange: [0, 1],
                })
                : 0;

            return (
                <Pressable
                    key={feedback.id || index}
                    onPress={() => handleAvatarPress(feedback)}
                    style={[
                        styles.avatarPressable,
                        expanded && styles.avatarPressableExpanded,
                    ]}
                >
                    <Animated.View
                        style={[
                            styles.avatarContainer,
                            {
                                zIndex: displayFeedbacks.length - index,
                                marginLeft: index > 0 ? -12 : 0,
                                transform: [{ translateX }, { translateY }, { scale }],
                            },
                        ]}
                    >
                        {hasAvatar ? (
                            <Image
                                source={avatarUrl}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <AvatarPlaceholder width={18} height={18} color="#BEBEBE" />
                            </View>
                        )}
                    </Animated.View>
                    {expanded && (
                        <Animated.Text style={[styles.avatarName, { opacity: nameOpacity }]}>
                            {userName}
                        </Animated.Text>
                    )}
                </Pressable>
            );
        });
    };

    return (
        <>
            <View
                ref={containerRef}
                style={[
                    styles.container,
                    isExpanded && styles.containerHidden,
                ]}
            >
                {renderAvatarItems(false)}
            </View>

            <Modal
                visible={isModalVisible}
                transparent
                animationType="none"
                onRequestClose={closeExpanded}
            >
                <View style={styles.backdrop}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeExpanded} />
                    <Animated.View
                        style={[
                            styles.expandedContainer,
                            {
                                opacity: animationProgress.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 1],
                                }),
                                transform: [
                                    {
                                        translateY: animationProgress.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [42, 0],
                                        }),
                                    },
                                    {
                                        scale: animationProgress.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.88, 1],
                                        }),
                                    },
                                ],
                                position: 'absolute',
                                top: Math.max(anchorY - 20, 0),
                                left: anchorX,
                                width: anchorWidth || screenWidth,
                            },
                        ]}
                    >
                        <View style={styles.expandedRow}>
                            {renderAvatarItems(true)}
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    containerHidden: {
        opacity: 0,
    },
    avatarPressable: {
        alignItems: 'center',
    },
    avatarPressableExpanded: {
        width: 72,
    },
    avatarContainer: {
        width: 36,
        height: 36,
        borderWidth: 2,
        borderRadius: 18,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
        borderColor: Color.blue2,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 18,
        borderColor: Color.blue2,
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 18,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarName: {
        marginTop: 6,
        fontSize: 12,
        color: '#FFFFFF',
        textAlign: 'center',
        width: '100%',
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    expandedContainer: {
        width: '100%',
        alignItems: 'flex-end',
    },
    expandedRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
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