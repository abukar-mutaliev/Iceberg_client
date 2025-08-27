import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles/EmployeeRewardsScreen.styles';

export const EmptyState = React.memo(() => (
    <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Нет данных</Text>
        <Text style={styles.emptySubtitle}>
            Здесь будут отображаться данные о вознаграждениях
        </Text>
    </View>
)); 