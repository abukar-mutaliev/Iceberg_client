import { StyleSheet } from 'react-native';
import { ORDER_STATUS_COLORS } from '@shared/lib/orderConstants';

export const createOrderDetailsStyles = () => StyleSheet.create({
    // Основные контейнеры
    container: {
        flex: 1,
        backgroundColor: '#667eea',
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
    headerGradient: {
        backgroundColor: '#667eea',
        paddingTop: 16,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 12,
    },
    headerContent: {
        gap: 16,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    orderNumberContainer: {
        flex: 1,
    },
    orderNumber: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
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
        color: '#fff',
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
        color: '#fff',
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
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        padding: 24,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
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
        color: '#2d3748',
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
        backgroundColor: '#f7fafc',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#718096',
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 16,
        color: '#2d3748',
        lineHeight: 22,
        fontWeight: '500',
    },
    infoSubtext: {
        fontSize: 12,
        color: '#718096',
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
        borderBottomColor: '#f1f5f9',
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
        backgroundColor: '#f8f9fa',
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
        backgroundColor: '#f1f5f9',
    },
    itemInfo: {
        flex: 1,
        gap: 8,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2d3748',
        lineHeight: 22,
    },
    supplierContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    itemSupplier: {
        fontSize: 12,
        color: '#718096',
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
        color: '#718096',
        fontWeight: '500',
    },
    itemQuantity: {
        fontSize: 14,
        color: '#2d3748',
        fontWeight: '600',
    },
    priceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: 14,
        color: '#718096',
        fontWeight: '500',
    },
    itemPrice: {
        fontSize: 14,
        color: '#2d3748',
        fontWeight: '600',
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    totalLabel: {
        fontSize: 16,
        color: '#4a5568',
        fontWeight: '600',
    },
    itemTotal: {
        fontSize: 18,
        fontWeight: '800',
        color: '#667eea',
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
        backgroundColor: '#667eea',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    processButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        marginBottom: 10
    },
    cancelButton: {
        backgroundColor: '#EF5350',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#EF5350',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    releaseButton: {
        backgroundColor: '#FF9800',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#FF9800',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },

    // Тексты кнопок
    downloadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    processButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    releaseButtonText: {
        color: '#fff',
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
        backgroundColor: '#667eea',
    },
    errorIconContainer: {
        width: 120,
        height: 120,
        backgroundColor: '#fff',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#EF5350',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
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
        backgroundColor: '#fff',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    retryButtonText: {
        color: '#667eea',
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 500,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    modalBody: {
        maxHeight: 400,
        padding: 20,
    },
    currentStatusContainer: {
        marginBottom: 20,
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    currentStatusLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    currentStatusText: {
        fontSize: 16,
        color: '#1a1a1a',
        fontWeight: '600',
    },
    infoContainer: {
        backgroundColor: '#f0f2ff',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#667eea',
        marginBottom: 20,
    },
    infoText: {
        fontSize: 14,
        color: '#1a1a1a',
        lineHeight: 20,
    },
    commentContainer: {
        marginBottom: 20,
    },
    commentLabel: {
        fontSize: 14,
        color: '#1a1a1a',
        marginBottom: 8,
        fontWeight: '600',
    },
    commentInput: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#1a1a1a',
        backgroundColor: '#fff',
        textAlignVertical: 'top',
        minHeight: 80,
    },
    commentCounter: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
        marginTop: 4,
    },
    modalActions: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        alignItems: 'center',
    },
    modalCancelButtonText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    modalConfirmButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#4CAF50',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    modalConfirmButtonText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    modalButtonDisabled: {
        backgroundColor: '#ccc',
        opacity: 0.6,
    },

    // Стили для истории обработки
    processingStepsContainer: {
        gap: 16,
    },
    processingStep: {
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
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
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    stepStatus: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2d3748',
    },
    stepDate: {
        fontSize: 12,
        color: '#718096',
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
        color: '#2d3748',
        marginBottom: 2,
    },
    employeePosition: {
        fontSize: 12,
        color: '#718096',
    },
    stepComment: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    commentText: {
        flex: 1,
        fontSize: 12,
        color: '#718096',
        fontStyle: 'italic',
        lineHeight: 16,
    },
    virtualStep: {
        opacity: 0.8,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
    },
    virtualComment: {
        fontStyle: 'normal',
        color: '#6b7280',
    },
    temporaryStep: {
        backgroundColor: '#e8f5e8',
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
        borderRadius: 8,
        padding: 12,
        opacity: 0.9,
    },

    // Загрузка
    loadingContainer: {
        flex: 1,
        backgroundColor: '#667eea',
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
        color: '#fff',
        fontWeight: '500',
    },
});
