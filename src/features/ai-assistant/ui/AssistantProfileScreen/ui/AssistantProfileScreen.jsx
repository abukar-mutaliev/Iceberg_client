import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Dimensions,
    StatusBar,
    Animated,
    PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import ChatIcon from '@shared/ui/Chat/ChatIcon';
import { AssistantAvatar } from '../../AssistantAvatar';
import {
    ASSISTANT_CHAT_TITLE,
    ASSISTANT_SUBTITLE,
    ASSISTANT_DESCRIPTION,
    ASSISTANT_CAPABILITIES,
    ASSISTANT_ESCALATION_HINT,
} from '../../../constants';

const ASSISTANT_AVATAR_IMAGE = require('@assets/images/assistant-avatar.jpg');
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const PROFILE_AVATAR_SIZE = 200;

/**
 * Экран описания и профиля ИИ-помощника — по образцу UserPublicProfileScreen.
 */
export const AssistantProfileScreen = ({ route, navigation }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const fromScreen = route?.params?.fromScreen ?? null;
    const roomId = route?.params?.roomId ?? null;
    const [showAvatarModal, setShowAvatarModal] = useState(false);

    const translateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;
    const scrollY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    const closeAvatarModal = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setShowAvatarModal(false);
            translateY.setValue(0);
            opacity.setValue(1);
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => (
                Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10
            ),
            onPanResponderGrant: () => {
                translateY.setOffset(translateY._value);
                opacity.setOffset(opacity._value);
            },
            onPanResponderMove: (_, gestureState) => {
                translateY.setValue(gestureState.dy);
                const opacityValue = Math.max(0.3, 1 - Math.abs(gestureState.dy) / screenHeight);
                opacity.setValue(opacityValue);
            },
            onPanResponderRelease: (_, gestureState) => {
                translateY.flattenOffset();
                opacity.flattenOffset();
                const { dy, vy } = gestureState;
                const threshold = 100;

                if (Math.abs(dy) > threshold || Math.abs(vy) > 0.5) {
                    const direction = dy > 0 ? 1 : -1;
                    Animated.parallel([
                        Animated.timing(translateY, {
                            toValue: direction * screenHeight,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                        Animated.timing(opacity, {
                            toValue: 0,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                    ]).start(() => {
                        setShowAvatarModal(false);
                        translateY.setValue(0);
                        opacity.setValue(1);
                    });
                } else {
                    Animated.parallel([
                        Animated.spring(translateY, {
                            toValue: 0,
                            useNativeDriver: true,
                            tension: 50,
                            friction: 7,
                        }),
                        Animated.spring(opacity, {
                            toValue: 1,
                            useNativeDriver: true,
                            tension: 50,
                            friction: 7,
                        }),
                    ]).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (showAvatarModal) {
            translateY.setValue(0);
            opacity.setValue(1);
        }
    }, [showAvatarModal, opacity, translateY]);

    const handleGoBack = () => {
        if (navigation?.canGoBack?.()) {
            navigation.goBack();
            return;
        }

        if (fromScreen === 'AssistantChat' || roomId) {
            navigation.navigate('AssistantChat', {
                roomId,
                fromScreen: fromScreen === 'AssistantChat' ? route?.params?.chatFromScreen : fromScreen,
            });
            return;
        }

        navigation.navigate('ChatMain');
    };

    const handleOpenChat = () => {
        if (fromScreen === 'AssistantChat' && navigation?.canGoBack?.()) {
            navigation.goBack();
            return;
        }

        navigation.navigate('AssistantChat', {
            roomId,
            fromScreen: fromScreen || 'AssistantProfile',
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar
                backgroundColor={isDark ? colors.background : '#FFFFFF'}
                barStyle={isDark ? 'light-content' : 'dark-content'}
            />

            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleGoBack}
                    activeOpacity={0.7}
                >
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Animated.View
                    style={[
                        styles.headerTitleContainer,
                        {
                            opacity: scrollY.interpolate({
                                inputRange: [80, 150],
                                outputRange: [0, 1],
                                extrapolate: 'clamp',
                            }),
                        },
                    ]}
                >
                    <Text style={styles.headerTitle} numberOfLines={1}>{ASSISTANT_CHAT_TITLE}</Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>{ASSISTANT_SUBTITLE}</Text>
                </Animated.View>
                <View style={styles.headerActions} />
            </View>

            <Animated.ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
            >
                <View style={styles.avatarSection}>
                    <Animated.View
                        style={{
                            transform: [{
                                scale: scrollY.interpolate({
                                    inputRange: [0, 150],
                                    outputRange: [1, 0],
                                    extrapolate: 'clamp',
                                }),
                            }],
                            opacity: scrollY.interpolate({
                                inputRange: [0, 150],
                                outputRange: [1, 0],
                                extrapolate: 'clamp',
                            }),
                        }}
                    >
                        <TouchableOpacity
                            style={styles.avatarContainer}
                            onPress={() => setShowAvatarModal(true)}
                            activeOpacity={0.8}
                        >
                            <AssistantAvatar size={PROFILE_AVATAR_SIZE} style={styles.profileAvatar} />
                        </TouchableOpacity>
                    </Animated.View>
                    <Animated.View
                        style={{
                            transform: [{
                                translateY: scrollY.interpolate({
                                    inputRange: [0, 150],
                                    outputRange: [0, -120],
                                    extrapolate: 'clamp',
                                }),
                            }],
                            opacity: scrollY.interpolate({
                                inputRange: [0, 80, 150],
                                outputRange: [1, 0.3, 0],
                                extrapolate: 'clamp',
                            }),
                        }}
                    >
                        <Text style={styles.avatarName}>{ASSISTANT_CHAT_TITLE}</Text>
                        <Text style={styles.avatarRole}>{ASSISTANT_SUBTITLE}</Text>
                    </Animated.View>
                </View>

                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <Text style={styles.sectionLabel}>О помощнике</Text>
                    </View>
                    <Text style={styles.infoText}>{ASSISTANT_DESCRIPTION}</Text>
                </View>

                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <Text style={styles.sectionLabel}>Чем может помочь</Text>
                    </View>
                    {ASSISTANT_CAPABILITIES.map((item) => (
                        <View key={item} style={styles.capabilityRow}>
                            <Text style={styles.capabilityBullet}>•</Text>
                            <Text style={styles.capabilityText}>{item}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <Text style={styles.sectionLabel}>Оператор</Text>
                    </View>
                    <Text style={styles.infoText}>{ASSISTANT_ESCALATION_HINT}</Text>
                </View>

                <View style={styles.actionsSection}>
                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={handleOpenChat}
                        activeOpacity={0.7}
                    >
                        <ChatIcon width={24} height={24} color="#25D366" />
                        <Text style={styles.actionText}>
                            {fromScreen === 'AssistantChat' ? 'Вернуться в чат' : 'Написать сообщение'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.ScrollView>

            <Modal
                visible={showAvatarModal}
                transparent
                animationType="fade"
                onRequestClose={closeAvatarModal}
            >
                <SafeAreaView style={styles.modalBackground}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity
                                style={styles.modalBackButton}
                                onPress={closeAvatarModal}
                            >
                                <Text style={styles.modalBackIcon}>←</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>{ASSISTANT_CHAT_TITLE}</Text>
                        </View>

                        <View style={styles.modalContent} {...panResponder.panHandlers}>
                            <Animated.Image
                                source={ASSISTANT_AVATAR_IMAGE}
                                style={[
                                    styles.fullSizeAvatar,
                                    {
                                        transform: [{ translateY }],
                                        opacity,
                                    },
                                ]}
                                resizeMode="contain"
                            />
                        </View>
                    </View>
                </SafeAreaView>
            </Modal>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDark ? colors.background : '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? colors.background : '#FFFFFF',
        paddingTop: 8,
        paddingBottom: 12,
        paddingHorizontal: 16,
        elevation: isDark ? 0 : 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0 : 0.2,
        shadowRadius: 4,
    },
    backButton: {
        marginRight: 16,
        padding: 8,
    },
    backIcon: {
        fontSize: 24,
        color: isDark ? colors.textPrimary : '#000000',
        fontWeight: '400',
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: 8,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: isDark ? colors.textPrimary : '#000000',
        marginBottom: 2,
    },
    headerSubtitle: {
        fontSize: 12,
        color: isDark ? colors.textSecondary : '#666666',
        fontWeight: '400',
    },
    headerActions: {
        width: 40,
    },
    content: {
        flex: 1,
        backgroundColor: isDark ? colors.background : '#FFFFFF',
    },
    scrollContent: {
        paddingBottom: 120,
    },
    avatarSection: {
        backgroundColor: isDark ? colors.background : '#FFFFFF',
        alignItems: 'center',
        paddingBottom: 24,
        paddingTop: 8,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    profileAvatar: {
        borderWidth: 3,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
    },
    avatarName: {
        fontSize: 24,
        fontWeight: '500',
        color: isDark ? colors.textPrimary : '#000000',
        textAlign: 'center',
        marginBottom: 4,
    },
    avatarRole: {
        fontSize: 16,
        color: isDark ? colors.textSecondary : '#666666',
        fontWeight: '400',
        textAlign: 'center',
    },
    infoSection: {
        backgroundColor: isDark ? colors.surface : '#FFFFFF',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? colors.divider : '#E8E8E8',
    },
    infoRow: {
        marginBottom: 8,
    },
    sectionLabel: {
        fontSize: 14,
        color: isDark ? colors.primary : '#25D366',
        fontWeight: '400',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoText: {
        fontSize: 16,
        color: isDark ? colors.textPrimary : '#000000',
        lineHeight: 22,
        fontWeight: '400',
    },
    capabilityRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    capabilityBullet: {
        fontSize: 16,
        color: isDark ? colors.textPrimary : '#000000',
        marginRight: 8,
        lineHeight: 22,
    },
    capabilityText: {
        flex: 1,
        fontSize: 16,
        color: isDark ? colors.textPrimary : '#000000',
        lineHeight: 22,
        fontWeight: '400',
    },
    actionsSection: {
        backgroundColor: isDark ? colors.surface : '#FFFFFF',
        paddingVertical: 8,
        marginTop: 8,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    actionText: {
        fontSize: 16,
        color: isDark ? colors.textPrimary : '#000000',
        marginLeft: 16,
        fontWeight: '400',
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    modalBackButton: {
        padding: 8,
        marginRight: 16,
    },
    modalBackIcon: {
        fontSize: 24,
        color: '#FFFFFF',
        fontWeight: '400',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '500',
        color: '#FFFFFF',
        flex: 1,
    },
    modalContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullSizeAvatar: {
        width: screenWidth,
        height: screenWidth,
        maxHeight: screenHeight * 0.7,
    },
});

export default AssistantProfileScreen;
