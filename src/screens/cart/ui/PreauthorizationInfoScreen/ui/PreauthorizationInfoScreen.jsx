import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, FontFamily } from '@app/styles/GlobalStyles';

const { width: screenWidth } = Dimensions.get('window');

const normalize = (size) => {
    const scale = screenWidth / 375;
    return Math.round(size * scale);
};

export const PreauthorizationInfoScreen = ({ navigation, route }) => {
    const { orderAmount = 0, orderNumber = '' } = route.params || {};

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#667eea" />
            
            {/* Заголовок */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Предавторизация платежа</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Основная информация */}
                <View style={styles.mainSection}>
                    <View style={styles.iconContainer}>
                        <Icon name="security" size={60} color="#667eea" />
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
                        <Icon name="shield" size={24} color="#28a745" />
                        <View style={styles.benefitText}>
                            <Text style={styles.benefitTitle}>Безопасность</Text>
                            <Text style={styles.benefitDescription}>
                                Деньги списываются только за доставленный товар
                            </Text>
                        </View>
                    </View>

                    <View style={styles.benefit}>
                        <Icon name="speed" size={24} color="#007bff" />
                        <View style={styles.benefitText}>
                            <Text style={styles.benefitTitle}>Быстрота</Text>
                            <Text style={styles.benefitDescription}>
                                Мгновенное резервирование товаров без задержек
                            </Text>
                        </View>
                    </View>

                    <View style={styles.benefit}>
                        <Icon name="favorite" size={24} color="#fd7e14" />
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
                        <Icon name="check-circle" size={20} color="#28a745" />
                        <Text style={styles.scenarioText}>
                            <Text style={styles.scenarioTitle}>Товар есть в наличии:</Text>
                            {'\n'}Заказ обрабатывается, средства списываются при отправке
                        </Text>
                    </View>

                    <View style={styles.scenario}>
                        <Icon name="help-outline" size={20} color="#fd7e14" />
                        <Text style={styles.scenarioText}>
                            <Text style={styles.scenarioTitle}>Товар временно недоступен:</Text>
                            {'\n'}Мы предложим варианты: подождать, заменить или отменить
                        </Text>
                    </View>

                    <View style={styles.scenario}>
                        <Icon name="cancel" size={20} color="#dc3545" />
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
                    <Icon name="thumb-up" size={20} color="#fff" />
                    <Text style={styles.understoodButtonText}>Понял, продолжить</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },

    // Заголовок
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        backgroundColor: '#667eea',
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
        color: '#fff',
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
        backgroundColor: '#fff',
        margin: normalize(16),
        borderRadius: normalize(16),
        padding: normalize(24),
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    iconContainer: {
        width: normalize(100),
        height: normalize(100),
        borderRadius: normalize(50),
        backgroundColor: '#f0f4ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: normalize(20),
    },
    title: {
        fontSize: normalize(22),
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        fontWeight: '700',
        color: '#333',
        textAlign: 'center',
        marginBottom: normalize(8),
    },
    subtitle: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: '#666',
        textAlign: 'center',
        lineHeight: normalize(22),
        marginBottom: normalize(20),
    },
    amountCard: {
        backgroundColor: '#f0f4ff',
        borderRadius: normalize(12),
        padding: normalize(16),
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: '#667eea',
    },
    amountLabel: {
        fontSize: normalize(13),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: '#667eea',
        fontWeight: '500',
        marginBottom: normalize(4),
    },
    amountValue: {
        fontSize: normalize(24),
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        fontWeight: '700',
        color: '#667eea',
        marginBottom: normalize(4),
    },
    orderInfo: {
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: '#666',
    },

    // Объяснение процесса
    explanationSection: {
        backgroundColor: '#fff',
        margin: normalize(16),
        marginTop: 0,
        borderRadius: normalize(16),
        padding: normalize(20),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: normalize(18),
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        fontWeight: '600',
        color: '#333',
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
        backgroundColor: '#667eea',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: normalize(12),
    },
    stepNumberText: {
        fontSize: normalize(14),
        fontWeight: '700',
        color: '#fff',
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: normalize(15),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: '#333',
        marginBottom: normalize(4),
    },
    stepDescription: {
        fontSize: normalize(13),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: '#666',
        lineHeight: normalize(18),
    },

    // Преимущества
    benefitsSection: {
        backgroundColor: '#fff',
        margin: normalize(16),
        marginTop: 0,
        borderRadius: normalize(16),
        padding: normalize(20),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
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
        color: '#333',
        marginBottom: normalize(4),
    },
    benefitDescription: {
        fontSize: normalize(13),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: '#666',
        lineHeight: normalize(18),
    },

    // Сценарии
    scenariosSection: {
        backgroundColor: '#fff',
        margin: normalize(16),
        marginTop: 0,
        borderRadius: normalize(16),
        padding: normalize(20),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    scenario: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: normalize(16),
        padding: normalize(12),
        backgroundColor: '#f8f9fa',
        borderRadius: normalize(8),
    },
    scenarioText: {
        flex: 1,
        marginLeft: normalize(12),
        fontSize: normalize(13),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: '#666',
        lineHeight: normalize(18),
    },
    scenarioTitle: {
        fontWeight: '600',
        color: '#333',
    },

    // Футер
    footer: {
        padding: normalize(20),
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    understoodButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#667eea',
        borderRadius: normalize(12),
        paddingVertical: normalize(16),
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    understoodButtonText: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: '#fff',
        marginLeft: normalize(8),
    },
});
