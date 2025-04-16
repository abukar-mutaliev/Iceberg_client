import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
    selectProfile,
    selectProfileLoading,
    selectProfileError
} from '@/entities/profile';
import { ProfileHeader } from '@shared/ui/ProfileHeader';
import { ProfileAvatar } from '@/entities/profile/ui/ProfileAvatar';
import { normalize, normalizeFont } from '@/shared/lib/normalize';
import {useProfileInfo} from "@features/profile/ui/ProfileInfo/model/useProfileInfo";

export const ProfileInfo = ({ onProductPress }) => {
    const navigation = useNavigation();

    const profile = useSelector(selectProfile);
    const isLoading = useSelector(selectProfileLoading);
    const profileError = useSelector(selectProfileError);
    const { user, isAuthenticated, tokens } = useSelector((state) => state.auth);

    const {
        setRetryCount,
        activeItemId,
        setActiveItemId,
        handleGoBack,
        handleLogout,
        navigateToLogin,
        menuItems
    } = useProfileInfo(isAuthenticated, tokens, user, navigation);

    const handleMenuItemPress = (itemId, callback) => {
        setActiveItemId(itemId);
        setTimeout(() => {
            setActiveItemId(null);
            callback();
        }, 150);
    };

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

    if (profileError) {
        return (
            <View style={styles.centered}>
                <Text style={styles.error}>{profileError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => setRetryCount((prev) => prev + 1)}>
                    <Text style={styles.retryButtonText}>Повторить</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ProfileHeader title="Мой кабинет" onGoBack={handleGoBack} />

            <ScrollView>
                <View style={styles.profileContainer}>
                    <ProfileAvatar
                        profile={profile}
                        size={118}
                        centered={true}
                        editable={false}
                    />

                    <View style={styles.nameContainer}>
                        <Text style={styles.profileName}>{profile?.name || user?.name || 'Пользователь'}</Text>
                    </View>
                </View>

                <View style={styles.menuContainer}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.menuItem, { borderTopWidth: index === 0 ? 0.5 : 0 }]}
                            onPress={() => handleMenuItemPress(item.id, item.onPress)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.menuIconContainer}>
                                {React.cloneElement(item.icon, {
                                    color: activeItemId === item.id ? '#007AFF' : '#000000',
                                })}
                            </View>
                            <Text
                                style={[
                                    styles.menuItemText,
                                    activeItemId === item.id && styles.menuItemTextActive
                                ]}
                            >
                                {item.title}
                            </Text>
                            <View style={styles.arrowIcon}>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {user?.role && (user.role === 'ADMIN' || user.role === 'SUPPLIER' || user.role === 'EMPLOYEE') && (
                    <View style={styles.specialFunctionsContainer}>
                        <TouchableOpacity
                            style={styles.addProductButton}
                            onPress={() => navigation.navigate('AddProduct')}
                        >
                            <Text style={styles.addProductButtonText}>Добавить продукт</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.viewProductsButton}
                            onPress={() => navigation.navigate('ProductList')}
                        >
                            <Text style={styles.viewProductsButtonText}>Управление продуктами</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.logoutContainer}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.logoutButtonText}>Выйти из аккаунта</Text>
                    </TouchableOpacity>
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
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(20),
    },
    profileContainer: {
        alignItems: 'center',
        marginTop: normalize(30),
        marginBottom: normalize(30),
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: normalize(15),
    },
    profileName: {
        fontSize: normalizeFont(20),
        fontWeight: '500',
        marginRight: normalize(10),
        color: '#000000',
    },
    menuContainer: {
        marginHorizontal: normalize(15),
        borderColor: '#E5E5E5',
        borderBottomWidth: 0.5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        height: normalize(70),
        borderColor: '#E5E5E5',
        borderBottomWidth: 0.8,
        position: 'relative',
    },
    menuIconContainer: {
        marginLeft: normalize(15),
        width: normalize(24),
        alignItems: 'center',
        zIndex: 1,
    },
    menuItemText: {
        fontSize: normalizeFont(16),
        marginLeft: normalize(15),
        flex: 1,
        color: '#000000',
        zIndex: 1,
    },
    menuItemTextActive: {
        color: '#007AFF',
    },
    arrowIcon: {
        marginRight: normalize(15),
        zIndex: 1,
    },
    specialFunctionsContainer: {
        marginTop: normalize(20),
        marginHorizontal: normalize(15),
    },
    addProductButton: {
        backgroundColor: '#007AFF',
        paddingVertical: normalize(12),
        borderRadius: normalize(8),
        alignItems: 'center',
        marginBottom: normalize(10),
    },
    addProductButtonText: {
        color: '#fff',
        fontSize: normalizeFont(16),
        fontWeight: '600',
    },
    viewProductsButton: {
        backgroundColor: '#3949ab',
        paddingVertical: normalize(12),
        borderRadius: normalize(8),
        alignItems: 'center',
    },
    viewProductsButtonText: {
        color: '#fff',
        fontSize: normalizeFont(16),
        fontWeight: '600',
    },
    logoutContainer: {
        margin: normalize(15),
        marginTop: normalize(20),
        marginBottom: normalize(30),
    },
    logoutButton: {
        backgroundColor: '#ff3b30',
        paddingVertical: normalize(12),
        borderRadius: normalize(8),
        alignItems: 'center',
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: normalizeFont(16),
        fontWeight: '600',
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
    retryButton: {
        backgroundColor: '#007AFF',
        paddingVertical: normalize(10),
        paddingHorizontal: normalize(20),
        borderRadius: normalize(8),
    },
    retryButtonText: {
        color: '#fff',
        fontSize: normalizeFont(14),
        fontWeight: '600',
    },
});

export default ProfileInfo;