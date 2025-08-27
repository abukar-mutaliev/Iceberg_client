import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Color, FontFamily, FontSize, CommonStyles } from '@app/styles/GlobalStyles';
import BackArrowIcon from "@shared/ui/Icon/BackArrowIcon/BackArrowIcon";
import { ErrorState } from '@shared/ui/states/ErrorState';
import { EmptyState } from '@shared/ui/states/EmptyState';
import {
    selectStops,
    selectStopLoading,
    selectStopError,
    fetchDriverStops,
} from '@entities/stop';
import {StopCard} from "@entities/driver/ui/StopCard";


export const StopsListScreen = ({ navigation }) => {
    const dispatch = useDispatch();

    const stops = useSelector(selectStops);
    const loading = useSelector(selectStopLoading);
    const error = useSelector(selectStopError);

    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadStops();
    }, [dispatch]);


    const loadStops = () => {
        dispatch(fetchDriverStops())  // Этот метод теперь из @entities/stop
            .catch(error => {
                console.error('Ошибка при загрузке остановок:', error);
            });
    };

    const handleRefresh = () => {
        setRefreshing(true);
        dispatch(fetchDriverStops())
            .finally(() => {
                setRefreshing(false);
            })
            .catch(error => {
                console.error('Ошибка при обновлении остановок:', error);
            });
    };


    const handleStopPress = (stopId) => {
        navigation.navigate('StopDetails', { stopId });
    };

    const renderContent = () => {
        if (loading && !refreshing && stops.length === 0) {
            return (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#2ecc71" />
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
                        colors={['#2ecc71']}
                        tintColor="#2ecc71"
                    />
                }
            >
                {/* Отображаем ошибку, если она есть */}
                {error && (
                    <ErrorState
                        message={`Ошибка загрузки: ${error}`}
                        onRetry={handleRefresh}
                    />
                )}

                {/* Отображаем сообщение о пустом списке */}
                {stops.length === 0 && !loading && !error ? (
                    <EmptyState message="Список остановок пуст" />
                ) : (
                    <View style={styles.locationsList}>
                        {stops.map((stop) => (
                            <StopCard
                                key={stop.id}
                                stop={stop}
                                onPress={handleStopPress}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Заголовок */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <BackArrowIcon size={20} color="#3478F6"/>
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Адреса</Text>
                </View>

                <View style={styles.backButton} />
            </View>

            {/* Основное содержимое */}
            {renderContent()}
        </SafeAreaView>
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
        // paddingHorizontal: Padding.p_xl,
        paddingVertical: 15,
    },
    backButton: {
        padding: 15,
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
    locationsList: {
        backgroundColor: Color.colorLightMode,
    }
});

export default DriverStopsListScreen;