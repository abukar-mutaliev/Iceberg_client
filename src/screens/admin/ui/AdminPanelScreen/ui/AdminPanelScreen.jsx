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
import IconCategory from "@shared/ui/Icon/CategoriesManagement/IconCategory";
import IconProducts from "@shared/ui/Icon/Profile/IconProducts";
import IconDelivery from "@shared/ui/Icon/Profile/IconDelivery";
import IconUser from "@shared/ui/Icon/Profile/IconPersona";
import IconDistrict from "@shared/ui/Icon/DistrictManagement/IconDistrict";
import IconSettings from "@shared/ui/Icon/Profile/IconSettings";
import IconWarehouse from "@shared/ui/Icon/Warehouse/IconWarehouse";
import { IconAdd } from "@shared/ui/Icon/ProductManagement";
import AddUserIcon from "@shared/ui/Icon/AddUserIcon";

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


    // Проверка прав доступа - разрешаем доступ администраторам и сотрудникам
    useEffect(() => {
        const isAdmin = currentUser?.role === 'ADMIN';
        const isEmployee = currentUser?.role === 'EMPLOYEE';

        if (!isAdmin && !isEmployee && !hasPermission('access:admin')) {
            navigation.goBack();
        }
    }, [currentUser, hasPermission, navigation]);

    const handleProductManagementPress = useCallback(() => {
        navigation.navigate('ProductManagement', {
            fromScreen: 'AdminPanel',
            returnTo: 'AdminPanel'
        });
    }, [navigation]);

    const handleCategoriesManagementPress = useCallback(() => {
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
        console.log('AdminPanel: Navigating to StopsListScreen with fromScreen=AdminPanel');
        // Переходим к StopsListScreen в MainStack с параметром возврата
        navigation.navigate('Main', {
            screen: 'MainTab',
            params: { 
                screen: 'StopsListScreen',
                params: {
                    fromScreen: 'AdminPanel'
                }
            }
        });
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

    }, [navigation]);

    const handleEmployeeManagementPress = useCallback(() => {
        navigation.navigate('EmployeeManagement');
    }, [navigation]);

    const handleDriverManagementPress = useCallback(() => {
        navigation.navigate('DriverManagement');
    }, [navigation]);

    const handleRewardsStatisticsPress = useCallback(() => {
        navigation.navigate('EmployeeRewards', {
            fromScreen: 'AdminPanel',
            viewMode: 'statistics'
        });
    }, [navigation]);

    const handleRewardSettingsPress = useCallback(() => {
        navigation.navigate('RewardSettings');
    }, [navigation]);

    // Обработчики для возвратов товаров
    const handleStagnantProductsPress = useCallback(() => {
        navigation.navigate('StagnantProducts');
    }, [navigation]);

    const handleProductReturnsPress = useCallback(() => {
        navigation.navigate('ProductReturns');
    }, [navigation]);


    const handleProductSuccess = useCallback((product) => {
        // После успешного добавления продукта переходим к его просмотру
        console.log('Продукт добавлен:', product);
        if (product?.id) {
            // Небольшая задержка чтобы продукт успел попасть в кэш и базу данных
            setTimeout(() => {
                navigation.navigate('AdminProductDetail', {
                    productId: product.id,
                    fromScreen: 'AdminPanel'
                });
            }, 500);
        }
    }, [navigation]);

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
                
                {/* Управление складами - объединенная секция на первом месте */}
                <AdminSection title="Управление складами">
                    <AdminMenuItem
                        icon={<IconDistrict color={Color.blue2} />}
                        title="Список районов и складов"
                        onPress={handleDistrictsManagementPress}
                    />
                    <AdminMenuItem
                        icon={<IconWarehouse width={24} height={24} color={Color.blue2} />}
                        title="Статистика складов"
                        onPress={() => navigation.navigate('WarehouseList', {
                            fromScreen: 'AdminPanel'
                        })}
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

                {/*Управления товарами */}
                <AdminSection title="Управление товарами">
                    <AdminMenuItem
                        icon={<IconAdd width={24} height={24} color={Color.blue2} />}
                        title="Добавить товар"
                        onPress={() => navigation.navigate('AddProduct', {
                            onSuccess: handleProductSuccess
                        })}
                    />
                    <AdminMenuItem
                        icon={<IconProducts color={Color.blue2} />}
                        title="Список товаров"
                        onPress={handleProductManagementPress}
                    />
                </AdminSection>

                {/* Управление возвратами товаров - показываем всем (ADMIN, EMPLOYEE) */}
                <AdminSection title="Возвраты товаров">
                    <AdminMenuItem
                        icon={<IconProducts color={Color.orange} />}
                        title="Залежавшиеся товары"
                        onPress={handleStagnantProductsPress}
                    />
                    <AdminMenuItem
                        icon={<IconDelivery color={Color.blue2} />}
                        title="Список возвратов"
                        onPress={handleProductReturnsPress}
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

                {/* Секцию управления пользователями показываем только администраторам */}
                {isAdmin && (
                    <AdminSection title="Управление пользователями">
                        <AdminMenuItem
                            icon={<IconUser color={Color.blue2} />}
                            title="Список пользователей"
                            onPress={handleUsersManagementPress}
                        />
                        <AdminMenuItem
                            icon={<AddUserIcon width={24} height={24} color={Color.blue2} />}
                            title="Добавить пользователя"
                            onPress={handleUserAddPress}
                        />
                        <AdminMenuItem
                            icon={<IconDistrict color={Color.blue2} />}
                            title="Районы и склады сотрудников"
                            onPress={handleEmployeeManagementPress}
                        />
                        <AdminMenuItem
                            icon={<IconDelivery color={Color.blue2} />}
                            title="Районы и склады водителей"
                            onPress={handleDriverManagementPress}
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

                {/* Раздел для управления категориями */}
                <AdminSection title="Управление категориями">
                    <AdminMenuItem
                        icon={<IconCategory color={Color.blue2} />}
                        title="Список категорий"
                        onPress={handleCategoriesManagementPress}
                    />
                </AdminSection>
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