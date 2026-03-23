import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {
    selectProfileLoading,
    selectProfileError,
    selectProfile,
    fetchProfile,
    clearError,
    clearProfile
} from '@entities/profile';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { useProfileInfo } from "@features/profile/ui/ProfileInfo/model/useProfileInfo";
import { Color, FontFamily } from "@app/styles/GlobalStyles";
import IconRight from "@shared/ui/Icon/Profile/IconRight";
import JoinTeamIcon from "@shared/ui/Icon/Profile/JoinTeamIcon";
import CustomButton from "@shared/ui/Button/CustomButton";
import { useAuth } from "@entities/auth/hooks/useAuth";
import PushNotificationService from "@shared/services/PushNotificationService";
import { GlobalAlert } from '@shared/ui/CustomAlert';

export const ProfileInfo = ({ onProductPress }) => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const isLoading = useSelector(selectProfileLoading);
    const profileError = useSelector(selectProfileError);
    const profile = useSelector(selectProfile);

    // Используем хук useAuth для получения данных авторизации
    const { isAuthenticated, currentUser, logout } = useAuth();

    // Получаем токены отдельно
    const tokens = useSelector(state => state.auth.tokens);

    const [activeButtonId, setActiveButtonId] = useState(null);

    const {
        activeItemId,
        setActiveItemId,
        navigateToLogin,
        menuItems,
    } = useProfileInfo(isAuthenticated, tokens, currentUser, navigation);

    // Мемоизируем проверки ролей
    const roleChecks = useMemo(() => ({
        isAdmin: currentUser?.role === 'ADMIN',
        isEmployee: currentUser?.role === 'EMPLOYEE',
        isSupplier: currentUser?.role === 'SUPPLIER',
        isDriver: currentUser?.role === 'DRIVER',
        isClient: currentUser?.role === 'CLIENT'
    }), [currentUser?.role]);

    const handleMenuItemPress = (itemId, callback) => {
        setActiveItemId(itemId);
        setTimeout(() => {
            setActiveItemId(null);
            callback();
        }, 150);
    };

    const handleJoinTeamPress = () => {
        navigation.navigate('JoinTeam');
    };

    const handleLogoutPress = async () => {
        try {
            console.log('🚪 Выполняем выход из системы...');

            // Деактивируем OneSignal токен перед выходом
            const deactivationResult = await PushNotificationService.clearUserContext();
            
            if (deactivationResult?.success) {
                console.log('✅ OneSignal токен успешно деактивирован при выходе');
            } else {
                console.warn('⚠️ Не удалось деактивировать OneSignal токен:', deactivationResult?.error?.message);
                // Показываем предупреждение, но не блокируем выход
                GlobalAlert.show(
                    'Предупреждение',
                    'Не удалось полностью отключить push-уведомления. Вы можете продолжить выход, но уведомления могут приходить до следующего входа.',
                    [
                        {
                            text: 'Отмена',
                            style: 'cancel'
                        },
                        {
                            text: 'Выйти всё равно',
                            onPress: () => proceedWithLogout()
                        }
                    ]
                );
                return; // Ждем решения пользователя
            }

            // Если деактивация успешна, продолжаем выход
            proceedWithLogout();

        } catch (error) {
            console.error('❌ Необработанная ошибка при выходе:', error);
            GlobalAlert.showError('Ошибка', 'Произошла неизвестная ошибка при выходе из системы.');
        }
    };

    const proceedWithLogout = () => {
        console.log('🚪 Начинаем процесс выхода из аккаунта');

        // Небольшая задержка для стабилизации состояния перед сбросом
        setTimeout(() => {
            // Затем выполняем стандартный выход
            dispatch({ type: 'RESET_APP_STATE' });
            console.log('🔄 RESET_APP_STATE отправлен');

            logout().then(() => {
                console.log('✅ Выход выполнен, переходим на экран авторизации');

                // После выхода переходим на экран авторизации
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Auth' }],
                });
                console.log('🧭 Навигация сброшена на экран Auth');
            }).catch(error => {
                console.error('❌ Ошибка при выходе:', error);
                GlobalAlert.showError('Ошибка', 'Не удалось выйти из системы. Попробуйте еще раз.');
            });
        }, 300); // Уменьшил задержку до 300ms
    };



    const handleProductSuccess = (product) => {
        console.log('Продукт добавлен:', product);
        if (onProductPress && product?.id) {
            // Небольшая задержка чтобы продукт успел попасть в кэш и базу данных
            setTimeout(() => {
                onProductPress(product.id);
            }, 500);
        }
    };

    const handleManageProducts = () => {
        // Переход к управлению продуктами в ProfileStack
        navigation.navigate('ProductManagement', {
            fromScreen: 'Profile',
            returnTo: 'Profile'
        });
    };

    const handleViewStagnantProducts = () => {
        // Переход к экрану залежавшихся товаров
        navigation.navigate('StagnantProducts');
    };

    const handleRetryProfileLoad = async () => {
        try {
            dispatch(clearError());
            await dispatch(fetchProfile()).unwrap();
        } catch (error) {
            const message = typeof error === 'string'
                ? error
                : error?.message || 'Не удалось повторно загрузить профиль';
            GlobalAlert.showError('Ошибка', message);
        }
    };

    const handleProfileRecovery = async () => {
        try {
            dispatch(clearError());
            dispatch(clearProfile());
            await dispatch(fetchProfile()).unwrap();
        } catch (error) {
            const message = typeof error === 'string'
                ? error
                : error?.message || 'Не удалось восстановить профиль';
            GlobalAlert.show(
                'Проблема не устранена',
                `${message}. Вы можете выйти из аккаунта и войти снова.`,
                [
                    { text: 'ОК' },
                    { text: 'Выйти', onPress: handleLogoutPress }
                ]
            );
        }
    };

    // Проверка на авторизацию и наличие токена
    if (!isAuthenticated || !tokens?.accessToken) {
        return (
            <View style={styles.centered}>
                <TouchableOpacity onPress={navigateToLogin}>
                    <Text style={styles.loginMessage}>
                        Для просмотра профиля необходимо <Text style={styles.loginLink}>войти в аккаунт</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Загрузка профиля...</Text>
            </View>
        );
    }

    const isAdminProfileError = profileError &&
        roleChecks.isAdmin &&
        profileError.includes('Профиль admin не найден');

    const hasCriticalProfileError = profileError && !isAdminProfileError;
    const lowerProfileError = (profileError || '').toLowerCase();
    const isEmailValidationError =
        lowerProfileError.includes('email') ||
        lowerProfileError.includes('почт');
    const isProfileUnavailable = hasCriticalProfileError && !profile;

    return (
        <View style={styles.container}>
            {hasCriticalProfileError && (
                <View style={styles.recoveryCard}>
                    <Text style={styles.recoveryTitle}>Профиль временно недоступен</Text>
                    <Text style={styles.recoveryText}>{profileError}</Text>
                    {isEmailValidationError && (
                        <Text style={styles.recoveryHint}>
                            Обнаружена ошибка email. Попробуйте восстановление профиля или выйдите из аккаунта и войдите снова.
                        </Text>
                    )}

                    <View style={styles.recoveryButtons}>
                        <CustomButton
                            title="Повторить загрузку"
                            onPress={handleRetryProfileLoad}
                            outlined={false}
                            color="#007AFF"
                            activeColor="#FFFFFF"
                            height={40}
                            style={styles.recoveryButtonStyle}
                            textStyle={styles.recoveryButtonTextStyle}
                        />
                        <CustomButton
                            title="Восстановить профиль"
                            onPress={handleProfileRecovery}
                            outlined={true}
                            color={Color.orange}
                            activeColor="#FFFFFF"
                            height={40}
                            style={styles.recoveryButtonStyle}
                            textStyle={styles.recoveryButtonTextStyle}
                        />
                        <CustomButton
                            title="Выйти из аккаунта"
                            onPress={handleLogoutPress}
                            outlined={false}
                            color={Color.red}
                            activeColor="#FFFFFF"
                            height={40}
                            style={styles.recoveryButtonStyle}
                            textStyle={styles.recoveryButtonTextStyle}
                        />
                    </View>
                </View>
            )}

            {isProfileUnavailable && (
                <View style={styles.recoveryNotice}>
                    <Text style={styles.recoveryNoticeText}>
                        Основные функции профиля могут работать с ограничениями до восстановления данных.
                    </Text>
                </View>
            )}

            <View style={styles.menuContainer}>
                {menuItems.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[
                            styles.menuItem,
                            activeItemId === item.id && styles.activeMenuItem
                        ]}
                        onPress={() => handleMenuItemPress(item.id, item.onPress)}
                    >
                        <View style={styles.menuItemIcon}>
                            {React.isValidElement(item.icon)
                                ? React.cloneElement(item.icon, {
                                    color: activeItemId === item.id ? '#fff' : undefined
                                })
                                : item.icon
                            }
                        </View>
                        <View style={styles.menuItemTextContainer}>
                            <Text style={[
                                styles.menuItemText,
                                activeItemId === item.id && styles.activeMenuItemText
                            ]}>
                                {item.title}
                            </Text>
                            {item.badgeCount > 0 && (
                                <View style={styles.menuBadge}>
                                    <Text style={styles.menuBadgeText}>
                                        {item.badgeCount > 99 ? '99+' : String(item.badgeCount)}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <IconRight color={activeItemId === item.id ? '#fff' : undefined} />
                    </TouchableOpacity>
                ))}
            </View>

            {/* Кнопки для разных ролей */}
            {roleChecks.isClient && (
                <View style={styles.buttonContainer}>
                    <CustomButton
                        title="Стать частью команды"
                        icon={<JoinTeamIcon />}
                        onPress={handleJoinTeamPress}
                        outlined={true}
                        color={Color.blue2}
                    />
                </View>
            )}

            {roleChecks.isSupplier && (
                <View style={styles.buttonContainer}>
                    <CustomButton
                        title="Добавить товар"
                        onPress={() => navigation.navigate('AddProduct', {
                            onSuccess: handleProductSuccess
                        })}
                        outlined={true}
                        color={Color.blue2}
                        activeColor="#FFFFFF"
                        style={styles.buttonMargin}
                    />
                    <CustomButton
                        title="Управление товарами"
                        onPress={handleManageProducts}
                        outlined={true}
                        color={Color.blue2}
                        activeColor="#FFFFFF"
                        style={styles.buttonMargin}
                    />
                    <CustomButton
                        title="Просмотр залежавшихся товаров"
                        onPress={handleViewStagnantProducts}
                        outlined={true}
                        color={Color.orange}
                        activeColor="#FFFFFF"
                    />
                </View>
            )}

            {roleChecks.isDriver && (
                <View style={styles.buttonContainer}>
                    <CustomButton
                        title="Добавить остановку"
                        onPress={() => navigation.navigate('AddStop')}
                        outlined={true}
                        color={Color.blue2}
                        style={styles.buttonMargin}
                    />
                    <CustomButton
                        title="Управление остановками"
                        onPress={() => navigation.navigate('StopsListScreen')}
                        outlined={true}
                        color={Color.blue2}
                    />
                </View>
            )}

            <View style={styles.logoutContainer}>
                <CustomButton
                    title="Выйти"
                    onPress={handleLogoutPress}
                    outlined={false}
                    color={Color.red}
                    activeColor="#FFFFFF"
                />
            </View>

        </View>
    );
};

const styles = StyleSheet.create({
    // Существующие стили
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(20),
    },
    menuContainer: {
        marginTop: normalize(16),
        marginHorizontal: normalize(20),
        borderColor: '#E5E5E5',
        borderBottomWidth: 0.5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: normalize(15),
        borderColor: '#E5E5E5',
        borderBottomWidth: 0.5,
        backgroundColor: '#FFFFFF',
        position: 'relative',
        paddingHorizontal: normalize(10),
    },
    menuItemIcon: {
        width: normalize(24),
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuItemTextContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: normalize(15),
    },
    menuItemText: {
        fontSize: normalizeFont(16),
        color: '#222222',
        fontFamily: FontFamily.sFProText,
    },
    menuBadge: {
        backgroundColor: '#FF3B30',
        borderRadius: normalize(10),
        minWidth: normalize(20),
        height: normalize(20),
        paddingHorizontal: normalize(6),
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: normalize(8),
    },
    menuBadgeText: {
        color: '#fff',
        fontSize: normalizeFont(11),
        fontWeight: '700',
        textAlign: 'center',
    },
    activeMenuItem: {
        backgroundColor: Color.blue2,
        width: '100%',
        paddingHorizontal: normalize(10),
    },
    activeMenuItemText: {
        color: '#fff',
    },
    buttonContainer: {
        marginTop: normalize(20),
        marginHorizontal: normalize(15),
        marginBottom: normalize(15),
    },
    buttonMargin: {
        marginBottom: normalize(10),
    },
    logoutContainer: {
        margin: normalize(15),
        marginTop: normalize(50),
        marginBottom: normalize(30),
    },
    loginMessage: {
        fontSize: normalizeFont(16),
        textAlign: 'center',
        color: '#666',
    },
    loginLink: {
        color: '#007AFF',
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    loadingText: {
        fontSize: normalizeFont(14),
        color: '#666',
        marginTop: normalize(10),
    },
    error: {
        color: 'red',
        fontSize: normalizeFont(16),
        textAlign: 'center',
        marginBottom: normalize(20),
    },
    recoveryCard: {
        marginTop: normalize(16),
        marginHorizontal: normalize(15),
        borderRadius: normalize(12),
        padding: normalize(14),
        borderWidth: 1,
        borderColor: '#FFD6D6',
        backgroundColor: '#FFF5F5',
    },
    recoveryTitle: {
        fontSize: normalizeFont(16),
        fontWeight: '700',
        color: '#B42318',
        marginBottom: normalize(6),
    },
    recoveryText: {
        fontSize: normalizeFont(13),
        color: '#7A2E2E',
        lineHeight: normalize(18),
    },
    recoveryHint: {
        marginTop: normalize(8),
        fontSize: normalizeFont(12),
        color: '#5E5E5E',
        lineHeight: normalize(17),
    },
    recoveryButtons: {
        marginTop: normalize(10),
        gap: normalize(8),
    },
    recoveryButtonStyle: {
        width: '100%',
    },
    recoveryButtonTextStyle: {
        fontSize: normalizeFont(14),
    },
    recoveryNotice: {
        marginHorizontal: normalize(15),
        marginTop: normalize(10),
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(10),
        borderRadius: normalize(10),
        backgroundColor: '#F3F6FF',
    },
    recoveryNoticeText: {
        color: '#445372',
        fontSize: normalizeFont(12),
        lineHeight: normalize(16),
    },
});
