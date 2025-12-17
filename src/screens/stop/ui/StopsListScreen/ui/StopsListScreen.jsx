import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, RefreshControl, TextInput, BackHandler } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { Color, FontFamily, FontSize, CommonStyles } from '@app/styles/GlobalStyles';
import { ErrorState } from '@shared/ui/states/ErrorState';
import { EmptyState } from '@shared/ui/states/EmptyState';
import { Loader } from "@shared/ui/Loader";
import {
    selectStops,
    selectStopLoading,
    selectStopError,
    selectStopById,
    fetchAllStops,
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

    const { districtId: routeDistrictId, districtName: routeDistrictName, highlightStopId, fromScreen } = route.params || {};

    const stops = useSelector(selectStops);
    const loading = useSelector(selectStopLoading);
    const error = useSelector(selectStopError);
    const userRole = useSelector(state => state.auth?.user?.role);

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

    useEffect(() => {
        loadStops();
    }, [dispatch]);

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

    const loadStops = () => {
        dispatch(fetchAllStops());
    };

    const handleRefresh = () => {
        setRefreshing(true);
        dispatch(fetchAllStops())
            .finally(() => {
                setRefreshing(false);
            });
    };

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
        const normalizedAddress = address.toLowerCase().trim();
        const normalizedQuery = query.toLowerCase().trim();
        
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
    const filteredStops = stops.filter(stop => {
        // Фильтр по району
        const districtFilter = selectedDistrictId 
            ? stop.districtId === selectedDistrictId 
            : true;
        
        // Фильтр по поисковому запросу
        const searchFilter = isAddressMatch(stop.address, debouncedSearchQuery);
        
        return districtFilter && searchFilter;
    });

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
        if (loading && !refreshing && stops.length === 0) {
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
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[Color.purpleSoft]}
                        tintColor={Color.purpleSoft}
                    />
                }
            >
                <InteractiveMap onDistrictSelect={handleDistrictSelect} />

                {renderSearchBar()}

                {selectedDistrictId && (
                    <View style={styles.filterContainer}>
                        <Text style={styles.filterText}>
                            Фильтр: {selectedDistrictName}
                        </Text>
                        <TouchableOpacity
                            style={styles.resetFilterButton}
                            onPress={resetFilter}
                        >
                            <Text style={styles.resetFilterText}>Сбросить</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {error && (
                    <ErrorState
                        message={`Ошибка загрузки: ${error}`}
                        onRetry={handleRefresh}
                    />
                )}

                {filteredStops.length === 0 && !loading && !error ? (
                    <EmptyState
                        message={getEmptyMessage()}
                    />
                ) : (
                    <View style={styles.locationsList}>
                        {filteredStops.map((stop) => (
                            <StopCard
                                key={stop.id}
                                stop={stop}
                                onPress={handleStopPress}
                                isHighlighted={stop.id === highlightStopId}
                            />
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

    // Перехватываем аппаратную кнопку "назад" на Android
    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                handleGoBack();
                return true; // Предотвращаем стандартное поведение
            };

            // Добавляем обработчик аппаратной кнопки назад
            BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => {
                // Удаляем обработчик при размонтировании
                BackHandler.removeEventListener('hardwareBackPress', onBackPress);
            };
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
                        <Ionicons name="add" size={28} color={Color.blue3} />
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
        overflow: "hidden",
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        ...CommonStyles.centered
    },
    header: {
        ...CommonStyles.flexRow,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingVertical: 15,
    },
    backButton: {
        padding: 15,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButton: {
        padding: 10,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: FontSize.size_lg,
        fontWeight: '500',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        letterSpacing: 0.9,
    },
    scrollView: {
        flex: 1,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 2,
        paddingBottom: 8,
        backgroundColor: Color.colorLightMode,
        marginTop: -25,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: Color.colorLavender,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 12,
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

    locationsList: {
        backgroundColor: Color.colorLightMode,
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#e8f4f8',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#d1ecf1',
        marginHorizontal: 0,
    },
    filterText: {
        fontSize: FontSize.size_md,
        fontWeight: '500',
        color: '#0c4a6e',
        fontFamily: FontFamily.sFProText,
        flex: 1,
    },
    resetFilterButton: {
        backgroundColor: '#0ea5e9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
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