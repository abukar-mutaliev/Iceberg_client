import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
} from 'react-native';
import { FontFamily } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');

const normalize = (size) => {
    const scale = screenWidth / 440;
    return Math.round(size * scale);
};

export const ValidationModal = ({ results, onClose, onProceed }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    if (!results) return null;

    const { issues = [], canProceedToCheckout } = results;
    const errorIssues = issues.filter(issue => issue.severity === 'error');
    const warningIssues = issues.filter(issue => issue.severity === 'warning');

    return (
        <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Проверка корзины</Text>
                <TouchableOpacity onPress={onClose}>
                    <Text style={styles.modalCloseButton}>✕</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
                {errorIssues.length > 0 && (
                    <View style={styles.issuesSection}>
                        <Text style={styles.issuesSectionTitle}>
                            ❌ Ошибки ({errorIssues.length})
                        </Text>
                        {errorIssues.map((issue, index) => (
                            <View key={index} style={styles.issueItem}>
                                <Text style={styles.issueProductName}>
                                    {issue.productName}
                                </Text>
                                <Text style={styles.issueMessage}>
                                    {issue.message}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {warningIssues.length > 0 && (
                    <View style={styles.issuesSection}>
                        <Text style={styles.issuesSectionTitle}>
                            ⚠️ Предупреждения ({warningIssues.length})
                        </Text>
                        {warningIssues.map((issue, index) => (
                            <View key={index} style={styles.issueItem}>
                                <Text style={styles.issueProductName}>
                                    {issue.productName}
                                </Text>
                                <Text style={styles.issueMessage}>
                                    {issue.message}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            <View style={styles.modalFooter}>
                {canProceedToCheckout ? (
                    <TouchableOpacity
                        style={styles.proceedButton}
                        onPress={() => {
                            onClose();
                            onProceed();
                        }}
                    >
                        <Text style={styles.proceedButtonText}>
                            Продолжить оформление
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <Text style={styles.cannotProceedText}>
                        Исправьте ошибки для продолжения
                    </Text>
                )}
            </View>
        </View>
    );
};

const createStyles = (colors) => StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },

    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: normalize(20),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },

    modalTitle: {
        fontSize: normalize(18),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
    },

    modalCloseButton: {
        fontSize: normalize(20),
        color: colors.primary,
        fontWeight: '600',
    },

    modalContent: {
        flex: 1,
        padding: normalize(20),
    },

    issuesSection: {
        marginBottom: normalize(20),
    },

    issuesSectionTitle: {
        fontSize: normalize(16),
        fontWeight: '600',
        marginBottom: normalize(10),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textPrimary,
    },

    issueItem: {
        backgroundColor: colors.surface,
        padding: normalize(12),
        borderRadius: normalize(8),
        marginBottom: normalize(8),
    },

    issueProductName: {
        fontSize: normalize(14),
        fontWeight: '500',
        marginBottom: normalize(4),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textPrimary,
    },

    issueMessage: {
        fontSize: normalize(13),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },

    modalFooter: {
        padding: normalize(20),
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },

    proceedButton: {
        backgroundColor: colors.primary,
        padding: normalize(15),
        borderRadius: normalize(10),
        alignItems: 'center',
    },

    proceedButtonText: {
        color: colors.textInverse,
        fontSize: normalize(16),
        fontWeight: '600',
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },

    cannotProceedText: {
        textAlign: 'center',
        color: colors.error,
        fontSize: normalize(14),
        fontWeight: '500',
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
    },
}); 