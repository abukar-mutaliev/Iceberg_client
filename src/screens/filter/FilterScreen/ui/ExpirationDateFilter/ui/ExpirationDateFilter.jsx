import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    SafeAreaView,
    Dimensions,
    PixelRatio,
    Platform
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { FontFamily } from '@/app/styles/GlobalStyles';
import DateTimePicker from '@react-native-community/datetimepicker';

// Адаптивные размеры
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const normalizeFont = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Форматирование даты для отображения
const formatDate = (date) => {
    if (!date) return '';

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
};

export const ExpirationDateFilter = ({ expirationDate, onChange }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [tempDate, setTempDate] = useState(expirationDate ? new Date(expirationDate) : new Date());

    // Обработчик выбора даты
    const handleDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || tempDate;
        setTempDate(currentDate);

        if (Platform.OS === 'android') {
            // На Android DatePicker закрывается после выбора даты
            handleApplyDate(currentDate);
        }
    };

    // Обработчик применения выбранной даты
    const handleApplyDate = (date = tempDate) => {
        onChange(date);
        setModalVisible(false);
    };

    // Обработчик сброса даты
    const handleClearDate = () => {
        onChange(null);
        setModalVisible(false);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.selector}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
            >
                <Text style={styles.selectorText}>
                    {expirationDate
                        ? `Срок годности до ${formatDate(new Date(expirationDate))}`
                        : 'Срок годности'}
                </Text>
                <ChevronRight color="#000000" size={normalize(24)} />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={false}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            style={styles.closeButton}
                        >
                            <Text style={styles.closeButtonText}>Закрыть</Text>
                        </TouchableOpacity>

                        <Text style={styles.modalTitle}>Срок годности</Text>

                        <TouchableOpacity
                            onPress={handleClearDate}
                            style={styles.clearButton}
                        >
                            <Text style={styles.clearButtonText}>Сбросить</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.datePickerContainer}>
                        {Platform.OS === 'ios' ? (
                            // iOS DatePicker
                            <DateTimePicker
                                value={tempDate}
                                mode="date"
                                display="spinner"
                                onChange={handleDateChange}
                                style={styles.iosDatePicker}
                                minimumDate={new Date()}
                            />
                        ) : (
                            // Android DatePicker
                            <DateTimePicker
                                value={tempDate}
                                mode="date"
                                display="default"
                                onChange={handleDateChange}
                                minimumDate={new Date()}
                            />
                        )}
                    </View>

                    {Platform.OS === 'ios' && (
                        <TouchableOpacity
                            style={styles.applyButton}
                            onPress={() => handleApplyDate()}
                        >
                            <Text style={styles.applyButtonText}>ПРИМЕНИТЬ</Text>
                        </TouchableOpacity>
                    )}
                </SafeAreaView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
    },
    selector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(16),
    },
    selectorText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(17),
        color: '#000000',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'white',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(10),
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    closeButton: {
        padding: normalize(5),
    },
    closeButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#000000',
    },
    modalTitle: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(17),
        fontWeight: '600',
        color: '#000000',
    },
    clearButton: {
        padding: normalize(5),
    },
    clearButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#999999',
    },
    datePickerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: normalize(20),
    },
    iosDatePicker: {
        width: SCREEN_WIDTH,
    },
    applyButton: {
        backgroundColor: '#6a3cf7',
        borderRadius: normalize(25),
        paddingVertical: normalize(14),
        marginHorizontal: normalize(16),
        marginTop: normalize(20),
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        fontWeight: '700',
        color: 'white',
    }
});

export default ExpirationDateFilter;