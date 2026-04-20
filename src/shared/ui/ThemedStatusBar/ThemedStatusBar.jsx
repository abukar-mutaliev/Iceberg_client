import React from 'react';
import { StatusBar, Platform } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

/**
 * Тонкая обёртка над StatusBar, которая читает текущую тему и проставляет
 * корректный barStyle / backgroundColor.
 *
 * Важно:
 *   - React Native StatusBar работает как stack: у нас три точки монтирования
 *     (AppNavigator, AppContainer, ErrorBoundary). Последняя смонтированная
 *     выигрывает. Компонент один, поэтому все три места согласованы.
 *   - Android: translucent={true} означает, что контент рисуется под статус-баром.
 *     Цвет статус-бара (backgroundColor) при translucent игнорируется, а фон
 *     над контентом определяется SafeAreaView / родителем. Но мы всё равно
 *     прокидываем backgroundColor на всякий случай (для не-translucent сценариев).
 *   - iOS: backgroundColor не используется, только barStyle.
 *
 * Принимает все пропсы оригинального StatusBar — можно переопределить точечно.
 */
export const ThemedStatusBar = (props) => {
    const { colors } = useTheme();

    return (
        <StatusBar
            barStyle={colors.statusBarStyle}
            backgroundColor={Platform.OS === 'android' ? colors.background : undefined}
            translucent
            {...props}
        />
    );
};

export default ThemedStatusBar;
