import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Loader } from '@/shared/ui/Loader';
import { createStyles } from '../styles/EmployeeRewardsScreen.styles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const LoadingState = React.memo(() => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    return (
        <View style={styles.loadingContainer}>
            <Loader />
        </View>
    );
}); 