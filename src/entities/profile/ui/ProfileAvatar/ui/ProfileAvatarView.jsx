import React from 'react';
import {
    View,
    Image,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Text,
    Modal,
    TouchableWithoutFeedback,
    Platform
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
                                  }) => {
    const route = useRoute();
    const isEditScreen = route.name === 'ProfileEdit';

    const normalizedSize = normalize(size);
    const borderRadius = normalizedSize / 2;

    return (
        <View style={[styles.container, centered && styles.centered]}>
            {/* Кнопка аватара */}
            <TouchableOpacity
                onPress={onAvatarPress}
                disabled={isUploading}
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
                    onRequestClose={() => setModalVisible(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Image
                                    source={avatarUri}
                                    style={styles.modalImage}
                                    resizeMode="contain"
                                />
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
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