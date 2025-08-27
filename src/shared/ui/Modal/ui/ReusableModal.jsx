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
    const translateY = useRef(new Animated.Value(0)).current;
    const modalHeight = useRef(SCREEN_HEIGHT * (height / 100));

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

    // Отслеживание клавиатуры
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
            () => {
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

    // Сброс анимации при изменении видимости
    useEffect(() => {
        if (visible) {
            setIsClosing(false);
            translateY.setValue(0);
        }
    }, [visible, translateY]);

    // Обработчик закрытия модального окна
    const handleModalClose = () => {
        if (!isClosing) {
            setIsClosing(true);
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
            });
        }
    };

    // Обработчики нажатия
    const handleOutsidePress = (event) => {
        event.stopPropagation();
    };

    const handleOverlayPress = () => {
        if (!keyboardVisible) {
            handleModalClose();
        } else {
            Keyboard.dismiss();
        }
    };

    // Компонент заголовка
    const ModalHeader = () => (
        <View style={styles.header}>
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
            visible={visible}
            transparent={true}
            animationType="fade"
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
                <TouchableWithoutFeedback onPress={handleOverlayPress}>
                    <View style={styles.modalOverlay} />
                </TouchableWithoutFeedback>

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
                    <View style={styles.dragHandle} {...panResponder.panHandlers} />

                    <TouchableWithoutFeedback onPress={handleOutsidePress}>
                        <View style={{ flex: 1 }}>
                            <ModalHeader />

                            <KeyboardAvoidingView
                                behavior={Platform.OS === "ios" ? "padding" : undefined}
                                style={{ flex: 1 }}
                                keyboardVerticalOffset={Platform.OS === "ios" ? 30 : 0}
                            >
                                <ScrollView
                                    style={styles.scrollView}
                                    keyboardShouldPersistTaps="handled"
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                >
                                    {children}
                                </ScrollView>
                            </KeyboardAvoidingView>
                        </View>
                    </TouchableWithoutFeedback>
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
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: "#ccc",
        borderRadius: 2.5,
        alignSelf: "center",
        marginTop: 8,
        marginBottom: 8,
    },
    header: {
        height: 38,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderBottomWidth: 0.5,
        borderBottomColor: "#EBEBF0",
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
    scrollView: {
        flex: 1,
    },
});

export default ReusableModal;