import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

const MONTHS = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export const MonthSelector = React.memo(({ selectedMonth, selectedYear, onMonthChange }) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

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

    // Опция "Все время"
    const handleSelectAll = () => {
        onMonthChange(null, null);
    };

    const handleSelectMonth = (year, month) => {
        onMonthChange(year, month);
    };

    const isAllTimeSelected = selectedMonth === null && selectedYear === null;

    return (
        <View style={styles.container} onStartShouldSetResponder={() => true}>
            <Text style={styles.title}>Выберите период</Text>
            
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                nestedScrollEnabled={true}
                scrollEnabled={true}
                removeClippedSubviews={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Кнопка "Все время" */}
                <TouchableOpacity
                    style={[
                        styles.monthButton,
                        isAllTimeSelected && styles.monthButtonActive
                    ]}
                    onPress={handleSelectAll}
                >
                    <Text style={[
                        styles.monthText,
                        isAllTimeSelected && styles.monthTextActive
                    ]}>
                        Все время
                    </Text>
                </TouchableOpacity>

                {/* Кнопки месяцев */}
                {availableMonths.map((item) => {
                    const isSelected = item.month === selectedMonth && item.year === selectedYear;
                    
                    return (
                        <TouchableOpacity
                            key={`${item.year}-${item.month}`}
                            style={[
                                styles.monthButton,
                                isSelected && styles.monthButtonActive,
                                item.isCurrent && styles.monthButtonCurrent
                            ]}
                            onPress={() => handleSelectMonth(item.year, item.month)}
                        >
                            <Text style={[
                                styles.monthText,
                                isSelected && styles.monthTextActive
                            ]}>
                                {item.label}
                            </Text>
                            {item.isCurrent && (
                                <Text style={styles.currentBadge}>Текущий</Text>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
});

MonthSelector.displayName = 'MonthSelector';

const styles = StyleSheet.create({
    container: {
        marginVertical: 10,
        paddingLeft: 16,
        maxHeight: 120, // Ограничиваем высоту чтобы не конфликтовать с основным скроллом
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
        paddingRight: 16,
    },
    scrollContent: {
        paddingVertical: 4,
        paddingRight: 32, // Увеличен отступ справа
        flexGrow: 0, // Не растягиваем контент
    },
    monthButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
        marginRight: 10, // Увеличен отступ между кнопками
        borderWidth: 1,
        borderColor: '#E0E0E0',
        minWidth: 120, // Увеличена минимальная ширина для лучшей видимости
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthButtonActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    monthButtonCurrent: {
        borderColor: '#FF9500',
        borderWidth: 2,
    },
    monthText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
    },
    monthTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    currentBadge: {
        fontSize: 10,
        color: '#FF9500',
        marginTop: 2,
        fontWeight: '600',
    },
});

