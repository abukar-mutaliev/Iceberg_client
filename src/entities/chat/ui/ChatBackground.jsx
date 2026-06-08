import React, { useMemo } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';


const BG_DARK = require('@assets/chat/background-dark.png');
const BG_LIGHT = require('@assets/chat/background-white.png');


const LIGHT_FALLBACK = '#ECE5DD';

/**
 * Фон чата. Рендерит подложку цветом темы под фоновым изображением —
 * пока картинка декодируется (особенно на Android), экран уже окрашен
 * в правильный цвет и при входе в комнату не видно белой вспышки.
 */
export const ChatBackground = ({ children }) => {
  const { colors, isDark } = useTheme();

  const source = isDark ? BG_DARK : BG_LIGHT;

  const containerStyle = useMemo(
    () => [
      styles.container,
      { backgroundColor: isDark ? colors.background : LIGHT_FALLBACK },
    ],
    [isDark, colors.background],
  );

  return (
    <View style={containerStyle}>
      <Image
        source={source}
        style={styles.backgroundImage}
        resizeMode="cover"
        // Не мешает touch-событиям и помогает GPU быстрее отрисовать текстуру
        fadeDuration={0}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Абсолютно позиционированное изображение рисуется одним проходом,
  // без дополнительной вложенной композиции, которую даёт ImageBackground.
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default ChatBackground;
