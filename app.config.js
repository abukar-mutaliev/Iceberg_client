const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

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
        plugins: [
            'expo-font',
            [
                'expo-location',
                {
                    locationAlwaysAndWhenInUsePermission: 'This app uses location to show your position on the map.',
                },
            ],
            [
                'expo-build-properties',
                {
                    android: {
                        usesCleartextTraffic: true,
                        networkSecurityConfig: './network_security_config.xml',
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
                '@react-native-firebase/app',
                {
                    googleServicesFile: './google-services.json',
                    iosGoogleServicesFile: './GoogleService-Info.plist',
                }
            ],

        ],
        extra: {
            eas: {
                projectId: '934456aa-74ef-4c35-844b-aa0c0c2899f3',
            },
            apiUrl: 'http://212.67.11.134:5000',
            environment: IS_DEV ? 'development' : IS_PREVIEW ? 'preview' : 'production',
            googleMapsApiKey: 'AIzaSyDev-AMb24bvlQn3a-b4DGsItiYB6su6_E',
            expoPushToken: true,
            firebaseProjectId: 'iceberg-323db',
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
            versionCode: 9,
            icon: './assets/icon.png',
            adaptiveIcon: {
                foregroundImage: './assets/icon.png',
                backgroundColor: '#E3F2FD',
            },
            googleServicesFile: './google-services.json',
            config: {
                googleMaps: {
                    apiKey: 'AIzaSyDev-AMb24bvlQn3a-b4DGsItiYB6su6_E',
                },
            },
            permissions: [
                'RECEIVE_BOOT_COMPLETED',
                'VIBRATE',
                'WAKE_LOCK',
                'com.android.vending.BILLING',
                'android.permission.RECEIVE_BOOT_COMPLETED',
                'android.permission.VIBRATE',
                'android.permission.WAKE_LOCK',
                'android.permission.POST_NOTIFICATIONS',
                'com.google.android.c2dm.permission.RECEIVE',
                'android.permission.INTERNET',
                'android.permission.ACCESS_NETWORK_STATE',
                'android.permission.SYSTEM_ALERT_WINDOW',
                'android.permission.WAKE_LOCK',
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
                {
                    action: 'com.google.firebase.MESSAGING_EVENT',
                    category: ['DEFAULT'],
                },
            ],
        },
        ios: {
            icon: './assets/icon.png',
            bundleIdentifier: 'com.abuingush.iceberg',
            googleServicesFile: './GoogleService-Info.plist',
            config: {
                googleMapsApiKey: 'AIzaSyDev-AMb24bvlQn3a-b4DGsItiYB6su6_E',
            },
            infoPlist: {
                UIBackgroundModes: ['remote-notification', 'background-processing'],
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