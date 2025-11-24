import React, {useEffect} from 'react';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import {useSelector} from 'react-redux';
import {DirectChatScreen} from './DirectChatScreen';
import {GroupChatScreen} from './GroupChatScreen';

/**
 * Роутер для чатов - определяет тип комнаты и рендерит соответствующий компонент
 */
export const ChatRoomScreen = ({route, navigation}) => {
    const {roomId} = route.params;

    // Получаем данные комнаты из Redux
    const roomDataRaw = useSelector((s) => s.chat?.rooms?.byId?.[roomId]);
    const roomData = roomDataRaw?.room ? roomDataRaw.room : roomDataRaw;
    const loading = useSelector((s) => s.chat?.rooms?.loading);

    // Показываем загрузку пока определяем тип комнаты
    if (!roomData && loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7c3aed" />
            </View>
        );
    }

    // Определяем какой компонент рендерить на основе типа комнаты
    const roomType = roomData?.type || route.params?.roomType;

    if (roomType === 'GROUP') {
        return <GroupChatScreen route={route} navigation={navigation} />;
    }

    // По умолчанию рендерим DirectChatScreen (для DIRECT и если тип не определен)
    return <DirectChatScreen route={route} navigation={navigation} />;
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ECE5DD',
    },
});
