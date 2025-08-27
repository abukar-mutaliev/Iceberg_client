import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    Alert,
    Keyboard,
    Platform,
    StatusBar
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { verify2FALogin } from '@entities/auth';
import { getSafePlatformFont } from '@shared/lib/fontUtils';

// Получаем размеры экрана и вычисляем адаптивные размеры
const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;
const isLargeDevice = height > 800;
const statusBarHeight = StatusBar.currentHeight || 0;
const safeTopPadding = Platform.OS === 'android' ? statusBarHeight + 10 : 20;

const adaptiveSize = (baseSize) => {
    if (isSmallDevice) return baseSize * 0.85;
    if (isLargeDevice) return baseSize * 1.1;
    return baseSize;
};

// Вычисляем размер ячейки кода в зависимости от ширины экрана
const codeInputSize = Math.min((width - adaptiveSize(80)) / 5, 70);

export const TwoFactorForm = ({ tempToken, onSuccess }) => {
    const [codeDigits, setCodeDigits] = useState(['', '', '', '', '']);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const dispatch = useDispatch();
    const isLoading = useSelector((state) => state.auth?.isLoading ?? false);

    useEffect(() => {
        Keyboard.dismiss();
        return () => Keyboard.dismiss();
    }, []);

    const handleSubmit = async () => {
        const code = codeDigits.join('');
        if (code.length !== 5) {
            Alert.alert('Ошибка', 'Пожалуйста, введите код подтверждения полностью');
            return;
        }

        try {
            await dispatch(verify2FALogin({ tempToken, twoFactorCode: code })).unwrap();
            onSuccess();
        } catch (error) {
            Alert.alert('Ошибка', error?.message || 'Ошибка подтверждения кода');
            setCodeDigits(['', '', '', '', '']);
            setSelectedIndex(0);
        }
    };

    const handleKeyPress = (key) => {
        if (key === 'backspace') {
            const newCodeDigits = [...codeDigits];

            if (newCodeDigits[selectedIndex] === '' && selectedIndex > 0) {
                newCodeDigits[selectedIndex - 1] = '';
                setCodeDigits(newCodeDigits);
                setSelectedIndex(selectedIndex - 1);
            } else {
                newCodeDigits[selectedIndex] = '';
                setCodeDigits(newCodeDigits);
            }
        } else if (key >= '0' && key <= '9') {
            const newCodeDigits = [...codeDigits];
            newCodeDigits[selectedIndex] = key;
            setCodeDigits(newCodeDigits);

            if (selectedIndex < 4) {
                setSelectedIndex(selectedIndex + 1);
            }
        }
    };

    const renderCodeInputs = () => {
        return (
            <View style={styles.codeContainer}>
                {codeDigits.map((digit, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.codeInput,
                            selectedIndex === index && styles.selectedCodeInput
                        ]}
                        onPress={() => setSelectedIndex(index)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.codeText}>{digit}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderKeyboard = () => {
        const keys = [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['', '0', 'backspace']
        ];

        return (
            <View style={styles.keyboardContainer}>
                {keys.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.keyboardRow}>
                        {row.map((key, keyIndex) => (
                            <TouchableOpacity
                                key={keyIndex}
                                style={key ? styles.keyContainer : styles.keyPlaceholder}
                                onPress={() => key && handleKeyPress(key)}
                                activeOpacity={key ? 0.7 : 1}
                            >
                                {key === 'backspace' ? (
                                    <Text style={styles.backspaceIcon}>⌫</Text>
                                ) : key ? (
                                    <Text style={styles.keyText}>{key}</Text>
                                ) : null}
                            </TouchableOpacity>
                        ))}
                    </View>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.inputLabel}>Введите код</Text>

            {renderCodeInputs()}

            <TouchableOpacity
                style={[
                    styles.confirmButton,
                    codeDigits.every(digit => digit !== '') ? styles.confirmButtonActive : styles.confirmButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={!codeDigits.every(digit => digit !== '') || isLoading}
                activeOpacity={0.8}
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.confirmButtonText}>ПОДТВЕРДИТЬ</Text>
                )}
            </TouchableOpacity>

            {renderKeyboard()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: adaptiveSize(20),
        paddingTop: safeTopPadding,
        backgroundColor: '#F5F5F5',
    },
    inputLabel: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: adaptiveSize(15),
        fontWeight: '600',
        color: '#000',
        opacity: 0.4,
        marginBottom: adaptiveSize(20),
        marginLeft: adaptiveSize(10),
    },
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: adaptiveSize(30),
        paddingHorizontal: adaptiveSize(5),
    },
    codeInput: {
        width: codeInputSize,
        height: codeInputSize,
        backgroundColor: '#E5E5E5',
        borderRadius: adaptiveSize(10),
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedCodeInput: {
        borderWidth: 1,
        borderColor: '#3339b0',
    },
    codeText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: adaptiveSize(24),
        fontWeight: '600',
        color: '#000',
    },
    confirmButton: {
        width: '100%',
        height: adaptiveSize(60),
        borderRadius: adaptiveSize(30),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: adaptiveSize(40),
    },
    confirmButtonActive: {
        backgroundColor: '#000cff',
    },
    confirmButtonDisabled: {
        backgroundColor: '#CCCCCC',
    },
    confirmButtonText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: adaptiveSize(17),
        fontWeight: '500',
        color: '#fff',
        textTransform: 'uppercase',
    },
    keyboardContainer: {
        marginTop: adaptiveSize(10),
    },
    keyboardRow: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        marginBottom: adaptiveSize(15),
    },
    keyContainer: {
        width: (width - adaptiveSize(60)) / 3,
        height: adaptiveSize(50),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: adaptiveSize(5),
        // Добавляем тень для лучшего визуального разделения кнопок
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 1,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    keyPlaceholder: {
        width: (width - adaptiveSize(60)) / 3,
        height: adaptiveSize(50),
    },
    keyText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: adaptiveSize(22),
        fontWeight: '500',
        color: '#000',
    },
    keySubText: {
        fontFamily: getSafePlatformFont('SFProText'),
        fontSize: adaptiveSize(10),
        color: '#666',
        marginTop: -5,
    },
    backspaceIcon: {
        fontSize: adaptiveSize(24),
        color: '#000',
    },
});