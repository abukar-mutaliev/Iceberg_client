import { Platform } from 'react-native';
import { pushTokenApi } from '@entities/notification/api/pushTokenApi';

let RustorePushClient = null;
let rustoreEventEmitter = null;
let PushEvents = null;

try {
    if (Platform.OS === 'android') {
        const sdk = require('react-native-rustore-push');
        RustorePushClient = sdk.default;
        rustoreEventEmitter = sdk.eventEmitter;
        PushEvents = sdk.PushEvents;
    }
} catch (_) {
    // Expo Go or iOS — native module unavailable
}

class RustorePushModule {
    constructor() {
        this.isAvailable = false;
        this.token = null;
        this._listeners = [];
    }

    async checkAvailability() {
        if (!RustorePushClient || Platform.OS !== 'android') {
            this.isAvailable = false;
            return false;
        }

        try {
            const result = await RustorePushClient.checkPushAvailability();
            this.isAvailable = result === true;
            return this.isAvailable;
        } catch (err) {
            if (__DEV__) {
                console.log('[RuStorePush] checkAvailability failed:', err?.message);
            }
            this.isAvailable = false;
            return false;
        }
    }

    async getToken() {
        if (!RustorePushClient || !this.isAvailable) return null;

        try {
            const token = await RustorePushClient.getToken();
            this.token = token || null;
            return this.token;
        } catch (err) {
            if (__DEV__) {
                console.warn('[RuStorePush] getToken failed:', err?.message);
            }
            return null;
        }
    }

    async registerToken(deviceId) {
        const token = this.token || (await this.getToken());
        if (!token) return false;

        try {
            await pushTokenApi.savePushToken({
                token,
                deviceId,
                platform: 'android',
                tokenType: 'rustore',
            });
            if (__DEV__) {
                console.log('[RuStorePush] Token registered on server');
            }
            return true;
        } catch (err) {
            if (__DEV__) {
                console.warn('[RuStorePush] registerToken failed:', err?.message);
            }
            return false;
        }
    }

    setupListeners({ onMessage, onOpened, onNewToken, onError }) {
        if (!rustoreEventEmitter || !PushEvents) return;

        this.removeListeners();

        try {
            RustorePushClient.createPushEmitter();
            RustorePushClient.offNativeErrorHandling();
        } catch (_) {}

        if (onMessage) {
            this._listeners.push(
                rustoreEventEmitter.addListener(PushEvents.ON_MESSAGE_RECEIVED, onMessage)
            );
        }

        if (onOpened) {
            this._listeners.push(
                rustoreEventEmitter.addListener(PushEvents.ON_OPENED, onOpened)
            );
        }

        if (onNewToken) {
            this._listeners.push(
                rustoreEventEmitter.addListener(PushEvents.ON_NEW_TOKEN, (event) => {
                    const newToken = event?.token || event;
                    this.token = newToken;
                    onNewToken(newToken);
                })
            );
        }

        if (onError) {
            this._listeners.push(
                rustoreEventEmitter.addListener(PushEvents.ON_ERROR, onError)
            );
        }
    }

    removeListeners() {
        for (const sub of this._listeners) {
            try { sub.remove(); } catch (_) {}
        }
        this._listeners = [];

        try {
            RustorePushClient?.deletePushEmitter?.();
        } catch (_) {}
    }

    async getInitialNotification() {
        if (!RustorePushClient) return null;
        try {
            return await RustorePushClient.getInitialNotification();
        } catch (_) {
            return null;
        }
    }

    async deleteToken() {
        if (!RustorePushClient) return;
        try {
            await RustorePushClient.deleteToken();
            if (this.token) {
                try {
                    await pushTokenApi.deactivatePushToken({ token: this.token });
                } catch (_) {}
            }
            this.token = null;
        } catch (_) {}
    }
}

const rustorePushModule = new RustorePushModule();
export default rustorePushModule;
export { rustorePushModule as RustorePushModule };
