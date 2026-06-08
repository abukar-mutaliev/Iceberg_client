import { createContext, useContext, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const ON_PRIMARY_COLOR = '#FFFFFF';
export const ORDER_DETAILS_CLIENT_DARK_BACKGROUND = '#3E3A73';

const OrderDetailsScreenThemeContext = createContext({ darkScreenBackground: null });

export const OrderDetailsScreenThemeProvider = ({ darkScreenBackground = null, children }) => {
    const value = useMemo(() => ({ darkScreenBackground }), [darkScreenBackground]);
    return (
        <OrderDetailsScreenThemeContext.Provider value={value}>
            {children}
        </OrderDetailsScreenThemeContext.Provider>
    );
};

export const useOrderDetailsScreenBackground = () => {
    const { colors, isDark } = useTheme();
    const { darkScreenBackground } = useContext(OrderDetailsScreenThemeContext);
    return isDark && darkScreenBackground ? darkScreenBackground : colors.primary;
};

export const useOrderDetailsStyles = () => {
    const { colors, isDark } = useTheme();
    const { darkScreenBackground } = useContext(OrderDetailsScreenThemeContext);
    return useMemo(
        () => createOrderDetailsStyles(colors, isDark, darkScreenBackground),
        [colors, isDark, darkScreenBackground]
    );
};

export const createOrderDetailsStyles = (colors, isDark, darkScreenBackground = null) => {
    const screenBackground = isDark && darkScreenBackground ? darkScreenBackground : colors.primary;
    const hasDarkPurpleTheme = isDark && !!darkScreenBackground;

    return StyleSheet.create({
    // Основные контейнеры
    container: {
        flex: 1,
        backgroundColor: screenBackground,
    },
    animatedContainer: {
        flex: 1,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 32,
    },

    // Заголовок
    headerContainer: {
        marginBottom: 20,
    },
    backButtonContainer: {
        position: 'absolute',
        left: 16,
        zIndex: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    headerGradient: {
        backgroundColor: screenBackground,
        paddingTop: 16,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: screenBackground,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.4 : 0.3,
        shadowRadius: 16,
        elevation: 12,
    },
    headerContent: {
        gap: 16,
    },
    badgeContainer: {
        alignItems: 'flex-end',
    },
    headerTop: {
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderNumberContainer: {
        flex: 1,
    },
    orderNumberWithCopy: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    orderNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: ON_PRIMARY_COLOR,
    },
    copyButtonHeader: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    orderDate: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        color: ON_PRIMARY_COLOR,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    progressContainer: {
        gap: 8,
    },
    progressBar: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    progressText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '600',
        textAlign: 'center',
    },
    amountContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 16,
    },
    amountInfo: {
        flex: 1,
    },
    amountLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
        marginBottom: 4,
    },
    amount: {
        fontSize: 24,
        fontWeight: '800',
        color: ON_PRIMARY_COLOR,
    },
    amountIcon: {
        width: 48,
        height: 48,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Современные карточки
    modernCard: {
        backgroundColor: colors.cardBackground,
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        padding: 24,
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.22 : 0.15,
        shadowRadius: isDark ? 12 : 20,
        elevation: isDark ? 6 : 10,
        borderWidth: isDark ? 1 : 0,
        borderColor: colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        flex: 1,
    },

    // Информационные строки
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        gap: 12,
    },
    infoIconContainer: {
        width: 32,
        height: 32,
        backgroundColor: colors.surface,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContent: {
        flex: 1,
    },
    infoLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    infoLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    copyButtonInline: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: hasDarkPurpleTheme
            ? 'rgba(255, 255, 255, 0.15)'
            : (colors.primarySoft || (colors.primary + '14')),
        borderWidth: 1,
        borderColor: hasDarkPurpleTheme
            ? 'rgba(255, 255, 255, 0.3)'
            : (colors.primary + '26'),
        marginLeft: 8,
    },
    infoValue: {
        fontSize: 16,
        color: colors.textPrimary,
        lineHeight: 22,
        fontWeight: '500',
    },
    infoSubtext: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },

    // Список товаров
    itemsList: {
        gap: 0,
    },
    itemContainer: {
        flexDirection: 'row',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 16,
    },
    lastItem: {
        borderBottomWidth: 0,
    },
    imageContainer: {
        width: 80,
        height: 80,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: colors.surface,
    },
    itemImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surfaceSecondary || colors.surface,
    },
    itemInfo: {
        flex: 1,
        gap: 8,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        lineHeight: 22,
    },
    supplierContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    itemSupplier: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    itemDetails: {
        gap: 4,
    },
    quantityContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    quantityLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    itemQuantity: {
        fontSize: 14,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    priceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    itemPrice: {
        fontSize: 14,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    totalLabel: {
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    itemTotal: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.primary,
    },

    // Действия
    actionsContainer: {
        marginHorizontal: 20,
        marginBottom: 20,
    },
    buttonSpacing: {
        marginTop: 12,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },

    // Общие стили кнопок
    downloadButton: {
        backgroundColor: colors.primary,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.35 : 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    processButton: {
        backgroundColor: colors.success,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.35 : 0.3,
        shadowRadius: 8,
        elevation: 6,
        marginBottom: 10
    },
    cancelButton: {
        backgroundColor: colors.error,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.error,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.35 : 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    releaseButton: {
        backgroundColor: colors.warning || '#FF9800',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.warning || '#FF9800',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.35 : 0.3,
        shadowRadius: 8,
        elevation: 6,
    },

    // Тексты кнопок
    downloadButtonText: {
        color: ON_PRIMARY_COLOR,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    processButtonText: {
        color: ON_PRIMARY_COLOR,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    cancelButtonText: {
        color: ON_PRIMARY_COLOR,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    releaseButtonText: {
        color: ON_PRIMARY_COLOR,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    // Ошибка
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        backgroundColor: screenBackground,
    },
    errorIconContainer: {
        width: 120,
        height: 120,
        backgroundColor: colors.cardBackground,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: colors.error,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.25 : 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: ON_PRIMARY_COLOR,
        marginBottom: 12,
        textAlign: 'center',
    },
    errorSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBackground,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.2 : 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    retryButtonText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '700',
    },

    // Стили для загрузчика кнопки
    buttonLoader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    buttonLoaderDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },

    // Стили для модального окна обработки заказа
    modalOverlay: {
        flex: 1,
        backgroundColor: hasDarkPurpleTheme
            ? 'rgba(0, 0, 0, 0.65)'
            : (colors.overlay || 'rgba(0, 0, 0, 0.5)'),
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        width: '100%',
        maxWidth: 500,
        maxHeight: '85%',
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.3 : 0.3,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: hasDarkPurpleTheme ? 1 : 0,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    modalHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: hasDarkPurpleTheme ? 'rgba(255, 255, 255, 0.15)' : colors.border,
        alignItems: 'center',
        backgroundColor: hasDarkPurpleTheme ? screenBackground : undefined,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: hasDarkPurpleTheme ? ON_PRIMARY_COLOR : colors.textPrimary,
        marginBottom: 4,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: hasDarkPurpleTheme ? 'rgba(255, 255, 255, 0.75)' : colors.textSecondary,
        textAlign: 'center',
    },
    modalBody: {
        maxHeight: 400,
        padding: 20,
    },
    currentStatusContainer: {
        marginBottom: 20,
        padding: 12,
        backgroundColor: hasDarkPurpleTheme ? (colors.surfaceElevated || colors.surface) : colors.surface,
        borderRadius: 8,
        borderWidth: hasDarkPurpleTheme ? 1 : 0,
        borderColor: colors.border,
    },
    currentStatusLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    currentStatusText: {
        fontSize: 16,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    infoContainer: {
        backgroundColor: hasDarkPurpleTheme ? 'rgba(255, 255, 255, 0.1)' : (colors.primarySoft || (colors.primary + '14')),
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: hasDarkPurpleTheme ? ON_PRIMARY_COLOR : colors.primary,
        marginBottom: 20,
    },
    infoText: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    commentContainer: {
        marginBottom: 20,
    },
    commentLabel: {
        fontSize: 14,
        color: colors.textPrimary,
        marginBottom: 8,
        fontWeight: '600',
    },
    commentInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: colors.textPrimary,
        backgroundColor: hasDarkPurpleTheme ? (colors.surfaceElevated || colors.surface) : colors.surface,
        textAlignVertical: 'top',
        minHeight: 80,
    },
    commentCounter: {
        fontSize: 12,
        color: colors.textTertiary,
        textAlign: 'right',
        marginTop: 4,
    },
    modalActions: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: hasDarkPurpleTheme ? 'transparent' : colors.surface,
        borderWidth: 1,
        borderColor: hasDarkPurpleTheme ? ON_PRIMARY_COLOR : colors.border,
        alignItems: 'center',
    },
    modalCancelButtonText: {
        fontSize: 14,
        color: hasDarkPurpleTheme ? ON_PRIMARY_COLOR : colors.textSecondary,
        fontWeight: '600',
    },
    modalConfirmButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: hasDarkPurpleTheme ? screenBackground : colors.success,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    modalConfirmButtonText: {
        fontSize: 14,
        color: ON_PRIMARY_COLOR,
        fontWeight: '600',
    },
    modalButtonDisabled: {
        backgroundColor: hasDarkPurpleTheme
            ? 'rgba(255, 255, 255, 0.12)'
            : (colors.surfaceSecondary || colors.border),
        opacity: 0.6,
    },

    // Стили для истории обработки
    processingStepsContainer: {
        gap: 16,
    },
    processingStep: {
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    lastProcessingStep: {
        borderBottomWidth: 0,
        paddingBottom: 0,
    },
    stepHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    stepRole: {
        flex: 1,
        gap: 8,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
        alignSelf: 'flex-start',
    },
    roleLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: ON_PRIMARY_COLOR,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    stepStatus: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    stepDate: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    stepEmployee: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    employeeInfo: {
        flex: 1,
    },
    employeeName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    employeePosition: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    stepComment: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    commentText: {
        flex: 1,
        fontSize: 12,
        color: colors.textSecondary,
        fontStyle: 'italic',
        lineHeight: 16,
    },
    virtualStep: {
        opacity: 0.8,
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 12,
    },
    virtualComment: {
        fontStyle: 'normal',
        color: colors.textTertiary,
    },
    temporaryStep: {
        backgroundColor: colors.success + '20',
        borderLeftWidth: 4,
        borderLeftColor: colors.success,
        borderRadius: 8,
        padding: 12,
        opacity: 0.9,
    },

    // Загрузка
    loadingContainer: {
        flex: 1,
        backgroundColor: screenBackground,
    },
    loadingContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: ON_PRIMARY_COLOR,
        fontWeight: '500',
    },

    // WaitingStockInfo стили
    waitingStockInfo: {
        backgroundColor: isDark ? colors.surface : '#fff3cd',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: isDark ? colors.border : '#ffeaa7',
        shadowColor: '#fd7e14',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.15 : 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    waitingStockHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    waitingStockIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fd7e14',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    waitingStockIconOverdue: {
        backgroundColor: '#dc3545',
    },
    waitingStockTextContainer: {
        flex: 1,
    },
    waitingStockTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    waitingStockSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    waitingStockDetails: {
        backgroundColor: isDark ? colors.cardBackground : 'rgba(255,255,255,0.7)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    waitingStockDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    waitingStockDetailLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    waitingStockDetailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fd7e14',
    },
    waitingStockDetailValueOverdue: {
        color: '#dc3545',
    },
    waitingStockMessage: {
        backgroundColor: isDark ? colors.surface : 'rgba(255,255,255,0.5)',
        borderRadius: 8,
        padding: 12,
    },
    waitingStockMessageText: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    });
};
