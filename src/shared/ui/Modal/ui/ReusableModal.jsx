import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import CloseIcon from "@shared/ui/Icon/Profile/CloseIcon";
import { Color, FontFamily } from "@app/styles/GlobalStyles";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * Универсальное переиспользуемое модальное окно
 * @param {Object} props - Свойства компонента
 * @param {boolean} props.visible - Видимость модального окна
 * @param {Function} props.onClose - Функция закрытия модального окна
 * @param {string} props.title - Заголовок модального окна
 * @param {React.ReactNode} props.children - Содержимое модального окна
 * @param {number} props.height - Высота модального окна (в процентах от высоты экрана, по умолчанию 90%)
 * @param {Object} props.additionalStyles - Дополнительные стили для модального окна
 * @param {boolean} props.disableSwipe - Отключение возможности закрытия свайпом (по умолчанию false)
 * @param {boolean} props.fullScreenOnKeyboard - Разворачивать на весь экран при открытии клавиатуры (по умолчанию false)
 * @returns {JSX.Element}
 */
export const ReusableModal = ({
                                  visible,
                                  onClose,
                                  title,
                                  children,
                                  height = 90,
                                  additionalStyles = {},
                                  disableSwipe = false,
                                  fullScreenOnKeyboard = false,
                              }) => {
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [showModal, setShowModal] = useState(visible);
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const modalHeight = useRef(SCREEN_HEIGHT * (height / 100));
    const [contentReady, setContentReady] = useState(false);

    // Настройка PanResponder для свайпа
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !disableSwipe,
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                if (disableSwipe) return false;
                return gestureState.dy > 0 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
            },
            onPanResponderMove: (evt, gestureState) => {
                if (gestureState.dy > 0 && !disableSwipe) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                if (gestureState.dy > 100 && !disableSwipe) {
                    handleModalClose();
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        let timer;
        if (visible) {
            // Сначала покажем модальное окно
            setShowModal(true);
            setIsClosing(false);

            // Затем запустим анимацию открытия
            Animated.timing(translateY, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                // И только после завершения анимации покажем содержимое
                timer = setTimeout(() => {
                    setContentReady(true);
                }, 50);
            });
        } else {
            // При закрытии сначала скрываем содержимое
            setContentReady(false);

            // Затем с небольшой задержкой начинаем закрытие
            if (!isClosing && showModal) {
                timer = setTimeout(() => {
                    handleModalClose();
                }, 50);
            }
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [visible, translateY]);

    // Отслеживание клавиатуры
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
            (event) => {
                // Запоминаем высоту клавиатуры для корректировки размеров модального окна
                const keyboardHeight = event.endCoordinates.height;
                setKeyboardVisible(true);
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
            () => {
                setKeyboardVisible(false);
            }
        );

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    // Управление анимацией при изменении видимости
    useEffect(() => {
        if (visible) {
            setShowModal(true);
            setIsClosing(false);
            // Анимация открытия снизу вверх
            Animated.timing(translateY, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else if (!isClosing && showModal) {
            // Если модалка видима, но должна закрыться
            handleModalClose();
        }
    }, [visible, translateY]);

    // Обработчик закрытия модального окна
    const handleModalClose = () => {
        if (!isClosing) {
            setIsClosing(true);
            setContentReady(false);

            setTimeout(() => {
                Keyboard.dismiss();

                Animated.timing(translateY, {
                    toValue: modalHeight.current,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => {
                    if (onClose && typeof onClose === "function") {
                        onClose();
                    }
                    setIsClosing(false);
                    setShowModal(false);
                });
            }, 50);
        }
    };

    // Обработчик нажатия на оверлей (тёмную область вокруг модального окна)
    const handleOverlayPress = () => {
        if (!keyboardVisible) {
            handleModalClose();
        } else {
            Keyboard.dismiss();
        }
    };

    // Компонент заголовка с возможностью свайпа
    const ModalHeader = () => (
        <View style={styles.header} {...panResponder.panHandlers}>
            <Text style={styles.headerTitle}>{title}</Text>
            <TouchableOpacity
                style={styles.closeButton}
                onPress={handleModalClose}
                activeOpacity={0.7}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
                <CloseIcon size={12} color="#000" />
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal
            visible={showModal}
            transparent={true}
            animationType="none"
            onRequestClose={() => {
                if (keyboardVisible) {
                    Keyboard.dismiss();
                } else {
                    handleModalClose();
                }
            }}
            statusBarTranslucent={true}
        >
            <View style={styles.container}>
                {/* Оверлей (темная область вокруг модального окна) */}
                <TouchableWithoutFeedback onPress={handleOverlayPress}>
                    <View style={styles.modalOverlay} />
                </TouchableWithoutFeedback>

                {/* Модальное окно с анимацией */}
                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            height: `${fullScreenOnKeyboard && keyboardVisible ? 100 : height}%`,
                            transform: [{ translateY }],
                        },
                        additionalStyles,
                    ]}
                >
                    {/* Заголовок модального окна */}
                    <ModalHeader />

                    {/* Основное содержимое модального окна */}
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={{ flex: 1 }}
                        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                        enabled={true}
                    >
                        {/* Используем обычный View вместо ScrollView для предотвращения конфликтов с FlatList */}
                        <View style={styles.contentContainer}>
                            {contentReady ? (
                                children
                            ) : (
                                <View style={styles.loadingContainer}>
                                    {/* Заглушка во время загрузки содержимого */}
                                </View>
                            )}
                        </View>
                    </KeyboardAvoidingView>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        justifyContent: "flex-end",
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "transparent",
    },
    modalContent: {
        width: "100%",
        backgroundColor: Color.colorLightMode,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: "hidden",
        // Тень для iOS
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        // Тень для Android
        elevation: 5,
    },
    header: {
        height: 50,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderBottomWidth: 0.5,
        borderBottomColor: "#EBEBF0",
        paddingTop: 10,
    },
    headerTitle: {
        fontWeight: "600",
        fontSize: 16,
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    closeButton: {
        position: "absolute",
        right: 16,
        alignItems: "center",
        justifyContent: "center",
        padding: 5,
    },
      contentContainer: {
    flex: 1,
  },
    loadingContainer: {
        flex: 1,
        minHeight: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ReusableModal;