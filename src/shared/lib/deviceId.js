import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import 'react-native-get-random-values';

const STORAGE_KEY = 'auth.deviceId';
const MAX_LENGTH = 128;

let cachedId = null;

function normalize(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed || trimmed.length > MAX_LENGTH) {
        return null;
    }

    return trimmed;
}

async function readNativeId() {
    try {
        if (Platform.OS === 'android') {
            return normalize(Application.getAndroidId?.() || Application.androidId);
        }

        if (Platform.OS === 'ios') {
            return normalize(await Application.getIosIdForVendorAsync());
        }
    } catch (_) {
        // На эмуляторе или без нативного модуля берём запасной UUID.
    }

    return null;
}

async function readOrCreateFallback() {
    const stored = normalize(await AsyncStorage.getItem(STORAGE_KEY));
    if (stored) {
        return stored;
    }

    const generated = normalize(
        global.crypto?.randomUUID?.()
        || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
    );

    if (generated) {
        await AsyncStorage.setItem(STORAGE_KEY, generated);
    }

    return generated;
}

export async function getDeviceId() {
    if (cachedId) {
        return cachedId;
    }

    const nativeId = await readNativeId();
    cachedId = nativeId || await readOrCreateFallback();
    return cachedId;
}

export async function withDeviceId(body = {}) {
    try {
        const deviceId = await getDeviceId();
        if (deviceId) {
            return { ...body, deviceId };
        }
    } catch (_) {
        // Старые пути входа и так работают без deviceId.
    }

    return body;
}
