import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    SafeAreaView,
    Dimensions,
    Animated,
} from 'react-native';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { normalize, normalizeFont } from '@shared/lib/normalize';

const { width, height } = Dimensions.get('window');

export const DatePickerWheel = ({ date, onDateChange, visible, onCancel, onPress }) => {
    const [internalVisible, setInternalVisible] = useState(false);
    const [selectedYear, setSelectedYear] = useState(date ? date.getFullYear() : new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(date ? date.getMonth() : new Date().getMonth());
    const [selectedDay, setSelectedDay] = useState(date ? date.getDate() : new Date().getDate());

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(300)).current;

    // Синхронизация с внешней датой
    useEffect(() => {
        if (date) {
            setSelectedYear(date.getFullYear());
            setSelectedMonth(date.getMonth());
            setSelectedDay(date.getDate());
        }
    }, [date]);

    // Используем либо external visible, либо internal
    const isVisible = visible !== undefined ? visible : internalVisible;

    useEffect(() => {
        if (visible !== undefined) {
            if (visible) {
                animateBackground(1);
                animateSlide(0);
            } else {
                animateBackground(0, 200);
                animateSlide(300, 200);
            }
        }
    }, [visible]);

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
        if (visible === undefined) {
            // Используем внутреннее состояние
            setInternalVisible(true);
        }
        animateBackground(1);
        animateSlide(0);
    };

    const closeModal = () => {
        animateBackground(0, 200);
        animateSlide(300, 200);
        setTimeout(() => {
            if (visible === undefined) {
                // Используем внутреннее состояние
                setInternalVisible(false);
            }
            if (onCancel && typeof onCancel === 'function') {
                onCancel();
            }
        }, 200);
    };

    const handlePress = () => {
        if (onPress && typeof onPress === 'function') {
            // Используем внешний обработчик открытия
            onPress();
        } else {
            // Используем внутренний обработчик открытия
            openModal();
        }
    };

    // Генерация данных для колес
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i); // 2 года назад + текущий + 7 вперед

    const months = [
        { value: 0, label: 'Январь' },
        { value: 1, label: 'Февраль' },
        { value: 2, label: 'Март' },
        { value: 3, label: 'Апрель' },
        { value: 4, label: 'Май' },
        { value: 5, label: 'Июнь' },
        { value: 6, label: 'Июль' },
        { value: 7, label: 'Август' },
        { value: 8, label: 'Сентябрь' },
        { value: 9, label: 'Октябрь' },
        { value: 10, label: 'Ноябрь' },
        { value: 11, label: 'Декабрь' },
    ];

    // Получаем количество дней в выбранном месяце
    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Обработчики изменения выбора
    const handleYearChange = (year) => {
        setSelectedYear(year);
        // Корректируем день если он превышает количество дней в новом месяце
        const maxDays = getDaysInMonth(year, selectedMonth);
        if (selectedDay > maxDays) {
            setSelectedDay(maxDays);
        }
    };

    const handleMonthChange = (month) => {
        setSelectedMonth(month);
        // Корректируем день если он превышает количество дней в новом месяце
        const maxDays = getDaysInMonth(selectedYear, month);
        if (selectedDay > maxDays) {
            setSelectedDay(maxDays);
        }
    };

    const handleConfirm = () => {
        const selectedDate = new Date(selectedYear, selectedMonth, selectedDay);
        onDateChange(selectedDate);
        closeModal();
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    return (
        <View>
            <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
                <View style={styles.datePickerInput}>
                    <Text style={styles.datePickerInputText}>
                        {date ? formatDate(date) : 'Выберите дату'}
                    </Text>
                </View>
            </TouchableOpacity>

            <Modal visible={isVisible} transparent={true} animationType="none">
                <Animated.View
                    style={[
                        styles.modalContainer,
                        { opacity: fadeAnim }
                    ]}
                >
                    <TouchableOpacity
                        style={[styles.modalBackdrop, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
                        activeOpacity={1}
                        onPress={closeModal}
                    >
                        <SafeAreaView style={styles.safeArea}>
                            <TouchableOpacity activeOpacity={1}>
                                <Animated.View
                                    style={[
                                        styles.modalContent,
                                        { transform: [{ translateY: slideAnim }] }
                                    ]}
                                >
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Выберите дату</Text>
                                    <TouchableOpacity onPress={closeModal}>
                                        <Text style={styles.closeButton}>Отмена</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.pickerContainer}>
                                    {/* Колесо годов */}
                                    <View style={styles.wheelContainer}>
                                        <Text style={styles.wheelTitle}>Год</Text>
                                        <ScrollView
                                            style={styles.wheel}
                                            showsVerticalScrollIndicator={false}
                                            snapToInterval={50}
                                            decelerationRate="fast"
                                        >
                                            {years.map((year) => (
                                                <TouchableOpacity
                                                    key={year}
                                                    style={[
                                                        styles.wheelItem,
                                                        selectedYear === year && styles.wheelItemSelected
                                                    ]}
                                                    onPress={() => handleYearChange(year)}
                                                >
                                                    <Text style={[
                                                        styles.wheelItemText,
                                                        selectedYear === year && styles.wheelItemTextSelected
                                                    ]}>
                                                        {year}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    {/* Колесо месяцев */}
                                    <View style={styles.wheelContainer}>
                                        <Text style={styles.wheelTitle}>Месяц</Text>
                                        <ScrollView
                                            style={styles.wheel}
                                            showsVerticalScrollIndicator={false}
                                            snapToInterval={50}
                                            decelerationRate="fast"
                                        >
                                            {months.map((month) => (
                                                <TouchableOpacity
                                                    key={month.value}
                                                    style={[
                                                        styles.wheelItem,
                                                        selectedMonth === month.value && styles.wheelItemSelected
                                                    ]}
                                                    onPress={() => handleMonthChange(month.value)}
                                                >
                                                    <Text style={[
                                                        styles.wheelItemText,
                                                        selectedMonth === month.value && styles.wheelItemTextSelected
                                                    ]}>
                                                        {month.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    {/* Колесо дней */}
                                    <View style={styles.wheelContainer}>
                                        <Text style={styles.wheelTitle}>День</Text>
                                        <ScrollView
                                            style={styles.wheel}
                                            showsVerticalScrollIndicator={false}
                                            snapToInterval={50}
                                            decelerationRate="fast"
                                        >
                                            {days.map((day) => (
                                                <TouchableOpacity
                                                    key={day}
                                                    style={[
                                                        styles.wheelItem,
                                                        selectedDay === day && styles.wheelItemSelected
                                                    ]}
                                                    onPress={() => setSelectedDay(day)}
                                                >
                                                    <Text style={[
                                                        styles.wheelItemText,
                                                        selectedDay === day && styles.wheelItemTextSelected
                                                    ]}>
                                                        {day}
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
                            </TouchableOpacity>
                        </SafeAreaView>
                    </TouchableOpacity>
                </Animated.View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    datePickerInput: {
        height: normalize(40),
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        justifyContent: 'center',
    },
    datePickerInputText: {
        fontSize: normalizeFont(FontSize.size_sm),
        color: Color.dark || '#000',
        fontFamily: FontFamily.sFProText,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    safeArea: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
        maxHeight: '75%',
        minHeight: '70%',
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
    pickerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: 200,
        marginBottom: 20,
    },
    wheelContainer: {
        flex: 1,
        alignItems: 'center',
    },
    wheelTitle: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontWeight: '600',
        color: Color.dark || '#000',
        marginBottom: 10,
        fontFamily: FontFamily.sFProText,
    },
    wheel: {
        flex: 1,
        width: '100%',
    },
    wheelItem: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
    },
    wheelItemSelected: {
        backgroundColor: '#e3f2fd',
        borderRadius: 8,
    },
    wheelItemText: {
        fontSize: normalizeFont(FontSize.size_md),
        color: Color.dark || '#000',
        fontFamily: FontFamily.sFProText,
    },
    wheelItemTextSelected: {
        color: '#667eea',
        fontWeight: '600',
    },
    confirmButton: {
        backgroundColor: Color.blue3 || '#3B43A2',
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 10,
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(FontSize.size_lg) || 18,
        fontWeight: '600',
    },
});
