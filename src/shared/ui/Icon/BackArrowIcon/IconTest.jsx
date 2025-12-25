import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

export const IconTest = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expo Vector Icons Test</Text>
      <View style={styles.iconsContainer}>
        <Ionicons name="camera" size={24} color="#000000" />
        <Ionicons name="arrow-back" size={24} color="#000000" />
        <FontAwesome5 name="user-circle" size={24} color="#000000" />
        <MaterialIcons name="location-on" size={24} color="#000000" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
});

export default IconTest; 