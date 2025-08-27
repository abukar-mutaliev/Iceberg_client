import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles/EmployeeRewardsScreen.styles';

export const ErrorState = React.memo(({ onRetry, errorMessage = "Ошибка загрузки данных" }) => (
    <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Повторить</Text>
        </TouchableOpacity>
    </View>
)); 