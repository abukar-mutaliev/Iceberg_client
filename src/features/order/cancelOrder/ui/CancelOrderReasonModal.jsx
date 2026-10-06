import React, { useEffect, useMemo, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { useOrderDetailsStyles } from '@shared/ui/OrderDetailsStyles';
import { CANCEL_ORDER_REASONS, buildCancelReasonText } from '@shared/lib/cancelOrderReasons';

export const CancelOrderReasonModal = ({
    visible,
    orderNumber,
    submitting = false,
    onClose,
    onConfirm
}) => {
    const { colors } = useTheme();
    const styles = useOrderDetailsStyles();
    const localStyles = useMemo(() => createLocalStyles(colors), [colors]);
    const [selectedId, setSelectedId] = useState(null);
    const [customText, setCustomText] = useState('');

    useEffect(() => {
        if (visible) {
            setSelectedId(null);
            setCustomText('');
        }
    }, [visible]);

    const reason = buildCancelReasonText(selectedId, customText);
    const canSubmit = Boolean(reason) && !submitting;

    const handleConfirm = () => {
        if (!canSubmit) return;
        onConfirm(reason);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            statusBarTranslucent
            onRequestClose={submitting ? undefined : onClose}
        >
            <KeyboardAvoidingView
                style={styles.modalOverlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={[styles.modalContent, { maxHeight: '90%' }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Почему отменяете заказ?</Text>
                        <Text style={styles.modalSubtitle}>
                            {orderNumber ? `Заказ ${orderNumber}` : 'Выберите причину'}
                        </Text>
                    </View>

                    <ScrollView
                        style={styles.modalBody}
                        contentContainerStyle={styles.modalBodyContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {CANCEL_ORDER_REASONS.map((item) => {
                            const selected = selectedId === item.id;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        localStyles.option,
                                        selected && localStyles.optionSelected
                                    ]}
                                    onPress={() => setSelectedId(item.id)}
                                    activeOpacity={0.8}
                                    disabled={submitting}
                                >
                                    <Icon
                                        name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                                        size={20}
                                        color={selected ? colors.primary : colors.textSecondary}
                                    />
                                    <Text style={[
                                        localStyles.optionText,
                                        selected && localStyles.optionTextSelected
                                    ]}
                                    >
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}

                        <View style={styles.commentContainer}>
                            <Text style={styles.commentLabel}>Свой ответ</Text>
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Напишите причину своими словами"
                                placeholderTextColor={colors.textTertiary}
                                value={customText}
                                onChangeText={setCustomText}
                                multiline
                                numberOfLines={3}
                                maxLength={500}
                                editable={!submitting}
                                keyboardAppearance={colors.keyboardAppearance}
                            />
                            <Text style={styles.commentCounter}>{customText.length}/500</Text>
                        </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={styles.modalCancelButton}
                            onPress={onClose}
                            disabled={submitting}
                        >
                            <Text style={styles.modalCancelButtonText}>Назад</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.modalConfirmButton,
                                { backgroundColor: colors.error },
                                !canSubmit && styles.modalButtonDisabled
                            ]}
                            onPress={handleConfirm}
                            disabled={!canSubmit}
                        >
                            <Text style={styles.modalConfirmButtonText}>
                                {submitting ? 'Отмена...' : 'Отменить заказ'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const createLocalStyles = (colors) => ({
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        marginBottom: 8
    },
    optionSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primarySoft || (colors.primary + '14')
    },
    optionText: {
        flex: 1,
        fontSize: 14,
        color: colors.textPrimary,
        fontWeight: '500'
    },
    optionTextSelected: {
        fontWeight: '700'
    }
});
