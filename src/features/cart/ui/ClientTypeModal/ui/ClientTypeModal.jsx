import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { FontFamily } from '@app/styles/GlobalStyles';
import { CLIENT_TYPES } from "@entities/cart";
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');

const normalize = (size) => {
    const scale = screenWidth / 440;
    return Math.round(size * scale);
};

export const ClientTypeModal = ({ currentType, onSelect, onClose }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

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

const createStyles = (colors) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.modalOverlay,
        justifyContent: 'center',
        alignItems: 'center',
    },

    modalTitle: {
        fontSize: normalize(18),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        marginBottom: normalize(20),
        textAlign: 'center',
    },

    clientTypeModal: {
        backgroundColor: colors.cardBackground,
        borderRadius: normalize(15),
        padding: normalize(20),
        width: screenWidth * 0.85,
        maxWidth: normalize(350),
    },

    clientTypeOption: {
        backgroundColor: colors.surface,
        padding: normalize(15),
        borderRadius: normalize(10),
        marginVertical: normalize(8),
        borderWidth: 2,
        borderColor: 'transparent',
    },

    clientTypeOptionActive: {
        borderColor: colors.primary,
        backgroundColor: colors.cardBackground,
    },

    clientTypeOptionText: {
        fontSize: normalize(16),
        fontWeight: '500',
        marginBottom: normalize(4),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textPrimary,
    },

    clientTypeOptionDesc: {
        fontSize: normalize(13),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },

    modalCancelButton: {
        marginTop: normalize(15),
        padding: normalize(15),
        alignItems: 'center',
    },

    modalCancelButtonText: {
        color: colors.primary,
        fontSize: normalize(16),
        fontWeight: '500',
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },
}); 