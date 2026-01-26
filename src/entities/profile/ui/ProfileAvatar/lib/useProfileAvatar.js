import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from "@react-native-community/netinfo";
import { getImageUrl } from '@shared/api/api';
import { updateAvatar } from '@entities/profile/model/slice';
import {
    selectAvatarUploading,
    selectAvatarUploadProgress,
    selectAvatarError
} from '@entities/profile/model/selectors';
import { useRoute } from '@react-navigation/native';

export const useProfileAvatar = (
    profile,
    currentUser,
    editable = false,
    useCurrentUserFallback = true
) => {
    const dispatch = useDispatch();
    const route = useRoute();
    const isEditScreen = route.name === 'ProfileEdit';

    const [modalVisible, setModalVisible] = useState(false);
    const [permissionModalVisible, setPermissionModalVisible] = useState(false);
    const [permissionType, setPermissionType] = useState('photos');
    const [debugText, setDebugText] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [avatarUriState, setAvatarUriState] = useState(null);
    const avatarUriRef = useRef(null);
    const suppressOpenUntilRef = useRef(0);
    const openTimeoutRef = useRef(null);
    const avatarCacheKeyRef = useRef(Date.now());

    const isUploading = useSelector(selectAvatarUploading);
    const uploadProgress = useSelector(selectAvatarUploadProgress);
    const avatarError = useSelector(selectAvatarError);

    useEffect(() => {
        avatarUriRef.current = null;
    }, [currentUser?.id]);

    const getFullAvatarUrl = useCallback((avatarPath) => {
        if (!avatarPath) {
            return null;
        }

        try {
            // Используем централизованную функцию для формирования URL
            const fullUrl = getImageUrl(avatarPath);
            return fullUrl;
        } catch (error) {
            console.error('Ошибка при формировании URL аватара:', error);
            return null;
        }
    }, []);

    const buildAvatarSource = useCallback((avatarUrl) => {
        if (!avatarUrl) {
            return null;
        }

        const shouldBustCache = Platform.OS === 'ios';
        if (!shouldBustCache) {
            return { uri: avatarUrl };
        }

        const cacheKey = avatarCacheKeyRef.current;
        const separator = avatarUrl.includes('?') ? '&' : '?';
        return {
            uri: `${avatarUrl}${separator}_t=${cacheKey}`,
            cache: 'reload'
        };
    }, []);


    useEffect(() => {
        if (!profile && !currentUser) {
            return;
        }

        let avatarUrl = null;

        if (profile?.user?.avatar) {
            avatarUrl = getFullAvatarUrl(profile.user.avatar);
        }
        else if (profile?.avatar) {
            avatarUrl = getFullAvatarUrl(profile.avatar);
        }
        else if (useCurrentUserFallback) {
            if (currentUser?.avatar) {
                avatarUrl = getFullAvatarUrl(currentUser.avatar);
            }
            else if (currentUser?.role && profile) {
                const role = currentUser.role.toLowerCase();
                if (profile[role]?.avatar) {
                    avatarUrl = getFullAvatarUrl(profile[role].avatar);
                }
            }
        }

        if (avatarUrl) {
            const newAvatarUri = buildAvatarSource(avatarUrl);
            avatarUriRef.current = newAvatarUri;
            setAvatarUriState(newAvatarUri);
        } else {
            avatarUriRef.current = null;
            setAvatarUriState(null);
        }

        setDebugText(prev => prev === 'update' ? 'updated' : 'update');
    }, [profile, currentUser, getFullAvatarUrl, buildAvatarSource]);

    const loadAvatarUri = useCallback(() => {

        let avatarUrl = null;

        if (profile?.user?.avatar) {
            avatarUrl = getFullAvatarUrl(profile.user.avatar);
        }
        else if (profile?.avatar) {
            avatarUrl = getFullAvatarUrl(profile.avatar);
        }
        else if (useCurrentUserFallback) {
            if (currentUser?.avatar) {
                avatarUrl = getFullAvatarUrl(currentUser.avatar);
            }
            else if (currentUser?.role && profile) {
                const role = currentUser.role.toLowerCase();
                if (profile[role]?.avatar) {
                    avatarUrl = getFullAvatarUrl(profile[role].avatar);
                }
            }
        }

        if (avatarUrl) {
            const newAvatarUri = buildAvatarSource(avatarUrl);
            avatarUriRef.current = newAvatarUri;
            setAvatarUriState(newAvatarUri);
            setDebugText(prev => prev === 'update' ? 'updated' : 'update');
            return true;
        }

        avatarUriRef.current = null;
        setAvatarUriState(null);
        return false;
    }, [profile, currentUser, getFullAvatarUrl, buildAvatarSource]);

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
            const reachable = state.isInternetReachable;
            // On iOS, isInternetReachable can be null on first fetch; treat as connected.
            if (reachable === null || typeof reachable === 'undefined') {
                return !!state.isConnected;
            }
            return state.isConnected && reachable;
        } catch (error) {
            return true;
        }
    }, []);

    const beginCloseAvatarModal = useCallback(() => {
        suppressOpenUntilRef.current = Date.now() + 350;
    }, []);

    const handleAvatarPress = useCallback(() => {
        const now = Date.now();
        const open = () => {
            if (avatarUriRef.current) {
                setModalVisible(true);
            }
        };

        if (now < suppressOpenUntilRef.current) {
            const delay = suppressOpenUntilRef.current - now;
            if (openTimeoutRef.current) {
                clearTimeout(openTimeoutRef.current);
            }
            openTimeoutRef.current = setTimeout(() => {
                openTimeoutRef.current = null;
                open();
            }, delay);
            return;
        }

        open();
    }, []);

    const closeAvatarModal = useCallback(() => {
        beginCloseAvatarModal();
        setModalVisible(false);
    }, [beginCloseAvatarModal]);

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

            if (Platform.OS === 'android') {
                // На Android: автоматический запрос разрешения (как раньше)
                const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
                
                if (currentStatus !== 'granted') {
                    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    
                    if (!permissionResult.granted) {
                        setDebugText('Доступ к галерее не предоставлен');
                        return;
                    }
                }
            } else {
                // iOS: сначала запрашиваем разрешение, и только после отказа показываем экран настроек
                const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();

                if (currentStatus !== 'granted') {
                    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

                    if (!permissionResult.granted) {
                        setDebugText('Доступ к галерее не предоставлен');
                        setPermissionType('photos');
                        setPermissionModalVisible(true);
                        return;
                    }
                }
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
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
                // Используем getFullAvatarUrl для правильного формирования URL
                const avatarUrl = getFullAvatarUrl(response.data.avatar);
                if (avatarUrl) {
                    avatarCacheKeyRef.current = Date.now();
                    const newAvatarUri = buildAvatarSource(avatarUrl);
                    avatarUriRef.current = newAvatarUri;
                    // Обновляем state для принудительного ре-рендера
                    setAvatarUriState(newAvatarUri);
                    setDebugText(prev => `Аватар обновлен: ${avatarUrl}`);
                    // Принудительно обновляем компонент
                    setDebugText(prev => prev === 'updated' ? 'update' : 'updated');
                }
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
    }, [dispatch, checkNetworkConnection, getFullAvatarUrl]);

    // Синхронизируем ref с state для ре-рендера при изменении зависимостей
    useEffect(() => {
        const currentAvatarUri = avatarUriRef.current;
        if (JSON.stringify(currentAvatarUri) !== JSON.stringify(avatarUriState)) {
            setAvatarUriState(currentAvatarUri);
        }
    }, [debugText, profile, currentUser]);

    useEffect(() => {
        return () => {
            if (openTimeoutRef.current) {
                clearTimeout(openTimeoutRef.current);
            }
        };
    }, []);

    return {
        avatarUri: avatarUriState || avatarUriRef.current,
        isUploading,
        uploadProgress,
        modalVisible,
        setModalVisible,
        closeAvatarModal,
        beginCloseAvatarModal,
        debugText,
        handleChooseAvatar,
        handleAvatarPress,
        loadAvatarUri,
        permissionModalVisible,
        setPermissionModalVisible,
        permissionType,
    };
};