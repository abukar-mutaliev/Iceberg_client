import React, {useState, useRef, useEffect} from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    SafeAreaView,
    TextInput,
    TouchableWithoutFeedback,
    Animated,
} from 'react-native';
import {Color, FontFamily, FontSize} from '@app/styles/GlobalStyles';
import {normalize, normalizeFont} from '@shared/lib/normalize';

export const CustomDatePicker = ({date, onDateChange, visible, onCancel}) => {
    const [internalVisible, setInternalVisible] = useState(false);
    const [tempDate, setTempDate] = useState(date);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(300)).current;

    useEffect(() => {
        if (visible !== undefined) {
            if (visible) {
                openModal();
            } else {
                closeModal();
            }
        }
    }, [visible]);

    useEffect(() => {
        setTempDate(date);
    }, [date]);

    const animateBackground = (toValue, duration = 300) => {
        Animated.timing(fadeAnim, {
            toValue,
            duration,
            useNativeDriver: true,
        }).start();
    };

    const animateSlide = (toValue, duration = 300) => {
        Animated.timing(slideAnim, {
            toValue,
            duration,
            useNativeDriver: true,
        }).start();
    };

    const openModal = () => {
        setInternalVisible(true);
        animateBackground(1);
        animateSlide(0);
    };

    const closeModal = () => {
        animateBackground(0, 200);
        animateSlide(300, 200);
        setTimeout(() => {
            setInternalVisible(false);
            if (onCancel && typeof onCancel === 'function') {
                onCancel();
            }
        }, 200);
    };

    const generateDays = () => {
        const days = [];
        const currentDate = new Date();
        // Генерируем дни на 30 дней вперед от текущей даты
        for (let i = 0; i < 30; i++) {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() + i);
            days.push(newDate);
        }
        return days;
    };

    const days = generateDays();

    const formatDate = (date) => {
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const handleSelectDate = (selectedDate) => {
        const newDate = new Date(selectedDate);
        newDate.setHours(tempDate.getHours(), tempDate.getMinutes());
        setTempDate(newDate);
    };

    const handleConfirm = () => {
        onDateChange(tempDate);
        closeModal();
    };

    return (
        <View>
            {visible === undefined && (
                <TouchableOpacity activeOpacity={0.7} onPress={openModal}>
                    <TextInput
                        style={styles.datePickerInput}
                        value={formatDate(date)}
                        editable={false}
                        pointerEvents="none"
                        placeholder="Выберите дату"
                        placeholderTextColor={Color.dark + '80'}
                    />
                </TouchableOpacity>
            )}

            <Modal visible={visible !== undefined ? visible : internalVisible} transparent={true} animationType="none">
                <TouchableWithoutFeedback onPress={closeModal}>
                    <Animated.View
                        style={[
                            styles.modalContainer,
                            {opacity: fadeAnim, backgroundColor: 'rgba(0, 0, 0, 0.5)'}
                        ]}
                    >
                        <TouchableWithoutFeedback>
                            <Animated.View
                                style={[
                                    styles.modalContent,
                                    {transform: [{translateY: slideAnim}]}
                                ]}
                            >
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Выберите дату</Text>
                                    <TouchableOpacity onPress={closeModal}>
                                        <Text style={styles.closeButton}>Отмена</Text>
                                    </TouchableOpacity>
                                </View>

                                <ScrollView style={styles.daysList}>
                                    {days.map((day, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.dayItem,
                                                day.toDateString() === tempDate.toDateString() && styles.selectedDay,
                                            ]}
                                            onPress={() => handleSelectDate(day)}
                                        >
                                            <Text
                                                style={[
                                                    styles.dayText,
                                                    day.toDateString() === tempDate.toDateString() && styles.selectedDayText,
                                                ]}
                                            >
                                                {formatDate(day)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                                    <Text style={styles.confirmButtonText}>Выбрать</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </TouchableWithoutFeedback>
                    </Animated.View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

export const CustomTimePicker = ({date, onTimeChange, visible, onCancel}) => {
    const [internalVisible, setInternalVisible] = useState(false);
    const [tempDate, setTempDate] = useState(date);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(300)).current;

    useEffect(() => {
        if (visible !== undefined) {
            if (visible) {
                openModal();
            } else {
                closeModal();
            }
        }
    }, [visible]);

    // Обновляем временную дату при изменении даты извне
    useEffect(() => {
        setTempDate(date);
    }, [date]);

    // Функция для запуска анимации фона
    const animateBackground = (toValue, duration = 300) => {
        Animated.timing(fadeAnim, {
            toValue,
            duration,
            useNativeDriver: true,
        }).start();
    };

    // Функция для анимации слайда контента
    const animateSlide = (toValue, duration = 300) => {
        Animated.timing(slideAnim, {
            toValue,
            duration,
            useNativeDriver: true,
        }).start();
    };

    // Открытие модального окна с анимацией фона и слайда
    const openModal = () => {
        setInternalVisible(true);
        animateBackground(1);
        animateSlide(0);
    };

    // Закрытие модального окна с анимацией фона и слайда
    const closeModal = () => {
        animateBackground(0, 200);
        animateSlide(300, 200);
        setTimeout(() => {
            setInternalVisible(false);
            // Вызываем внешний обработчик закрытия, если он предоставлен
            if (onCancel && typeof onCancel === 'function') {
                onCancel();
            }
        }, 200);
    };

    const hours = Array.from({length: 24}, (_, i) => i);
    const minutes = Array.from({length: 12}, (_, i) => i * 5);

    const formatTime = (date) => {
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleSelectTime = (hour, minute) => {
        const newDate = new Date(tempDate);
        newDate.setHours(hour, minute);
        setTempDate(newDate);
    };

    const handleConfirm = () => {
        onTimeChange(tempDate);
        closeModal();
    };

    return (
        <View>
            {visible === undefined && (
                <TouchableOpacity activeOpacity={0.7} onPress={openModal}>
                    <TextInput
                        style={styles.timePickerInput}
                        value={formatTime(date)}
                        editable={false}
                        pointerEvents="none"
                        placeholder="Выберите время"
                        placeholderTextColor={Color.dark}
                    />
                </TouchableOpacity>
            )}

            <Modal visible={visible !== undefined ? visible : internalVisible} transparent={true} animationType="none">
                <TouchableWithoutFeedback onPress={closeModal}>
                    <Animated.View
                        style={[
                            styles.modalContainer,
                            {opacity: fadeAnim, backgroundColor: 'rgba(0, 0, 0, 0.5)'}
                        ]}
                    >
                        <TouchableWithoutFeedback>
                            <Animated.View
                                style={[
                                    styles.modalContent,
                                    {transform: [{translateY: slideAnim}]}
                                ]}
                            >
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Выберите время</Text>
                                    <TouchableOpacity onPress={closeModal}>
                                        <Text style={styles.closeButton}>Отмена</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.timePickerContainer}>
                                    <View style={styles.timeColumn}>
                                        <Text style={styles.timeColumnTitle}>Часы</Text>
                                        <ScrollView style={styles.timeColumnScroll}>
                                            {hours.map((hour) => (
                                                <TouchableOpacity
                                                    key={`hour-${hour}`}
                                                    style={[
                                                        styles.timeItem,
                                                        tempDate.getHours() === hour && styles.selectedTime,
                                                    ]}
                                                    onPress={() => handleSelectTime(hour, tempDate.getMinutes())}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.timeText,
                                                            tempDate.getHours() === hour && styles.selectedTimeText,
                                                        ]}
                                                    >
                                                        {hour.toString().padStart(2, '0')}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    <View style={styles.timeColumn}>
                                        <Text style={styles.timeColumnTitle}>Минуты</Text>
                                        <ScrollView style={styles.timeColumnScroll}>
                                            {minutes.map((minute) => (
                                                <TouchableOpacity
                                                    key={`minute-${minute}`}
                                                    style={[
                                                        styles.timeItem,
                                                        tempDate.getMinutes() === minute && styles.selectedTime,
                                                    ]}
                                                    onPress={() => handleSelectTime(tempDate.getHours(), minute)}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.timeText,
                                                            tempDate.getMinutes() === minute && styles.selectedTimeText,
                                                        ]}
                                                    >
                                                        {minute.toString().padStart(2, '0')}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>

                                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                                    <Text style={styles.confirmButtonText}>Выбрать</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </TouchableWithoutFeedback>
                    </Animated.View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    datePickerInput: {
        height: normalize(30),
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingVertical: normalize(5),
        paddingLeft: 0,
        paddingRight: 0,
        borderColor: 'transparent',
        fontSize: normalizeFont(FontSize.size_xs),
        color: Color.dark || '#000',
        fontFamily: FontFamily.sFProText,
    },
    timePickerInput: {
        height: normalize(30),
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingVertical: normalize(5),
        paddingLeft: 0,
        paddingRight: 0,
        borderColor: 'transparent',
        fontSize: normalizeFont(FontSize.size_xs),
        color: Color.dark || '#000',
        fontFamily: FontFamily.sFProText,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: normalizeFont(FontSize.size_lg) || 18,
        fontWeight: '600',
        color: Color.dark || '#000',
        fontFamily: FontFamily.sFProText,
    },
    closeButton: {
        fontSize: normalizeFont(FontSize.size_md) || 16,
        color: '#007AFF',
        fontFamily: FontFamily.sFProText,
    },
    daysList: {
        maxHeight: 300,
    },
    dayItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    selectedDay: {
        backgroundColor: '#E8F5E9',
    },
    dayText: {
        fontSize: normalizeFont(FontSize.size_md) || 16,
        color: Color.dark || '#000',
        textAlign: 'center',
        fontFamily: FontFamily.sFProText,
    },
    selectedDayText: {
        color: Color.blue2 || '#007AFF',
        fontWeight: '600',
    },
    timePickerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: 250,
    },
    timeColumn: {
        flex: 1,
        marginHorizontal: 10,
    },
    timeColumnTitle: {
        fontSize: normalizeFont(FontSize.size_md) || 16,
        fontWeight: '500',
        color: Color.dark || '#000',
        textAlign: 'center',
        marginBottom: 10,
        fontFamily: FontFamily.sFProText,
    },
    timeColumnScroll: {
        flex: 1,
    },
    timeItem: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    selectedTime: {
        backgroundColor: '#E8F5E9',
    },
    timeText: {
        fontSize: normalizeFont(FontSize.size_lg) || 18,
        color: Color.dark || '#000',
        fontFamily: FontFamily.sFProText,
    },
    selectedTimeText: {
        color: Color.blue2 || '#007AFF',
        fontWeight: '600',
    },
    confirmButton: {
        backgroundColor: Color.blue3 || '#3B43A2',
        borderRadius: 8,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 20,
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(FontSize.size_lg) || 18,
        fontWeight: '600',
    },
    modalTitleContainer: {
        flex: 1,
    },
    modalSubtitle: {
        fontSize: normalizeFont(FontSize.size_sm) || 14,
        color: Color.dark || '#000',
        fontFamily: FontFamily.sFProText,
        opacity: 0.7,
        marginTop: 2,
    },
});