import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {
    selectProfileLoading,
    selectProfileError,
    selectProfile
} from '@entities/profile';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { useProfileInfo } from "@features/profile/ui/ProfileInfo/model/useProfileInfo";
import { Color, FontFamily } from "@app/styles/GlobalStyles";
import IconRight from "@shared/ui/Icon/Profile/IconRight";
import JoinTeamIcon from "@shared/ui/Icon/Profile/JoinTeamIcon";
import CustomButton from "@shared/ui/Button/CustomButton";
import { AddProductModal } from "@widgets/product/AddProductModal";
import { useAuth } from "@entities/auth/hooks/useAuth";
// Импортируем только функцию тестирования авторизации
import { testAuth } from '@shared/api/api';

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

    const [isAddProductModalVisible, setAddProductModalVisible] = useState(false);
    const [activeButtonId, setActiveButtonId] = useState(null);
    // Упрощенные состояния для диагностики
    const [authTestResult, setAuthTestResult] = useState(null);
    const [isTestingAuth, setIsTestingAuth] = useState(false);
    const [lastTestTime, setLastTestTime] = useState(null);

    const {
        setRetryCount,
        activeItemId,
        setActiveItemId,
        handleLogout: logoutFromProfile,
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

    const handleLogoutPress = () => {
        try {
            console.log('Выполняем выход...');

            // Сначала отправляем действие для полного сброса состояния
            dispatch({ type: 'RESET_APP_STATE' });

            // Затем выполняем выход
            logout().then(() => {
                console.log('Выход выполнен, переходим на экран авторизации');

                // Сбрасываем стек навигации на экран авторизации
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Auth' }],
                });
            }).catch(error => {
                console.error('Ошибка при выходе:', error);
                Alert.alert('Ошибка', 'Не удалось выйти из системы. Попробуйте еще раз.');
            });
        } catch (error) {
            console.error('Необработанная ошибка при выходе:', error);
            Alert.alert('Ошибка', 'Произошла неизвестная ошибка при выходе из системы.');
        }
    };

    // Упрощенная функция для тестирования авторизации
    const handleTestAuth = async () => {
        try {
            setIsTestingAuth(true);
            setAuthTestResult(null);

            console.log('Запускаем диагностику авторизации...');
            const result = await testAuth();

            console.log('Результат диагностики:', result);
            setAuthTestResult(result);
            setLastTestTime(new Date());

        } catch (error) {
            console.error('Ошибка при тестировании авторизации:', error);
            Alert.alert('Ошибка диагностики', error.message || 'Не удалось выполнить проверку авторизации');
        } finally {
            setIsTestingAuth(false);
        }
    };

    const handleProductSuccess = (product) => {
        console.log('Продукт добавлен:', product);
        if (onProductPress) {
            onProductPress(product);
        }
    };

    const handleManageProducts = () => {
        // Используем глобальную навигацию к MainStack
        navigation.navigate('MainTab', {
            screen: 'ProductManagement',
            params: { fromScreen: 'Profile' }
        });
    };

    const handlePushNotificationTest = () => {
        navigation.navigate('PushNotificationTest');
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

    if (profileError && !isAdminProfileError) {
        return (
            <View style={styles.centered}>
                <Text style={styles.error}>{profileError}</Text>
                <CustomButton
                    title="Повторить"
                    onPress={() => setRetryCount((prev) => prev + 1)}
                    outlined={false}
                    color="#007AFF"
                    activeColor="#FFFFFF"
                    height={40}
                    style={styles.retryButtonStyle}
                    textStyle={styles.retryButtonTextStyle}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
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
                        <Text style={[
                            styles.menuItemText,
                            activeItemId === item.id && styles.activeMenuItemText
                        ]}>
                            {item.title}
                        </Text>
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
                        title="Добавить продукт"
                        onPress={() => setAddProductModalVisible(true)}
                        outlined={true}
                        color={Color.blue2}
                        activeColor="#FFFFFF"
                        style={styles.buttonMargin}
                    />
                    <CustomButton
                        title="Управление продуктами"
                        onPress={handleManageProducts}
                        outlined={true}
                        color={Color.blue2}
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
                        onPress={() => navigation.navigate('StopsList')}
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

            <AddProductModal
                visible={isAddProductModalVisible}
                onClose={() => setAddProductModalVisible(false)}
                onSuccess={handleProductSuccess}
            />
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
    menuItemText: {
        flex: 1,
        marginLeft: normalize(15),
        fontSize: normalizeFont(16),
        color: '#222222',
        fontFamily: FontFamily.sFProText,
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
    retryButtonStyle: {
        width: 'auto',
        paddingHorizontal: normalize(20),
    },
    retryButtonTextStyle: {
        fontSize: normalizeFont(14),
    },

    // Стили для секции диагностики
    debugContainer: {
        marginHorizontal: normalize(15),
        marginTop: normalize(10),
        marginBottom: normalize(10),
        paddingTop: normalize(10),
        paddingBottom: normalize(10),
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: '#E5E5E5',
    },
    debugButton: {
        backgroundColor: 'rgba(102, 102, 102, 0.1)',
    },
    testResultContainer: {
        marginTop: normalize(10),
        padding: normalize(10),
        backgroundColor: '#F5F5F5',
        borderRadius: normalize(8),
    },
    testResultTitle: {
        fontSize: normalizeFont(14),
        fontWeight: 'bold',
        marginBottom: normalize(5),
        color: '#333',
    },
    testResultItem: {
        fontSize: normalizeFont(12),
        marginVertical: normalize(2),
        color: '#666',
    },
    testResultValue: {
        fontWeight: 'bold',
    },
    validToken: {
        color: 'green',
    },
    invalidToken: {
        color: 'red',
    },
    testResultStatus: {
        fontSize: normalizeFont(13),
        marginTop: normalize(5),
        paddingTop: normalize(5),
        borderTopWidth: 0.5,
        borderTopColor: '#E0E0E0',
        fontWeight: 'bold',
        color: '#333',
    },
});
