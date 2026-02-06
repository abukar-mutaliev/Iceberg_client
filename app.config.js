const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview' || process.env.APP_VARIANT === 'preview-debug' || process.env.EXPO_PUBLIC_BUILD_TYPE === 'preview';
const IS_PREVIEW_DEBUG = process.env.APP_VARIANT === 'preview-debug' || process.env.EXPO_PUBLIC_BUILD_TYPE === 'preview-debug';

export default {
    expo: {
        name: IS_DEV ? 'Iceberg (Dev)' : 'Iceberg',
        slug: 'iceberg',
        version: '1.3.6',
        scheme: 'iceberg',
        icon: './assets/notification-icon.png',
        splash: {
            image: './assets/logo/logo.png',
            resizeMode: 'contain',
            backgroundColor: '#ffffff',
        },
        platforms: ['ios', 'android'],
        assetBundlePatterns: ['**/*', 'src/assets/**/*', 'src/assets/images/**/*'],
        web: {
            favicon: './assets/icon.png',
            bundler: 'metro',
        },
        developmentClient: {
            silentLaunch: true,
        },
        plugins: [
            'expo-font',
            'expo-sqlite',
            [
                'expo-location',
                {
                    locationAlwaysAndWhenInUsePermission: 'This app uses location to show your position on the map.',
                },
            ],
            [
                'expo-image-picker',
                {
                    photosPermission: 'Приложению требуется доступ к вашим фотографиям для отправки изображений в чате.',
                    cameraPermission: 'Приложению требуется доступ к камере для съемки фотографий в чате.',
                },
            ],
            [
                'expo-media-library',
                {
                    photosPermission: 'Приложению требуется доступ к вашим фотографиям для сохранения изображений.',
                    savePhotosPermission: 'Приложению требуется доступ к вашей галерее для сохранения изображений.',
                    granularPermissions: ['photo'],
                },
            ],
            ...(IS_DEV || IS_PREVIEW ? ['expo-dev-client'] : []),
            './app.plugin.js',
            [
                'expo-build-properties',  // ← УБРАЛИ ЛИШНИЕ СКОБКИ
                {
                    android: {
                        minSdkVersion: 24,
                        compileSdkVersion: 35,
                        targetSdkVersion: 35,
                        usesCleartextTraffic: true,
                        networkSecurityConfig: './network_security_config.xml',
                        enableProguardInReleaseBuilds: true,
                        enableShrinkResourcesInReleaseBuilds: true,
                        ...(IS_PREVIEW_DEBUG && {
                            enableHermes: true,
                            enableProfiling: true,
                        }),
                    },
                    ios: {
                        deploymentTarget: '15.1',
                        // Временно отключаем useFrameworks для preview из-за проблем с react-native-maps
                        // react-native-maps имеет проблемы совместимости с useFrameworks: 'static'
                        // Для production можно включить обратно, если обновить react-native-maps
                        // ...(IS_PREVIEW && {
                        //     useFrameworks: 'static',
                        // }),
                    },
                },
            ],
            [
                'expo-notifications',
                {
                    icon: './assets/notification-icon.png',
                    color: '#ffffff',
                    mode: 'production',
                },
            ],
            [
                'onesignal-expo-plugin',
                {
                    mode: IS_DEV ? 'development' : 'production',
                }
            ]
        ],
        extra: {
            eas: {
                projectId: '934456aa-74ef-4c35-844b-aa0c0c2899f3',
            },
            apiUrl: 'http://85.192.33.223:5000',
            environment: IS_DEV ? 'development' : IS_PREVIEW ? 'preview' : 'production',
            googleMapsApiKey: 'AIzaSyDev-AMb24bvlQn3a-b4DGsItiYB6su6_E',
            yandexMapsApiKey: '17ee620d-aee1-482c-acc9-c7144fd46087',
            expoPushToken: true,
            oneSignalAppId:
                process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ||
                'a1bde379-4211-4fb9-89e2-3e94530a7041',
            oneSignalAndroidChannelUuid: process.env.EXPO_PUBLIC_ONESIGNAL_ANDROID_CHANNEL_UUID || "084a368f-9843-40cc-91a7-cdb835b445df",
        },
        owner: 'abuingush',
        runtimeVersion: '1.0.0',
        newArchEnabled: true,
        updates: {
            enabled: true,
            fallbackToCacheTimeout: 0,
            url: 'https://u.expo.dev/934456aa-74ef-4c35-844b-aa0c0c2899f3',
        },
        android: {
            package: 'com.abuingush.iceberg',
            versionCode: 47,
            versionName: '1.4.7',
            icon: './assets/icon.png',
            adaptiveIcon: {
                foregroundImage: './assets/icon.png',
                backgroundColor: '#E3F2FD',
            },
            softwareKeyboardLayoutMode: 'resize',
            config: {
                googleMaps: {
                    apiKey: 'AIzaSyDev-AMb24bvlQn3a-b4DGsItiYB6su6_E',
                },
                yandexMaps: {
                    apiKey: '17ee620d-aee1-482c-acc9-c7144fd46087',
                },
            },
            permissions: [
                'RECEIVE_BOOT_COMPLETED',
                'VIBRATE',
                'WAKE_LOCK',
                'POST_NOTIFICATIONS',
                'INTERNET',
                'ACCESS_NETWORK_STATE',
                'SYSTEM_ALERT_WINDOW',
                'FOREGROUND_SERVICE',
                'com.google.android.gms.permission.AD_ID',
                'android.permission.RECEIVE_BOOT_COMPLETED',
                'android.permission.VIBRATE',
                'android.permission.WAKE_LOCK',
                'android.permission.POST_NOTIFICATIONS',
                'android.permission.INTERNET',
                'android.permission.ACCESS_NETWORK_STATE',
                'android.permission.SYSTEM_ALERT_WINDOW',
                'android.permission.FOREGROUND_SERVICE',
            ],
            intentFilters: [
                {
                    action: 'VIEW',
                    autoVerify: true,
                    data: [
                        {
                            scheme: 'iceberg',
                        },
                    ],
                    category: ['BROWSABLE', 'DEFAULT'],
                },
            ],
        },
        ios: {
            deploymentTarget: '15.1',  // ← Минимальная версия iOS
            icon: './assets/icon.png',
            bundleIdentifier: 'com.abuingush.iceberg',
            buildNumber: '6',
            config: {
                googleMapsApiKey: 'AIzaSyDev-AMb24bvlQn3a-b4DGsItiYB6su6_E',
                yandexMapsApiKey: '17ee620d-aee1-482c-acc9-c7144fd46087',
            },
            infoPlist: {
                UIBackgroundModes: ['remote-notification'],
                CFBundleURLTypes: [
                    {
                        CFBundleURLName: 'iceberg',
                        CFBundleURLSchemes: ['iceberg'],
                    },
                ],
                NSAppTransportSecurity: {
                    NSAllowsArbitraryLoads: true,
                },
                NSCameraUsageDescription: 'Приложению требуется доступ к камере для съемки фотографий в чате.',
                NSPhotoLibraryUsageDescription: 'Приложению требуется доступ к вашим фотографиям для отправки изображений в чате.',
                NSPhotoLibraryAddUsageDescription: 'Приложению требуется доступ для сохранения фотографий в вашу галерею.',
                NSMicrophoneUsageDescription: 'Нужен доступ к микрофону для записи голосовых сообщений в чате и отправки их собеседнику.',
                NSContactsUsageDescription: 'Нужен доступ к контактам, чтобы выбирать и отправлять контакты в чате и приглашать друзей.',
                LSApplicationQueriesSchemes: ['whatsapp'],
            },
        },
    },
};