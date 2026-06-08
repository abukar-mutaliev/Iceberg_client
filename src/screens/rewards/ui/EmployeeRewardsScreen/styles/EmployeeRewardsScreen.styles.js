import { StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { palettes } from '@app/styles/themeConfig';

export const createStyles = (colors, isDark = false) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
        paddingBottom: 50
    },
    container: {
        flex: 1,
    },
    statsContainer: {
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
    },
    pendingCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: Border.radius.medium,
        padding: normalize(20),
        marginBottom: normalize(16),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: isDark ? '#000000' : Color.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.35 : 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    pendingTitle: {
        fontSize: normalizeFont(FontSize.size_lg),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: normalize(8),
    },
    pendingAmount: {
        fontSize: normalizeFont(FontSize.size_xl),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: 'bold',
        color: colors.warning,
        marginBottom: normalize(8),
    },
    pendingSubtitle: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: colors.textSecondary,
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
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: normalize(8),
    },
    emptySubtitle: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: colors.textSecondary,
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
        color: colors.error,
        textAlign: 'center',
        marginBottom: normalize(20),
    },
    retryButton: {
        backgroundColor: colors.primary,
        borderRadius: Border.radius.medium,
        paddingHorizontal: normalize(24),
        paddingVertical: normalize(12),
        shadowColor: isDark ? '#000000' : Color.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.35 : 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    retryButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: colors.textInverse,
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
        backgroundColor: isDark ? colors.surface : '#F0F9FF',
        borderRadius: Border.radius.medium,
        padding: normalize(20),
        marginTop: normalize(16),
        alignItems: 'center',
        borderWidth: 2,
        borderColor: isDark ? colors.border : '#B3E0FF',
        shadowColor: isDark ? '#000000' : Color.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.35 : 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    toPayTitle: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: isDark ? colors.primary : '#0066CC',
        marginBottom: normalize(8),
        textAlign: 'center',
    },
    toPayAmount: {
        fontSize: normalizeFont(FontSize.size_2xl),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: 'bold',
        color: isDark ? colors.primary : '#0066CC',
        marginBottom: normalize(4),
    },
    toPayHint: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: isDark ? colors.textSecondary : '#0066CC',
        textAlign: 'center',
        opacity: 0.8,
    },
    batchPaymentContainer: {
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
    },
    batchPaymentButton: {
        backgroundColor: colors.success,
        borderRadius: Border.radius.medium,
        padding: normalize(16),
        alignItems: 'center',
        shadowColor: isDark ? '#000000' : Color.black,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: isDark ? 0.4 : 0.15,
        shadowRadius: 5,
        elevation: 5,
    },
    batchPaymentButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: normalize(4),
    },
    batchPaymentAmount: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: '#FFFFFF',
        opacity: 0.9,
    },
});

export const styles = createStyles(palettes.light, false);