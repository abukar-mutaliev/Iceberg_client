import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useToast } from './useToast';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, Border, FontFamily } from '@app/styles/GlobalStyles';
import { AndroidShadow } from '@shared/ui/Shadow/ui/AndroidShadow';

export const ToastExample = () => {
  const { showSuccess, showError, showWarning, showInfo, showCustom } = useToast();

  const showSuccessToast = () => {
    showSuccess('Операция выполнена успешно!');
  };

  const showErrorToast = () => {
    showError('Произошла ошибка при выполнении операции');
  };

  const showWarningToast = () => {
    showWarning('Внимание! Проверьте введенные данные');
  };

  const showInfoToast = () => {
    showInfo('Информация обновлена');
  };

  const showCustomToast = () => {
    showCustom({
      message: 'Кастомное уведомление с действием',
      type: 'info',
      duration: 5000,
      action: true,
      actionText: 'Открыть',
      onActionPress: () => {
        console.log('Action pressed!');
        showSuccess('Действие выполнено!');
      },
    });
  };

  const showLongToast = () => {
    showInfo('Это длинное сообщение, которое будет отображаться дольше обычного', {
      duration: 6000,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Toast Notifications Demo</Text>

      <AndroidShadow
        style={styles.buttonShadow}
        shadowColor="rgba(51, 57, 176, 0.15)"
        shadowConfig={{
          offsetX: 0,
          offsetY: 2,
          elevation: 4,
          radius: 4,
          opacity: 0.2
        }}
        borderRadius={10}
      >
        <TouchableOpacity style={[styles.button, styles.successButton]} onPress={showSuccessToast}>
          <Text style={styles.buttonText}>Показать Success Toast</Text>
        </TouchableOpacity>
      </AndroidShadow>

      <AndroidShadow
        style={styles.buttonShadow}
        shadowColor="rgba(51, 57, 176, 0.15)"
        shadowConfig={{
          offsetX: 0,
          offsetY: 2,
          elevation: 4,
          radius: 4,
          opacity: 0.2
        }}
        borderRadius={10}
      >
        <TouchableOpacity style={[styles.button, styles.errorButton]} onPress={showErrorToast}>
          <Text style={styles.buttonText}>Показать Error Toast</Text>
        </TouchableOpacity>
      </AndroidShadow>

      <AndroidShadow
        style={styles.buttonShadow}
        shadowColor="rgba(51, 57, 176, 0.15)"
        shadowConfig={{
          offsetX: 0,
          offsetY: 2,
          elevation: 4,
          radius: 4,
          opacity: 0.2
        }}
        borderRadius={10}
      >
        <TouchableOpacity style={[styles.button, styles.warningButton]} onPress={showWarningToast}>
          <Text style={styles.buttonText}>Показать Warning Toast</Text>
        </TouchableOpacity>
      </AndroidShadow>

      <AndroidShadow
        style={styles.buttonShadow}
        shadowColor="rgba(51, 57, 176, 0.15)"
        shadowConfig={{
          offsetX: 0,
          offsetY: 2,
          elevation: 4,
          radius: 4,
          opacity: 0.2
        }}
        borderRadius={10}
      >
        <TouchableOpacity style={[styles.button, styles.infoButton]} onPress={showInfoToast}>
          <Text style={styles.buttonText}>Показать Info Toast</Text>
        </TouchableOpacity>
      </AndroidShadow>

      <AndroidShadow
        style={styles.buttonShadow}
        shadowColor="rgba(51, 57, 176, 0.15)"
        shadowConfig={{
          offsetX: 0,
          offsetY: 2,
          elevation: 4,
          radius: 4,
          opacity: 0.2
        }}
        borderRadius={10}
      >
        <TouchableOpacity style={[styles.button, styles.customButton]} onPress={showCustomToast}>
          <Text style={styles.buttonText}>Показать Custom Toast с действием</Text>
        </TouchableOpacity>
      </AndroidShadow>

      <AndroidShadow
        style={styles.buttonShadow}
        shadowColor="rgba(51, 57, 176, 0.15)"
        shadowConfig={{
          offsetX: 0,
          offsetY: 2,
          elevation: 4,
          radius: 4,
          opacity: 0.2
        }}
        borderRadius={10}
      >
        <TouchableOpacity style={[styles.button, styles.longButton]} onPress={showLongToast}>
          <Text style={styles.buttonText}>Показать длинное сообщение</Text>
        </TouchableOpacity>
      </AndroidShadow>

      <Text style={styles.description}>
        Toast сообщения автоматически исчезают через указанное время (по умолчанию 3 секунды).
        {'\n\n'}Можно добавить действия и настроить длительность отображения.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: normalize(20),
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: normalizeFont(24),
    fontFamily: FontFamily.bold,
    textAlign: 'center',
    marginBottom: normalize(30),
    color: Color.textPrimary,
  },
  button: {
    padding: normalize(15),
    borderRadius: Border.br_3xs,
    alignItems: 'center',
  },
  buttonShadow: {
    marginBottom: normalize(15),
  },
  successButton: {
    backgroundColor: Color.success,
  },
  errorButton: {
    backgroundColor: Color.error,
  },
  warningButton: {
    backgroundColor: Color.warning,
  },
  infoButton: {
    backgroundColor: Color.primary,
  },
  customButton: {
    backgroundColor: Color.purpleSoft,
  },
  longButton: {
    backgroundColor: Color.blue3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: normalizeFont(16),
    fontFamily: FontFamily.medium,
  },
  description: {
    fontSize: normalizeFont(14),
    color: Color.textSecondary,
    lineHeight: normalizeFont(20),
    textAlign: 'center',
    marginTop: normalize(20),
  },
});
