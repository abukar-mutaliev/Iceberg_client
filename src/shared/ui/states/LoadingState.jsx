import {View, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator} from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ScrollableBackgroundGradient } from '@shared/ui/BackgroundGradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const LoadingState = () => {
    const { colors } = useTheme();

    return (
        <View style={styles.fullScreenContainer}>
            <ScrollableBackgroundGradient />
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        </View>
    );
};
const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
})