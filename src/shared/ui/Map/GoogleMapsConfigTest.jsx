import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Constants from 'expo-constants';

export const GoogleMapsConfigTest = () => {
  const renderConfigValue = (value, label) => (
    <View style={styles.configItem}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>
        {value ? (typeof value === 'string' ? `"${value}"` : JSON.stringify(value)) : 'undefined'}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Google Maps Configuration Debug</Text>
      
      <Text style={styles.section}>Constants Info:</Text>
      {renderConfigValue(Constants.platform, 'Platform')}
      {renderConfigValue(Constants.isDevice, 'Is Device')}
      {renderConfigValue(Constants.expoVersion, 'Expo Version')}
      {renderConfigValue(process.env.NODE_ENV, 'Node Environment')}
      
      <Text style={styles.section}>Constants.manifest:</Text>
      {renderConfigValue(Constants.manifest, 'Full manifest')}
      {renderConfigValue(Constants.manifest?.android?.config?.googleMaps?.apiKey, 'manifest.android.config.googleMaps.apiKey')}
      {renderConfigValue(Constants.manifest?.ios?.config?.googleMapsApiKey, 'manifest.ios.config.googleMapsApiKey')}
      {renderConfigValue(Constants.manifest?.extra?.googleMapsApiKey, 'manifest.extra.googleMapsApiKey')}
      
      <Text style={styles.section}>Constants.expoConfig:</Text>
      {renderConfigValue(Constants.expoConfig, 'Full expoConfig')}
      {renderConfigValue(Constants.expoConfig?.android?.config?.googleMaps?.apiKey, 'expoConfig.android.config.googleMaps.apiKey')}
      {renderConfigValue(Constants.expoConfig?.ios?.config?.googleMapsApiKey, 'expoConfig.ios.config.googleMapsApiKey')}
      {renderConfigValue(Constants.expoConfig?.extra?.googleMapsApiKey, 'expoConfig.extra.googleMapsApiKey')}
      
      <Text style={styles.section}>Process Environment:</Text>
      {renderConfigValue(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY, 'process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY')}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  section: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#555',
  },
  configItem: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  value: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
});

export default GoogleMapsConfigTest; 