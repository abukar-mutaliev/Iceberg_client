import { StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';

export const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    container: {
        flex: 1,
    },
    statsContainer: {
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
    },
    pendingCard: {
        backgroundColor: Color.colorLightMode,
        borderRadius: Border.radius.medium,
        padding: normalize(20),
        marginBottom: normalize(16),
        alignItems: 'center',
        ...Shadow.light,
    },
    pendingTitle: {
        fontSize: normalizeFont(FontSize.size_lg),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: normalize(8),
    },
    pendingAmount: {
        fontSize: normalizeFont(FontSize.size_xl),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: 'bold',
        color: Color.orange,
        marginBottom: normalize(8),
    },
    pendingSubtitle: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        textAlign: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: normalize(40),
        paddingVertical: normalize(60),
    },
    emptyText: {
        fontSize: normalizeFont(FontSize.size_lg),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
        textAlign: 'center',
        marginBottom: normalize(8),
    },
    emptySubtitle: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: normalize(40),
        paddingVertical: normalize(60),
    },
    errorText: {
        fontSize: normalizeFont(FontSize.size_lg),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.error,
        textAlign: 'center',
        marginBottom: normalize(20),
    },
    retryButton: {
        backgroundColor: Color.blue2,
        borderRadius: Border.radius.medium,
        paddingHorizontal: normalize(24),
        paddingVertical: normalize(12),
        ...Shadow.light,
    },
    retryButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.colorLightMode,
    },
    searchContainer: {
        paddingHorizontal: normalize(20),
        paddingBottom: normalize(16),
    },
    listContainer: {
        paddingHorizontal: normalize(20),
        paddingBottom: normalize(20),
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    contentContainer: {
        flex: 1,
    },
    listItem: {
        paddingHorizontal: normalize(20),
        marginBottom: normalize(12),
    },
    toPayCard: {
        backgroundColor: '#F0F9FF',
        borderRadius: Border.radius.medium,
        padding: normalize(20),
        marginTop: normalize(16),
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#B3E0FF',
        ...Shadow.light,
    },
    toPayTitle: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: '#0066CC',
        marginBottom: normalize(8),
        textAlign: 'center',
    },
    toPayAmount: {
        fontSize: normalizeFont(FontSize.size_2xl),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: 'bold',
        color: '#0066CC',
        marginBottom: normalize(4),
    },
    toPayHint: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: '#0066CC',
        textAlign: 'center',
        opacity: 0.8,
    },
    batchPaymentContainer: {
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
    },
    batchPaymentButton: {
        backgroundColor: '#10B981',
        borderRadius: Border.radius.medium,
        padding: normalize(16),
        alignItems: 'center',
        ...Shadow.medium,
    },
    batchPaymentButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '700',
        color: Color.colorLightMode,
        marginBottom: normalize(4),
    },
    batchPaymentAmount: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.colorLightMode,
        opacity: 0.9,
    },
}); 