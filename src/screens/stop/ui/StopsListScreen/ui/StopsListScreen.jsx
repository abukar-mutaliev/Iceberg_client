import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, TextInput, BackHandler, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { Color, FontFamily, FontSize, CommonStyles } from '@app/styles/GlobalStyles';
import { EmptyState } from '@shared/ui/states/EmptyState';
import { Loader } from "@shared/ui/Loader";
import {
    selectStops,
    selectStopLoading,
    selectStopError,
    selectStopById,
    fetchAllStops,
    clearStopCache,
} from '@entities/stop';
import { StopCard } from "@entities/driver/ui/StopCard";
import { BackButton } from "@shared/ui/Button/BackButton";
import { InteractiveMap } from "@shared/ui/InteractiveMapIngushetia";
import { SearchIcon } from "@shared/ui/Icon/SearchIcon";
import CloseIcon from "@shared/ui/Icon/Profile/CloseIcon";
import { navigationRef } from '@shared/utils/NavigationRef';
import { Ionicons } from '@expo/vector-icons';

export const StopsListScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const tabBarHeight = 80 + insets.bottom;
    const scrollBottomPadding = tabBarHeight + 40;

    const { districtId: routeDistrictId, districtName: routeDistrictName, highlightStopId, fromScreen } = route.params || {};

    const stops = useSelector(selectStops);
    const loading = useSelector(selectStopLoading);
    const error = useSelector(selectStopError);
    const userRole = useSelector(state => state.auth?.user?.role);
    const safeStops = Array.isArray(stops) ? stops : [];

    const highlightedStop = useSelector(state =>
        highlightStopId ? selectStopById(state, highlightStopId) : null
    );

    // Проверка доступа к добавлению остановок (только для админов и водителей)
    const canAddStop = userRole === 'ADMIN' || userRole === 'DRIVER';

    const [refreshing, setRefreshing] = useState(false);
    const [selectedDistrictId, setSelectedDistrictId] = useState(routeDistrictId || null);
    const [selectedDistrictName, setSelectedDistrictName] = useState(routeDistrictName || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    const getErrorMessage = (errorValue) => {
        if (!errorValue) {
            return '';
        }

        const mapNetworkErrorMessage = (message) => {
            const normalizedMessage = String(message || '').trim().toLowerCase();

            if (!normalizedMessage) {
                return '';
            }

            if (
                normalizedMessage.includes('network error') ||
                normalizedMessage.includes('network request failed') ||
                normalizedMessage.includes('failed to fetch')
            ) {
                return 'Нет подключения к интернету. Проверьте сеть и попробуйте снова.';
            }

            if (
                normalizedMessage.includes('timeout') ||
                normalizedMessage.includes('econnaborted')
            ) {
                return 'Превышено время ожидания ответа. Проверьте подключение и попробуйте снова.';
            }

            return String(message).trim();
        };

        if (typeof errorValue === 'string') {
            return mapNetworkErrorMessage(errorValue);
        }

        if (typeof errorValue?.message === 'string' && errorValue.message.trim() !== '') {
            return mapNetworkErrorMessage(errorValue.message);
        }

        if (Array.isArray(errorValue?.errors) && errorValue.errors.length > 0) {
            return errorValue.errors
                .map(item => item?.message || item)
                .filter(Boolean)
                .join('\n');
        }

        return 'Не удалось загрузить остановки. Проверьте подключение к интернету и попробуйте снова.';
    };

    const loadStops = useCallback(async (districtId = selectedDistrictId, options = {}) => {
        const { showRefreshing = false } = options;

        if (showRefreshing) {
            setRefreshing(true);
        }

        dispatch(clearStopCache());

        try {
            await dispatch(fetchAllStops(districtId || null)).unwrap();
        } catch (loadError) {
            return loadError;
        } finally {
            if (showRefreshing) {
                setRefreshing(false);
            }
        }
    }, [dispatch, selectedDistrictId]);

    useFocusEffect(
        React.useCallback(() => {
            loadStops(selectedDistrictId);
        }, [loadStops, selectedDistrictId])
    );

    useFocusEffect(
        React.useCallback(() => {
            const intervalId = setInterval(() => {
                loadStops(selectedDistrictId);
            }, 30000);

            return () => clearInterval(intervalId);
        }, [loadStops, selectedDistrictId])
    );

    useEffect(() => {
        if (highlightStopId && highlightedStop) {
            const timer = setTimeout(() => {
                navigation.replace('StopDetails', {
                    stopId: highlightStopId
                });
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [highlightStopId, highlightedStop, navigation]);

    const handleRefresh = useCallback(() => {
        loadStops(selectedDistrictId, { showRefreshing: true });
    }, [loadStops, selectedDistrictId]);

    const handleStopPress = (stopId) => {
        navigation.navigate('StopDetails', { stopId });
    };

    const handleDistrictSelect = (districtInfo) => {
        if (districtInfo) {
            setSelectedDistrictId(districtInfo.id);
            setSelectedDistrictName(districtInfo.name);
        } else {
            setSelectedDistrictId(null);
            setSelectedDistrictName(null);
        }
    };

    const handleSearchChange = (text) => {
        setSearchQuery(text);
    };

    // Debounce поискового запроса
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300); // 300ms задержка

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const clearSearch = () => {
        setSearchQuery('');
        setDebouncedSearchQuery('');
    };

    // Улучшенная функция поиска
    const isAddressMatch = (address, query) => {
        const normalizedAddress = String(address || '').toLowerCase().trim();
        const normalizedQuery = String(query || '').toLowerCase().trim();
        
        // Если запрос пустой, показываем все
        if (normalizedQuery === '') return true;
        
        // Проверяем точное включение
        if (normalizedAddress.includes(normalizedQuery)) return true;
        
        // Убираем лишние пробелы из запроса
        const cleanQuery = normalizedQuery.replace(/\s+/g, ' ').trim();
        if (normalizedAddress.includes(cleanQuery)) return true;
        
        // Проверяем слова отдельно
        const queryWords = cleanQuery.split(' ').filter(word => word.length > 0);
        const addressWords = normalizedAddress.split(' ').filter(word => word.length > 0);
        
        // Если все слова запроса содержатся в адресе
        return queryWords.every(queryWord => 
            addressWords.some(addressWord => addressWord.includes(queryWord))
        );
    };

    // Фильтрация остановок по району и поисковому запросу
    const filteredStops = safeStops.filter(stop => {
        // Фильтр по району
        const districtFilter = selectedDistrictId 
            ? stop.districtId === selectedDistrictId 
            : true;
        
        // Фильтр по поисковому запросу
        const searchFilter = isAddressMatch(stop.address, debouncedSearchQuery);
        
        return districtFilter && searchFilter;
    });

    const errorMessage = getErrorMessage(error);

    const getScreenTitle = () => {
        if (selectedDistrictId && selectedDistrictName) {
            return `${selectedDistrictName}`;
        } else if (selectedDistrictId) {
            return 'Остановки в районе';
        }
        return 'Все остановки';
    };

    const getEmptyMessage = () => {
        if (debouncedSearchQuery.trim() !== '') {
            const cleanQuery = debouncedSearchQuery.trim();
            return `По запросу "${cleanQuery}" ничего не найдено`;
        } else if (selectedDistrictId && selectedDistrictName) {
            return `В районе "${selectedDistrictName}" нет остановок`;
        } else if (selectedDistrictId) {
            return "В этом районе нет остановок";
        }
        return "Список остановок пуст";
    };

    const resetFilter = () => {
        setSelectedDistrictId(null);
        setSelectedDistrictName(null);
    };

    const handleAddStop = () => {
        navigation.navigate('AddStop');
    };

    const renderSearchBar = () => (
        <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
                <SearchIcon size={20} color={Color.gray} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Поиск по адресу..."
                    placeholderTextColor={Color.gray}
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={clearSearch}
                    >
                        <CloseIcon width={16} height={16} color={Color.gray} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderContent = () => {
        if (loading && !refreshing && safeStops.length === 0) {
            return (
                <View style={styles.centerContainer}>
                    <Loader 
                        type="youtube"
                        color={Color.purpleSoft}
                    />
                </View>
            );
        }

        return (
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: scrollBottomPadding }
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[Color.purpleSoft]}
                        tintColor={Color.purpleSoft}
                    />
                }
            >
                <View style={styles.mapCard}>
                    <View style={styles.mapCardInner}>
                        <InteractiveMap onDistrictSelect={handleDistrictSelect} />
                    </View>
                </View>

                {!error && renderSearchBar()}

                {error ? (
                    <View style={styles.errorSection}>
                        <View style={styles.errorCard}>
                            <View style={styles.errorIconWrap}>
                                <Ionicons name="cloud-offline-outline" size={28} color={Color.purpleSoft} />
                            </View>
                            <Text style={styles.errorTitle}>Не удалось загрузить остановки</Text>
                            <Text style={styles.errorText}>{errorMessage}</Text>
                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={handleRefresh}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.retryButtonText}>Повторить попытку</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : filteredStops.length === 0 && !loading ? (
                    <EmptyState
                        message={getEmptyMessage()}
                    />
                ) : (
                    <View style={styles.locationsList}>
                        {filteredStops.map((stop) => (
                            <View style={styles.stopCardWrapper} key={stop.id}>
                                <View style={styles.stopCardInner}>
                                    <StopCard
                                        stop={stop}
                                        onPress={handleStopPress}
                                        isHighlighted={stop.id === highlightStopId}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        );
    };

    const handleGoBack = React.useCallback(() => {
        if (fromScreen === 'AdminPanel') {
            // Возвращаемся в AdminPanel через корневой навигатор
            try {
                // Используем navigationRef для доступа к корневому навигатору
                if (navigationRef.current) {
                    navigationRef.current.navigate('Admin', {
                        screen: 'AdminPanel'
                    });
                    return true; // Важно для BackHandler - говорит что мы обработали событие
                } else {
                    // Fallback - пробуем через родительский навигатор
                    const parentNav = navigation.getParent()?.getParent();
                    if (parentNav) {
                        parentNav.navigate('Admin', {
                            screen: 'AdminPanel'
                        });
                        return true;
                    } else {
                        navigation.goBack();
                        return true;
                    }
                }
            } catch (error) {
                navigation.goBack();
                return true;
            }
        } else {
            // Обычная навигация назад
            navigation.goBack();
            return true;
        }
    }, [fromScreen, navigation]);

    // Нативная кнопка «Назад» на Android (жест или аппаратная кнопка)
    useFocusEffect(
        React.useCallback(() => {
            if (Platform.OS !== 'android') return undefined;

            const onBackPress = () => {
                handleGoBack();
                return true;
            };
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [handleGoBack])
    );

    // Перехватываем жест назад и программную навигацию (для iOS)
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            // Если мы пришли из AdminPanel и происходит попытка навигации назад
            if (fromScreen === 'AdminPanel') {
                // Предотвращаем стандартное действие
                e.preventDefault();
                
                // Выполняем нашу кастомную навигацию
                handleGoBack();
            }
        });

        return unsubscribe;
    }, [navigation, fromScreen, handleGoBack]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleGoBack}
                >
                    <BackButton />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>
                        {getScreenTitle()}
                    </Text>
                </View>

                {canAddStop ? (
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleAddStop}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add" size={24} color={Color.blue3} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.backButton} />
                )}
            </View>

            {renderContent()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...CommonStyles.container,
        flex: 1,
        backgroundColor: '#f6f7fb',
    },
    centerContainer: {
        flex: 1,
        ...CommonStyles.centered
    },
    header: {
        ...CommonStyles.flexRow,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 10,
        paddingBottom: 8,
        paddingHorizontal: 8,
        backgroundColor: '#f6f7fb',
    },
    backButton: {
        padding: 10,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButton: {
        padding: 8,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: '#eef2ff',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    headerTitle: {
        fontSize: FontSize.size_lg,
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        letterSpacing: 0.4,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    mapCard: {
        marginHorizontal: 16,
        marginTop: 0,
        borderRadius: 16,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    mapCardInner: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 4,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#e8eaf3',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: FontSize.size_md,
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        paddingVertical: 0,
    },
    clearButton: {
        padding: 4,
        marginLeft: 8,
    },
    errorSection: {
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    errorCard: {
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    errorIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#f3f0ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    errorTitle: {
        fontSize: FontSize.size_lg,
        fontWeight: '700',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginBottom: 8,
    },
    errorText: {
        fontSize: FontSize.size_md,
        color: Color.gray,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 16,
    },
    retryButton: {
        minWidth: 180,
        borderRadius: 12,
        backgroundColor: Color.purpleSoft,
        paddingHorizontal: 20,
        paddingVertical: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    retryButtonText: {
        color: '#ffffff',
        fontSize: FontSize.size_md,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
    },
    locationsList: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        marginTop: 8,
    },
    stopCardWrapper: {
        marginBottom: 12,
        borderRadius: 16,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    stopCardInner: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#eef4ff',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 6,
    },
    filterText: {
        fontSize: FontSize.size_md,
        fontWeight: '600',
        color: '#2b3a67',
        fontFamily: FontFamily.sFProText,
        flex: 1,
    },
    resetFilterButton: {
        backgroundColor: '#4f46e5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    resetFilterText: {
        fontSize: FontSize.size_sm,
        fontWeight: '500',
        color: '#ffffff',
        fontFamily: FontFamily.sFProText,
    },
    stopsInfo: {
        backgroundColor: '#f0f9ff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e7ff',
        marginBottom: 8,
    },
    stopsInfoText: {
        fontSize: FontSize.size_md,
        fontWeight: '500',
        color: '#1e40af',
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
    },
});