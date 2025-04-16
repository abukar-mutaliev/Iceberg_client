import React, { useState, useEffect } from 'react';
import {
    View,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
    FlatList,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import {
    createFeedback,
    selectFeedbackLoading,
    selectPhotoUploading,
    selectHasUserLeftFeedback,
} from '@/entities/feedback/';
import { selectUser } from '@entities/auth';

const MAX_PHOTOS = 5;

const StarRating = ({ rating, onRatingChange }) => {
    return (
        <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                    key={star}
                    onPress={() => onRatingChange(star)}
                    style={styles.starButton}
                >
                    <View style={styles.star}>
                        <Text style={{
                            fontSize: 30,
                            color: star <= rating ? '#5E00FF' : '#E0E0E0',
                            borderColor: star <= rating ? '#E0E0E0' : '#5E00FF',
                        }}>
                            ★
                        </Text>
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const CameraIcon = ({ size = 24, color = '#FFFFFF' }) => (
    <View>
        <Text style={{ fontSize: size, color }}>📷</Text>
    </View>
);

const GalleryIcon = ({ size = 24, color = '#FFFFFF' }) => (
    <View>
        <Text style={{ fontSize: size, color }}>🖼️</Text>
    </View>
);

const DeleteIcon = ({ size = 16, color = '#FFFFFF' }) => (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: size, color }}>✕</Text>
    </View>
);

export const FeedbackAddModal = ({
                                     visible,
                                     onClose,
                                     onSuccess,
                                     initialRating = 0,
                                     productId,
                                 }) => {
    const { colors } = useTheme();
    const dispatch = useDispatch();
    const currentUser = useSelector(selectUser);

    const hasLeftFeedback = useSelector(
        currentUser?.profile?.id
            ? state => selectHasUserLeftFeedback(currentUser.profile.id)(state, productId)
            : () => false
    );

    const isLoading = useSelector(selectFeedbackLoading);
    const isPhotoUploading = useSelector(selectPhotoUploading);

    const [rating, setRating] = useState(initialRating);
    const [comment, setComment] = useState('');
    const [photos, setPhotos] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (visible && hasLeftFeedback) {
            Alert.alert(
                "Уведомление",
                "Вы уже оставили отзыв к этому продукту.",
                [{
                    text: "OK",
                    onPress: () => {
                        if (onClose) onClose();
                    },
                }],
            );
        }
    }, [visible, hasLeftFeedback, onClose]);

    useEffect(() => {
        if (visible) {
            setRating(initialRating);
            setComment('');
            setPhotos([]);
            setError('');
        }
    }, [visible, initialRating]);

    const handleRatingChange = (newRating) => {
        setRating(newRating);
        if (error && newRating > 0) {
            setError('');
        }
    };

    const pickImages = async () => {
        if (photos.length >= MAX_PHOTOS) {
            Alert.alert('Ограничение', `Вы можете добавить максимум ${MAX_PHOTOS} фотографий`);
            return;
        }

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Доступ запрещен', 'Для выбора фотографий необходимо разрешение на доступ к галерее.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const selectedAsset = result.assets[0];

            if (photos.length + 1 > MAX_PHOTOS) {
                Alert.alert('Ограничение', `Вы можете добавить максимум ${MAX_PHOTOS} фотографий`);
                return;
            }

            setPhotos([...photos, selectedAsset]);
        }
    };

    const takePhoto = async () => {
        if (photos.length >= MAX_PHOTOS) {
            Alert.alert('Ограничение', `Вы можете добавить максимум ${MAX_PHOTOS} фотографий`);
            return;
        }

        const { status } = await ImagePicker.requestCameraPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Доступ запрещен', 'Для съемки фотографий необходимо разрешение на доступ к камере.');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const selectedAsset = result.assets[0];

            if (photos.length + 1 > MAX_PHOTOS) {
                Alert.alert('Ограничение', `Вы можете добавить максимум ${MAX_PHOTOS} фотографий`);
                return;
            }

            setPhotos([...photos, selectedAsset]);
        }
    };

    const removePhoto = (index) => {
        const newPhotos = [...photos];
        newPhotos.splice(index, 1);
        setPhotos(newPhotos);
    };

    const handleSubmit = async () => {
        if (hasLeftFeedback) {
            Alert.alert(
                "Уведомление",
                "Вы уже оставили отзыв к этому продукту.",
                [{ text: "OK" }],
            );
            return;
        }

        if (rating === 0) {
            setError('Пожалуйста, поставьте оценку');
            return;
        }

        const feedbackData = {
            productId,
            rating,
            comment,
            photos,
        };

        try {
            const resultAction = await dispatch(createFeedback(feedbackData));

            if (createFeedback.rejected.match(resultAction)) {
                if (resultAction.payload && resultAction.payload.includes('уже оставили отзыв')) {
                    Alert.alert(
                        "Уведомление",
                        "Вы уже оставили отзыв к этому продукту.",
                        [{ text: "OK" }],
                    );
                } else {
                    setError(resultAction.payload || 'Не удалось отправить отзыв. Попробуйте позже.');
                }
                return;
            }

            if (onSuccess) {
                onSuccess({ rating, comment, productId, photos });
            }

            if (onClose) {
                onClose();
            }
        } catch (error) {
            setError(error.message || 'Не удалось отправить отзыв. Попробуйте позже.');
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.centeredView}
            >
                <View style={[styles.modalView, { backgroundColor: colors.background }]}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={[styles.title, { color: colors.text }]}>
                            Оставить отзыв
                        </Text>

                        <StarRating
                            rating={rating}
                            onRatingChange={handleRatingChange}
                        />

                        <Text style={[styles.ratingText, { color: colors.primary }]}>
                            {rating > 0 ? `Ваша оценка: ${rating}` : 'Выберите оценку'}
                        </Text>

                        {error ? (
                            <Text style={styles.errorText}>{error}</Text>
                        ) : null}

                        {isLoading || isPhotoUploading ? (
                            <ActivityIndicator size="small" color={colors.primary} style={styles.loadingIndicator} />
                        ) : null}

                        <TextInput
                            style={[
                                styles.commentInput,
                                {
                                    backgroundColor: colors.card || '#F9F9F9',
                                    color: colors.text,
                                    borderColor: colors.border || '#E0E0E0',
                                },
                            ]}
                            placeholder="Напишите ваш отзыв"
                            placeholderTextColor={colors.placeholder || '#999999'}
                            multiline
                            value={comment}
                            onChangeText={setComment}
                        />

                        <View style={styles.photosSection}>
                            <Text style={[styles.photosTitle, { color: colors.text }]}>
                                Фотографии: {photos.length}/{MAX_PHOTOS}
                            </Text>

                            {photos.length > 0 && (
                                <FlatList
                                    data={photos}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={(_, index) => `photo-${index}`}
                                    style={styles.photosList}
                                    renderItem={({ item, index }) => (
                                        <View style={styles.photoContainer}>
                                            <Image
                                                source={{ uri: item.uri }}
                                                style={styles.photoPreview}
                                            />
                                            <TouchableOpacity
                                                style={[styles.removePhotoButton, { backgroundColor: colors.error || '#FF3B30' }]}
                                                onPress={() => removePhoto(index)}
                                            >
                                                <DeleteIcon color="#FFFFFF" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                />
                            )}

                            {photos.length < MAX_PHOTOS && (
                                <View style={styles.photoButtonsContainer}>
                                    <TouchableOpacity
                                        style={[styles.photoButton, { backgroundColor: colors.primary }]}
                                        onPress={pickImages}
                                    >
                                        <GalleryIcon />
                                        <Text style={styles.photoButtonText}>Галерея</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.photoButton, { backgroundColor: colors.primary }]}
                                        onPress={takePhoto}
                                    >
                                        <CameraIcon />
                                        <Text style={styles.photoButtonText}>Камера</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton, { borderColor: colors.border || '#E0E0E0' }]}
                                onPress={onClose}
                                disabled={isLoading || isPhotoUploading}
                            >
                                <Text style={[styles.buttonText, { color: colors.text }]}>
                                    Отмена
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    styles.submitButton,
                                    {
                                        backgroundColor: (isLoading || isPhotoUploading)
                                            ? colors.disabled || '#A0A0A0'
                                            : colors.primary || '#3498db',
                                    },
                                ]}
                                onPress={handleSubmit}
                                disabled={isLoading || isPhotoUploading}
                            >
                                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                                    {isLoading || isPhotoUploading ? 'Отправка...' : 'Отправить'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 10,
    },
    modalView: {
        width: '95%',
        maxHeight: '90%',
        borderRadius: 15,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    scrollContent: {
        flexGrow: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
    },
    starsContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        justifyContent: 'center',
    },
    starButton: {
        padding: 5,
    },
    star: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    ratingText: {
        fontSize: 16,
        marginBottom: 16,
        textAlign: 'center',
    },
    errorText: {
        color: 'red',
        marginBottom: 10,
        textAlign: 'center',
    },
    loadingIndicator: {
        marginBottom: 10,
    },
    commentInput: {
        width: '100%',
        minHeight: 100,
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 20,
        textAlignVertical: 'top',
    },
    photosSection: {
        marginBottom: 20,
        width: '100%',
    },
    photosTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 10,
    },
    photosList: {
        marginBottom: 12,
    },
    photoContainer: {
        marginRight: 8,
        position: 'relative',
    },
    photoPreview: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    removePhotoButton: {
        position: 'absolute',
        top: -5,
        right: -5,
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999
    },
    photoButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    photoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 5,
    },
    photoButtonText: {
        color: '#FFFFFF',
        marginLeft: 5,
        fontSize: 14,
        fontWeight: '500',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        minWidth: '45%',
        alignItems: 'center',
    },
    cancelButton: {
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    submitButton: {
        borderWidth: 0,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '500',
    },
});