import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily } from '@app/styles/GlobalStyles';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const ModernStockStatsCard = ({ stats, loading, selectedFilter, onFilterPress }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>{String('Загрузка статистики...')}</Text>
            </View>
        );
    }

    if (!stats || !stats.summary) {
        return null;
    }

    const { summary } = stats;

    const statsData = [
        {
            key: 'critical',
            label: 'Критично',
            value: summary.critical || 0,
            color: '#FF3B30',
            icon: 'error',
            description: '≤20-30 коробок - срочно пополнить'
        },
        {
            key: 'warning',
            label: 'Предупреждение',
            value: summary.warning || 0,
            color: '#FF9500',
            icon: 'warning',
            description: '≤50 коробок - требуется пополнение'
        },
        {
            key: 'attention',
            label: 'Внимание',
            value: summary.attention || 0,
            color: '#FFCC00',
            icon: 'info',
            description: '≤100 коробок - запланировать пополнение'
        },
        {
            key: 'normal',
            label: 'В норме',
            value: summary.normal || 0,
            color: '#34C759',
            icon: 'check-circle',
            description: 'Оптимальный запас'
        }
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.iconCircle}>
                        <Icon name="analytics" size={normalize(24)} color={colors.primary} />
                    </View>
                    <View>
                        <Text style={styles.title}>{String('Состояние складов')}</Text>
                        <Text style={styles.subtitle}>{String('Анализ скорости продаж')}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.statsContainer}>
                {statsData.map((stat) => (
                    <TouchableOpacity
                        key={stat.key}
                        style={[
                            styles.statCard,
                            selectedFilter === stat.key && styles.selectedStatCard
                        ]}
                        onPress={() => onFilterPress && onFilterPress(stat.key)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.statIconBg, { backgroundColor: stat.color + '15' }]}>
                            <Icon name={stat.icon} size={normalize(20)} color={stat.color} />
                        </View>

                        <Text style={[styles.statValue, { color: stat.color }]}>
                            {String(stat.value)}
                        </Text>

                        <Text style={styles.statLabel}>{String(stat.label)}</Text>
                        <Text style={styles.statDescription}>{String(stat.description)}</Text>

                        {selectedFilter === stat.key && (
                            <View style={styles.selectedIndicator}>
                                <View style={[styles.selectedDot, { backgroundColor: stat.color }]} />
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        backgroundColor: colors.cardBackground,
        borderRadius: normalize(16),
        padding: normalize(12),
        marginBottom: normalize(12),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.border,
    },
    loadingContainer: {
        backgroundColor: colors.cardBackground,
        borderRadius: normalize(16),
        padding: normalize(32),
        marginBottom: normalize(16),
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.border,
    },
    loadingText: {
        fontSize: normalizeFont(14),
        color: colors.textSecondary,
        marginTop: normalize(8),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(16),
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        backgroundColor: `${colors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: normalize(10),
    },
    title: {
        fontSize: normalizeFont(18),
        fontFamily: FontFamily.sFProTextBold,
        color: colors.textPrimary,
        marginBottom: normalize(2),
    },
    subtitle: {
        fontSize: normalizeFont(13),
        color: colors.textSecondary,
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: normalize(-4),
    },
    statCard: {
        width: '48%',
        backgroundColor: colors.surfaceSecondary,
        borderRadius: normalize(10),
        padding: normalize(10),
        alignItems: 'center',
        margin: normalize(4),
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedStatCard: {
        backgroundColor: isDark ? colors.surfaceElevated : '#F0F8FF',
        borderColor: colors.primary,
    },
    statIconBg: {
        width: normalize(32),
        height: normalize(32),
        borderRadius: normalize(16),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: normalize(6),
    },
    statValue: {
        fontSize: normalizeFont(24),
        fontFamily: FontFamily.sFProTextBold,
        marginBottom: normalize(2),
    },
    statLabel: {
        fontSize: normalizeFont(12),
        fontFamily: FontFamily.sFProTextBold,
        color: colors.textPrimary,
        marginBottom: normalize(2),
        textAlign: 'center',
    },
    statDescription: {
        fontSize: normalizeFont(10),
        color: colors.textSecondary,
        textAlign: 'center',
    },
    selectedIndicator: {
        position: 'absolute',
        top: normalize(8),
        right: normalize(8),
    },
    selectedDot: {
        width: normalize(8),
        height: normalize(8),
        borderRadius: normalize(4),
    },
});

export default ModernStockStatsCard;
