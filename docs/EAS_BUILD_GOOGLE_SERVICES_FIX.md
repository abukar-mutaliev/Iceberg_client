# Исправление ошибки сборки EAS Build: Missing google-services.json

## Проблема

При попытке создать сборку на EAS Build возникала ошибка:

```
Error: ENOENT: no such file or directory, open '/home/expo/workingdir/build/google-services.json'
Error: "google-services.json" is missing, make sure that the file exists.
```

## Причина

В конфигурации `app.config.js` была указана ссылка на файл `google-services.json`:

```javascript
android: {
    googleServicesFile: './google-services.json',
    // ...
}
```

Однако:
1. Файл `google-services.json` отсутствовал в проекте
2. Файл добавлен в `.gitignore`, поэтому не загружался на EAS Build
3. Firebase **не используется** в проекте (для пуш-уведомлений используется OneSignal)
4. Google Maps настроен через API ключи в конфигурации, а не через `google-services.json`

## Решение

Удалена строка `googleServicesFile: './google-services.json'` из конфигурации Android в файле `mobile/app.config.js`.

### Что было:
```javascript
android: {
    package: 'com.abuingush.iceberg',
    versionCode: 9,
    icon: './assets/icon.png',
    googleServicesFile: './google-services.json', // ❌ Удалено
    adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#E3F2FD',
    },
    // ...
}
```

### Что стало:
```javascript
android: {
    package: 'com.abuingush.iceberg',
    versionCode: 9,
    icon: './assets/icon.png',
    adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#E3F2FD',
    },
    // ...
}
```

## Почему это безопасно

1. **Firebase не используется** - проект использует OneSignal для пуш-уведомлений
2. **Google Maps работает без google-services.json** - API ключи настроены через `config.googleMaps.apiKey`
3. **Все зависимости корректны** - в `package.json` нет Firebase пакетов
4. **OneSignal настроен** - используется `onesignal-expo-plugin` и `react-native-onesignal`

## Технические детали

### Когда нужен google-services.json?

Файл `google-services.json` требуется только при использовании Firebase SDK:
- Firebase Authentication
- Firebase Cloud Messaging (FCM)
- Firebase Analytics
- Firebase Crashlytics
- И другие Firebase сервисы

### Альтернативы для push-уведомлений

Проект использует **OneSignal** вместо Firebase Cloud Messaging:
- `onesignal-expo-plugin` в конфигурации
- `react-native-onesignal` в зависимостях
- Настройка в `app.config.js`:
```javascript
[
    'onesignal-expo-plugin',
    {
        mode: IS_DEV ? 'development' : 'production',
    }
]
```

### Google Maps конфигурация

Google Maps работает через API ключи в конфигурации:
```javascript
android: {
    config: {
        googleMaps: {
            apiKey: 'AIzaSyDev-AMb24bvlQn3a-b4DGsItiYB6su6_E',
        },
    },
}
```

## Результат

✅ Сборка EAS Build теперь проходит успешно
✅ Все функции приложения работают корректно
✅ Push-уведомления через OneSignal работают
✅ Google Maps отображается корректно

## Дополнительная информация

Если в будущем потребуется добавить Firebase:
1. Создайте проект в [Firebase Console](https://console.firebase.google.com/)
2. Скачайте `google-services.json` для Android
3. Поместите файл в корень папки `mobile/`
4. Добавьте строку `googleServicesFile: './google-services.json'` в `android` конфигурацию
5. Используйте EAS Secrets для безопасного хранения файла в продакшене:
   ```bash
   eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
   ```

## Дата исправления
29 октября 2025

