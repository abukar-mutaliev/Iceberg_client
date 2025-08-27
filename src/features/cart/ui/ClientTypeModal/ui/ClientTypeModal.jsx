import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import {
    Color,
    FontFamily
} from '@app/styles/GlobalStyles';
import { CLIENT_TYPES } from "@entities/cart";

const { width: screenWidth } = Dimensions.get('window');

const normalize = (size) => {
    const scale = screenWidth / 440;
    return Math.round(size * scale);
};

export const ClientTypeModal = ({ currentType, onSelect, onClose }) => {
    return (
        <View style={styles.modalOverlay}>
            <View style={styles.clientTypeModal}>
                <Text style={styles.modalTitle}>Тип клиента</Text>

                <TouchableOpacity
                    style={[
                        styles.clientTypeOption,
                        currentType === CLIENT_TYPES.RETAIL && styles.clientTypeOptionActive
                    ]}
                    onPress={() => onSelect(CLIENT_TYPES.RETAIL)}
                >
                    <Text style={styles.clientTypeOptionText}>
                        🛍️ Розничный клиент
                    </Text>
                    <Text style={styles.clientTypeOptionDesc}>
                        Обычные цены
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.clientTypeOption,
                        currentType === CLIENT_TYPES.WHOLESALE && styles.clientTypeOptionActive
                    ]}
                    onPress={() => onSelect(CLIENT_TYPES.WHOLESALE)}
                >
                    <Text style={styles.clientTypeOptionText}>
                        🏢 Оптовый клиент
                    </Text>
                    <Text style={styles.clientTypeOptionDesc}>
                        Скидки при больших заказах
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={onClose}
                >
                    <Text style={styles.modalCancelButtonText}>Отмена</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    modalTitle: {
        fontSize: normalize(18),
        fontWeight: '600',
        color: '#000000',
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        marginBottom: normalize(20),
        textAlign: 'center',
    },

    clientTypeModal: {
        backgroundColor: '#FFFFFF',
        borderRadius: normalize(15),
        padding: normalize(20),
        width: screenWidth * 0.85,
        maxWidth: normalize(350),
    },

    clientTypeOption: {
        backgroundColor: '#F8F9FF',
        padding: normalize(15),
        borderRadius: normalize(10),
        marginVertical: normalize(8),
        borderWidth: 2,
        borderColor: 'transparent',
    },

    clientTypeOptionActive: {
        borderColor: '#3339B0',
        backgroundColor: '#FFFFFF',
    },

    clientTypeOptionText: {
        fontSize: normalize(16),
        fontWeight: '500',
        marginBottom: normalize(4),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: '#000000',
    },

    clientTypeOptionDesc: {
        fontSize: normalize(13),
        color: 'rgba(60, 60, 67, 0.60)',
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },

    modalCancelButton: {
        marginTop: normalize(15),
        padding: normalize(15),
        alignItems: 'center',
    },

    modalCancelButtonText: {
        color: '#3339B0',
        fontSize: normalize(16),
        fontWeight: '500',
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },
}); 