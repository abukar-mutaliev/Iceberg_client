import React from 'react';
import { StyleSheet, ScrollView, View, BackHandler } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { normalize } from '@shared/lib/normalize';
import { HeaderWithBackButton } from '@shared/ui/HeaderWithBackButton';
import { FAQSection } from '../../FAQSection';
import { ContactSection } from '../../ContactSection';
import { AppFeedbackSection } from '../../AppFeedbackSection';

/**
 * Главный экран Центра помощи
 */
export const HelpCenterScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const handleBackPress = React.useCallback(() => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('ProfileMain');
        }
    }, [navigation]);

    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                handleBackPress();
                return true;
            };

            const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => {
                if (backHandler && typeof backHandler.remove === 'function') {
                    backHandler.remove();
                }
            };
        }, [handleBackPress])
    );

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
            <HeaderWithBackButton
                title="Центр помощи"
                onBackPress={handleBackPress}
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + normalize(120) },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <FAQSection />
                <View style={styles.divider} />
                <ContactSection />
                <View style={styles.divider} />
                <AppFeedbackSection />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 0,
    },
    divider: {
        height: normalize(1),
        backgroundColor: '#E5E5E5',
        marginVertical: normalize(8),
    },
});
