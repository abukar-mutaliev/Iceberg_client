import React, {useRef, useEffect, useState} from 'react';
import {
    Modal,
    View,
    Image,
    TouchableOpacity,
    Animated,
    Dimensions,
    StyleSheet,
    TouchableWithoutFeedback,
    StatusBar,
    Platform,
    Text,
    Alert,
    ActivityIndicator
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {X, MoreVertical, Download} from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

/**
 * Универсальное модальное окно для просмотра изображений с возможностью сохранения
 * @param {boolean} visible - видимость модального окна
 * @param {string} imageUri - URI изображения для отображения
 * @param {function} onClose - функция закрытия модального окна
 * @param {string} title - заголовок модального окна (опционально)
 * @param {React.ReactNode} headerRight - дополнительная кнопка в заголовке (опционально)
 */
export const ImageViewerModal = ({
                                     visible,
                                     imageUri,
                                     onClose,
                                     title,
                                     headerRight
                                 }) => {
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.3)).current;
    const backgroundOpacity = useRef(new Animated.Value(0)).current;

    const [menuVisible, setMenuVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            // Анимация появления
            Animated.parallel([
                Animated.timing(backgroundOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Анимация исчезновения
            Animated.parallel([
                Animated.timing(backgroundOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 0.3,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const handleClose = () => {
        setMenuVisible(false);
        onClose?.();
    };

    const handleBackgroundPress = () => {
        if (menuVisible) {
            setMenuVisible(false);
        } else {
            handleClose();
        }
    };

    const toggleMenu = () => {
        setMenuVisible(!menuVisible);
    };

    const saveImageToGallery = async () => {
        try {
            setIsSaving(true);
            setMenuVisible(false);

            // Скачиваем файл во временную папку
            const fileName = `iceberg_image_${Date.now()}.jpg`;
            const fileUri = FileSystem.documentDirectory + fileName;

            console.log('Скачиваем изображение с:', imageUri);
            console.log('Сохраняем во временный файл:', fileUri);

            const downloadResult = await FileSystem.downloadAsync(imageUri, fileUri);
            console.log('Результат скачивания:', downloadResult);

            if (downloadResult.status === 200) {
                // Сначала пробуем поделиться изображением (это работает всегда)
                const canShare = await Sharing.isAvailableAsync();

                if (canShare) {
                    Alert.alert(
                        'Сохранить изображение',
                        'Выберите действие:',
                        [
                            {
                                text: 'Поделиться',
                                onPress: async () => {
                                    try {
                                        await Sharing.shareAsync(downloadResult.uri, {
                                            mimeType: 'image/jpeg',
                                            dialogTitle: 'Сохранить изображение'
                                        });
                                    } catch (shareError) {
                                        console.error('Ошибка шаринга:', shareError);
                                        Alert.alert('Ошибка', 'Не удалось поделиться изображением');
                                    }
                                }
                            },
                            {
                                text: 'Сохранить',
                                onPress: async () => {
                                    await saveToGallery(downloadResult.uri);
                                }
                            },
                            {text: 'Отмена', style: 'cancel'}
                        ]
                    );
                } else {
                    // Если шаринг недоступен, просто сохраняем
                    await saveToGallery(downloadResult.uri);
                }
            } else {
                throw new Error('Ошибка загрузки изображения');
            }
        } catch (error) {
            console.error('Ошибка обработки изображения:', error);
            Alert.alert('Ошибка', `Не удалось обработать изображение: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };


    const saveToGallery = async (fileUri) => {
        try {
            // Запрашиваем разрешение
            const {status} = await MediaLibrary.requestPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    'Разрешение не предоставлено',
                    'Для сохранения изображения необходимо разрешение на доступ к галерее'
                );
                return;
            }

            console.log('Сохраняем файл в галерею:', fileUri);

            // Небольшая задержка для стабилизации файла
            await new Promise(resolve => setTimeout(resolve, 100));

            // Проверяем, что файл существует
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            if (!fileInfo.exists) {
                throw new Error('Временный файл не найден');
            }

            console.log('Информация о файле:', fileInfo);

            // Пробуем разные методы сохранения
            let asset;
            try {
                // Метод 1: createAssetAsync (новый API)
                asset = await MediaLibrary.createAssetAsync(fileUri);
            } catch (error1) {
                console.log('Метод 1 не сработал:', error1.message);
                try {
                    // Метод 2: createAssetAsync с параметрами (старый API)
                    asset = await MediaLibrary.createAssetAsync(fileUri, {
                        mediaType: 'photo',
                        album: 'Iceberg App'
                    });
                } catch (error2) {
                    console.log('Метод 2 не сработал:', error2.message);
                    try {
                        // Метод 3: saveToLibraryAsync (альтернативный API)
                        asset = await MediaLibrary.saveToLibraryAsync(fileUri);
                    } catch (error3) {
                        console.log('Метод 3 не сработал:', error3.message);
                        throw new Error('Все методы сохранения недоступны');
                    }
                }
            }

            console.log('Изображение успешно сохранено:', asset);

            // Показываем уведомление об успехе
            Alert.alert(
                'Успешно',
                'Изображение сохранено в галерею',
                [{text: 'OK'}]
            );

            // Очищаем временный файл
            try {
                await FileSystem.deleteAsync(fileUri);
                console.log('Временный файл удален');
            } catch (cleanupError) {
                console.log('Ошибка очистки временного файла:', cleanupError);
            }

        } catch (error) {
            console.error('Ошибка сохранения в галерею:', error);

            // Показываем понятное сообщение об ошибке
            let errorMessage = 'Не удалось сохранить изображение в галерею';

            if (error.message?.includes('permission')) {
                errorMessage = 'Нет разрешения на доступ к галерее';
            } else if (error.message?.includes('Invalid argument')) {
                errorMessage = 'Ошибка обработки файла';
            } else if (error.message?.includes('API недоступен')) {
                errorMessage = 'Функция сохранения временно недоступна';
            } else if (error.message?.includes('Все методы')) {
                errorMessage = 'Функция сохранения недоступна на этом устройстве';
            } else if (error.message) {
                errorMessage = error.message;
            }

            Alert.alert('Ошибка', errorMessage);

            // Очищаем временный файл даже при ошибке
            try {
                await FileSystem.deleteAsync(fileUri);
            } catch (cleanupError) {
                console.log('Ошибка очистки временного файла:', cleanupError);
            }
        }
    };


    if (!visible || !imageUri) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <StatusBar backgroundColor="#000000" barStyle="light-content"/>

            {/* Затемненный фон */}
            <TouchableWithoutFeedback onPress={handleBackgroundPress}>
                <Animated.View
                    style={[
                        styles.backgroundOverlay,
                        {opacity: backgroundOpacity}
                    ]}
                />
            </TouchableWithoutFeedback>

            {/* Контейнер модального окна */}
            <View style={styles.modalContainer} pointerEvents="box-none">
                {/* Верхняя панель с заголовком и кнопками - поверх всего */}
                <View style={styles.topPanel}>
                    {/* Кнопка назад (слева) */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleClose}
                        activeOpacity={0.7}
                    >
                        <View style={styles.backButtonInner}>
                            <Text style={styles.backButtonText}>←</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Заголовок по центру */}
                    {title && imageUri && (
                        <Text style={styles.headerTitle}>{title}</Text>
                    )}

                    {/* Кнопка меню (справа) */}
                    {imageUri && (
                        <TouchableOpacity
                            style={styles.menuButton}
                            onPress={toggleMenu}
                            activeOpacity={0.7}
                            disabled={isSaving}
                        >
                            <View style={styles.menuButtonInner}>
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#FFFFFF"/>
                                ) : (
                                    <MoreVertical size={20} color="#FFFFFF" strokeWidth={2}/>
                                )}
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Дополнительная кнопка справа от заголовка (если есть) */}
                {headerRight && imageUri && (
                    <View style={styles.headerRight}>
                        {headerRight}
                    </View>
                )}

                {/* Меню действий */}
                {menuVisible && imageUri && (
                    <View style={styles.menu}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={saveImageToGallery}
                            activeOpacity={0.7}
                            disabled={isSaving}
                        >
                            <Download size={18} color="#FFFFFF" strokeWidth={2}/>
                            <Text style={styles.menuItemText}>
                                {isSaving ? 'Сохранение...' : 'Сохранить изображение'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Контейнер изображения без отступов */}
                <Animated.View
                    style={[
                        styles.imageContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{scale: scaleAnim}],
                        }
                    ]}
                >
                    {/* Изображение */}
                    {imageUri ? (
                        <Image
                            source={{uri: imageUri}}
                            style={styles.image}
                            resizeMode="contain"
                            onError={() => {
                                handleClose();
                            }}
                        />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Text style={styles.imagePlaceholderText}>👥</Text>
                        </View>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
};
const styles = StyleSheet.create({
    backgroundOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000000',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#000000',
        position: 'relative',
    },
    topPanel: {
        position: 'absolute',
        top: 10,
        left: 0,
        right: 0,
        zIndex: 10, // Поверх всего
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.7)', // Полупрозрачный фон для читаемости
    },
    backButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonInner: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 18,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        flex: 1,
        marginHorizontal: 8,
    },
    headerRight: {
        position: 'absolute',
        right: 16,
        top: 16,
    },
    menuButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuButtonInner: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menu: {
        position: 'absolute',
        top: 60, // Под верхней панелью
        right: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderRadius: 8,
        paddingVertical: 8,
        minWidth: 200,
        zIndex: 11,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.25,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    menuItemText: {
        color: 'white',
        fontSize: 16,
        marginLeft: 12,
        fontWeight: '500',
    },
    imageContainer: {
        flex: 1, // Занимает весь экран
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%', // На всю ширину экрана
        height: '100%', // На всю высоту экрана
        backgroundColor: '#000000',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePlaceholderText: {
        fontSize: 120,
        color: '#FFFFFF',
        opacity: 0.3,
    },
});

