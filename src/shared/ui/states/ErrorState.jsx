import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '@/app/providers/themeProvider/ThemeProvider';
import Text from '@/shared/ui/Text/Text';
import { ScrollableBackgroundGradient } from '@/shared/ui/BackgroundGradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ErrorState = ({
                               message = 'Произошла ошибка при загрузке данных',
                               error = null,
                               onRetry = () => {},
                               buttonText = 'Обновить'
                           }) => {
    const { colors } = useTheme();

    return (
        <View style={styles.fullScreenContainer}>
            <ScrollableBackgroundGradient />
            <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { color: colors.text }]}>
                    {message}
                </Text>
                {error && typeof error === 'string' && (
                    <Text style={[styles.errorDetails, { color: colors.textSecondary }]}>
                        {error}
                    </Text>
                )}
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                    onPress={onRetry}
                >
                    <Text style={styles.actionButtonText}>{buttonText}</Text>
                </TouchableOpacity>
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SCREEN_WIDTH * 0.047,
        backgroundColor: 'transparent',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: SCREEN_WIDTH * 0.037,
        textAlign: 'center',
        marginBottom: SCREEN_WIDTH * 0.023,
        fontWeight: '500',
    },
    errorDetails: {
        fontSize: SCREEN_WIDTH * 0.032,
        textAlign: 'center',
        marginBottom: SCREEN_WIDTH * 0.047,
    },
    actionButton: {
        paddingVertical: SCREEN_WIDTH * 0.023,
        paddingHorizontal: SCREEN_WIDTH * 0.047,
        borderRadius: SCREEN_WIDTH * 0.023,
    },
    actionButtonText: {
        color: 'white',
        fontSize: SCREEN_WIDTH * 0.037,
        fontWeight: '500',
    },
});