import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Linking,
    Platform
} from 'react-native';
import { normalize } from '@shared/lib/normalize';

/**
 * Компонент для отображения информации о Receive Call (Flashcall)
 * Показывает номер для звонка и код верификации
 */
export const ReceiveCallCard = ({ phoneToCall, code, onCallPress }) => {
    
    // Форматируем номер для отображения
    const formatPhone = (phone) => {
        if (!phone) return '';
        // Убираем все нецифровые символы
        const digits = phone.replace(/\D/g, '');
        // Форматируем: +7 (XXX) XXX-XX-XX
        if (digits.length === 11 && digits.startsWith('7')) {
            return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
        }
        return `+${digits}`;
    };

    const handleCall = () => {
        // Добавляем + в начало номера если его нет
        const formattedPhone = phoneToCall.startsWith('+') ? phoneToCall : `+${phoneToCall}`;
        const telUrl = `tel:${formattedPhone}`;
        
        console.log('Звонок на номер:', formattedPhone);
        
        Linking.canOpenURL(telUrl)
            .then((supported) => {
                if (supported) {
                    Linking.openURL(telUrl);
                    if (onCallPress) {
                        onCallPress();
                    }
                } else {
                    console.error('Не удалось открыть приложение для звонков');
                }
            })
            .catch((err) => console.error('Ошибка при открытии звонка:', err));
    };

    return (
        <View style={styles.container}>
            {/* Заголовок */}
            <View style={styles.header}>
                <Text style={styles.icon}>📞</Text>
                <Text style={styles.headerText}>Позвоните для подтверждения</Text>
            </View>

            {/* Основная информация */}
            <View style={styles.infoContainer}>
                <Text style={styles.instructionText}>
                    Позвоните на номер ниже.{'\n'}
                    Звонок автоматически сбросится.
                </Text>

                {/* Номер для звонка */}
                <View style={styles.phoneContainer}>
                    <Text style={styles.phoneLabel}>Номер для звонка:</Text>
                    <Text style={styles.phoneNumber}>{formatPhone(phoneToCall)}</Text>
                </View>

                {/* Код верификации */}
                <View style={styles.codeContainer}>
                    <Text style={styles.codeLabel}>Ваш код (последние 4 цифры):</Text>
                    <View style={styles.codeBox}>
                        {code.split('').map((digit, index) => (
                            <View key={index} style={styles.codeDigit}>
                                <Text style={styles.codeDigitText}>{digit}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Кнопка "Позвонить" */}
                <TouchableOpacity
                    style={styles.callButton}
                    onPress={handleCall}
                    activeOpacity={0.8}
                >
                    <Text style={styles.callButtonIcon}>📱</Text>
                    <Text style={styles.callButtonText}>Позвонить сейчас</Text>
                </TouchableOpacity>

                {/* Дополнительная информация */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoIcon}>💡</Text>
                    <View style={styles.infoTextContainer}>
                        <Text style={styles.infoTitle}>Важно знать:</Text>
                        <Text style={styles.infoText}>
                            • Звонок бесплатный для вас{'\n'}
                            • Автоматически сбросится через 1-2 секунды{'\n'}
                            • После звонка нажмите на кнопку "Я позвонил(а)"
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: normalize(16),
        padding: normalize(28),
        paddingBottom: normalize(32),
        marginVertical: normalize(16),
        marginHorizontal: normalize(8),
        width: '95%',
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        minHeight: normalize(520),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(8),
        paddingBottom: normalize(10),
        borderBottomWidth: 1,
        borderBottomColor: '#E8E8E8',
    },
    icon: {
        fontSize: normalize(28),
        marginRight: normalize(12),
    },
    headerText: {
        fontSize: normalize(18),
        fontWeight: '600',
        color: '#2D3748',
        flex: 1,
    },
    infoContainer: {
        // Используем явные отступы вместо gap для совместимости
    },
    instructionText: {
        fontSize: normalize(14),
        color: '#4A5568',
        lineHeight: normalize(20),
        textAlign: 'center',
        marginBottom: normalize(18),
    },
    phoneContainer: {
        alignItems: 'center',
        paddingVertical: normalize(14),
        backgroundColor: '#F7FAFC',
        borderRadius: normalize(12),
        marginBottom: normalize(18),
    },
    phoneLabel: {
        fontSize: normalize(12),
        color: '#718096',
        marginBottom: normalize(6),
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    phoneNumber: {
        fontSize: normalize(24),
        fontWeight: '700',
        color: '#2B6CB0',
        letterSpacing: 1,
    },
    codeContainer: {
        alignItems: 'center',
        paddingVertical: normalize(18),
        marginBottom: normalize(18),
    },
    codeLabel: {
        fontSize: normalize(12),
        color: '#718096',
        marginBottom: normalize(12),
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    codeBox: {
        flexDirection: 'row',
        gap: normalize(8),
    },
    codeDigit: {
        width: normalize(50),
        height: normalize(60),
        backgroundColor: '#EDF2F7',
        borderRadius: normalize(12),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#4299E1',
    },
    codeDigitText: {
        fontSize: normalize(28),
        fontWeight: '700',
        color: '#2B6CB0',
    },
    callButton: {
        flexDirection: 'row',
        backgroundColor: '#48BB78',
        paddingVertical: normalize(18),
        paddingHorizontal: normalize(32),
        borderRadius: normalize(12),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: normalize(18),
        shadowColor: '#48BB78',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    callButtonIcon: {
        fontSize: normalize(20),
        marginRight: normalize(8),
    },
    callButtonText: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: '#FFFFFF',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#EBF8FF',
        padding: normalize(18),
        borderRadius: normalize(12),
        borderLeftWidth: 4,
        borderLeftColor: '#4299E1',
    },
    infoIcon: {
        fontSize: normalize(20),
        marginRight: normalize(12),
        marginTop: normalize(2),
    },
    infoTextContainer: {
        flex: 1,
    },
    infoTitle: {
        fontSize: normalize(13),
        fontWeight: '600',
        color: '#2C5282',
        marginBottom: normalize(6),
    },
    infoText: {
        fontSize: normalize(12),
        color: '#2C5282',
        lineHeight: normalize(18),
    },
});

