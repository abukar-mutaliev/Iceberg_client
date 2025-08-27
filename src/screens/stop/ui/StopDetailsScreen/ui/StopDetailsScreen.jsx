import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectDriverLoading, selectDriverError } from '@entities/driver';
import { StopDetailsContent } from './StopDetailsContent';
import { LoadingState } from '@shared/ui/states/LoadingState';
import { ErrorState } from '@shared/ui/states/ErrorState';
import { selectStopById } from "@entities/stop";

export const StopDetailsScreen = ({ navigation }) => {
    const route = useRoute();
    const { stopId } = route.params || {};

    const stop = useSelector(state => selectStopById(state, stopId));
    const isLoading = useSelector(selectDriverLoading);
    const error = useSelector(selectDriverError);

    if (isLoading) {
        return <LoadingState />;
    }

    if (error || !stop) {
        return (
            <ErrorState
                message={error || 'Остановка не найдена'}
                onRetry={() => navigation.goBack()}
                buttonText="Вернуться назад"
            />
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StopDetailsContent stop={stop} navigation={navigation} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});