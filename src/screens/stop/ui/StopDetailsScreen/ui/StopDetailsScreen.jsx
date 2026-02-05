import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { selectDriverLoading, selectDriverError } from '@entities/driver';
import { StopDetailsContent } from './StopDetailsContent';
import { LoadingState } from '@shared/ui/states/LoadingState';
import { ErrorState } from '@shared/ui/states/ErrorState';
import { selectStopById, selectStops, fetchAllStops, clearStopCache, fetchDriverStops, activateStop, skipStop, completeStop, cancelStop } from "@entities/stop";

export const StopDetailsScreen = ({ navigation }) => {
    const route = useRoute();
    const dispatch = useDispatch();
    const { stopId } = route.params || {};

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

    const stopStatus = (stop?.status || 'SCHEDULED').toUpperCase();
    const isAdminOrEmployee = userRole === 'ADMIN' || userRole === 'EMPLOYEE' || isSuperAdmin;
    const isDriver = userRole === 'DRIVER';
    const [isLifecycleLoading, setIsLifecycleLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Функция для ручной загрузки данных
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

    // Загрузка данных при монтировании только если данных нет
    useEffect(() => {
        const loadStopsImmediately = async () => {
            if (!stopId) {
                return;
            }

            // Если данные уже есть, не перезагружаем
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

    // Дополнительная проверка после загрузки данных
    useEffect(() => {
        if (stopId && allStops.length > 0 && !stop && retryCount < 3) {
            const timer = setTimeout(() => {
                setRetryCount(prev => prev + 1);

                // Ищем остановку вручную в загруженных данных
                const foundStop = allStops.find(s => s.id === parseInt(stopId));

                if (!foundStop && retryCount < 2) {
                    // Повторная загрузка если остановка все еще не найдена
                    loadStopsData();
                }
            }, 1000 * (retryCount + 1)); // Увеличиваем задержку с каждой попыткой

            return () => clearTimeout(timer);
        }
    }, [stopId, stop, allStops.length, retryCount, loadStopsData]);

    // Фокус на экране - дополнительная проверка и перезагрузка после редактирования
    useFocusEffect(
        React.useCallback(() => {
            // Загружаем данные только если остановка не найдена и данных нет
            if (!stop && stopId && !isLoadingStops && allStops.length === 0) {
                loadStopsData();
            }
            // НЕ перезагружаем данные автоматически при каждом фокусе - это вызывает бесконечные запросы
            // Перезагрузка происходит только через useEffect при монтировании
        }, [stopId, stop, isLoadingStops, allStops.length, loadStopsData])
    );

    const handleRetry = () => {
        setRetryCount(0);
        loadStopsData();
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

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

    // Показываем загрузку если данные загружаются
    if (isLoading || isLoadingStops) {
        return <LoadingState />;
    }

    // Если нет stopId в параметрах
    if (!stopId) {
        return (
            <ErrorState
                message="Не указан идентификатор остановки"
                onRetry={handleGoBack}
                buttonText="Вернуться назад"
            />
        );
    }

    // Если остановка все еще не найдена после загрузки
    if (!stop && stopId) {
        const errorMessage = allStops.length === 0
            ? "Не удалось загрузить данные остановок"
            : `Остановка #${stopId} не найдена среди ${allStops.length} загруженных остановок`;

        return (
            <ErrorState
                message={errorMessage}
                onRetry={handleRetry}
                buttonText={retryCount < 3 ? "Повторить загрузку" : "Обновить данные"}
            />
        );
    }

    // Если есть общая ошибка
    if (error) {
        return (
            <ErrorState
                message={error}
                onRetry={handleGoBack}
                buttonText="Вернуться назад"
            />
        );
    }

    const stopOwnerUserId = (localStop || stop)?.driver?.userId;
    const stopOwnerDriverId = (localStop || stop)?.driverId;
    const isOwnedStop = !!(
        isSuperAdmin ||
        (userId && stopOwnerUserId === userId) ||
        (userDriverId && stopOwnerDriverId === userDriverId)
    );

    // Показываем контент остановки
    const lifecycleSection = (isOwnedStop && (isDriver || isAdminOrEmployee)) && (
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
                                style={styles.lifecycleButtonText}
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
                                    style={styles.lifecycleButtonText}
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
                            style={styles.lifecycleButtonText}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    lifecycleSection: {
        paddingTop: 8,
        paddingBottom: 16,
    },
    lifecycleTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
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
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
    },
    lifecyclePrimary: {
        backgroundColor: '#2E7D32',
        borderColor: '#2E7D32',
    },
    lifecycleWarning: {
        backgroundColor: '#FFF3E0',
        borderColor: '#FFB74D',
    },
    lifecycleDanger: {
        backgroundColor: '#FFEBEE',
        borderColor: '#EF5350',
    },
    lifecycleDisabled: {
        opacity: 0.6,
    },
    lifecycleButtonText: {
        fontWeight: '600',
        fontSize: 12,
        color: '#424242',
        textAlign: 'center',
    },
    lifecycleButtonTextPrimary: {
        fontWeight: '600',
        fontSize: 12,
        color: '#FFFFFF',
        textAlign: 'center',
    },
});