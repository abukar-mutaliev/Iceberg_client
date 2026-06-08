import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { StopCard, isStopActive } from '@entities/driver/ui/StopCard';
import { canEditStop } from '@entities/stop/lib/canEditStop';
import { QuickEditStopTimeModal } from '@features/stop/quickEditStopTime';
import { BackButton } from "@shared/ui/Button/BackButton";
import { InteractiveMap } from "@shared/ui/InteractiveMapIngushetia";
import { SearchIcon } from "@shared/ui/Icon/SearchIcon";
import CloseIcon from "@shared/ui/Icon/Profile/CloseIcon";
import { navigationRef } from '@shared/utils/NavigationRef';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ThemedStatusBar } from '@shared/ui/ThemedStatusBar/ThemedStatusBar';

const parseStopDateTime = (value) => {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
    }

    const directDate = new Date(value);
    if (!isNaN(directDate.getTime())) {
        return directDate;
    }

    if (typeof value !== 'string') {
        return null;
    }

    const normalizedValue = value.trim();
    const match = normalizedValue.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?(?:([Zz])|([+-]\d{2}:?\d{2}))?$/
    );

    if (!match) {
        return null;
    }

    const [, year, month, day, hours = '0', minutes = '0', seconds = '0', milliseconds = '0', utcMark, offset] = match;

    if (utcMark || offset) {
        const isoOffset = offset && !offset.includes(':')
            ? `${offset.slice(0, 3)}:${offset.slice(3)}`
            : offset;
        const isoValue = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds.padEnd(3, '0')}${utcMark || isoOffset}`;
        const date = new Date(isoValue);
        return isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        Number(seconds),
        Number(milliseconds.padEnd(3, '0'))
    );

    return isNaN(date.getTime()) ? null : date;
};

export const StopsListScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const tabBarHeight = 80 + insets.bottom;
    const scrollBottomPadding = tabBarHeight + 40;
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const { districtId: routeDistrictId, districtName: routeDistrictName, highlightStopId, fromScreen } = route.params || {};

    const stops = useSelector(selectStops);
    const loading = useSelector(selectStopLoading);
    const error = useSelector(selectStopError);
    const user = useSelector(state => state.auth?.user);
    const userRole = user?.role;
    const safeStops = Array.isArray(stops) ? stops : [];

    const highlightedStop = useSelector(state =>
        highlightStopId ? selectStopById(state, highlightStopId) : null
    );

    const canAddStop = userRole === 'ADMIN' || userRole === 'DRIVER';

    const [refreshing, setRefreshing] = useState(false);
    const [selectedDistrictId, setSelectedDistrictId] = useState(routeDistrictId || null);
    const [selectedDistrictName, setSelectedDistrictName] = useState(routeDistrictName || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [editingStop, setEditingStop] = useState(null);

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

    const loadStops = useCallback(async (options = {}) => {
        const { showRefreshing = false, forceRefresh = false } = options;

        if (showRefreshing) {
            setRefreshing(true);
        }

        if (forceRefresh) {
            dispatch(clearStopCache());
        }

        try {
            await dispatch(fetchAllStops(null)).unwrap();
        } catch (loadError) {
            return loadError;
        } finally {
            if (showRefreshing) {
                setRefreshing(false);
            }
        }
    }, [dispatch]);

    useFocusEffect(
        React.useCallback(() => {
            loadStops();
        }, [loadStops])
    );

    useFocusEffect(
        React.useCallback(() => {
            const intervalId = setInterval(() => {
                loadStops();
            }, 30000);

            return () => clearInterval(intervalId);
        }, [loadStops])
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
        loadStops({ showRefreshing: true, forceRefresh: true });
    }, [loadStops]);

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

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const clearSearch = () => {
        setSearchQuery('');
        setDebouncedSearchQuery('');
    };

    const isAddressMatch = (address, query) => {
        const normalizedAddress = String(address || '').toLowerCase().trim();
        const normalizedQuery = String(query || '').toLowerCase().trim();

        if (normalizedQuery === '') return true;

        if (normalizedAddress.includes(normalizedQuery)) return true;

        const cleanQuery = normalizedQuery.replace(/\s+/g, ' ').trim();
        if (normalizedAddress.includes(cleanQuery)) return true;

        const queryWords = cleanQuery.split(' ').filter(word => word.length > 0);
        const addressWords = normalizedAddress.split(' ').filter(word => word.length > 0);

        return queryWords.every(queryWord =>
            addressWords.some(addressWord => addressWord.includes(queryWord))
        );
    };

    const isPrivilegedUser = userRole === 'ADMIN' || userRole === 'EMPLOYEE' || userRole === 'DRIVER';

    const hasPublicVisibleTime = (stop) => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        if (stop.schedule?.daysOfWeek?.length) {
            const days = stop.schedule.daysOfWeek
                .map(day => Number(day))
                .filter(day => Number.isInteger(day) && day >= 0 && day <= 6);
            const start = parseStopDateTime(stop.startTime);
            const isSkipToday = (stop.status || '').toUpperCase() === 'SKIPPED' ||
                (stop.skipReason && start && start >= todayStart && start <= todayEnd);

            return days.includes(now.getDay()) && !isSkipToday;
        }

        const start = parseStopDateTime(stop.startTime);
        const end   = parseStopDateTime(stop.endTime);

        if (start && end) return start <= todayEnd && end >= todayStart;
        if (end) return end >= todayStart && end <= todayEnd;
        if (start) return start >= todayStart && start <= todayEnd;

        return false;
    };

    const filteredStops = safeStops.filter(stop => {
        if (!isPrivilegedUser && !hasPublicVisibleTime(stop)) return false;

        const districtFilter = selectedDistrictId
            ? stop.districtId === selectedDistrictId
            : true;

        const searchFilter = isAddressMatch(stop.address, debouncedSearchQuery);

        return districtFilter && searchFilter;
    });

    const sortedStops = isPrivilegedUser
        ? filteredStops
        : [...filteredStops].sort((a, b) => {
            const aActive = isStopActive(a) ? 0 : 1;
            const bActive = isStopActive(b) ? 0 : 1;

            if (aActive !== bActive) return aActive - bActive;

            const now = new Date();
            const aEnd = parseStopDateTime(a.endTime);
            const bEnd = parseStopDateTime(b.endTime);
            const aStart = parseStopDateTime(a.startTime);
            const bStart = parseStopDateTime(b.startTime);

            const aExpired = aEnd && aEnd < now;
            const bExpired = bEnd && bEnd < now;

            if (aExpired !== bExpired) return aExpired ? 1 : -1;

            if (aExpired && bExpired) {
                return (bEnd?.getTime() ?? 0) - (aEnd?.getTime() ?? 0);
            }

            return (aStart?.getTime() ?? 0) - (bStart?.getTime() ?? 0);
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

    const handleEditStopTime = useCallback((stop) => {
        setEditingStop(stop);
    }, []);

    const handleCloseEditModal = useCallback(() => {
        setEditingStop(null);
    }, []);

    const handleStopTimeSaved = useCallback(() => {
        loadStops({ forceRefresh: true });
    }, [loadStops]);

    const loaderAccent = isDark ? colors.primary : Color.purpleSoft;
    const iconMuted = isDark ? colors.textSecondary : Color.gray;

    const renderSearchBar = () => (
        <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
                <SearchIcon size={20} color={iconMuted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Поиск по адресу..."
                    placeholderTextColor={isDark ? colors.textTertiary : Color.gray}
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardAppearance={colors.keyboardAppearance}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={clearSearch}
                    >
                        <CloseIcon width={16} height={16} color={iconMuted} />
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
                        color={loaderAccent}
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
                        colors={[loaderAccent]}
                        tintColor={loaderAccent}
                        progressBackgroundColor={isDark ? colors.surfaceElevated : '#fff'}
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
                                <Ionicons name="cloud-offline-outline" size={28} color={loaderAccent} />
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
                ) : sortedStops.length === 0 && !loading ? (
                    <EmptyState
                        message={getEmptyMessage()}
                    />
                ) : (
                    <View style={styles.locationsList}>
                        {sortedStops.map((stop) => {
                            const showEditButton = canEditStop(stop, user);

                            return (
                                <View style={styles.stopCardWrapper} key={stop.id}>
                                    <View style={styles.stopCardInner}>
                                        <StopCard
                                            stop={stop}
                                            onPress={handleStopPress}
                                            isHighlighted={stop.id === highlightStopId}
                                        />
                                        {showEditButton && (
                                            <TouchableOpacity
                                                style={styles.editTimeButton}
                                                onPress={() => handleEditStopTime(stop)}
                                                activeOpacity={0.7}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <Ionicons
                                                    name="time-outline"
                                                    size={18}
                                                    color={isDark ? colors.primary : Color.blue3}
                                                />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        );
    };

    const handleGoBack = React.useCallback(() => {
        if (fromScreen === 'AdminPanel') {
            try {
                if (navigationRef.current) {
                    navigationRef.current.navigate('Admin', {
                        screen: 'AdminPanel'
                    });
                    return true;
                } else {
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
            navigation.goBack();
            return true;
        }
    }, [fromScreen, navigation]);

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

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (fromScreen === 'AdminPanel') {
                e.preventDefault();

                handleGoBack();
            }
        });

        return unsubscribe;
    }, [navigation, fromScreen, handleGoBack]);

    return (
        <View style={styles.container}>
            <ThemedStatusBar />
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
                        <Ionicons
                            name="add"
                            size={24}
                            color={isDark ? colors.primary : Color.blue3}
                        />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.backButton} />
                )}
            </View>

            {renderContent()}

            <QuickEditStopTimeModal
                visible={!!editingStop}
                stop={editingStop}
                onClose={handleCloseEditModal}
                onSaved={handleStopTimeSaved}
            />
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        ...CommonStyles.container,
        flex: 1,
        backgroundColor: isDark ? colors.background : '#f6f7fb',
    },
    centerContainer: {
        flex: 1,
        ...CommonStyles.centered,
    },
    header: {
        ...CommonStyles.flexRow,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 10,
        paddingBottom: 8,
        paddingHorizontal: 8,
        backgroundColor: isDark ? colors.background : '#f6f7fb',
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
        backgroundColor: isDark ? colors.surfaceElevated : '#eef2ff',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    headerTitle: {
        fontSize: FontSize.size_lg,
        fontWeight: '600',
        color: colors.textPrimary,
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
        backgroundColor: isDark ? colors.cardBackground : '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    mapCardInner: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: isDark ? colors.cardBackground : '#ffffff',
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 4,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? colors.cardBackground : '#ffffff',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: isDark ? colors.border : '#e8eaf3',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: isDark ? 0.3 : 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: FontSize.size_md,
        color: colors.textPrimary,
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
        backgroundColor: isDark ? colors.cardBackground : '#ffffff',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    errorIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: isDark ? colors.surfaceElevated : '#f3f0ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    errorTitle: {
        fontSize: FontSize.size_lg,
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginBottom: 8,
    },
    errorText: {
        fontSize: FontSize.size_md,
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 16,
    },
    retryButton: {
        minWidth: 180,
        borderRadius: 12,
        backgroundColor: isDark ? colors.primary : Color.purpleSoft,
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
        backgroundColor: isDark ? colors.cardBackground : '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.3 : 0.06,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    stopCardInner: {
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: isDark ? colors.cardBackground : '#ffffff',
    },
    editTimeButton: {
        position: 'absolute',
        right: 32,
        top: '50%',
        marginTop: -16,
        zIndex: 2,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? colors.surfaceElevated : '#eef2ff',
        borderWidth: 1,
        borderColor: isDark ? colors.border : '#dbe4ff',
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: isDark ? colors.surfaceElevated : '#eef4ff',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 6,
    },
    filterText: {
        fontSize: FontSize.size_md,
        fontWeight: '600',
        color: isDark ? colors.textPrimary : '#2b3a67',
        fontFamily: FontFamily.sFProText,
        flex: 1,
    },
    resetFilterButton: {
        backgroundColor: isDark ? colors.primary : '#4f46e5',
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
        backgroundColor: isDark ? colors.surfaceElevated : '#f0f9ff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? colors.border : '#e0e7ff',
        marginBottom: 8,
    },
    stopsInfoText: {
        fontSize: FontSize.size_md,
        fontWeight: '500',
        color: isDark ? colors.primary : '#1e40af',
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
    },
});
