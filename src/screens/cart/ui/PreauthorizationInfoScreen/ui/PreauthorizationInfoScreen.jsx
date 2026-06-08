import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { FontFamily } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');

const normalize = (size) => {
    const scale = screenWidth / 375;
    return Math.round(size * scale);
};

export const PreauthorizationInfoScreen = ({ navigation, route }) => {
    const { orderAmount = 0, orderNumber = '' } = route.params || {};
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
            
            {/* Заголовок */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-back" size={24} color={colors.textInverse} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Предавторизация платежа</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Основная информация */}
                <View style={styles.mainSection}>
                    <View style={styles.iconContainer}>
                        <Icon name="security" size={60} color={colors.primary} />
                    </View>
                    
                    <Text style={styles.title}>Средства заблокированы</Text>
                    <Text style={styles.subtitle}>
                        Мы заблокировали сумму {formatAmount(orderAmount)} на вашей карте
                    </Text>
                    
                    <View style={styles.amountCard}>
                        <Text style={styles.amountLabel}>Заблокированная сумма:</Text>
                        <Text style={styles.amountValue}>{formatAmount(orderAmount)}</Text>
                        {orderNumber && (
                            <Text style={styles.orderInfo}>Заказ {orderNumber}</Text>
                        )}
                    </View>
                </View>

                {/* Объяснение процесса */}
                <View style={styles.explanationSection}>
                    <Text style={styles.sectionTitle}>Как это работает:</Text>
                    
                    <View style={styles.stepsList}>
                        <View style={styles.step}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>1</Text>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>Блокировка средств</Text>
                                <Text style={styles.stepDescription}>
                                    Сумма заказа заблокирована на вашей карте, но не списана
                                </Text>
                            </View>
                        </View>

                        <View style={styles.step}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>2</Text>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>Проверка наличия</Text>
                                <Text style={styles.stepDescription}>
                                    Мы проверяем наличие всех товаров на складе
                                </Text>
                            </View>
                        </View>

                        <View style={styles.step}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>3</Text>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>Списание или возврат</Text>
                                <Text style={styles.stepDescription}>
                                    Если товары есть - средства списываются. 
                                    Если нет - блокировка снимается
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Преимущества */}
                <View style={styles.benefitsSection}>
                    <Text style={styles.sectionTitle}>Ваши преимущества:</Text>
                    
                    <View style={styles.benefit}>
                        <Icon name="shield" size={24} color={colors.success} />
                        <View style={styles.benefitText}>
                            <Text style={styles.benefitTitle}>Безопасность</Text>
                            <Text style={styles.benefitDescription}>
                                Деньги списываются только за доставленный товар
                            </Text>
                        </View>
                    </View>

                    <View style={styles.benefit}>
                        <Icon name="speed" size={24} color={colors.primary} />
                        <View style={styles.benefitText}>
                            <Text style={styles.benefitTitle}>Быстрота</Text>
                            <Text style={styles.benefitDescription}>
                                Мгновенное резервирование товаров без задержек
                            </Text>
                        </View>
                    </View>

                    <View style={styles.benefit}>
                        <Icon name="favorite" size={24} color={colors.warning} />
                        <View style={styles.benefitText}>
                            <Text style={styles.benefitTitle}>Честность</Text>
                            <Text style={styles.benefitDescription}>
                                Полная прозрачность - вы всегда знаете статус заказа
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Информация о возможных ситуациях */}
                <View style={styles.scenariosSection}>
                    <Text style={styles.sectionTitle}>Возможные сценарии:</Text>
                    
                    <View style={styles.scenario}>
                        <Icon name="check-circle" size={20} color={colors.success} />
                        <Text style={styles.scenarioText}>
                            <Text style={styles.scenarioTitle}>Товар есть в наличии:</Text>
                            {'\n'}Заказ обрабатывается, средства списываются при отправке
                        </Text>
                    </View>

                    <View style={styles.scenario}>
                        <Icon name="help-outline" size={20} color={colors.warning} />
                        <Text style={styles.scenarioText}>
                            <Text style={styles.scenarioTitle}>Товар временно недоступен:</Text>
                            {'\n'}Мы предложим варианты: подождать, заменить или отменить
                        </Text>
                    </View>

                    <View style={styles.scenario}>
                        <Icon name="cancel" size={20} color={colors.error} />
                        <Text style={styles.scenarioText}>
                            <Text style={styles.scenarioTitle}>Отмена заказа:</Text>
                            {'\n'}Блокировка снимается автоматически, деньги не списываются
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Кнопка понял */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.understoodButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="thumb-up" size={20} color={colors.textInverse} />
                    <Text style={styles.understoodButtonText}>Понял, продолжить</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    // Заголовок
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        backgroundColor: colors.primary,
    },
    backButton: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: normalize(18),
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        fontWeight: '600',
        color: colors.textInverse,
    },
    headerPlaceholder: {
        width: normalize(40),
    },

    // Контент
    content: {
        flex: 1,
    },

    // Основная секция
    mainSection: {
        backgroundColor: colors.cardBackground,
        margin: normalize(16),
        borderRadius: normalize(16),
        padding: normalize(24),
        alignItems: 'center',
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.25 : 0.1,
        shadowRadius: isDark ? 10 : 8,
        elevation: isDark ? 5 : 4,
    },
    iconContainer: {
        width: normalize(100),
        height: normalize(100),
        borderRadius: normalize(50),
        backgroundColor: colors.primary + '1A',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: normalize(20),
    },
    title: {
        fontSize: normalize(22),
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: normalize(8),
    },
    subtitle: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: normalize(22),
        marginBottom: normalize(20),
    },
    amountCard: {
        backgroundColor: colors.primary + '1A',
        borderRadius: normalize(12),
        padding: normalize(16),
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    amountLabel: {
        fontSize: normalize(13),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.primary,
        fontWeight: '500',
        marginBottom: normalize(4),
    },
    amountValue: {
        fontSize: normalize(24),
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        fontWeight: '700',
        color: colors.primary,
        marginBottom: normalize(4),
    },
    orderInfo: {
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
    },

    // Объяснение процесса
    explanationSection: {
        backgroundColor: colors.cardBackground,
        margin: normalize(16),
        marginTop: 0,
        borderRadius: normalize(16),
        padding: normalize(20),
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.22 : 0.08,
        shadowRadius: isDark ? 8 : 4,
        elevation: isDark ? 4 : 3,
    },
    sectionTitle: {
        fontSize: normalize(18),
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: normalize(16),
    },
    stepsList: {
        gap: normalize(16),
    },
    step: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    stepNumber: {
        width: normalize(32),
        height: normalize(32),
        borderRadius: normalize(16),
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: normalize(12),
    },
    stepNumberText: {
        fontSize: normalize(14),
        fontWeight: '700',
        color: colors.textInverse,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: normalize(15),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: normalize(4),
    },
    stepDescription: {
        fontSize: normalize(13),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
        lineHeight: normalize(18),
    },

    // Преимущества
    benefitsSection: {
        backgroundColor: colors.cardBackground,
        margin: normalize(16),
        marginTop: 0,
        borderRadius: normalize(16),
        padding: normalize(20),
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.22 : 0.08,
        shadowRadius: isDark ? 8 : 4,
        elevation: isDark ? 4 : 3,
    },
    benefit: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: normalize(16),
    },
    benefitText: {
        flex: 1,
        marginLeft: normalize(12),
    },
    benefitTitle: {
        fontSize: normalize(15),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: normalize(4),
    },
    benefitDescription: {
        fontSize: normalize(13),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
        lineHeight: normalize(18),
    },

    // Сценарии
    scenariosSection: {
        backgroundColor: colors.cardBackground,
        margin: normalize(16),
        marginTop: 0,
        borderRadius: normalize(16),
        padding: normalize(20),
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.22 : 0.08,
        shadowRadius: isDark ? 8 : 4,
        elevation: isDark ? 4 : 3,
    },
    scenario: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: normalize(16),
        padding: normalize(12),
        backgroundColor: colors.surface,
        borderRadius: normalize(8),
    },
    scenarioText: {
        flex: 1,
        marginLeft: normalize(12),
        fontSize: normalize(13),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
        lineHeight: normalize(18),
    },
    scenarioTitle: {
        fontWeight: '600',
        color: colors.textPrimary,
    },

    // Футер
    footer: {
        padding: normalize(20),
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    understoodButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        borderRadius: normalize(12),
        paddingVertical: normalize(16),
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    understoodButtonText: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: colors.textInverse,
        marginLeft: normalize(8),
    },
});
