import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import { normalize, normalizeFont } from '@shared/lib/normalize';

export const DateTimeInput = ({
  label,
  date,
  time,
  onDatePress,
  onTimePress,
  error,
  style
}) => {
  const formatDate = (date) => {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\./g, '.');
  };

  const formatTime = (time) => {
    return time.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={onDatePress}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar" size={normalize(16)} color="#555" style={styles.icon} />
          <Text style={styles.text}>{formatDate(date)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.timeButton}
          onPress={onTimePress}
          activeOpacity={0.7}
        >
          <Ionicons name="time" size={normalize(16)} color="#555" style={styles.icon} />
          <Text style={styles.text}>{formatTime(time)}</Text>
        </TouchableOpacity>
      </View>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: normalize(4),
    marginRight: normalize(10),
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: normalize(4),
  },
  icon: {
    marginRight: normalize(8),
  },
  text: {
    fontSize: normalizeFont(16),
    color: Color.dark,
    fontFamily: FontFamily.sFProText,
  },
  underline: {
    height: 1,
    backgroundColor: Color.dark,
    marginTop: normalize(4),
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