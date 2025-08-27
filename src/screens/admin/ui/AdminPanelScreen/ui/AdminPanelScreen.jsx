// Файл: src/pages/admin/ui/AdminPanelScreen.js (или src/screens/admin/ui/AdminPanelScreen.js)

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import IconAdmin from '@shared/ui/Icon/IconAdmin';
import { useAuth } from '@entities/auth/model/useAuth';
import CustomButton from '@shared/ui/Button/CustomButton';

// Импорт виджетов админ-панели
import { AdminMenuSection } from '@widgets/admin/AdminMenuSection';
import { AdminMenuItem } from '@widgets/admin/AdminMenuItem';
import { AdminHeader } from '@widgets/admin/AdminHeader';

// Основной компонент экрана админ-панели
export const AdminPanelScreen = () => {
    const navigation = useNavigation();
    const { currentUser, hasPermission } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // Проверка прав доступа
    useEffect(() => {
        if (currentUser?.role !== 'ADMIN' && !hasPermission('access:admin')) {
            navigation.goBack();
        }
    }, [currentUser, hasPermission, navigation]);

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Color.blue2} />
                <Text style={styles.loadingText}>Загрузка...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <AdminHeader
                title="Панель Администратора"
                icon={<IconAdmin width={24} height={24} color={Color.blue2} />}
            />

            <ScrollView style={styles.scrollView}>
                <AdminMenuSection title="Управление продуктами">
                    <AdminMenuItem
                        icon={<IconCoupon color={Color.blue2} />}
                        title="Добавить продукт"
                        onPress={() => navigation.navigate('AddProduct')}
                    />
                    <AdminMenuItem
                        icon={<IconCoupon color={Color.blue2} />}
                        title="Список продуктов"
                        onPress={() => navigation.navigate('ProductList')}
                    />
                    <AdminMenuItem
                        icon={<IconCoupon color={Color.blue2} />}
                        title="Категории продуктов"
                        onPress={() => navigation.navigate('ProductCategories')}
                    />
                </AdminMenuSection>

                <AdminMenuSection title="Управление остановками">
                    <AdminMenuItem
                        icon={<IconSettings color={Color.blue2} />}
                        title="Добавить остановку"
                        onPress={() => navigation.navigate('AddStop')}
                    />
                    <AdminMenuItem
                        icon={<IconSettings color={Color.blue2} />}
                        title="Список остановок"
                        onPress={() => navigation.navigate('StopsList')}
                    />
                    <AdminMenuItem
                        icon={<IconSettings color={Color.blue2} />}
                        title="Маршруты"
                        onPress={() => navigation.navigate('Routes')}
                    />
                </AdminMenuSection>

                <AdminMenuSection title="Управление пользователями">
                    <AdminMenuItem
                        icon={<IconPersona color={Color.blue2} />}
                        title="Список пользователей"
                        onPress={() => navigation.navigate('UsersList')}
                    />
                    <AdminMenuItem
                        icon={<IconPersona color={Color.blue2} />}
                        title="Роли и разрешения"
                        onPress={() => navigation.navigate('UserRoles')}
                    />
                </AdminMenuSection>

                <AdminMenuSection title="Статистика и аналитика">
                    <AdminMenuItem
                        icon={<IconCoupon color={Color.blue2} />}
                        title="Отчеты по продажам"
                        onPress={() => navigation.navigate('SalesReports')}
                    />
                    <AdminMenuItem
                        icon={<IconCoupon color={Color.blue2} />}
                        title="Статистика посещений"
                        onPress={() => navigation.navigate('VisitStats')}
                    />
                </AdminMenuSection>

                <AdminMenuSection title="Система">
                    <AdminMenuItem
                        icon={<IconSettings color={Color.blue2} />}
                        title="Настройки приложения"
                        onPress={() => navigation.navigate('AppSettings')}
                    />
                    <AdminMenuItem
                        icon={<IconSettings color={Color.blue2} />}
                        title="Журнал событий"
                        onPress={() => navigation.navigate('EventLogs')}
                    />
                </AdminMenuSection>
            </ScrollView>

            <View style={styles.footer}>
                <CustomButton
                    title="Вернуться в профиль"
                    onPress={() => navigation.goBack()}
                    outlined={true}
                    color={Color.blue2}
                    activeColor="#FFFFFF"
                />
            </View>
        </SafeAreaView>
    );
};

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

export default AdminPanelScreen;