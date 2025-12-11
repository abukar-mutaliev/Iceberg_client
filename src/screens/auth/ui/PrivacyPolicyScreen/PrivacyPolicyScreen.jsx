import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Dimensions,
    PixelRatio,
    Platform,
    TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BackButton } from '@shared/ui/Button/BackButton';

const { width, height } = Dimensions.get('window');
const scale = width / 430;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const normalizeFont = (size) => {
    const isSmallDevice = height < 700;
    const isLargeDevice = height > 800;

    let newSize = size * scale;
    if (isSmallDevice) {
        newSize = newSize * 0.9;
    } else if (isLargeDevice) {
        newSize = newSize * 1.1;
    }
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const PrivacyPolicyScreen = () => {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <BackButton
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                />
                <Text style={styles.headerTitle}>Согласие на обработку персональных данных</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
            >
                <Text style={styles.title}>СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ</Text>

                <Text style={styles.paragraph}>
                    Настоящим я, действуя своей волей и в своем интересе, при регистрации в мобильном приложении Iceberg Ingushetia (далее — «Приложение») даю свое согласие на обработку персональных данных, указанных мной при регистрации в Приложении, а также иных персональных данных, которые могут быть получены в процессе использования Приложения.
                </Text>

                <Text style={styles.sectionTitle}>1. ОПЕРАТОР ПЕРСОНАЛЬНЫХ ДАННЫХ</Text>
                <Text style={styles.paragraph}>
                    Оператором персональных данных является владелец Приложения (далее — «Оператор»).
                </Text>

                <Text style={styles.sectionTitle}>2. ЦЕЛИ ОБРАБОТКИ ПЕРСОНАЛЬНЫХ ДАННЫХ</Text>
                <Text style={styles.paragraph}>
                    Оператор обрабатывает персональные данные в следующих целях:
                </Text>
                <Text style={styles.listItem}>
                    • Регистрация и авторизация пользователя в Приложении;
                </Text>
                <Text style={styles.listItem}>
                    • Предоставление пользователю доступа к функциональным возможностям Приложения;
                </Text>
                <Text style={styles.listItem}>
                    • Обработка заказов и предоставление услуг;
                </Text>
                <Text style={styles.listItem}>
                    • Связь с пользователем, в том числе направление уведомлений, касающихся использования Приложения;
                </Text>
                <Text style={styles.listItem}>
                    • Улучшение качества работы Приложения и разработка новых сервисов;
                </Text>
                <Text style={styles.listItem}>
                    • Проведение статистических и иных исследований на основе обезличенных данных;
                </Text>
                <Text style={styles.listItem}>
                    • Соблюдение требований законодательства Российской Федерации.
                </Text>

                <Text style={styles.sectionTitle}>3. СОСТАВ ПЕРСОНАЛЬНЫХ ДАННЫХ</Text>
                <Text style={styles.paragraph}>
                    Оператор обрабатывает следующие персональные данные:
                </Text>
                <Text style={styles.listItem}>
                    • Фамилия, имя, отчество;
                </Text>
                <Text style={styles.listItem}>
                    • Адрес электронной почты;
                </Text>
                <Text style={styles.listItem}>
                    • Номер телефона;
                </Text>
                <Text style={styles.listItem}>
                    • Адрес доставки;
                </Text>
                <Text style={styles.listItem}>
                    • Пол;
                </Text>
                <Text style={styles.listItem}>
                    • Район проживания;
                </Text>
                <Text style={styles.listItem}>
                    • Иные данные, предоставляемые пользователем при использовании Приложения.
                </Text>

                <Text style={styles.sectionTitle}>4. СПОСОБЫ И СРОКИ ОБРАБОТКИ ПЕРСОНАЛЬНЫХ ДАННЫХ</Text>
                <Text style={styles.paragraph}>
                    Обработка персональных данных осуществляется с использованием средств автоматизации и без использования таких средств, включая сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передачу (распространение, предоставление, доступ), обезличивание, блокирование, удаление, уничтожение персональных данных.
                </Text>
                <Text style={styles.paragraph}>
                    Срок обработки персональных данных определяется достижением целей, для которых были собраны персональные данные, если иной срок не предусмотрен договором или действующим законодательством Российской Федерации.
                </Text>

                <Text style={styles.sectionTitle}>5. ПРАВА СУБЪЕКТА ПЕРСОНАЛЬНЫХ ДАННЫХ</Text>
                <Text style={styles.paragraph}>
                    В соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных», я имею право:
                </Text>
                <Text style={styles.listItem}>
                    • Получать информацию, касающуюся обработки моих персональных данных;
                </Text>
                <Text style={styles.listItem}>
                    • Требовать уточнения, блокирования или уничтожения моих персональных данных, если они являются неполными, устаревшими, неточными, незаконно полученными или не являются необходимыми для заявленной цели обработки;
                </Text>
                <Text style={styles.listItem}>
                    • Отозвать согласие на обработку персональных данных;
                </Text>
                <Text style={styles.listItem}>
                    • Обжаловать действия или бездействие Оператора в уполномоченный орган по защите прав субъектов персональных данных или в судебном порядке.
                </Text>

                <Text style={styles.sectionTitle}>6. ОТЗЫВ СОГЛАСИЯ</Text>
                <Text style={styles.paragraph}>
                    Я понимаю, что в любое время могу отозвать настоящее согласие на обработку персональных данных, направив Оператору соответствующее уведомление на адрес электронной почты, указанный в Приложении. В случае отзыва согласия Оператор прекращает обработку персональных данных и уничтожает их в срок, не превышающий тридцати дней с даты поступления указанного отзыва, если иное не предусмотрено договором или действующим законодательством Российской Федерации.
                </Text>

                <Text style={styles.sectionTitle}>7. ПЕРЕДАЧА ПЕРСОНАЛЬНЫХ ДАННЫХ ТРЕТЬИМ ЛИЦАМ</Text>
                <Text style={styles.paragraph}>
                    Оператор вправе передавать персональные данные третьим лицам в следующих случаях:
                </Text>
                <Text style={styles.listItem}>
                    • Субъект персональных данных выразил согласие на такие действия;
                </Text>
                <Text style={styles.listItem}>
                    • Передача предусмотрена законодательством Российской Федерации в рамках установленной законодательством процедуры;
                </Text>
                <Text style={styles.listItem}>
                    • В целях исполнения договора, стороной которого является субъект персональных данных.
                </Text>

                <Text style={styles.sectionTitle}>8. МЕРЫ ПО ЗАЩИТЕ ПЕРСОНАЛЬНЫХ ДАННЫХ</Text>
                <Text style={styles.paragraph}>
                    Оператор принимает необходимые правовые, организационные и технические меры для защиты персональных данных от неправомерного доступа, уничтожения, изменения, блокирования, копирования, предоставления, распространения, а также от иных неправомерных действий в отношении персональных данных.
                </Text>

                <Text style={styles.sectionTitle}>9. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ</Text>
                <Text style={styles.paragraph}>
                    Настоящее согласие действует в течение всего периода использования Приложения и до момента отзыва согласия субъектом персональных данных.
                </Text>
                <Text style={styles.paragraph}>
                    Я подтверждаю, что ознакомлен(а) с положениями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных», правами и обязанностями в области защиты персональных данных, с целями и условиями обработки моих персональных данных, указанными в настоящем согласии.
                </Text>
                <Text style={styles.paragraph}>
                    Настоящее согласие дано мной добровольно и в полном объеме.
                </Text>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Дата: {new Date().toLocaleDateString('ru-RU')}
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 15,
        paddingHorizontal: normalize(20),
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        backgroundColor: 'transparent',
        padding: 0,
        marginRight: normalize(10),
    },
    headerTitle: {
        flex: 1,
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(18),
        fontWeight: '600',
        color: '#000000',
        textAlign: 'center',
        marginRight: normalize(40),
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: normalize(20),
        paddingBottom: normalize(40),
    },
    title: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(20),
        fontWeight: '700',
        color: '#000000',
        textAlign: 'center',
        marginBottom: normalize(20),
        textTransform: 'uppercase',
    },
    sectionTitle: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(16),
        fontWeight: '700',
        color: '#000000',
        marginTop: normalize(20),
        marginBottom: normalize(10),
    },
    paragraph: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(14),
        fontWeight: '400',
        color: '#333333',
        lineHeight: normalize(22),
        marginBottom: normalize(15),
        textAlign: 'justify',
    },
    listItem: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(14),
        fontWeight: '400',
        color: '#333333',
        lineHeight: normalize(22),
        marginBottom: normalize(8),
        paddingLeft: normalize(10),
    },
    footer: {
        marginTop: normalize(30),
        paddingTop: normalize(20),
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    footerText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(12),
        fontWeight: '400',
        color: '#666666',
        textAlign: 'center',
    },
});

