import React, { useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from "@app/providers/themeProvider/ThemeProvider";
import BackArrowIcon from "@shared/ui/Icon/BackArrowIcon/BackArrowIcon";
import { Color } from '@app/styles/GlobalStyles';

export const BackButton = ({ onPress, style, disabled = false }) => {
    const { colors } = useTheme();
    const navigation = useNavigation();
    const isNavigatingRef = useRef(false);

    const handlePress = () => {
        if (disabled || isNavigatingRef.current) {
            if (process.env.NODE_ENV === 'development') {
                console.log('BackButton - button is disabled or already navigating');
            }
            return;
        }

        // Блокируем повторные нажатия
        isNavigatingRef.current = true;

        if (typeof onPress === 'function') {
            onPress();
            // Сбрасываем блокировку сразу после выполнения onPress
            setTimeout(() => {
                isNavigatingRef.current = false;
            }, 100);
        } else if (navigation.canGoBack()) {
            navigation.goBack();
            // Сбрасываем блокировку сразу после навигации
            setTimeout(() => {
                isNavigatingRef.current = false;
            }, 100);
        } else {
            // Если не можем вернуться назад, переходим на главный экран
            navigation.navigate('Main');
            // Сбрасываем блокировку сразу после навигации
            setTimeout(() => {
                isNavigatingRef.current = false;
            }, 100);
        }
    };

    return (
        <Pressable
            style={[
                styles.button,
                style,
                disabled && styles.disabled
            ]}
            onPress={handlePress}
            disabled={disabled}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)', borderless: true }}
        >
            <BackArrowIcon
                color={disabled ? Color.gray : Color.blue3}
            />
        </Pressable>
    );
};

const styles = StyleSheet.create({
    button: {
        padding: 15,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabled: {
        opacity: 0.5,
    },
    buttonShadow: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
});

export default React.memo(BackButton);