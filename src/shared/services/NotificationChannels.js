import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const CHANNELS = {
    default:    { name: 'Основные',   importance: Notifications.AndroidImportance.HIGH },
    chat:       { name: 'Чат',        importance: Notifications.AndroidImportance.HIGH },
    orders:     { name: 'Заказы',     importance: Notifications.AndroidImportance.HIGH },
    stops:      { name: 'Остановки',  importance: Notifications.AndroidImportance.DEFAULT },
    promotions: { name: 'Акции',      importance: Notifications.AndroidImportance.LOW },
};

export async function ensureChannels() {
    if (Platform.OS !== 'android') return;

    for (const [id, config] of Object.entries(CHANNELS)) {
        try {
            await Notifications.setNotificationChannelAsync(id, {
                name: config.name,
                importance: config.importance,
                vibrationPattern: [0, 250, 250, 250],
                sound: 'default',
            });
        } catch (e) {
            if (__DEV__) {
                console.warn(`[NotificationChannels] Failed to create channel "${id}":`, e?.message);
            }
        }
    }
}
