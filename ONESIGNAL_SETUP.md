# OneSignal Setup для IcebergApp

## 1. Создание OneSignal App

1. Зайдите на [https://onesignal.com](https://onesignal.com)
2. Создайте бесплатный аккаунт
3. Нажмите "New App/Website"
4. Выберите название приложения (например, "IcebergApp")
5. Выберите платформу "Mobile Apps"

## 2. Настройка Android

1. В OneSignal Dashboard выберите вашу созданную app
2. Перейдите в Settings → Platforms
3. Нажмите "Google Android (FCM)"
4. Загрузите ваш `google-services.json` файл
5. Или введите Server Key и Sender ID из Firebase Console
6. Нажмите "Save"

## 3. Получение OneSignal App ID

1. В OneSignal Dashboard перейдите в Settings → Keys & IDs
2. Скопируйте "OneSignal App ID"
3. Откройте файл `src/shared/services/PushNotificationService.js`
4. Замените `YOUR_ONESIGNAL_APP_ID` на ваш реальный App ID:

```javascript
// Было:
this.oneSignalAppId = 'YOUR_ONESIGNAL_APP_ID';

// Стало:
this.oneSignalAppId = 'ваш-реальный-app-id-здесь';
```

## 4. Настройка в app.config.js

OneSignal plugin уже добавлен в конфигурацию:

```javascript
[
    'onesignal-expo-plugin',
    {
        mode: IS_DEV ? 'development' : 'production',
    }
]
```

## 5. Тестирование

### Development (Expo Go)
```bash
npm start
```

### Preview/Production APK
```bash
npx eas build --profile preview --platform android --clear-cache
```

## 6. Проверка работы

После авторизации в приложении ищите в логах:

```
✅ OneSignal инициализирован успешно
👤 OneSignal External User ID установлен: USER_ID
🎫 OneSignal Subscription ID: subscription-id-here
✅ PushNotificationService настроен для пользователя: USER_ID
```

## 7. Отправка тест-уведомления

1. В OneSignal Dashboard перейдите в Messages → New Push
2. Выберите "Send to Particular Users"
3. В поле "User ID" введите ID вашего пользователя
4. Введите заголовок и текст уведомления
5. Нажмите "Send Message"

## 8. Отладка

Если не работает:

1. Проверьте OneSignal App ID
2. Убедитесь что google-services.json правильный
3. Проверьте разрешения на уведомления в настройках устройства
4. Посмотрите логи в React Native Debugger

## 9. Дополнительные возможности

### Установка тегов пользователя
```javascript
await PushNotificationService.setUserTags({
    userId: user.id,
    role: user.role,
    subscription: 'premium'
});
```

### Очистка при выходе
```javascript
await PushNotificationService.clearUserContext();
```

## Преимущества OneSignal

✅ Работает во всех типах сборок (dev, preview, production)  
✅ Простая настройка без сложных Firebase конфигураций  
✅ Бесплатный план до 10,000 пользователей  
✅ Автоматическое управление токенами  
✅ Богатая аналитика и сегментация  
✅ Поддержка deep linking  
✅ A/B тестирование уведомлений  

## Миграция с сервера

Если ранее на сервере использовались Expo или FCM токены, теперь нужно работать с OneSignal Player ID (Subscription ID).

OneSignal предоставляет REST API для отправки уведомлений с сервера:

```javascript
// Пример отправки с Node.js сервера
const response = await fetch('https://onesignal.com/api/v1/notifications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic YOUR_REST_API_KEY'
  },
  body: JSON.stringify({
    app_id: 'YOUR_ONESIGNAL_APP_ID',
    include_external_user_ids: [userId], // ID пользователя
    headings: { en: 'Заголовок' },
    contents: { en: 'Текст уведомления' },
    data: { orderId: 123, type: 'ORDER_UPDATE' }
  })
});
```