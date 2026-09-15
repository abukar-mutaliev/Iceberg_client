import AsyncStorage from '@react-native-async-storage/async-storage';

export const REGISTRATION_PROMPT_SHOWN_KEY = '@iceberg/registrationPromptShown';

/**
 * Показывали ли уже рекомендацию зарегистрироваться.
 * При ошибке чтения возвращаем true, чтобы не показать окно повторно.
 */
export const hasRegistrationPromptBeenShown = async () => {
    try {
        const value = await AsyncStorage.getItem(REGISTRATION_PROMPT_SHOWN_KEY);
        return value === 'true';
    } catch (error) {
        console.warn('RegistrationPrompt: не удалось прочитать флаг показа:', error?.message);
        return true;
    }
};

export const markRegistrationPromptShown = async () => {
    try {
        await AsyncStorage.setItem(REGISTRATION_PROMPT_SHOWN_KEY, 'true');
    } catch (error) {
        console.warn('RegistrationPrompt: не удалось сохранить флаг показа:', error?.message);
    }
};

/** Для отладки и тестирования флоу первого запуска. */
export const resetRegistrationPrompt = async () => {
    try {
        await AsyncStorage.removeItem(REGISTRATION_PROMPT_SHOWN_KEY);
    } catch (error) {
        console.warn('RegistrationPrompt: не удалось сбросить флаг показа:', error?.message);
    }
};
