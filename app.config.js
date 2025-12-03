const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview' || process.env.APP_VARIANT === 'preview-debug' || process.env.EXPO_PUBLIC_BUILD_TYPE === 'preview';
const IS_PREVIEW_DEBUG = process.env.APP_VARIANT === 'preview-debug' || process.env.EXPO_PUBLIC_BUILD_TYPE === 'preview-debug';

export default {
    expo: {
        name: IS_DEV ? 'Iceberg (Dev)' : 'Iceberg',
        slug: 'iceberg',
        version: '1.0.7',
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
        // Включаем developmentClient для preview и development сборок
        developmentClient: {
            silentLaunch: true,
        },
        plugins: [
            'expo-font',
            [
                'expo-location',
                {
                    locationAlwaysAndWhenInUsePermission: 'This app uses location to show your position on the map.',
                },
            ],
            // Добавляем expo-dev-client плагин для preview и dev сборок
            ...(IS_DEV || IS_PREVIEW ? ['expo-dev-client'] : []),
            [
                'expo-build-properties',
                {
                    android: {
                        usesCleartextTraffic: true,
                        networkSecurityConfig: './network_security_config.xml',
                        // Отключаем proguard и shrink во всех релизных сборках для стабильной работы OneSignal
                        enableProguardInReleaseBuilds: false,
                        enableShrinkResourcesInReleaseBuilds: false,
                        // Дополнительные настройки для preview-debug
                        ...(IS_PREVIEW_DEBUG && {
                            enableHermes: true,
                            enableProfiling: true,
                        }),
                    },
                    ios: {
                        // Включаем remote debugging для preview сборок
                        ...(IS_PREVIEW && {
                            useFrameworks: 'static',
                        }),
                        // Дополнительные настройки для preview-debug
                        ...(IS_PREVIEW_DEBUG && {
                            useFrameworks: 'static',
                            deploymentTarget: '13.0',
                        }),
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
            apiUrl: 'http://212.67.11.134:5000',
            environment: IS_DEV ? 'development' : IS_PREVIEW ? 'preview' : 'production',
            googleMapsApiKey: 'AIzaSyDev-AMb24bvlQn3a-b4DGsItiYB6su6_E',
            yandexMapsApiKey: '17ee620d-aee1-482c-acc9-c7144fd46087',
            expoPushToken: true,
            // OneSignal App ID для нативной конфигурации плагина
            oneSignalAppId: 'a1bde379-4211-4fb9-89e2-3e94530a7041',
        },
        owner: 'abuingush',
        runtimeVersion: '1.0.0',
        newArchEnabled: false,
        updates: {
            enabled: true,
            fallbackToCacheTimeout: 0,
            url: 'https://u.expo.dev/934456aa-74ef-4c35-844b-aa0c0c2899f3',
        },
        android: {
            package: 'com.abuingush.iceberg',
            versionCode: 9,
            icon: './assets/icon.png',
            adaptiveIcon: {
                foregroundImage: './assets/icon.png',
                backgroundColor: '#E3F2FD',
            },
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
                'com.android.vending.BILLING',
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
            icon: './assets/icon.png',
            bundleIdentifier: 'com.abuingush.iceberg',
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
            },
        },
    },
};