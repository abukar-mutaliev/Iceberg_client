import React, { useState, useEffect, useCallback } from 'react';
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
    Keyboard,
    Dimensions,
} from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import {
    createFeedback,
    selectFeedbackLoading,
    selectPhotoUploading,
    selectHasUserLeftFeedbackSafe,
    selectFeedbackError,
} from '@entities/feedback/';
import { selectUser } from '@entities/auth';

const MAX_PHOTOS = 5;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    const currentUser = useSelector((state) => selectUser(state));

    // Используем селекторы для получения состояния
    const hasLeftFeedback = useSelector(selectHasUserLeftFeedbackSafe(currentUser?.profile?.id));
    const isLoading = useSelector(selectFeedbackLoading);
    const isPhotoUploading = useSelector(selectPhotoUploading);
    const feedbackError = useSelector(selectFeedbackError);

    // Локальное состояние
    const [rating, setRating] = useState(initialRating);
    const [comment, setComment] = useState('');
    const [photos, setPhotos] = useState([]);
    const [error, setError] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Обработчики клавиатуры
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => setKeyboardVisible(true)
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => setKeyboardVisible(false)
        );

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    // Проверка на существующий отзыв при открытии модалки
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

    // Сброс формы при открытии
    useEffect(() => {
        if (visible) {
            setRating(initialRating);
            setComment('');
            setPhotos([]);
            setError('');
        }
    }, [visible, initialRating]);

    // Отслеживание ошибок из Redux
    useEffect(() => {
        if (feedbackError) {
            setError(feedbackError);
        }
    }, [feedbackError]);

    const handleRatingChange = useCallback((newRating) => {
        setRating(newRating);
        if (error && newRating > 0) {
            setError('');
        }
    }, [error]);

    const pickImages = useCallback(async () => {
        if (photos.length >= MAX_PHOTOS) {
            Alert.alert('Ограничение', `Вы можете добавить максимум ${MAX_PHOTOS} фотографий`);
            return;
        }

        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Доступ запрещен', 'Для выбора фотографий необходимо разрешение на доступ к галерее.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
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

                setPhotos(prevPhotos => [...prevPhotos, selectedAsset]);
            }
        } catch (error) {
            console.error('Ошибка при выборе изображения:', error);
            Alert.alert('Ошибка', 'Не удалось выбрать изображение');
        }
    }, [photos.length]);

    const takePhoto = useCallback(async () => {
        if (photos.length >= MAX_PHOTOS) {
            Alert.alert('Ограничение', `Вы можете добавить максимум ${MAX_PHOTOS} фотографий`);
            return;
        }

        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Доступ запрещен', 'Для съемки фотографий необходимо разрешение на доступ к камере.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
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

                setPhotos(prevPhotos => [...prevPhotos, selectedAsset]);
            }
        } catch (error) {
            console.error('Ошибка при съемке фото:', error);
            Alert.alert('Ошибка', 'Не удалось сделать фото');
        }
    }, [photos.length]);

    const removePhoto = useCallback((index) => {
        setPhotos(prevPhotos => {
            const newPhotos = [...prevPhotos];
            newPhotos.splice(index, 1);
            return newPhotos;
        });
    }, []);

    const handleSubmit = useCallback(async () => {
        // Проверяем еще раз, не оставил ли пользователь отзыв
        if (hasLeftFeedback) {
            Alert.alert(
                "Уведомление",
                "Вы уже оставили отзыв к этому продукту.",
                [{ text: "OK" }],
            );
            return;
        }

        // Валидация рейтинга
        if (rating === 0) {
            setError('Пожалуйста, поставьте оценку');
            return;
        }

        // Валидация productId
        if (!productId) {
            setError('Ошибка: не указан продукт');
            return;
        }

        const feedbackData = {
            productId,
            rating,
            comment: comment.trim(),
            photos,
        };

        try {
            console.log('Отправка отзыва:', feedbackData);

            const resultAction = await dispatch(createFeedback(feedbackData));

            if (createFeedback.rejected.match(resultAction)) {
                const errorMessage = resultAction.payload;

                if (errorMessage && errorMessage.includes('уже оставили отзыв')) {
                    Alert.alert(
                        "Уведомление",
                        "Вы уже оставили отзыв к этому продукту.",
                        [{ text: "OK" }],
                    );
                } else {
                    setError(errorMessage || 'Не удалось отправить отзыв. Попробуйте позже.');
                }
                return;
            }

            // Успешное создание отзыва
            if (createFeedback.fulfilled.match(resultAction)) {
                console.log('Отзыв успешно создан:', resultAction.payload);

                if (onSuccess) {
                    onSuccess({
                        rating,
                        comment: comment.trim(),
                        productId,
                        photos,
                        feedback: resultAction.payload.feedback
                    });
                }

                if (onClose) {
                    onClose();
                }
            }
        } catch (error) {
            console.error('Ошибка при отправке отзыва:', error);
            setError(error.message || 'Не удалось отправить отзыв. Попробуйте позже.');
        }
    }, [hasLeftFeedback, rating, productId, comment, photos, dispatch, onSuccess, onClose]);

    const handleClose = useCallback(() => {
        if (isLoading || isPhotoUploading) {
            Alert.alert(
                'Подтверждение',
                'Отзыв в процессе отправки. Вы действительно хотите закрыть окно?',
                [
                    { text: 'Отмена', style: 'cancel' },
                    { text: 'Закрыть', onPress: onClose }
                ]
            );
        } else {
            onClose();
        }
    }, [isLoading, isPhotoUploading, onClose]);

    const isSubmitDisabled = isLoading || isPhotoUploading || rating === 0;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={handleClose}
        >
            <View style={styles.centeredView}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardAvoidingView}
                    keyboardVerticalOffset={0}
                    enabled={Platform.OS === 'ios'}
                >
                    <View
                        style={[
                            styles.modalView,
                            {
                                backgroundColor: '#FFFFFF', // Всегда белый фон
                                maxHeight: SCREEN_HEIGHT * 0.9
                            }
                        ]}
                    >
                        <ScrollView
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="interactive"
                            nestedScrollEnabled={true}
                            bounces={false}
                            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                        >
                            <Text style={[styles.title, { color: '#000000' }]}>
                                Оставить отзыв
                            </Text>

                            <StarRating
                                rating={rating}
                                onRatingChange={handleRatingChange}
                            />

                            <Text style={[styles.ratingText, { color: '#5E00FF' }]}>
                                {rating > 0 ? `Ваша оценка: ${rating}` : 'Выберите оценку'}
                            </Text>

                            {error ? (
                                <Text style={styles.errorText}>{error}</Text>
                            ) : null}

                            {(isLoading || isPhotoUploading) && (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color="#5E00FF" />
                                    <Text style={[styles.loadingText, { color: '#000000' }]}>
                                        {isPhotoUploading ? 'Загрузка фотографий...' : 'Отправка отзыва...'}
                                    </Text>
                                </View>
                            )}

                            <TextInput
                                style={[
                                    styles.commentInput,
                                    {
                                        backgroundColor: '#F9F9F9',
                                        color: '#000000',
                                        borderColor: '#E0E0E0',
                                    },
                                ]}
                                placeholder="Напишите ваш отзыв"
                                placeholderTextColor="#999999"
                                multiline
                                value={comment}
                                onChangeText={setComment}
                                editable={!isLoading && !isPhotoUploading}
                            />

                            <View style={styles.photosSection}>
                                <Text style={[styles.photosTitle, { color: '#000000' }]}>
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
                                                    style={[styles.removePhotoButton, { backgroundColor: '#FF3B30' }]}
                                                    onPress={() => removePhoto(index)}
                                                    disabled={isLoading || isPhotoUploading}
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
                                            style={[styles.photoButton, { backgroundColor: '#5E00FF', opacity: (isLoading || isPhotoUploading) ? 0.5 : 1 }]}
                                            onPress={pickImages}
                                            disabled={isLoading || isPhotoUploading}
                                        >
                                            <GalleryIcon />
                                            <Text style={styles.photoButtonText}>Галерея</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.photoButton, { backgroundColor: '#5E00FF', opacity: (isLoading || isPhotoUploading) ? 0.5 : 1 }]}
                                            onPress={takePhoto}
                                            disabled={isLoading || isPhotoUploading}
                                        >
                                            <CameraIcon />
                                            <Text style={styles.photoButtonText}>Камера</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        styles.cancelButton,
                                        {
                                            borderColor: '#E0E0E0',
                                            opacity: (isLoading || isPhotoUploading) ? 0.7 : 1
                                        }
                                    ]}
                                    onPress={handleClose}
                                >
                                    <Text style={[styles.buttonText, { color: '#5E00FF' }]}>
                                        Отмена
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        styles.submitButton,
                                        {
                                            backgroundColor: isSubmitDisabled ? '#A0A0A0' : '#5E00FF',
                                            opacity: isSubmitDisabled ? 0.7 : 1
                                        },
                                    ]}
                                    onPress={handleSubmit}
                                    disabled={isSubmitDisabled}
                                >
                                    <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                                        {isLoading || isPhotoUploading ? 'Отправка...' : 'Отправить'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
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
    keyboardAvoidingView: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalView: {
        width: '95%',
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
        paddingBottom: 20,
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
        color: '#FF3B30',
        marginBottom: 10,
        textAlign: 'center',
        fontSize: 14,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    loadingText: {
        marginLeft: 8,
        fontSize: 14,
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
        paddingVertical: 12,
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