// entities/profile/ui/ProfileAvatar/index.js
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Image,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    Text,
    Modal,
    TouchableWithoutFeedback,
    Dimensions,
    ProgressBarAndroid,
    ProgressViewIOS,
    NetInfo
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
    updateAvatar,
    selectAvatarUploading,
    selectAvatarUploadProgress,
    selectAvatarError
} from '@/entities/profile';
import { AvatarPlaceholder } from '@shared/ui/Icon/DetailScreenIcons';
import { getBaseUrl } from '@shared/api/api';
import { normalize } from '@/shared/lib/normalize';
import * as ExpoImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ProfileAvatar = ({
                                  profile,
                                  size = 118,
                                  centered = true,
                                  editable = false
                              }) => {
    const dispatch = useDispatch();
    const [modalVisible, setModalVisible] = useState(false);
    const [debugText, setDebugText] = useState('');
    const [selectedImage, setSelectedImage] = useState(null); // Сохраняем выбранное изображение
    const [retryCount, setRetryCount] = useState(0); // Счетчик попыток
    const { tokens, user } = useSelector(state => state.auth);

    // Получаем состояние загрузки из Redux
    const isUploading = useSelector(selectAvatarUploading);
    const uploadProgress = useSelector(selectAvatarUploadProgress);
    const avatarError = useSelector(selectAvatarError);

    const avatarUriRef = useRef(null);

    // Определяем источник аватара при монтировании и при изменении profile/user
    useEffect(() => {
        console.log('ProfileAvatar mounted, editable:', editable);

        // Определяем источник аватара
        if (profile?.user?.avatar) {
            const uri = profile.user.avatar.startsWith('http')
                ? profile.user.avatar
                : `${getBaseUrl()}${profile.user.avatar}`;
            avatarUriRef.current = { uri };
        }
        else if (profile?.avatar) {
            const uri = profile.avatar.startsWith('http')
                ? profile.avatar
                : `${getBaseUrl()}${profile.avatar}`;
            avatarUriRef.current = { uri };
        }
        else if (user?.avatar) {
            const uri = user.avatar.startsWith('http')
                ? user.avatar
                : `${getBaseUrl()}${user.avatar}`;
            avatarUriRef.current = { uri };
        }
        else {
            avatarUriRef.current = null;
        }
    }, [profile, user, tokens, editable]);

    // Отслеживаем ошибки загрузки аватара
    useEffect(() => {
        if (avatarError) {
            // Показываем ошибку с возможностью повторить загрузку
            if (selectedImage && avatarError.includes('Ошибка сети')) {
                Alert.alert(
                    'Ошибка сети',
                    'Не удалось загрузить аватар из-за проблем с подключением. Проверьте соединение и попробуйте снова.',
                    [
                        { text: 'Отмена', style: 'cancel' },
                        {
                            text: 'Повторить',
                            onPress: () => {
                                setRetryCount(prev => prev + 1);
                                uploadAvatarToServer(selectedImage);
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Ошибка', avatarError);
            }
        }
    }, [avatarError]);

    // Повторяем попытку загрузки при изменении счетчика
    useEffect(() => {
        if (retryCount > 0 && selectedImage) {
            uploadAvatarToServer(selectedImage);
        }
    }, [retryCount]);

    // Проверка сетевого подключения
    const checkNetworkConnection = async () => {
        try {
            const state = await NetInfo.fetch();
            return state.isConnected && state.isInternetReachable;
        } catch (error) {
            console.log('Ошибка при проверке сети:', error);
            return false;
        }
    };

    const handleChooseAvatar = async () => {
        console.log('Нажата кнопка выбора аватара');

        if (!editable) {
            console.log('Режим просмотра - открываем модальное окно');
            setModalVisible(true);
            return;
        }

        console.log('Режим редактирования - запускаем выбор изображения');
        setDebugText('Запуск выбора изображения с expo-image-picker');

        try {
            // Проверка подключения к сети
            const isConnected = await checkNetworkConnection();
            if (!isConnected) {
                Alert.alert(
                    'Нет подключения к сети',
                    'Для загрузки аватара необходимо подключение к интернету. Пожалуйста, проверьте ваше соединение и попробуйте снова.'
                );
                return;
            }

            // Запрашиваем разрешения для доступа к медиа-библиотеке
            const permissionResult = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
            console.log('Результат запроса разрешений:', permissionResult);

            if (!permissionResult.granted) {
                setDebugText('Доступ к галерее не предоставлен');
                Alert.alert('Ошибка', 'Необходимо предоставить доступ к галерее');
                return;
            }

            // Запускаем выбор изображения
            console.log('Запускаем ExpoImagePicker.launchImageLibraryAsync');
            const result = await ExpoImagePicker.launchImageLibraryAsync({
                mediaTypes: ExpoImagePicker.MediaType.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            console.log('Результат выбора изображения:', result);
            setDebugText('Ответ от ExpoImagePicker: ' + JSON.stringify(result).substring(0, 100) + '...');

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                console.log('Изображение выбрано:', asset.uri);
                setDebugText(prev => prev + '\nИзображение выбрано: ' + asset.uri);

                // Сохраняем выбранное изображение для возможности повторной загрузки
                setSelectedImage(asset);

                // Проверяем размер файла
                if (asset.fileSize > 5 * 1024 * 1024) { // 5MB в байтах
                    Alert.alert(
                        'Слишком большой файл',
                        'Размер изображения превышает 5MB. Пожалуйста, выберите изображение меньшего размера.'
                    );
                    return;
                }

                // Загружаем выбранное изображение через Redux
                uploadAvatarToServer(asset);
            } else {
                console.log('Выбор изображения отменен');
            }
        } catch (error) {
            console.error('Ошибка при выборе изображения:', error);
            setDebugText('Ошибка при выборе изображения: ' + error.message);
            Alert.alert('Ошибка', 'Не удалось выбрать изображение: ' + error.message);
        }
    };

    const uploadAvatarToServer = async (asset) => {
        if (!asset) {
            console.error('Отсутствует изображение для загрузки');
            return;
        }

        try {
            setDebugText(prev => prev + '\nПодготовка к загрузке...');

            // Проверка подключения к сети перед отправкой
            const isConnected = await checkNetworkConnection();
            if (!isConnected) {
                Alert.alert(
                    'Нет подключения к сети',
                    'Для загрузки аватара необходимо подключение к интернету. Пожалуйста, проверьте ваше соединение и попробуйте снова.'
                );
                return;
            }

            // Создаем FormData для отправки файла
            const formData = new FormData();

            // Получаем информацию о файле
            const fileInfo = asset.uri.split('/');
            const fileName = asset.fileName || fileInfo[fileInfo.length - 1];
            const fileType = asset.type || (fileName.endsWith('.png') ? 'image/png' : 'image/jpeg');

            // Добавляем файл в FormData
            formData.append('avatar', {
                uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
                type: fileType,
                name: fileName
            });

            console.log('Отправляем аватар через Redux...');
            setDebugText(prev => prev + '\nОтправка запроса через Redux...');
            console.log('URI файла:', asset.uri);
            console.log('Тип файла:', fileType);
            console.log('Имя файла:', fileName);
            console.log('Размер файла:', asset.fileSize, 'байт');
            console.log('BaseURL:', getBaseUrl());

            // Вызываем Redux-действие для загрузки аватара
            await dispatch(updateAvatar(formData)).unwrap();

            console.log('Аватар успешно загружен');
            setDebugText(prev => prev + '\nАватар успешно загружен!');

            // Очищаем сохраненное изображение после успешной загрузки
            setSelectedImage(null);

        } catch (error) {
            console.error('Ошибка загрузки аватара:', error);
            setDebugText(prev => prev + '\nОшибка: ' + error.message);
            // Не показываем Alert здесь, так как он уже показывается в useEffect
        }
    };

    // Рендерим прогресс-бар в зависимости от платформы
    const renderProgressBar = () => {
        if (uploadProgress > 0 && uploadProgress < 100) {
            if (Platform.OS === 'android') {
                return (
                    <ProgressBarAndroid
                        styleAttr="Horizontal"
                        indeterminate={false}
                        progress={uploadProgress / 100}
                        color="#007AFF"
                        style={styles.progressBar}
                    />
                );
            } else if (Platform.OS === 'ios') {
                return (
                    <ProgressViewIOS
                        progress={uploadProgress / 100}
                        progressTintColor="#007AFF"
                        style={styles.progressBar}
                    />
                );
            }
        }
        return null;
    };

    const normalizedSize = normalize(size);
    const borderRadius = normalizedSize / 2;

    return (
        <View style={[styles.container, centered && styles.centered]}>
            <TouchableOpacity
                onPress={handleChooseAvatar}
                disabled={isUploading}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.avatarWrapper,
                    {
                        width: normalizedSize,
                        height: normalizedSize,
                        borderRadius: borderRadius
                    }
                ]}>
                    {isUploading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#007AFF" />
                            <Text style={styles.loadingText}>
                                {uploadProgress > 0 ? `${uploadProgress}%` : 'Загрузка...'}
                            </Text>
                            {renderProgressBar()}
                        </View>
                    ) : avatarUriRef.current ? (
                        <Image
                            source={avatarUriRef.current}
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
                </View>
            </TouchableOpacity>

            {editable && (
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={handleChooseAvatar}
                    disabled={isUploading}
                >
                    <Text style={styles.editButtonText}>
                        {avatarUriRef.current ? 'Изменить фото' : 'Добавить фото'}
                    </Text>
                </TouchableOpacity>
            )}

            {/* Модальное окно для просмотра аватара */}
            {avatarUriRef.current && (
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
                                    source={avatarUriRef.current}
                                    style={styles.modalImage}
                                    resizeMode="contain"
                                />
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            )}

            {/* Отладочная информация */}
            {__DEV__ && debugText ? (
                <View style={styles.debugContainer}>
                    <Text style={styles.debugText}>{debugText}</Text>
                </View>
            ) : null}
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
    progressBar: {
        width: '80%',
        marginTop: normalize(5),
    },
    editButton: {
        marginTop: normalize(8),
        paddingVertical: normalize(5),
    },
    editButtonText: {
        color: '#007AFF',
        fontSize: normalize(14),
        fontWeight: '500',
        textAlign: 'center',
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

export default ProfileAvatar;