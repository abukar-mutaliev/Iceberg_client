import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const MessageErrorActions = ({ 
  message, 
  onRetry, 
  onCancel,
  isRetrying = false 
}) => {
  const { status, error, retryCount, maxRetries, isRetryable } = message;

  if (status !== 'FAILED' || !isRetryable) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.errorInfo}>
        <Ionicons name="alert-circle" size={16} color="#FF3B30" />
        <Text style={styles.errorText}>
          {retryCount >= (maxRetries || 5) - 1 
            ? 'Не удалось отправить' 
            : `Попытка ${retryCount + 1}/${maxRetries || 5}`}
        </Text>
      </View>
      
      {isRetrying ? (
        <View style={styles.retryingContainer}>
          <ActivityIndicator size="small" color="#7c3aed" />
          <Text style={styles.retryingText}>Отправка...</Text>
        </View>
      ) : (
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.cancelButton]}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle-outline" size={18} color="#FF3B30" />
            <Text style={styles.cancelText}>Отменить</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.retryButton]}
            onPress={onRetry}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
            <Text style={styles.retryText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#FFF3F3',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  errorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginLeft: 6,
    fontWeight: '500',
  },
  retryingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  retryingText: {
    fontSize: 12,
    color: '#7c3aed',
    marginLeft: 8,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  retryButton: {
    backgroundColor: '#7c3aed',
  },
  cancelText: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '600',
  },
  retryText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});







