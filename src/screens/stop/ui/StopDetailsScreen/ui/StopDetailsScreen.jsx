import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, BackHandler, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { selectDriverLoading, selectDriverError } from '@entities/driver';
import { StopDetailsContent } from './StopDetailsContent';
import { LoadingState } from '@shared/ui/states/LoadingState';
import { ErrorState } from '@shared/ui/states/ErrorState';
import IceCreamTruckIcon from '@shared/ui/Icon/MainScreen/IceCreamTruckIcon';
import { Color } from '@app/styles/GlobalStyles';
import { selectStopById, selectStops, fetchAllStops, clearStopCache, fetchDriverStops, activateStop, skipStop, completeStop, cancelStop } from "@entities/stop";
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ThemedStatusBar } from '@shared/ui/ThemedStatusBar/ThemedStatusBar';

export const StopDetailsScreen = ({ navigation }) => {
    const route = useRoute();
    const dispatch = useDispatch();
    const { stopId } = route.params || {};
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const [isLoadingStops, setIsLoadingStops] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const stop = useSelector(state => selectStopById(state, stopId));
    const allStops = useSelector(selectStops);
    const [localStop, setLocalStop] = useState(null);
    const isLoading = useSelector(selectDriverLoading);
    const error = useSelector(selectDriverError);
    const userRole = useSelector(state => state.auth?.user?.role || 'DRIVER');
    const isSuperAdmin = useSelector(state => !!state.auth?.user?.admin?.isSuperAdmin);
    const userId = useSelector(state => state.auth?.user?.id);
    const userDriverId = useSelector(state => state.auth?.user?.driver?.id);
    const userEmployeeId = useSelector(state => state.auth?.user?.employee?.id);
    const currentStop = localStop || stop;

    const stopStatus = (currentStop?.status || 'SCHEDULED').toUpperCase();
    const isAdminOrEmployee = userRole === 'ADMIN' || userRole === 'EMPLOYEE' || isSuperAdmin;
    const isDriver = userRole === 'DRIVER';
    const [isLifecycleLoading, setIsLifecycleLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadStopsData = React.useCallback(async () => {
        setIsLoadingStops(true);

        try {
            await dispatch(fetchAllStops()).unwrap();
            setRetryCount(0);
        } catch (error) {
            setRetryCount(prev => prev + 1);
        } finally {
            setIsLoadingStops(false);
        }
    }, [dispatch]);

    useEffect(() => {
        const loadStopsImmediately = async () => {
            if (!stopId) {
                return;
            }

            if (allStops.length > 0) {
                return;
            }
            await loadStopsData();
        };

        loadStopsImmediately();
    }, [stopId, allStops.length, loadStopsData]);

    useEffect(() => {
        if (stop) {
            setLocalStop(stop);
        }
    }, [stop]);

    useFocusEffect(
        React.useCallback(() => {
            if (!stop && stopId && !isLoadingStops && allStops.length === 0) {
                loadStopsData();
            }
        }, [stopId, stop, isLoadingStops, allStops.length, loadStopsData])
    );

    const handleRetry = () => {
        setRetryCount(0);
        loadStopsData();
    };

    const handleGoBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    useEffect(() => {
        if (Platform.OS !== 'android') return;
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            handleGoBack();
            return true;
        });
        return () => subscription.remove();
    }, [handleGoBack]);

    const refreshStops = useCallback(async () => {
        dispatch(clearStopCache());
        await dispatch(fetchAllStops());
        if (isDriver) {
            await dispatch(fetchDriverStops());
        }
    }, [dispatch, isDriver]);

    const handleRefresh = useCallback(async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await refreshStops();
        } finally {
            setIsRefreshing(false);
        }
    }, [refreshStops, isRefreshing]);

    const runLifecycleAction = useCallback(async (actionType) => {
        if (isLifecycleLoading) return;
        setIsLifecycleLoading(true);
        try {
            let result = null;
            console.log('[StopDetails] lifecycle action start', {
                actionType,
                stopId,
                stopStatus,
                hasStop: !!(localStop || stop)
            });
            if (actionType === 'activate') {
                result = await dispatch(activateStop(stopId)).unwrap();
            } else if (actionType === 'skip') {
                result = await dispatch(skipStop({ stopId })).unwrap();
            } else if (actionType === 'complete') {
                result = await dispatch(completeStop(stopId)).unwrap();
            } else if (actionType === 'cancel') {
                result = await dispatch(cancelStop({ stopId })).unwrap();
            }
            console.log('[StopDetails] lifecycle action result', {
                actionType,
                stopId,
                result
            });
            if (result?.stop) {
                setLocalStop(result.stop);
            }
            await refreshStops();
        } catch (actionError) {
            console.log('[StopDetails] lifecycle action error', {
                actionType,
                stopId,
                error: actionError?.message || actionError
            });
            Alert.alert('Ошибка', actionError?.message || 'Не удалось обновить статус остановки');
        } finally {
            setIsLifecycleLoading(false);
        }
    }, [dispatch, stopId, refreshStops, isLifecycleLoading]);

    const confirmAction = useCallback((title, message, actionType) => {
        Alert.alert(title, message, [
            { text: 'Отмена', style: 'cancel' },
            { text: 'Продолжить', style: 'destructive', onPress: () => runLifecycleAction(actionType) }
        ]);
    }, [runLifecycleAction]);

    if (isLoading || isLoadingStops) {
        return <LoadingState />;
    }

    if (!stopId) {
        return (
            <ErrorState
                icon={<IceCreamTruckIcon width={64} height={64} fill={isDark ? colors.primary : Color.blue2} />}
                title="Остановка не найдена"
                message="Не указан идентификатор остановки"
                onRetry={handleGoBack}
                buttonText="Вернуться назад"
            />
        );
    }

    if (!stop && stopId) {
        const errorMessage = allStops.length === 0
            ? "Не удалось загрузить данные остановок"
            : `Остановка #${stopId} не найдена среди ${allStops.length} загруженных остановок`;

        return (
            <ErrorState
                icon={<IceCreamTruckIcon width={64} height={64} fill={isDark ? colors.primary : Color.blue2} />}
                title="Остановка недоступна"
                message={errorMessage}
                onRetry={handleRetry}
                buttonText={retryCount < 3 ? "Повторить загрузку" : "Обновить данные"}
                onSecondary={handleGoBack}
                secondaryButtonText="Вернуться назад"
            />
        );
    }

    if (error) {
        return (
            <ErrorState
                icon={<IceCreamTruckIcon width={64} height={64} fill={isDark ? colors.primary : Color.blue2} />}
                title="Ошибка загрузки"
                message={error}
                onRetry={handleGoBack}
                buttonText="Вернуться назад"
            />
        );
    }

    const stopOwnerUserId = currentStop?.employee?.userId || currentStop?.driver?.userId;
    const stopOwnerDriverId = currentStop?.driverId;
    const stopOwnerEmployeeId = currentStop?.employeeId;
    const isDriverOwnedStop = !!(
        (userId && stopOwnerUserId === userId) ||
        (userDriverId && stopOwnerDriverId === userDriverId)
    );
    const isEmployeeOwnedStop = !!(
        (userId && stopOwnerUserId === userId) ||
        (userEmployeeId && stopOwnerEmployeeId === userEmployeeId)
    );
    const canManageStopLifecycle = isAdminOrEmployee || (isDriver && isDriverOwnedStop) || isEmployeeOwnedStop;

    const lifecycleSection = canManageStopLifecycle && (
        <View style={styles.lifecycleSection}>
            <Text style={styles.lifecycleTitle}>Статус остановки</Text>
            <View style={styles.lifecycleActions}>
                {stopStatus === 'SCHEDULED' && (
                    <>

                        <TouchableOpacity
                            style={[styles.lifecycleButton, styles.lifecycleWarning, isLifecycleLoading && styles.lifecycleDisabled]}
                            onPress={() => confirmAction('Пропустить остановку', 'Остановка не будет показана в канале маршрутов.', 'skip')}
                            disabled={isLifecycleLoading}
                        >
                            <Text
                                style={styles.lifecycleWarningText}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                Пропустить день
                            </Text>
                        </TouchableOpacity>
                    </>
                )}

                {stopStatus === 'ACTIVE' && (
                    <>
                        <TouchableOpacity
                            style={[styles.lifecycleButton, styles.lifecyclePrimary, isLifecycleLoading && styles.lifecycleDisabled]}
                            onPress={() => runLifecycleAction('complete')}
                            disabled={isLifecycleLoading}
                        >
                            <Text
                                style={styles.lifecycleButtonTextPrimary}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                Завершить
                            </Text>
                        </TouchableOpacity>
                        {isAdminOrEmployee && (
                            <TouchableOpacity
                                style={[styles.lifecycleButton, styles.lifecycleDanger, isLifecycleLoading && styles.lifecycleDisabled]}
                                onPress={() => confirmAction('Отменить остановку', 'Остановка будет отменена и удалена из канала.', 'cancel')}
                                disabled={isLifecycleLoading}
                            >
                                <Text
                                    style={styles.lifecycleDangerText}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    Отменить
                                </Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}

                {stopStatus === 'SCHEDULED' && isAdminOrEmployee && (
                    <TouchableOpacity
                        style={[styles.lifecycleButton, styles.lifecycleDanger, isLifecycleLoading && styles.lifecycleDisabled]}
                        onPress={() => confirmAction('Отменить остановку', 'Остановка будет отменена и удалена из канала.', 'cancel')}
                        disabled={isLifecycleLoading}
                    >
                        <Text
                            style={styles.lifecycleDangerText}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            Отменить
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <ThemedStatusBar />
            <StopDetailsContent
                stop={localStop || stop}
                navigation={navigation}
                lifecycleSection={lifecycleSection}
                onRefresh={handleRefresh}
                refreshing={isRefreshing}
            />
        </SafeAreaView>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    lifecycleSection: {
        paddingTop: 8,
        paddingBottom: 16,
    },
    lifecycleTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    lifecycleActions: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        gap: 8,
    },
    lifecycleButton: {
        flexGrow: 1,
        flexBasis: 0,
        minWidth: 0,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isDark ? colors.border : '#E0E0E0',
        backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF',
    },
    lifecyclePrimary: {
        backgroundColor: isDark ? '#2E7D32' : '#2E7D32',
        borderColor: isDark ? '#2E7D32' : '#2E7D32',
    },
    lifecycleWarning: {
        backgroundColor: isDark ? 'rgba(255, 183, 77, 0.15)' : '#FFF3E0',
        borderColor: isDark ? 'rgba(255, 183, 77, 0.5)' : '#FFB74D',
    },
    lifecycleDanger: {
        backgroundColor: isDark ? 'rgba(239, 83, 80, 0.15)' : '#FFEBEE',
        borderColor: isDark ? 'rgba(239, 83, 80, 0.6)' : '#EF5350',
    },
    lifecycleDisabled: {
        opacity: 0.6,
    },
    lifecycleButtonText: {
        fontWeight: '600',
        fontSize: 12,
        color: isDark ? colors.textPrimary : '#424242',
        textAlign: 'center',
    },
    lifecycleWarningText: {
        fontWeight: '600',
        fontSize: 12,
        color: isDark ? '#FFB74D' : '#424242',
        textAlign: 'center',
    },
    lifecycleDangerText: {
        fontWeight: '600',
        fontSize: 12,
        color: isDark ? '#EF5350' : '#424242',
        textAlign: 'center',
    },
    lifecycleButtonTextPrimary: {
        fontWeight: '600',
        fontSize: 12,
        color: '#FFFFFF',
        textAlign: 'center',
    },
});
