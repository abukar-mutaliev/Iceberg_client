import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useRegistrationPromptTrigger } from '../../../hooks/useRegistrationPromptTrigger';
import { RegistrationPromptDialog } from '../../RegistrationPromptDialog';

/**
 * Подключает рекомендацию зарегистрироваться к навигации.
 * Монтируется один раз на весь app — рядом с остальными глобальными диалогами.
 */
export const RegistrationPromptHost = () => {
    const navigation = useNavigation();
    const { isVisible, hide } = useRegistrationPromptTrigger();

    const openAuth = useCallback((activeTab) => {
        hide();
        try {
            navigation.navigate('Auth', { activeTab });
        } catch (error) {
            console.error('RegistrationPrompt: не удалось открыть экран авторизации:', error);
        }
    }, [hide, navigation]);

    const handleRegister = useCallback(() => openAuth('login'), [openAuth]);
    const handleLogin = useCallback(() => openAuth('login'), [openAuth]);

    return (
        <RegistrationPromptDialog
            visible={isVisible}
            onRegister={handleRegister}
            onLogin={handleLogin}
            onDismiss={hide}
        />
    );
};
