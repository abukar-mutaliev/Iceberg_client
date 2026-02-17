import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text, TouchableOpacity, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { ProductManagementHeader } from './ProductManagementHeader';
import { ProductManagementCard } from './ProductManagementCard';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { useProductManagement } from '@entities/product';
import { smartNavigateToProductDetail } from '@shared/utils/NavigationUtils';

export const ProductManagementScreen = ({ route }) => {
    const navigation = useNavigation();
    const { isAuthenticated, currentUser } = useAuth();

    const fromScreen = route?.params?.fromScreen;
    const shouldRefresh = route?.params?.refresh;
    const moderationOnly = route?.params?.moderationOnly === true;

    const isMountedRef = useRef(true);
    const isNavigatingRef = useRef(false);
    const [isInitialized, setIsInitialized] = useState(false);

    const {
        filteredProducts,
        isLoading,
        error,
        isRefreshing,
        handleRefresh,
        forceReloadData
    } = useProductManagement();

    // Управление жизненным циклом компонента
    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            if (isMountedRef.current) {
                console.log('ProductManagementScreen initialized with params:', route?.params);
                setIsInitialized(true);
            }
        });

        return () => {
            task.cancel();
            isMountedRef.current = false;
        };
    }, []);

    // Сброс флага навигации при возвращении на экран
    useFocusEffect(
        useCallback(() => {
            isNavigatingRef.current = false;
        }, [])
    );

    // Обработка параметра refresh для автоматического обновления списка
    useEffect(() => {
        if (shouldRefresh && isInitialized) {
            console.log('ProductManagementScreen: Получен запрос на обновление, вызываем forceReloadData');
            
            // Небольшая задержка для завершения навигации
            const timeout = setTimeout(() => {
                if (isMountedRef.current) {
                    forceReloadData();
                    
                    // Очищаем параметр refresh чтобы избежать повторных обновлений
                    navigation.setParams({ refresh: false });
                }
            }, 100);

            return () => clearTimeout(timeout);
        }
    }, [shouldRefresh, isInitialized, forceReloadData, navigation]);

    const handleGoBack = useCallback(() => {
        if (!isMountedRef.current || isNavigatingRef.current) return;

        console.log('ProductManagement: Going back, fromScreen:', fromScreen);

        isNavigatingRef.current = true;

        // Используем InteractionManager для безопасной навигации
        InteractionManager.runAfterInteractions(() => {
            if (isMountedRef.current) {
                if (navigation.canGoBack()) {
                    navigation.goBack();
                } else {
                    // Если пришли из профиля, возвращаемся в профиль
                    if (fromScreen === 'Profile') {
                        navigation.navigate('ProfileMain');
                    } else {
                        // В противном случае возвращаемся в админ панель
                        navigation.navigate('AdminPanel');
                    }
                }
            }

            // Сбрасываем флаг через небольшое время
            setTimeout(() => {
                isNavigatingRef.current = false;
            }, 500);
        });
    }, [navigation, fromScreen]);

    const handleViewProduct = useCallback((productId, fromScreen = 'ProductManagement') => {
        // Защита от множественных нажатий
        if (!isMountedRef.current || isNavigatingRef.current) {
            console.log('ProductManagementScreen: Навигация уже в процессе или компонент размонтирован');
            return;
        }

        if (!productId) {
            console.warn('ProductManagementScreen: Нет productId для навигации');
            return;
        }

        console.log('ProductManagementScreen: Навигация к продукту', {
            productId,
            fromScreen,
            userRole: currentUser?.role
        });

        // Устанавливаем флаг навигации
        isNavigatingRef.current = true;

        try {
            // Используем InteractionManager для безопасной навигации
            InteractionManager.runAfterInteractions(() => {
                if (isMountedRef.current) {
                    navigation.navigate('AdminProductDetail', {
                        productId: parseInt(productId, 10),
                        fromScreen: 'ProductManagement'
                    });
                }

                // Сбрасываем флаг через время
                setTimeout(() => {
                    isNavigatingRef.current = false;
                }, 1000);
            });
        } catch (error) {
            console.error('ProductManagementScreen: Ошибка навигации:', error);
            isNavigatingRef.current = false;
        }
    }, [navigation, currentUser?.role]);

    const handleViewStagnantProducts = useCallback(() => {
        console.log('Переход к залежавшимся товарам');
        navigation.navigate('StagnantProducts');
    }, [navigation]);

    const renderSupplierCards = useMemo(() => {
        if (currentUser?.role !== 'SUPPLIER') return null;

        return (
            <View style={styles.supplierCardsContainer}>
                <TouchableOpacity 
                    style={styles.supplierCard}
                    onPress={handleViewStagnantProducts}
                    activeOpacity={0.7}
                >
                    <View style={styles.cardIconContainer}>
                        <Text style={styles.cardIcon}>⚠️</Text>
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={styles.cardTitle}>Залежавшиеся товары</Text>
                        <Text style={styles.cardDescription}>
                            Товары без продаж более 3 недель.{'\n'}
                            Возвраты создаются администрацией.
                        </Text>
                    </View>
                    <Text style={styles.cardArrow}>›</Text>
                </TouchableOpacity>
            </View>
        );
    }, [currentUser?.role, handleViewStagnantProducts]);

    const moderationPendingCount = useMemo(() => {
        if (!Array.isArray(filteredProducts)) return 0;
        return filteredProducts.filter((item) => item?.moderationStatus === 'PENDING').length;
    }, [filteredProducts]);

    const displayedProducts = useMemo(() => {
        if (!Array.isArray(filteredProducts)) return [];
        if (moderationOnly) {
            return filteredProducts.filter((item) => item?.moderationStatus === 'PENDING');
        }
        return filteredProducts;
    }, [filteredProducts, moderationOnly]);

    const renderEmptyList = useMemo(() => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
                {moderationOnly
                    ? 'Нет товаров в очереди модерации'
                    : (currentUser?.role === 'SUPPLIER' ? 'У вас пока нет продуктов' : 'Продукты отсутствуют')}
            </Text>
            <Text style={styles.infoText}>
                {moderationOnly
                    ? 'Все заявки обработаны'
                    : (currentUser?.role === 'SUPPLIER'
                    ? 'Чтобы добавить новый продукт, перейдите в профиль и нажмите кнопку "Добавить продукт"'
                    : 'Попробуйте обновить список или вернитесь позже'
                )}
            </Text>
            <TouchableOpacity style={styles.reloadButton} onPress={forceReloadData}>
                <Text style={styles.reloadButtonText}>Обновить</Text>
            </TouchableOpacity>
        </View>
    ), [currentUser?.role, forceReloadData, moderationOnly]);

    const renderProductCard = useCallback(({ item, index }) => {
        if (!item || !item.id) {
            console.warn('ProductManagementScreen: Получен невалидный item:', item);
            return null;
        }

        return (
            <ProductManagementCard
                key={`product-${item.id}-${index}`}
                product={item}
                onViewProduct={handleViewProduct}
                onProductUpdated={() => {
                    // Для поставщика список хранится в локальном state useProductManagement,
                    // поэтому после сохранения форсируем перезагрузку, чтобы UI обновился без перезапуска приложения.
                    forceReloadData();
                }}
            />
        );
    }, [handleViewProduct, forceReloadData]);

    const keyExtractor = useCallback((item, index) => {
        // Используем только ID продукта как ключ для максимальной стабильности
        if (item?.id) {
            return `product-${item.id}`;
        }
        return `item-${index}`;
    }, []);

    // Проверка авторизации
    if (!isAuthenticated) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>
                    Для управления продуктами необходимо авторизоваться
                </Text>
            </View>
        );
    }

    // Проверка на инициализацию
    if (!isInitialized) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Color.blue2} />
                <Text style={styles.loadingText}>Инициализация...</Text>
            </View>
        );
    }

    // Проверка на загрузку
    if (isLoading && !isRefreshing && (!filteredProducts || filteredProducts.length === 0)) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Color.blue2} />
                <Text style={styles.loadingText}>
                    {currentUser?.role === 'SUPPLIER' ? 'Загрузка ваших продуктов...' : 'Загрузка продуктов...'}
                </Text>
            </View>
        );
    }

    // Отображение ошибки
    if (error && !filteredProducts?.length) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={forceReloadData}>
                    <Text style={styles.retryButtonText}>Попробовать снова</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <ProductManagementHeader
                title={
                    moderationOnly
                        ? 'Очередь модерации'
                        : (currentUser?.role === 'SUPPLIER' ? 'Мои товары' : 'Управление продуктами')
                }
                onBack={handleGoBack}
            />

            <View style={styles.content}>
                {/* Карточки для поставщика */}
                {renderSupplierCards}
                {currentUser?.role === 'SUPPLIER' && moderationPendingCount > 0 && (
                    <View style={styles.pendingInfoContainer}>
                        <Text style={styles.pendingInfoText}>
                            На модерации: {moderationPendingCount} товар(ов)
                        </Text>
                    </View>
                )}

                {!displayedProducts || displayedProducts.length === 0 ? (
                    renderEmptyList
                ) : (
                    <FlatList
                        data={displayedProducts}
                        renderItem={renderProductCard}
                        keyExtractor={keyExtractor}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        onRefresh={handleRefresh}
                        refreshing={isRefreshing}
                        removeClippedSubviews={true}
                        initialNumToRender={10}
                        windowSize={5}
                        maxToRenderPerBatch={5}
                        updateCellsBatchingPeriod={50}
                        getItemLayout={(data, index) => ({
                            length: 172,
                            offset: 172 * index,
                            index
                        })}
                        // Дополнительные оптимизации для предотвращения ViewState ошибок
                        extraData={displayedProducts?.length}
                        keyboardShouldPersistTaps="handled"
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FBFAFF',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    listContainer: {
        paddingBottom: 196,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.sFProText,
        color: Color.colorSilver_100,
        textAlign: 'center',
        marginBottom: 10,
    },
    loadingText: {
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginTop: 10,
    },
    infoText: {
        fontSize: FontSize.size_xs,
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        textAlign: 'center',
        marginTop: 10,
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    pendingInfoContainer: {
        marginBottom: 12,
        backgroundColor: '#FFF4E5',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    pendingInfoText: {
        color: '#B26A00',
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        fontWeight: '600',
    },
    errorText: {
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        color: Color.red,
        textAlign: 'center',
        marginBottom: 20,
    },
    reloadButton: {
        backgroundColor: Color.blue2,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    reloadButtonText: {
        color: '#FFFFFF',
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
    },
    retryButton: {
        backgroundColor: Color.blue2,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
    },
    // Стили для карточек поставщика
    supplierCardsContainer: {
        marginBottom: 16,
    },
    supplierCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: Color.orange,
    },
    cardIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 149, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardIcon: {
        fontSize: 28,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: FontSize.size_xs,
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        lineHeight: 18,
    },
    cardArrow: {
        fontSize: 28,
        color: Color.textSecondary,
        marginLeft: 8,
    },
});

export default ProductManagementScreen;