import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import IconAdmin from '@shared/ui/Icon/IconAdmin';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAuth } from "@entities/auth/hooks/useAuth";
import { AdminHeader } from "@widgets/admin/AdminHeader";
import { AdminMenuItem } from "@widgets/admin/AdminMenuItem";
import { navigationRef } from "@shared/utils/NavigationRef";
import IconCategory from "@shared/ui/Icon/CategoriesManagement/IconCategory";
import IconProducts from "@shared/ui/Icon/Profile/IconProducts";
import IconDelivery from "@shared/ui/Icon/Profile/IconDelivery";
import IconUser from "@shared/ui/Icon/Profile/IconPersona";
import IconDistrict from "@shared/ui/Icon/DistrictManagement/IconDistrict";
import IconSettings from "@shared/ui/Icon/Profile/IconSettings";
import IconWarehouse from "@shared/ui/Icon/Warehouse/IconWarehouse";
import { IconAdd } from "@shared/ui/Icon/ProductManagement";
import AddUserIcon from "@shared/ui/Icon/AddUserIcon";
import { adminApi } from "@entities/admin/api/adminApi";
import productsApi from "@entities/product/api/productsApi";

const AdminSection = ({ title, children, styles }) => {
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
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    // Цвет иконок пунктов меню в зависимости от темы
    const iconBlue = isDark ? colors.primary : Color.blue2;
    const iconOrange = isDark ? colors.warning : Color.orange;
    const [isLoading, setIsLoading] = useState(false);
    const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);
    const [pendingModerationCount, setPendingModerationCount] = useState(0);
    const isAdmin = currentUser?.role === 'ADMIN';
    const isEmployee = currentUser?.role === 'EMPLOYEE';
    const isSuperAdmin = currentUser?.admin?.isSuperAdmin || false;


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
        console.log('AdminPanel: Navigating to AddStop');
        // Переходим к AddStop в корневом стеке через navigationRef
        try {
            if (navigationRef.isReady()) {
                console.log('AdminPanel: Using navigationRef to navigate to AddStop');
                navigationRef.navigate('AddStop', {
                    fromScreen: 'AdminPanel'
                });
            } else {
                console.warn('AdminPanel: navigationRef is not ready, trying fallback navigation');
                // Fallback через обычную навигацию - поднимаемся на уровень выше
                const parent = navigation.getParent();
                if (parent) {
                    console.log('AdminPanel: Using parent navigator');
                    parent.navigate('AddStop', {
                        fromScreen: 'AdminPanel'
                    });
                } else {
                    console.log('AdminPanel: No parent navigator, trying direct navigation');
                    navigation.navigate('AddStop', {
                        fromScreen: 'AdminPanel'
                    });
                }
            }
        } catch (error) {
            console.error('AdminPanel: Error navigating to AddStop:', error);
            // Последняя попытка через CommonActions
            try {
                const { CommonActions } = require('@react-navigation/native');
                navigation.dispatch(
                    CommonActions.navigate({
                        name: 'AddStop',
                        params: {
                            fromScreen: 'AdminPanel'
                        }
                    })
                );
            } catch (dispatchError) {
                console.error('AdminPanel: CommonActions navigation also failed:', dispatchError);
            }
        }
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
        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }

        const parentNavigation = navigation.getParent();
        if (parentNavigation?.canGoBack()) {
            parentNavigation.goBack();
            return;
        }

        // Fallback только если стек пуст (например, прямой вход на экран)
        parentNavigation?.navigate('Main', {
            screen: 'ProfileTab',
            params: { screen: 'ProfileMain' }
        });
    }, [navigation]);

    const loadPendingApplicationsCount = useCallback(async () => {
        if (!isSuperAdmin) {
            setPendingApplicationsCount(0);
            return;
        }

        try {
            const statsRes = await adminApi.getStaffApplicationsStatistics();
            const stats =
                statsRes?.data?.data
                || statsRes?.data
                || statsRes
                || {};
            const pendingCount = Number(stats?.pending || 0);
            setPendingApplicationsCount(Number.isFinite(pendingCount) ? pendingCount : 0);
        } catch (error) {
            console.error('AdminPanel: Ошибка загрузки статистики заявок:', error);
            setPendingApplicationsCount(0);
        }
    }, [isSuperAdmin]);

    const extractProductsAndPagination = (response) => {
        const products = Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
                ? response
                : [];

        const pagination = response?.pagination || null;

        return { products, pagination };
    };

    const loadPendingModerationCount = useCallback(async () => {
        if (!isAdmin) {
            setPendingModerationCount(0);
            return;
        }

        try {
            let page = 1;
            const limit = 100;
            let hasMore = true;
            let safetyCounter = 0;
            let totalPending = 0;

            while (hasMore && safetyCounter < 30) {
                const response = await productsApi.getProducts({ page, limit });
                const { products, pagination } = extractProductsAndPagination(response);

                totalPending += products.filter(
                    (product) => product?.moderationStatus === 'PENDING'
                ).length;

                const byHasMore = pagination?.hasMore === true;
                const byTotalPages = pagination?.totalPages
                    ? page < pagination.totalPages
                    : false;

                hasMore = (byHasMore || byTotalPages) && products.length > 0;
                page += 1;
                safetyCounter += 1;
            }

            setPendingModerationCount(totalPending);
        } catch (error) {
            console.error('AdminPanel: Ошибка загрузки очереди модерации:', error);
            setPendingModerationCount(0);
        }
    }, [isAdmin]);

    useFocusEffect(
        useCallback(() => {
            loadPendingApplicationsCount();
            loadPendingModerationCount();
        }, [loadPendingApplicationsCount, loadPendingModerationCount])
    );

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={iconBlue} />
            </View>
        );
    }

    const processingRole = currentUser?.employee?.processingRole;
    const restrictedRoles = ['PICKER', 'COURIER'];
    const canViewStockAlerts = isAdmin || (isEmployee && !restrictedRoles.includes(processingRole));

    const panelTitle = isAdmin
        ? "Панель Администратора"
        : (isEmployee ? "Панель Сотрудника" : "Панель Управления");

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <AdminHeader
                title={panelTitle}
                icon={<IconAdmin width={24} height={24} color={iconBlue} />}
                onBackPress={handleGoBack}
                showBackButton={true}
            />

            <ScrollView style={styles.scrollView}>
                
                {/* Управление складами - объединенная секция на первом месте */}
                <AdminSection title="Управление складами" styles={styles}>
                    <AdminMenuItem
                        icon={<IconDistrict color={iconBlue} />}
                        title="Список районов и складов"
                        onPress={handleDistrictsManagementPress}
                    />
                    <AdminMenuItem
                        icon={<IconWarehouse width={24} height={24} color={iconBlue} />}
                        title="Статистика складов"
                        onPress={() => navigation.navigate('WarehouseList', {
                            fromScreen: 'AdminPanel'
                        })}
                    />
                </AdminSection>

                {/* Раздел для управления вознаграждениями - только для суперадминистраторов */}
                {isSuperAdmin && (
                    <AdminSection title="Управление вознаграждениями" styles={styles}>
                        <AdminMenuItem
                            icon={<IconUser color={iconBlue} />}
                            title="Статистика вознаграждений"
                            onPress={handleRewardsStatisticsPress}
                        />
                        <AdminMenuItem
                            icon={<IconSettings color={iconBlue} />}
                            title="Настройки вознаграждений"
                            onPress={handleRewardSettingsPress}
                        />
                    </AdminSection>
                )}

                {/*Управления товарами */}
                <AdminSection title="Управление товарами" styles={styles}>
                    <AdminMenuItem
                        icon={<IconAdd width={24} height={24} color={iconBlue} />}
                        title="Добавить товар"
                        onPress={() => navigation.navigate('AddProduct', {
                            onSuccess: handleProductSuccess
                        })}
                    />
                    <AdminMenuItem
                        icon={<IconProducts color={iconBlue} />}
                        title="Список товаров"
                        onPress={handleProductManagementPress}
                    />
                    {isAdmin && (
                        <AdminMenuItem
                            icon={<Icon name="gavel" size={24} color={iconOrange} />}
                            title="Очередь модерации"
                            badgeCount={pendingModerationCount}
                            onPress={() => navigation.navigate('ProductModerationQueue', {
                                fromScreen: 'AdminPanel',
                                moderationOnly: true
                            })}
                        />
                    )}
                    {canViewStockAlerts && (
                        <AdminMenuItem
                            icon={<Icon name="inventory" size={24} color={iconBlue} />}
                            title="Остатки товаров"
                            onPress={() => navigation.navigate('StockAlerts', {
                                fromScreen: 'AdminPanel'
                            })}
                        />
                    )}
                </AdminSection>

                {/* Управление возвратами товаров - показываем всем (ADMIN, EMPLOYEE) */}
                <AdminSection title="Возвраты товаров" styles={styles}>
                    <AdminMenuItem
                        icon={<IconProducts color={iconOrange} />}
                        title="Залежавшиеся товары"
                        onPress={handleStagnantProductsPress}
                    />
                    <AdminMenuItem
                        icon={<IconDelivery color={iconBlue} />}
                        title="Список возвратов"
                        onPress={handleProductReturnsPress}
                    />
                </AdminSection>

                <AdminSection title="Управление остановками" styles={styles}>
                    <AdminMenuItem
                        icon={<IconDelivery color={iconBlue} />}
                        title="Добавить остановку"
                        onPress={handleAddStopPress}
                    />
                    <AdminMenuItem
                        icon={<IconDelivery color={iconBlue} />}
                        title="Список остановок"
                        onPress={handleStopsListPress}
                    />
                </AdminSection>

                {/* Секцию управления пользователями показываем только суперадминистраторам */}
                {isSuperAdmin && (
                    <AdminSection title="Управление пользователями" styles={styles}>
                        <AdminMenuItem
                            icon={<IconUser color={iconBlue} />}
                            title="Пользователи и права"
                            onPress={handleUsersManagementPress}
                        />
                        <AdminMenuItem
                            icon={<AddUserIcon width={24} height={24} color={iconBlue} />}
                            title="Добавить пользователя"
                            onPress={handleUserAddPress}
                        />
                        <AdminMenuItem
                            icon={<IconDistrict color={iconBlue} />}
                            title="Районы и склады сотрудников"
                            onPress={handleEmployeeManagementPress}
                        />
                        <AdminMenuItem
                            icon={<IconDelivery color={iconBlue} />}
                            title="Районы и склады водителей"
                            onPress={handleDriverManagementPress}
                        />
                        {/* Управление заявками на присоединение - только для суперадминов */}
                        {isSuperAdmin && (
                            <AdminMenuItem
                                icon={<IconUser color={iconOrange} />}
                                title="Заявки на присоединение"
                                badgeCount={pendingApplicationsCount}
                                onPress={() => navigation.navigate('StaffApplications')}
                            />
                        )}
                        {/* Управление должностями - только для суперадминов */}
                        {isSuperAdmin && (
                            <AdminMenuItem
                                icon={<IconSettings color={iconOrange} />}
                                title="Должности сотрудников"
                                onPress={() => navigation.navigate('ProcessingRolesScreen')}
                            />
                        )}
                    </AdminSection>
                )}

                {/* Раздел для управления категориями */}
                <AdminSection title="Управление категориями" styles={styles}>
                    <AdminMenuItem
                        icon={<IconCategory color={iconBlue} />}
                        title="Список категорий"
                        onPress={handleCategoriesManagementPress}
                    />
                </AdminSection>
            </ScrollView>

        </SafeAreaView>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDark ? colors.background : Color.colorLightMode,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(20),
        backgroundColor: isDark ? colors.background : Color.colorLightMode,
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
        color: isDark ? colors.textSecondary : Color.grey7D7D7D,
        marginBottom: normalize(8),
    },
    sectionContent: {
        borderRadius: Border.radius.large,
        backgroundColor: isDark ? colors.cardBackground : Color.colorLightMode,
        ...(isDark ? {} : Shadow.light),
        overflow: 'hidden',
        ...(isDark ? { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.divider } : {}),
    },
    loadingText: {
        fontSize: normalizeFont(14),
        color: isDark ? colors.textSecondary : Color.textSecondary,
        marginTop: normalize(10),
    },
});