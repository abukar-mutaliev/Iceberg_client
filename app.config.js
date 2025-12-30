const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview' || process.env.APP_VARIANT === 'preview-debug' || process.env.EXPO_PUBLIC_BUILD_TYPE === 'preview';
const IS_PREVIEW_DEBUG = process.env.APP_VARIANT === 'preview-debug' || process.env.EXPO_PUBLIC_BUILD_TYPE === 'preview-debug';

export default {
    expo: {
        name: IS_DEV ? 'Iceberg (Dev)' : 'Iceberg',
        slug: 'iceberg',
        version: '1.0.8',
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
            // Требуется для корректной работы expo-sqlite в dev-client / production сборках
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
            // Добавляем expo-dev-client плагин для preview и dev сборок
            ...(IS_DEV || IS_PREVIEW ? ['expo-dev-client'] : []),
            // Кастомный плагин для настройки windowSoftInputMode
            './app.plugin.js',
            [
                'expo-build-properties',
                {
                    android: {
                        minSdkVersion: 24,
                        compileSdkVersion: 35,
                        targetSdkVersion: 35,
                        usesCleartextTraffic: true,
                        networkSecurityConfig: './network_security_config.xml',
                        // Включаем оптимизацию для уменьшения размера приложения
                        // OneSignal работает корректно с включенной минификацией при наличии правильных ProGuard правил
                        enableProguardInReleaseBuilds: true,
                        enableShrinkResourcesInReleaseBuilds: true,
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
                    // Иконки для Android автоматически копируются из src/assets/icons/push/
                    // через app.plugin.js при каждой сборке
                    // Поэтому указываем пути к уже скопированным иконкам в android проекте
                    smallIcons: [
                        './android/app/src/main/res/drawable-mdpi/ic_stat_iceberg.png',
                        './android/app/src/main/res/drawable-hdpi/ic_stat_iceberg.png',
                        './android/app/src/main/res/drawable-xhdpi/ic_stat_iceberg.png',
                        './android/app/src/main/res/drawable-xxhdpi/ic_stat_iceberg.png',
                        './android/app/src/main/res/drawable-xxxhdpi/ic_stat_iceberg.png',
                    ],
                    // Большая иконка для развернутого уведомления (опционально)
                    // largeIcons: ['./android/app/src/main/res/drawable-xxxhdpi/ic_stat_iceberg.png'],
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
            // OneSignal App ID (берем из env для EAS build). Fallback оставляем, чтобы dev/preview не ломались.
            oneSignalAppId:
                process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ||
                'a1bde379-4211-4fb9-89e2-3e94530a7041',
            // OneSignal Android Notification Channel UUID (из OneSignal Dashboard).
            // Если задан, приложение заранее создаст канал `OS_<uuid>` с MAX importance для heads-up.
            // Удобно, когда сервер отправляет android_channel_id и OneSignal SDK создает `OS_<uuid>` канал на устройстве.
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
            versionCode: 32,
            versionName: '1.3.2',
            icon: './assets/icon.png',
            adaptiveIcon: {
                foregroundImage: './assets/icon.png',
                backgroundColor: '#E3F2FD',
            },
            // Важно: 'resize' не сдвигает весь экран (и stack header), а уменьшает высоту окна.
            // Это предотвращает "уезжание" хедера вверх и перекрытие поля ввода клавиатурой.
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
                NSCameraUsageDescription: 'Приложению требуется доступ к камере для съемки фотографий в чате.',
                NSPhotoLibraryUsageDescription: 'Приложению требуется доступ к вашим фотографиям для отправки изображений в чате.',
                NSPhotoLibraryAddUsageDescription: 'Приложению требуется доступ для сохранения фотографий в вашу галерею.',
            },
        },
    },
};