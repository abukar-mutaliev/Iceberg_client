import React, { useEffect, useMemo, useRef } from 'react';
import {
    View,
    Image,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Text,
    Modal,
    TouchableWithoutFeedback,
    Animated,
    PanResponder,
    Platform,
} from 'react-native';
import { AvatarPlaceholder } from '@shared/ui/Icon/DetailScreenIcons';
import { normalize } from '@shared/lib/normalize';
import { Dimensions } from 'react-native';
import { useRoute } from '@react-navigation/native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ProfileAvatarView = ({
                                      avatarUri,
                                      isUploading,
                                      uploadProgress,
                                      size = 118,
                                      centered = true,
                                      editable = false,
                                      onAvatarPress,
                                      modalVisible,
                                      setModalVisible,
                                      onCloseModal,
                                      onBeginClose,
                                  }) => {
    const route = useRoute();
    const isEditScreen = route.name === 'ProfileEdit';
    const avatarLogRef = useRef({ lastUri: null, lastTs: 0 });

    const normalizedSize = normalize(size);
    const borderRadius = normalizedSize / 2;
    const translateY = useRef(new Animated.Value(0)).current;
    const contentLayoutRef = useRef(null);
    const startedOutsideContentRef = useRef(false);

    const overlayOpacity = useMemo(() => {
        return translateY.interpolate({
            inputRange: [0, SCREEN_HEIGHT * 0.6],
            outputRange: [1, 0.3],
            extrapolate: 'clamp',
        });
    }, [translateY]);

    const closeModal = onCloseModal || (() => setModalVisible(false));

    const closeModalAnimated = () => {
        if (onBeginClose) {
            onBeginClose();
        }
        Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 220,
            useNativeDriver: true,
        }).start(() => {
            closeModal();
        });
    };

    const panResponder = useMemo(() => {
        return PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                const { dy, dx } = gestureState;
                return Math.abs(dy) > 4 && Math.abs(dy) > Math.abs(dx);
            },
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                const { dy, dx } = gestureState;
                return Math.abs(dy) > 4 && Math.abs(dy) > Math.abs(dx);
            },
            onPanResponderGrant: (_, gestureState) => {
                const layout = contentLayoutRef.current;
                if (!layout) {
                    startedOutsideContentRef.current = true;
                    return;
                }
                const { x0, y0 } = gestureState;
                const insideX = x0 >= layout.x && x0 <= layout.x + layout.width;
                const insideY = y0 >= layout.y && y0 <= layout.y + layout.height;
                startedOutsideContentRef.current = !(insideX && insideY);
            },
            onPanResponderMove: (_, gestureState) => {
                const { dy } = gestureState;
                if (dy > 0) {
                    translateY.setValue(dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                const { dy, vy, dx } = gestureState;
                const shouldClose = dy > SCREEN_HEIGHT * 0.15 || vy > 1.2;
                const isTap = Math.abs(dy) < 10 && Math.abs(dx) < 10 && Math.abs(vy) < 0.6;

                if (shouldClose) {
                    closeModalAnimated();
                    return;
                }

                if (isTap && startedOutsideContentRef.current) {
                    if (onBeginClose) {
                        onBeginClose();
                    }
                    closeModal();
                    return;
                }

                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 18,
                    stiffness: 180,
                    mass: 0.8,
                }).start();
            },
            onPanResponderTerminate: () => {
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 18,
                    stiffness: 180,
                    mass: 0.8,
                }).start();
            },
            onPanResponderTerminationRequest: () => false,
        });
    }, [closeModalAnimated, translateY]);

    useEffect(() => {
        if (modalVisible) {
            translateY.setValue(0);
        }
        if (!modalVisible) {
            if (Platform.OS === 'ios') {
                const timeoutId = setTimeout(() => {
                    translateY.setValue(0);
                }, 320);
                return () => clearTimeout(timeoutId);
            }
            translateY.setValue(0);
        }
    }, [modalVisible, translateY]);

    return (
        <View style={[styles.container, centered && styles.centered]}>
            {/* Кнопка аватара */}
            <TouchableOpacity
                onPress={onAvatarPress}
                disabled={isUploading || modalVisible}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.avatarWrapper,
                    {
                        width: normalizedSize,
                        height: normalizedSize,
                        borderRadius: borderRadius
                    },
                    editable && isEditScreen && styles.editableAvatar
                ]}>
                    {isUploading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#007AFF" />
                            <Text style={styles.loadingText}>
                                {uploadProgress > 0 ? `${uploadProgress}%` : 'Загрузка...'}
                            </Text>
                        </View>
                    ) : avatarUri ? (
                        // Аватар
                        <Image
                            key={avatarUri?.uri || 'avatar'}
                            source={avatarUri}
                            style={[
                                styles.avatarImage,
                                {
                                    width: normalizedSize,
                                    height: normalizedSize,
                                    borderRadius: borderRadius
                                }
                            ]}
                            resizeMode="cover"
                            onLoadStart={() => {
                                if (!__DEV__) return;
                                const uri = avatarUri?.uri || null;
                                const now = Date.now();
                                if (uri && (avatarLogRef.current.lastUri !== uri || now - avatarLogRef.current.lastTs > 5000)) {
                                    console.log('ProfileAvatar: image load start', { uri });
                                    avatarLogRef.current = { lastUri: uri, lastTs: now };
                                }
                            }}
                            onLoad={() => {
                                if (!__DEV__) return;
                                const uri = avatarUri?.uri || null;
                                console.log('ProfileAvatar: image load success', { uri });
                            }}
                            onError={(event) => {
                                if (!__DEV__) return;
                                const uri = avatarUri?.uri || null;
                                const error = event?.nativeEvent || {};
                                console.log('ProfileAvatar: image load error', { uri, error });
                            }}
                        />
                    ) : (
                        <View style={[
                            styles.placeholderContainer,
                            {
                                width: normalizedSize,
                                height: normalizedSize,
                                borderRadius: borderRadius
                            }
                        ]}>
                            <AvatarPlaceholder
                                width={normalize(size * 0.8)}
                                height={normalize(size * 0.8)}
                                color="#666"
                            />
                        </View>
                    )}

                    {/* Индикатор возможности изменения - только на экране редактирования */}
                    {editable && isEditScreen && !isUploading && (
                        <View style={styles.editIndicator}>
                            <Text style={styles.editIndicatorText}>изменить</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            {/* Модальное окно для просмотра аватара */}
            {avatarUri && (
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => {
                        if (onBeginClose) {
                            onBeginClose();
                        }
                        closeModal();
                    }}
                >
                    <Animated.View
                        style={[styles.modalOverlay, { opacity: overlayOpacity }]}
                        {...panResponder.panHandlers}
                    >
                        <Animated.View
                            style={[styles.modalContent, { transform: [{ translateY }] }]}
                            onLayout={event => {
                                contentLayoutRef.current = event.nativeEvent.layout;
                            }}
                        >
                            <Image
                                source={avatarUri}
                                style={styles.modalImage}
                                resizeMode="contain"
                                onError={(event) => {
                                    if (!__DEV__) return;
                                    const uri = avatarUri?.uri || null;
                                    const error = event?.nativeEvent || {};
                                    console.log('ProfileAvatar: modal image load error', { uri, error });
                                }}
                            />
                        </Animated.View>
                    </Animated.View>
                </Modal>
            )}

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: normalize(10),
    },
    centered: {
        alignItems: 'center',
    },
    avatarWrapper: {
        backgroundColor: '#f2f3ff',
        overflow: 'hidden',
        position: 'relative',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    placeholderContainer: {
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    loadingText: {
        marginTop: normalize(5),
        color: '#007AFF',
        fontSize: normalize(12),
    },
    editableAvatar: {
        borderWidth: 1,
        borderColor: 'rgba(0, 122, 255, 0.3)',
    },
    editIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: normalize(4),
        alignItems: 'center',
    },
    editIndicatorText: {
        color: '#FFFFFF',
        fontSize: normalize(12),
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: SCREEN_WIDTH * 0.9,
        height: SCREEN_HEIGHT * 0.6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalImage: {
        width: '100%',
        height: '100%',
        borderRadius: normalize(8),
    },
    debugContainer: {
        marginTop: normalize(10),
        padding: normalize(10),
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: normalize(5),
        maxWidth: SCREEN_WIDTH * 0.9,
    },
    debugText: {
        color: '#fff',
        fontSize: normalize(10),
    }
});