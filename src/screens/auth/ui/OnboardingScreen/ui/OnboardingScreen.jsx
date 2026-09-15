import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    Image,
    Modal,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    PixelRatio,
    Platform,
    ActivityIndicator,
    KeyboardAvoidingView,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { markProfileCompleted, loadUserProfile, selectCurrentAuthUser } from '@entities/auth';
import { updateProfile } from '@entities/profile';
import { CustomTextInput } from '@shared/ui/CustomTextInput/CustomTextInput';
import { api } from '@shared/api/api';
import { getUserFriendlyError } from '@shared/lib/errorMessages';
import { GlobalAlert } from '@shared/ui/CustomAlert';

const OTHER_DISTRICT_NAME = 'Другой';

/**
 * Онбординг после входа по номеру.
 *
 * В едином телефонном потоке аккаунт создаётся сразу после подтверждения
 * номера, поэтому имя и район спрашиваются здесь, а не до регистрации. Экран
 * показывается, пока сервер отдаёт `needsProfile`, и закрыть его нельзя:
 * без района невозможно оформить доставку.
 */
export const OnboardingScreen = () => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const placeholderColor = isDark ? colors.textTertiary : '#888';

    const user = useSelector(selectCurrentAuthUser);

    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [districtId, setDistrictId] = useState(null);
    const [isOtherDistrict, setIsOtherDistrict] = useState(false);
    const [districts, setDistricts] = useState([]);
    const [districtsLoading, setDistrictsLoading] = useState(false);
    const [showDistrictModal, setShowDistrictModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [nameError, setNameError] = useState('');
    const [districtError, setDistrictError] = useState('');
    const [formError, setFormError] = useState('');
    const [privacyAgreed, setPrivacyAgreed] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const scrollRef = useRef(null);
    const addressOffsetY = useRef(0);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const onShow = Keyboard.addListener(showEvent, (event) => {
            setKeyboardHeight(event.endCoordinates.height);
        });
        const onHide = Keyboard.addListener(hideEvent, () => {
            setKeyboardHeight(0);
        });

        return () => {
            onShow.remove();
            onHide.remove();
        };
    }, []);

    const scrollToAddress = useCallback(() => {
        const y = Math.max(0, addressOffsetY.current - normalize(16));
        const scroll = () => scrollRef.current?.scrollTo({ y, animated: true });

        requestAnimationFrame(scroll);
        setTimeout(scroll, 280);
    }, []);

    const loadDistricts = useCallback(async () => {
        setDistrictsLoading(true);
        try {
            const response = await api.get('/api/districts');
            const list = response?.data?.data;

            if (Array.isArray(list)) {
                setDistricts(list.filter((district) => district?.name !== OTHER_DISTRICT_NAME));
            }
        } catch (error) {
            setFormError('Не удалось загрузить список районов');
        } finally {
            setDistrictsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDistricts();
    }, [loadDistricts]);

    const districtLabel = isOtherDistrict
        ? OTHER_DISTRICT_NAME
        : districts.find((district) => district.id === districtId)?.name || '';

    const handleDistrictSelect = (district) => {
        if (district === 'other') {
            setIsOtherDistrict(true);
            setDistrictId(null);
        } else {
            setIsOtherDistrict(false);
            setDistrictId(district.id);
        }

        setDistrictError('');
        setShowDistrictModal(false);
    };

    const handleSubmit = async () => {
        const trimmedName = name.trim();
        let hasError = false;

        if (trimmedName.length < 2) {
            setNameError('Введите имя, минимум 2 символа');
            hasError = true;
        }

        if (!districtId && !isOtherDistrict) {
            setDistrictError('Выберите район');
            hasError = true;
        }

        if (hasError) {
            return;
        }

        if (!privacyAgreed) {
            GlobalAlert.show({
                type: 'warning',
                title: 'Согласие на обработку персональных данных',
                message: 'Для продолжения необходимо дать согласие на обработку персональных данных. Пожалуйста, ознакомьтесь с соглашением и отметьте соответствующий чекбокс.',
            });
            return;
        }

        setFormError('');
        setIsSaving(true);

        try {
            const result = await dispatch(updateProfile({
                name: trimmedName,
                ...(address.trim() && { address: address.trim() }),
                ...(districtId
                    ? { districtId }
                    : { customDistrict: OTHER_DISTRICT_NAME }),
            }));

            if (result.meta.requestStatus !== 'fulfilled') {
                setFormError(getUserFriendlyError(result.payload) || 'Не удалось сохранить профиль');
                return;
            }

            dispatch(markProfileCompleted());

            // Аккаунт создавался с заглушкой вместо имени и без района, и это
            // всё ещё лежит в auth.user, откуда данные читает половина экранов.
            // Без этой загрузки человек попадает в приложение с пустым профилем
            // и видит свои данные только после повторного входа.
            await dispatch(loadUserProfile());

            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Main' }],
                })
            );
        } catch (error) {
            setFormError(getUserFriendlyError(error) || 'Не удалось сохранить профиль');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    ref={scrollRef}
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: normalize(80) + keyboardHeight },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('@assets/logo/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={styles.title}>Ещё пара деталей</Text>
                    <Text style={styles.subtitle}>
                        {user?.client?.phone || user?.phone
                            ? `Номер ${user.client?.phone || user.phone} подтверждён. Расскажите, как к вам обращаться и куда возить заказы.`
                            : 'Номер подтверждён. Расскажите, как к вам обращаться и куда возить заказы.'}
                    </Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>
                            Ваши ФИО<Text style={styles.requiredStar}> *</Text>
                        </Text>
                        <CustomTextInput
                            style={[styles.input, nameError ? styles.inputError : null]}
                            value={name}
                            onChangeText={(text) => {
                                setName(text);
                                setNameError('');
                            }}
                            placeholder="Фамилия Имя Отчество"
                            placeholderTextColor={placeholderColor}
                            autoFocus
                        />
                        {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
                        <View style={styles.inputUnderline} />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>
                            Ваш район<Text style={styles.requiredStar}> *</Text>
                        </Text>
                        <TouchableOpacity
                            style={[styles.input, styles.selector]}
                            onPress={() => setShowDistrictModal(true)}
                        >
                            <Text style={districtLabel ? styles.inputText : styles.placeholderText}>
                                {districtLabel || 'Выберите район'}
                            </Text>
                        </TouchableOpacity>
                        {districtError ? <Text style={styles.errorText}>{districtError}</Text> : null}
                        <View style={styles.inputUnderline} />
                    </View>

                    <View
                        style={styles.inputContainer}
                        onLayout={(event) => {
                            addressOffsetY.current = event.nativeEvent.layout.y;
                        }}
                    >
                        <Text style={styles.inputLabel}>Ваш адрес</Text>
                        <CustomTextInput
                            style={styles.input}
                            value={address}
                            onChangeText={setAddress}
                            onFocus={scrollToAddress}
                            placeholder="г. Магас, ул. Примерная, д. 1"
                            placeholderTextColor={placeholderColor}
                        />
                        <View style={styles.inputUnderline} />
                    </View>

                    {formError ? <Text style={styles.formError}>{formError}</Text> : null}

                    <View style={styles.privacyContainer}>
                        <View style={styles.checkboxContainer}>
                            <TouchableOpacity
                                style={styles.checkboxWrapper}
                                onPress={() => setPrivacyAgreed((prev) => !prev)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.checkbox, privacyAgreed && styles.checkboxChecked]}>
                                    {privacyAgreed ? (
                                        <Text style={styles.checkmark}>✓</Text>
                                    ) : null}
                                </View>
                            </TouchableOpacity>
                            <View style={styles.privacyTextContainer}>
                                <Text style={styles.privacyText}>
                                    Я согласен(а) на{' '}
                                    <Text
                                        style={styles.privacyLink}
                                        onPress={() => navigation.navigate('PrivacyPolicy')}
                                    >
                                        обработку персональных данных
                                    </Text>
                                </Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.button,
                            (isSaving || !privacyAgreed) && styles.buttonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={isSaving || !privacyAgreed}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Готово</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal
                visible={showDistrictModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDistrictModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Выберите район</Text>

                        {districtsLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={isDark ? colors.primary : '#000cff'} />
                                <Text style={styles.loadingText}>Загрузка районов...</Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.districtsList}>
                                {districts.map((district) => (
                                    <TouchableOpacity
                                        key={district.id}
                                        style={[
                                            styles.optionItem,
                                            districtId === district.id && !isOtherDistrict && styles.selectedOptionItem,
                                        ]}
                                        onPress={() => handleDistrictSelect(district)}
                                    >
                                        <Text style={styles.optionText}>{district.name}</Text>
                                        {district.description ? (
                                            <Text style={styles.optionDescription}>{district.description}</Text>
                                        ) : null}
                                    </TouchableOpacity>
                                ))}

                                <TouchableOpacity
                                    style={[styles.optionItem, isOtherDistrict && styles.selectedOptionItem]}
                                    onPress={() => handleDistrictSelect('other')}
                                >
                                    <Text style={styles.optionText}>{OTHER_DISTRICT_NAME}</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowDistrictModal(false)}
                        >
                            <Text style={styles.closeButtonText}>Закрыть</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const { width, height } = Dimensions.get('window');
const scale = width / 430;

const normalize = (size) => Math.round(PixelRatio.roundToNearestPixel(size * scale));

const normalizeFont = (size) => {
    const isSmallDevice = height < 700;
    const isLargeDevice = height > 800;

    let newSize = size * scale;
    if (isSmallDevice) {
        newSize *= 0.9;
    } else if (isLargeDevice) {
        newSize *= 1.1;
    }

    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const createStyles = (colors, isDark) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: isDark ? colors.background : '#FFFFFF',
    },
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: normalize(20),
        paddingTop: normalize(30),
        paddingBottom: normalize(80),
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: normalize(20),
    },
    logo: {
        width: normalize(89),
        height: normalize(77),
    },
    title: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(22),
        fontWeight: '700',
        textAlign: 'center',
        color: isDark ? colors.textPrimary : '#000',
        marginBottom: normalize(10),
    },
    subtitle: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(14),
        textAlign: 'center',
        color: isDark ? colors.textSecondary : '#666',
        marginBottom: normalize(30),
        lineHeight: normalize(20),
    },
    inputContainer: {
        marginBottom: normalize(25),
        position: 'relative',
    },
    inputLabel: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(15),
        fontWeight: '600',
        color: isDark ? colors.textSecondary : '#000',
        opacity: isDark ? 1 : 0.4,
        marginBottom: normalize(5),
        lineHeight: normalize(21),
    },
    requiredStar: {
        color: isDark ? colors.error : '#FF0000',
        fontWeight: '700',
        opacity: 1,
    },
    input: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(17),
        fontWeight: '600',
        color: isDark ? colors.textPrimary : '#000',
        paddingBottom: normalize(5),
        height: normalize(40),
        paddingHorizontal: 0,
        borderBottomWidth: 0,
    },
    selector: {
        justifyContent: 'center',
    },
    inputText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(17),
        fontWeight: '600',
        color: isDark ? colors.textPrimary : '#000',
    },
    placeholderText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(17),
        fontWeight: '600',
        color: isDark ? colors.textTertiary : '#888',
    },
    inputUnderline: {
        height: 1,
        backgroundColor: isDark ? colors.border : '#000',
        width: '100%',
        position: 'absolute',
        bottom: 0,
    },
    inputError: {
        color: isDark ? colors.error : '#FF0000',
    },
    errorText: {
        color: isDark ? colors.error : '#FF0000',
        fontSize: normalizeFont(12),
        marginTop: normalize(5),
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    formError: {
        color: isDark ? colors.error : '#FF0000',
        fontSize: normalizeFont(14),
        textAlign: 'center',
        marginBottom: normalize(10),
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
    },
    privacyContainer: {
        marginTop: normalize(10),
        marginBottom: normalize(15),
        paddingHorizontal: normalize(5),
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkboxWrapper: {
        marginRight: normalize(10),
    },
    checkbox: {
        width: normalize(24),
        height: normalize(24),
        borderWidth: 2,
        borderColor: isDark ? colors.border : '#000',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
    },
    checkboxChecked: {
        backgroundColor: isDark ? colors.primary : '#000cff',
        borderColor: isDark ? colors.primary : '#000cff',
    },
    checkmark: {
        color: '#FFFFFF',
        fontSize: normalizeFont(16),
        fontWeight: '700',
    },
    privacyTextContainer: {
        flex: 1,
        paddingTop: normalize(2),
    },
    privacyText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(13),
        fontWeight: '400',
        color: isDark ? colors.textSecondary : '#333333',
        lineHeight: normalize(18),
    },
    privacyLink: {
        color: isDark ? colors.primary : '#000cff',
        textDecorationLine: 'underline',
        fontWeight: '500',
    },
    button: {
        backgroundColor: isDark ? colors.primary : '#000cff',
        borderRadius: 30,
        width: Math.min(width * 0.8, normalize(320)),
        height: normalize(70),
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginTop: normalize(10),
    },
    buttonDisabled: {
        backgroundColor: isDark ? colors.border : '#d3d3d3',
    },
    buttonText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(17),
        fontWeight: '500',
        textTransform: 'uppercase',
        color: '#fff',
        lineHeight: normalize(30),
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: isDark ? colors.surface : '#fff',
        borderRadius: 20,
        padding: normalize(20),
        width: width * 0.9,
        maxHeight: height * 0.85,
    },
    modalTitle: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(18),
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: normalize(20),
        color: isDark ? colors.textPrimary : '#000',
    },
    districtsList: {
        maxHeight: height * 0.5,
    },
    optionItem: {
        padding: normalize(15),
        borderBottomWidth: 1,
        borderBottomColor: isDark ? colors.border : '#eee',
    },
    selectedOptionItem: {
        backgroundColor: isDark ? 'rgba(124, 127, 232, 0.18)' : 'rgba(0, 12, 255, 0.1)',
    },
    optionText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(16),
        color: isDark ? colors.textPrimary : '#000',
    },
    optionDescription: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(13),
        color: isDark ? colors.textSecondary : '#666',
        marginTop: normalize(3),
    },
    loadingContainer: {
        paddingVertical: normalize(30),
        alignItems: 'center',
    },
    loadingText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(14),
        color: isDark ? colors.textSecondary : '#666',
        marginTop: normalize(10),
    },
    closeButton: {
        marginTop: normalize(15),
        paddingVertical: normalize(12),
        alignItems: 'center',
    },
    closeButtonText: {
        fontFamily: Platform.OS === 'ios' ? 'SFProText' : 'sans-serif',
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: isDark ? colors.primary : '#000cff',
    },
});
