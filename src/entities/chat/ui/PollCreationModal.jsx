import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const PollCreationModal = ({ visible, onClose, onSubmit }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    
    // Если пользователь ввел текст в последнее поле и оно не пустое, добавляем новое поле
    const isLastField = index === options.length - 1;
    const hasText = value.trim().length > 0;
    const canAddMore = newOptions.length < 12;
    
    if (isLastField && hasText && canAddMore) {
      newOptions.push('');
    }
    
    setOptions(newOptions);
  };

  const handleSubmit = () => {
    const trimmedQuestion = question.trim();
    const trimmedOptions = options.map(opt => opt.trim()).filter(opt => opt.length > 0);

    if (!trimmedQuestion) {
      return;
    }

    if (trimmedOptions.length < 2) {
      return;
    }

    onSubmit({
      question: trimmedQuestion,
      options: trimmedOptions,
      allowMultiple,
    });

    // Сброс формы
    setQuestion('');
    setOptions(['', '']);
    setAllowMultiple(false);
    onClose();
  };

  const canSubmit = question.trim().length > 0 && options.filter(opt => opt.trim().length > 0).length >= 2;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Заголовок */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Создание опроса</Text>
            <View style={styles.placeholder} />
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <ScrollView 
              style={styles.content} 
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {/* Вопрос */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Вопрос</Text>
                <TextInput
                  style={styles.questionInput}
                  placeholder="Задайте вопрос"
                  value={question}
                  onChangeText={setQuestion}
                  multiline
                  maxLength={200}
                  placeholderTextColor="#999"
                  editable={true}
                  selectTextOnFocus={false}
                />
              </View>

              {/* Варианты ответа */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Варианты</Text>
                {options.map((option, index) => (
                  <View key={`option-${index}`} style={styles.optionRow}>
                    <TextInput
                      style={styles.optionInput}
                      placeholder={`Вариант ${index + 1}`}
                      value={option}
                      onChangeText={(value) => handleOptionChange(index, value)}
                      maxLength={100}
                      placeholderTextColor="#999"
                      editable={true}
                      selectTextOnFocus={false}
                    />
                    {options.length > 2 && (
                      <TouchableOpacity
                        onPress={() => handleRemoveOption(index)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="close-circle" size={24} color="#ff3b30" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              {/* Разрешить несколько ответов */}
              <View style={styles.section}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Разрешить несколько ответов</Text>
                  <Switch
                    value={allowMultiple}
                    onValueChange={setAllowMultiple}
                    trackColor={{ false: '#E0E0E0', true: '#075E54' }}
                    thumbColor={allowMultiple ? '#fff' : '#f4f3f4'}
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Кнопка отправки */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              disabled={!canSubmit}
            >
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Создать опрос</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    maxHeight: '90%',
    flexDirection: 'column',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#075E54',
    marginBottom: 12,
  },
  questionInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 80,
    maxHeight: 150,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#075E54',
    ...Platform.select({
      ios: {
        paddingTop: 12,
      },
      android: {
        paddingTop: 12,
        textAlignVertical: 'top',
      },
    }),
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 44,
    ...Platform.select({
      ios: {
        paddingTop: 12,
      },
      android: {
        paddingTop: 12,
        textAlignVertical: 'center',
      },
    }),
  },
  removeButton: {
    marginLeft: 8,
    padding: 4,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  addOptionText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#075E54',
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#075E54',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

