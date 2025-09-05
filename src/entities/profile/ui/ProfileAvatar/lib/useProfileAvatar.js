import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from "@react-native-community/netinfo";
import { getBaseUrl } from '@shared/api/api';
import { updateAvatar } from '@entities/profile/model/slice';
import {
    selectAvatarUploading,
    selectAvatarUploadProgress,
    selectAvatarError
} from '@entities/profile/model/selectors';
import { useRoute } from '@react-navigation/native';

export const useProfileAvatar = (profile, currentUser, editable = false) => {
    const dispatch = useDispatch();
    const route = useRoute();
    const isEditScreen = route.name === 'ProfileEdit';

    const [modalVisible, setModalVisible] = useState(false);
    const [debugText, setDebugText] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const avatarUriRef = useRef(null);

    const isUploading = useSelector(selectAvatarUploading);
    const uploadProgress = useSelector(selectAvatarUploadProgress);
    const avatarError = useSelector(selectAvatarError);

    useEffect(() => {
        avatarUriRef.current = null;
    }, [currentUser?.id]);

    const getFullAvatarUrl = useCallback((avatarPath) => {
        if (!avatarPath) return null;

        try {
            if (avatarPath.startsWith('http')) {
                return avatarPath;
            } else {
                const baseUrl = getBaseUrl();
                const fullUrl = `${baseUrl}${avatarPath}`;
                return fullUrl;
            }
        } catch (error) {
            console.error('Ошибка при формировании URL аватара:', error);
            return null;
        }
    }, []);


    useEffect(() => {
        if (!profile && !currentUser) return;

        let avatarUrl = null;

        if (profile?.user?.avatar) {
            avatarUrl = getFullAvatarUrl(profile.user.avatar);
        }
        else if (profile?.avatar) {
            avatarUrl = getFullAvatarUrl(profile.avatar);
        }
        else if (currentUser?.avatar) {
            avatarUrl = getFullAvatarUrl(currentUser.avatar);
        }
        else if (currentUser?.role && profile) {
            const role = currentUser.role.toLowerCase();
            if (profile[role]?.avatar) {
                avatarUrl = getFullAvatarUrl(profile[role].avatar);
            }
        }

        if (avatarUrl) {
            avatarUriRef.current = { uri: avatarUrl };
        } else {
            avatarUriRef.current = null;
        }

        setDebugText(prev => prev === 'update' ? 'updated' : 'update');
    }, [profile, currentUser, getFullAvatarUrl]);

    const loadAvatarUri = useCallback(() => {

        let avatarUrl = null;

        if (profile?.user?.avatar) {
            avatarUrl = getFullAvatarUrl(profile.user.avatar);
        }
        else if (profile?.avatar) {
            avatarUrl = getFullAvatarUrl(profile.avatar);
        }
        else if (currentUser?.avatar) {
            avatarUrl = getFullAvatarUrl(currentUser.avatar);
        }
        else if (currentUser?.role && profile) {
            const role = currentUser.role.toLowerCase();
            if (profile[role]?.avatar) {
                avatarUrl = getFullAvatarUrl(profile[role].avatar);
            }
        }

        if (avatarUrl) {
            avatarUriRef.current = { uri: avatarUrl };
            setDebugText(prev => prev === 'update' ? 'updated' : 'update');
            return true;
        }

        return false;
    }, [profile, currentUser, getFullAvatarUrl]);

    useEffect(() => {
        if (avatarError) {
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
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Ошибка', avatarError);
            }
        }
    }, [avatarError]);

    useEffect(() => {
        if (retryCount > 0 && selectedImage) {
            uploadAvatarToServer(selectedImage);
        }
    }, [retryCount]);

    const checkNetworkConnection = useCallback(async () => {
        try {
            const state = await NetInfo.fetch();
            return state.isConnected && state.isInternetReachable;
        } catch (error) {
            return true;
        }
    }, []);

    const handleAvatarPress = useCallback(() => {
        if (avatarUriRef.current) {
            setModalVisible(true);
        }
    }, []);

    const handleChoosePhoto = useCallback(async () => {
        setDebugText('Запуск выбора изображения с expo-image-picker');

        try {
            const isConnected = await checkNetworkConnection();
            if (!isConnected) {
                Alert.alert(
                    'Нет подключения к сети',
                    'Для загрузки аватара необходимо подключение к интернету. Пожалуйста, проверьте ваше соединение и попробуйте снова.'
                );
                return;
            }

            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permissionResult.granted) {
                setDebugText('Доступ к галерее не предоставлен');
                Alert.alert('Ошибка', 'Необходимо предоставить доступ к галерее');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            setDebugText('Ответ от ImagePicker: ' + JSON.stringify(result).substring(0, 100) + '...');

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setDebugText(prev => prev + '\nИзображение выбрано: ' + asset.uri);

                setSelectedImage(asset);

                if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
                    Alert.alert(
                        'Большой файл',
                        'Это изображение имеет большой размер. Загрузка может занять некоторое время.',
                        [{ text: 'OK' }]
                    );
                }

                uploadAvatarToServer(asset);
            } else {
                console.log('Выбор изображения отменен');
            }
        } catch (error) {
            setDebugText('Ошибка при выборе изображения: ' + error.message);
            Alert.alert('Ошибка', 'Не удалось выбрать изображение: ' + error.message);
        }
    }, [checkNetworkConnection]);

    // Основная логика для обработки нажатия на аватар в зависимости от экрана
    const handleChooseAvatar = useCallback(() => {

        // Если мы на экране редактирования профиля и редактирование разрешено
        if (isEditScreen && editable) {
            handleChoosePhoto();
        }
        // Иначе просто показываем аватар в модальном окне
        else if (avatarUriRef.current) {
            handleAvatarPress();
        } else {
            const found = loadAvatarUri();
            if (found) {
                handleAvatarPress();
            } else {
                console.log('Аватар не найден');
            }
        }
    }, [isEditScreen, editable, handleChoosePhoto, handleAvatarPress, loadAvatarUri]);

    const uploadAvatarToServer = useCallback(async (asset) => {
        if (!asset) return;

        try {
            const isConnected = await checkNetworkConnection();
            if (!isConnected) {
                Alert.alert(
                    'Нет подключения к сети',
                    'Для загрузки аватара необходимо подключение к интернету. Пожалуйста, проверьте ваше соединение и попробуйте снова.'
                );
                return;
            }

            const formData = new FormData();
            const fileInfo = asset.uri.split('/');
            const fileName = asset.fileName || fileInfo[fileInfo.length - 1];
            const fileType = asset.mimeType || 'image/jpeg';

            formData.append('avatar', {
                uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
                type: fileType,
                name: fileName
            });

            const response = await dispatch(updateAvatar(formData)).unwrap();
            setSelectedImage(null);

            if (response?.data?.avatar) {
                avatarUriRef.current = { uri: response.data.avatar };
                setDebugText(prev => `Аватар обновлен: ${response.data.avatar}`);
            }

        } catch (error) {
            let errorMessage = 'Произошла ошибка при загрузке аватара.';

            if (error.message?.includes('Network Error') ||
                error.message?.includes('ERR_NETWORK') ||
                error.message?.includes('Таймаут') ||
                error.message?.includes('подключением')) {
                errorMessage = 'Ошибка сети при загрузке аватара. Проверьте соединение и попробуйте еще раз.';
            }

            Alert.alert(
                'Ошибка загрузки',
                errorMessage,
                [
                    {
                        text: 'Отмена',
                        style: 'cancel',
                        onPress: () => setSelectedImage(null)
                    },
                    {
                        text: 'Повторить',
                        onPress: () => {
                            if (asset) {
                                setTimeout(() => uploadAvatarToServer(asset), 1000);
                            }
                        }
                    }
                ]
            );
        }
    }, [dispatch, checkNetworkConnection]);

    return {
        avatarUri: avatarUriRef.current,
        isUploading,
        uploadProgress,
        modalVisible,
        setModalVisible,
        debugText,
        handleChooseAvatar,
        handleAvatarPress,
        loadAvatarUri
    };
};