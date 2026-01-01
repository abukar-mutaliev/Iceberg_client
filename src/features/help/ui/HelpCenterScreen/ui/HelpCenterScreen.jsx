import React from 'react';
import { SafeAreaView, StyleSheet, ScrollView, View } from 'react-native';
import { normalize } from '@shared/lib/normalize';
import { FAQSection } from '../../FAQSection';
import { ContactSection } from '../../ContactSection';
import { AppFeedbackSection } from '../../AppFeedbackSection';

/**
 * Главный экран Центра помощи
 */
export const HelpCenterScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
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
        paddingBottom: normalize(24),
    },
    divider: {
        height: normalize(1),
        backgroundColor: '#E5E5E5',
        marginVertical: normalize(8),
    },
});
