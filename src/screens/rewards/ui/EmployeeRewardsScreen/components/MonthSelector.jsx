import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';

const MONTHS = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export const MonthSelector = React.memo(({ selectedMonth, selectedYear, onMonthChange }) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const [isOpen, setIsOpen] = useState(false);
    const [viewYear, setViewYear] = useState(selectedYear ?? currentYear);

    // Генерируем список доступных месяцев (текущий год + предыдущий)
    const availableMonths = useMemo(() => {
        const months = [];
        
        // Добавляем месяцы предыдущего года
        for (let month = 0; month < 12; month++) {
            months.push({
                year: currentYear - 1,
                month: month,
                label: `${MONTHS[month]} ${currentYear - 1}`,
                isCurrent: false,
                isFuture: false
            });
        }
        
        // Добавляем месяцы текущего года до текущего месяца (включительно)
        for (let month = 0; month <= currentMonth; month++) {
            months.push({
                year: currentYear,
                month: month,
                label: `${MONTHS[month]} ${currentYear}`,
                isCurrent: month === currentMonth && currentYear === selectedYear,
                isFuture: false
            });
        }
        
        return months.reverse(); // Показываем от новых к старым
    }, [currentYear, currentMonth, selectedYear]);

    const availableYears = useMemo(() => {
        return [currentYear, currentYear - 1];
    }, [currentYear]);

    // Опция "Все время"
    const handleSelectAll = () => {
        onMonthChange(null, null);
        setIsOpen(false);
    };

    const handleSelectMonth = (year, month) => {
        onMonthChange(year, month);
        setIsOpen(false);
    };

    const isAllTimeSelected = selectedMonth === null && selectedYear === null;
    const selectedLabel = isAllTimeSelected
        ? 'Все время'
        : selectedMonth !== null && selectedYear
            ? `${MONTHS[selectedMonth]} ${selectedYear}`
            : 'Выбрать месяц';

    const openModal = () => {
        setViewYear(selectedYear ?? currentYear);
        setIsOpen(true);
    };

    const closeModal = () => setIsOpen(false);

    const canGoPrev = availableYears.includes(viewYear - 1);
    const canGoNext = availableYears.includes(viewYear + 1);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Период</Text>
            <TouchableOpacity
                style={styles.triggerButton}
                onPress={openModal}
                activeOpacity={0.7}
            >
                <Text style={styles.triggerText}>{selectedLabel}</Text>
            </TouchableOpacity>

            <Modal
                visible={isOpen}
                transparent
                animationType="fade"
                onRequestClose={closeModal}
            >
                <View style={styles.modalBackdrop}>
                    <Pressable style={styles.backdropPressArea} onPress={closeModal} />
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Выберите месяц</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={closeModal}
                                accessibilityLabel="Закрыть"
                            >
                                <Text style={styles.closeButtonText}>X</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.yearRow}>
                            <TouchableOpacity
                                style={styles.yearArrowButton}
                                onPress={() => setViewYear(viewYear - 1)}
                                disabled={!canGoPrev}
                            >
                                <Text style={[styles.yearArrow, !canGoPrev && styles.yearArrowDisabled]}>‹</Text>
                            </TouchableOpacity>
                            <Text style={styles.yearText}>{viewYear}</Text>
                            <TouchableOpacity
                                style={styles.yearArrowButton}
                                onPress={() => setViewYear(viewYear + 1)}
                                disabled={!canGoNext}
                            >
                                <Text style={[styles.yearArrow, !canGoNext && styles.yearArrowDisabled]}>›</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.monthGrid}>
                            {MONTHS.map((monthName, index) => {
                                const isSelected = selectedYear === viewYear && selectedMonth === index;

                                return (
                                    <TouchableOpacity
                                        key={`${viewYear}-${index}`}
                                        style={[
                                            styles.monthGridButton,
                                            isSelected && styles.monthGridButtonActive
                                        ]}
                                        onPress={() => handleSelectMonth(viewYear, index)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.monthGridText,
                                            isSelected && styles.monthGridTextActive
                                        ]}>
                                            {monthName}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.allTimeButton,
                                isAllTimeSelected && styles.allTimeButtonActive
                            ]}
                            onPress={handleSelectAll}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.allTimeText,
                                isAllTimeSelected && styles.allTimeTextActive
                            ]}>
                                Все время
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
});

MonthSelector.displayName = 'MonthSelector';

const styles = StyleSheet.create({
    container: {
        marginVertical: 10,
        paddingLeft: 16,
        paddingRight: 16,
        flexShrink: 0,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    triggerButton: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    triggerText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    backdropPressArea: {
        ...StyleSheet.absoluteFillObject,
    },
    modalCard: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    closeButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#555',
    },
    yearRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingHorizontal: 8,
    },
    yearText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    yearArrowButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    yearArrow: {
        fontSize: 22,
        color: '#333',
    },
    yearArrowDisabled: {
        color: '#C0C0C0',
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    monthGridButton: {
        width: '31%',
        paddingVertical: 10,
        marginBottom: 10,
        borderRadius: 10,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        alignItems: 'center',
    },
    monthGridButtonActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    monthGridText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#444',
    },
    monthGridTextActive: {
        color: '#FFFFFF',
    },
    allTimeButton: {
        marginTop: 8,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        alignItems: 'center',
    },
    allTimeButtonActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    allTimeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#444',
    },
    allTimeTextActive: {
        color: '#FFFFFF',
    },
});

