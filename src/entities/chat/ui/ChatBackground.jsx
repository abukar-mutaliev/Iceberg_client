import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';

export const ChatBackground = ({ children }) => {
  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('@assets/chat/background-white.jpeg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.content}>
          {children}
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECE5DD', // Fallback цвет на случай если изображение не загрузится
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default ChatBackground;

