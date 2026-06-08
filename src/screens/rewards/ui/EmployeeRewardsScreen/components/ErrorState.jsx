import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createStyles } from '../styles/EmployeeRewardsScreen.styles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const ErrorState = React.memo(({ onRetry, errorMessage = "Ошибка загрузки данных" }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    return (
        <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                <Text style={styles.retryButtonText}>Повторить</Text>
            </TouchableOpacity>
        </View>
    );
}); 