import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles/EmployeeRewardsScreen.styles';

const MONTHS = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export const EmptyState = React.memo(({ selectedMonth, selectedYear, viewMode }) => {
    const getPeriodText = () => {
        if (selectedMonth !== null && selectedMonth !== undefined && selectedYear) {
            return `за ${MONTHS[selectedMonth]} ${selectedYear}`;
        }
        return '';
    };

    const getMessage = () => {
        const period = getPeriodText();
        
        if (viewMode === 'pending') {
            return {
                title: period ? `Нет вознаграждений в ожидании ${period}` : 'Нет вознаграждений в ожидании',
                subtitle: 'Когда появятся новые вознаграждения, они отобразятся здесь'
            };
        }
        
        if (viewMode === 'statistics') {
            return {
                title: period ? `Нет данных по сотрудникам ${period}` : 'Нет данных по сотрудникам',
                subtitle: 'Статистика появится после обработки заказов сотрудниками'
            };
        }
        
        // Режим просмотра вознаграждений сотрудника
        return {
            title: period ? `Нет вознаграждений ${period}` : 'Нет вознаграждений',
            subtitle: period 
                ? 'Попробуйте выбрать другой месяц или период "Все время"' 
                : 'Вознаграждения появятся после обработки заказов'
        };
    };

    const message = getMessage();

    return (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{message.title}</Text>
            <Text style={styles.emptySubtitle}>{message.subtitle}</Text>
        </View>
    );
}); 