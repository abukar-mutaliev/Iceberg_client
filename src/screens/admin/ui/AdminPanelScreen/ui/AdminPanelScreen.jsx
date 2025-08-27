import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import IconAdmin from '@shared/ui/Icon/IconAdmin';
import CustomButton from '@shared/ui/Button/CustomButton';

import { useAuth } from "@entities/auth/hooks/useAuth";
import { AdminHeader } from "@widgets/admin/AdminHeader";
import { AdminMenuItem } from "@widgets/admin/AdminMenuItem";
import { AddProductModal } from "@widgets/product/AddProductModal";
import IconCategory from "@shared/ui/Icon/CategoriesManagement/IconCategory";
import IconProducts from "@shared/ui/Icon/Profile/IconProducts";
import IconDelivery from "@shared/ui/Icon/Profile/IconDelivery";
import IconUser from "@shared/ui/Icon/Profile/IconPersona";
import IconDistrict from "@shared/ui/Icon/DistrictManagement/IconDistrict";
import IconSettings from "@shared/ui/Icon/Profile/IconSettings";

const AdminSection = ({ title, children }) => {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionContent}>
                {children}
            </View>
        </View>
    );
};

// Основной компонент экрана админ-панели
export const AdminPanelScreen = () => {
    const navigation = useNavigation();
    const { currentUser, hasPermission } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // Состояние для модальных окон
    const [isAddProductModalVisible, setAddProductModalVisible] = useState(false);

    // Проверка прав доступа - разрешаем доступ администраторам и сотрудникам
    useEffect(() => {
        // Проверяем, является ли пользователь администратором или сотрудником
        const isAdmin = currentUser?.role === 'ADMIN';
        const isEmployee = currentUser?.role === 'EMPLOYEE';

        // Если пользователь не администратор и не сотрудник, и не имеет права доступа - перенаправляем назад
        if (!isAdmin && !isEmployee && !hasPermission('access:admin')) {
            navigation.goBack();
        }
    }, [currentUser, hasPermission, navigation]);

    const handleProductManagementPress = useCallback(() => {
        console.log('AdminPanel: Переход к управлению продуктами');
        // Теперь навигация происходит внутри AdminStack
        navigation.navigate('ProductManagement', {
            fromScreen: 'AdminPanel',
            returnTo: 'AdminPanel'
        });
    }, [navigation]);

    const handleCategoriesManagementPress = useCallback(() => {
        console.log('AdminPanel: Переход к управлению категориями');
        // Теперь навигация происходит внутри AdminStack
        navigation.navigate('CategoriesManagement', {
            fromScreen: 'AdminPanel',
            returnTo: 'AdminPanel'
        });
    }, [navigation]);

    const handleDistrictsManagementPress = useCallback(() => {
        // Теперь навигация происходит внутри AdminStack
        navigation.navigate('DistrictsManagement');
    }, [navigation]);

    const handleAddDistrictPress = useCallback(() => {
        // Теперь навигация происходит внутри AdminStack
        navigation.navigate('DistrictsManagement', { openAddModal: true });
    }, [navigation]);

    const handleStopsListPress = useCallback(() => {
        // Переходим к StopsListScreen в корневом стеке
        navigation.getParent()?.navigate('StopsListScreen') || navigation.navigate('StopsListScreen');
    }, [navigation]);

    const handleAddStopPress = useCallback(() => {
        // Переходим к AddStop в корневом стеке
        navigation.getParent()?.navigate('AddStop') || navigation.navigate('AddStop');
    }, [navigation]);

    const handleUsersManagementPress = useCallback(() => {
        // Теперь навигация происходит внутри AdminStack
        navigation.navigate('UsersManagement');
    }, [navigation]);

    const handleUserAddPress = useCallback(() => {
        // Теперь навигация происходит внутри AdminStack
        navigation.navigate('UserAdd');
    }, [navigation]);

    const handleStaffOrdersPress = useCallback(() => {
        // Переходим к экрану управления заказами
        // Пока используем заглушку, в будущем можно добавить реальный экран
        console.log('AdminPanel: Переход к управлению заказами');
        // TODO: Добавить навигацию к экрану управления заказами
        // navigation.navigate('OrdersManagement');
    }, [navigation]);

    const handleEmployeeManagementPress = useCallback(() => {
        console.log('AdminPanel: Переход к управлению сотрудниками');
        navigation.navigate('EmployeeManagement');
    }, [navigation]);

    const handleRewardsStatisticsPress = useCallback(() => {
        console.log('AdminPanel: Переход к статистике вознаграждений');
        navigation.navigate('EmployeeRewards', {
            fromScreen: 'AdminPanel',
            viewMode: 'statistics'
        });
    }, [navigation]);

    const handleRewardSettingsPress = useCallback(() => {
        console.log('AdminPanel: Переход к настройкам вознаграждений');
        navigation.navigate('RewardSettings');
    }, [navigation]);

    const handleOrderNotificationTestPress = useCallback(() => {
        console.log('AdminPanel: Переход к тестированию уведомлений заказов');
        navigation.navigate('OrderNotificationTest');
    }, [navigation]);

    const handleProductSuccess = useCallback((product) => {
        // После успешного добавления продукта остаемся в админ панели
        console.log('Продукт добавлен:', product);
        // Можно дополнительно показать уведомление или обновить данные
    }, []);

    const handleGoBack = useCallback(() => {
        // Возвращаемся к профилю через корневой навигатор
        navigation.getParent().navigate('Main', {
            screen: 'ProfileTab',
            params: { screen: 'ProfileMain' }
        });
    }, [navigation]);

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Color.blue2} />
            </View>
        );
    }

    const isAdmin = currentUser?.role === 'ADMIN';
    const isEmployee = currentUser?.role === 'EMPLOYEE';

    const panelTitle = isAdmin
        ? "Панель Администратора"
        : (isEmployee ? "Панель Сотрудника" : "Панель Управления");

    return (
        <SafeAreaView style={styles.container}>
            <AdminHeader
                title={panelTitle}
                icon={<IconAdmin width={24} height={24} color={Color.blue2} />}
            />

            <ScrollView style={styles.scrollView}>
                {/* Добавляем новый раздел для управления категориями */}
                <AdminSection title="Управление категориями">
                    <AdminMenuItem
                        icon={<IconCategory color={Color.blue2} />}
                        title="Список категорий"
                        onPress={handleCategoriesManagementPress}
                    />
                </AdminSection>

                {/* Новый раздел для управления районами */}
                <AdminSection title="Управление районами">
                    <AdminMenuItem
                        icon={<IconDistrict color={Color.blue2} />}
                        title="Список районов"
                        onPress={handleDistrictsManagementPress}
                    />
                    <AdminMenuItem
                        icon={<IconDistrict color={Color.blue2} />}
                        title="Добавить район"
                        onPress={handleAddDistrictPress}
                    />
                </AdminSection>

                {/* Раздел для управления вознаграждениями - только для администраторов */}
                {isAdmin && (
                    <AdminSection title="Управление вознаграждениями">
                        <AdminMenuItem
                            icon={<IconUser color={Color.blue2} />}
                            title="Статистика вознаграждений"
                            onPress={handleRewardsStatisticsPress}
                        />
                        <AdminMenuItem
                            icon={<IconSettings color={Color.blue2} />}
                            title="Настройки вознаграждений"
                            onPress={handleRewardSettingsPress}
                        />
                    </AdminSection>
                )}

                {/* ИСПРАВЛЕННАЯ секция управления продуктами */}
                <AdminSection title="Управление продуктами">
                    <AdminMenuItem
                        icon={<IconProducts color={Color.blue2} />}
                        title="Добавить продукт"
                        onPress={() => setAddProductModalVisible(true)}
                    />
                    <AdminMenuItem
                        icon={<IconProducts color={Color.blue2} />}
                        title="Список продуктов"
                        onPress={handleProductManagementPress}
                    />
                </AdminSection>

                <AdminSection title="Управление остановками">
                    <AdminMenuItem
                        icon={<IconDelivery color={Color.blue2} />}
                        title="Добавить остановку"
                        onPress={handleAddStopPress}
                    />
                    <AdminMenuItem
                        icon={<IconDelivery color={Color.blue2} />}
                        title="Список остановок"
                        onPress={handleStopsListPress}
                    />
                </AdminSection>

                {/* Раздел для тестирования уведомлений - только для администраторов */}
                {isAdmin && (
                    <AdminSection title="Уведомления и тестирование">
                        <AdminMenuItem
                            icon={<IconSettings color={Color.blue2} />}
                            title="Тест уведомлений заказов"
                            onPress={handleOrderNotificationTestPress}
                        />
                    </AdminSection>
                )}

                {/* Управление сотрудниками - показываем только администраторам */}
                {isAdmin && (
                    <AdminSection title="Управление сотрудниками">
                        <AdminMenuItem
                            icon={<IconUser color={Color.blue2} />}
                            title="Районы сотрудников"
                            onPress={handleEmployeeManagementPress}
                        />
                    </AdminSection>
                )}

                {/* Секцию управления пользователями показываем только администраторам */}
                {isAdmin && (
                    <AdminSection title="Управление пользователями">
                        <AdminMenuItem
                            icon={<IconUser color={Color.blue2} />}
                            title="Список пользователей"
                            onPress={handleUsersManagementPress}
                        />
                        <AdminMenuItem
                            icon={<IconUser color={Color.blue2} />}
                            title="Добавить пользователя"
                            onPress={handleUserAddPress}
                        />
                        {/* Управление должностями - только для суперадминов */}
                        {currentUser?.profile?.isSuperAdmin && (
                            <AdminMenuItem
                                icon={<IconSettings color={Color.orange} />}
                                title="Должности сотрудников"
                                onPress={() => navigation.navigate('ProcessingRolesScreen')}
                            />
                        )}
                    </AdminSection>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <CustomButton
                    title="Вернуться в профиль"
                    onPress={handleGoBack}
                    outlined={true}
                    color={Color.blue2}
                    activeColor="#FFFFFF"
                />
            </View>

            {/* Модальное окно добавления продукта */}
            <AddProductModal
                visible={isAddProductModalVisible}
                onClose={() => setAddProductModalVisible(false)}
                onSuccess={handleProductSuccess}
            />
        </SafeAreaView>
    );
};

// Стили остаются прежними
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(20),
    },
    scrollView: {
        flex: 1,
    },
    section: {
        marginTop: normalize(16),
        marginHorizontal: normalize(20),
        marginBottom: normalize(8),
    },
    sectionTitle: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.grey7D7D7D,
        marginBottom: normalize(8),
    },
    sectionContent: {
        borderRadius: Border.radius.large,
        backgroundColor: Color.colorLightMode,
        ...Shadow.light,
        overflow: 'hidden',
    },
    footer: {
        padding: normalize(15),
        borderTopWidth: 0.5,
        borderTopColor: Color.border,
        backgroundColor: Color.colorLightMode,
    },
    loadingText: {
        fontSize: normalizeFont(14),
        color: Color.textSecondary,
        marginTop: normalize(10),
    },
});