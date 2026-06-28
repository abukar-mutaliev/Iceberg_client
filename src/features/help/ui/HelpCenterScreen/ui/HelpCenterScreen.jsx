import React, { useEffect, useMemo, useState } from 'react';
import {
    StyleSheet,
    ScrollView,
    View,
    BackHandler,
    Platform,
    Keyboard,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { normalize } from '@shared/lib/normalize';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { HeaderWithBackButton } from '@shared/ui/HeaderWithBackButton';
import { FAQSection } from '../../FAQSection';
import { ContactSection } from '../../ContactSection';
import { AppFeedbackSection } from '../../AppFeedbackSection';
import { AssistantSection } from '@features/ai-assistant';

/**
 * Главный экран Центра помощи
 */
export const HelpCenterScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const onShow = (e) => {
            setKeyboardHeight(e.endCoordinates?.height ?? 0);
        };
        const onHide = () => setKeyboardHeight(0);
        const subShow = Keyboard.addListener(showEvt, onShow);
        const subHide = Keyboard.addListener(hideEvt, onHide);
        return () => {
            subShow.remove();
            subHide.remove();
        };
    }, []);

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

    const scrollPaddingBottom =
        insets.bottom +
        normalize(120) +
        (Platform.OS === 'android' ? keyboardHeight : 0);

    const scrollRef = React.useRef(null);

    const handleFeedbackFieldFocus = React.useCallback(() => {
        requestAnimationFrame(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        });
    }, []);

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
            <HeaderWithBackButton
                title="Центр помощи"
                onBackPress={handleBackPress}
            />
            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                enabled={Platform.OS === 'ios'}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    ref={scrollRef}
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: scrollPaddingBottom },
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    <AssistantSection />
                    <View style={styles.divider} />
                    <FAQSection />
                    <View style={styles.divider} />
                    <ContactSection />
                    <View style={styles.divider} />
                    <AppFeedbackSection onFeedbackFieldFocus={handleFeedbackFieldFocus} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardAvoid: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 0,
    },
    divider: {
        height: normalize(1),
        backgroundColor: colors.divider,
        marginVertical: normalize(8),
    },
});
