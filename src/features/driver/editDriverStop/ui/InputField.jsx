import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import { normalize, normalizeFont } from '@shared/lib/normalize';

export const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline,
  numberOfLines,
  style
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          error ? styles.inputError : null
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? "top" : "center"}
      />
      <View style={[styles.underline, error ? styles.errorUnderline : null]} />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: normalize(16),
  },
  label: {
    fontSize: normalizeFont(13),
    fontWeight: '600',
    color: Color.dark,
    opacity: 0.4,
    marginBottom: normalize(10),
    fontFamily: FontFamily.sFProText,
  },
  input: {
    fontSize: normalizeFont(16),
    color: Color.dark,
    fontFamily: FontFamily.sFProText,
    paddingVertical: normalize(4),
    paddingHorizontal: 0,
  },
  multilineInput: {
    minHeight: normalize(80),
    paddingTop: normalize(8),
  },
  inputError: {
    color: '#FF3B30',
  },
  underline: {
    height: 1,
    backgroundColor: Color.dark,
  },
  errorUnderline: {
    backgroundColor: '#FF3B30',
    height: 1.5,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: normalizeFont(12),
    marginTop: normalize(4),
    fontFamily: FontFamily.sFProText,
  },
}); 