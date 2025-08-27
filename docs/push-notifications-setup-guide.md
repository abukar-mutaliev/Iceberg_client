# Руководство по настройке Push-уведомлений

## Проблема
Push-уведомления не работают ни в Expo Go, ни в preview builds.

## Решение

### 1. Получение EXPO_ACCESS_TOKEN

#### Шаг 1: Войдите в Expo
1. Откройте https://expo.dev
2. Войдите в свой аккаунт

#### Шаг 2: Получите Access Token
1. Перейдите в **Account Settings**
2. Найдите раздел **"Access Tokens"** или **"API Keys"**
3. Нажмите **"Create Token"** или используйте существующий
4. Скопируйте токен (он должен начинаться с `ExpoToken`)

#### Шаг 3: Добавьте токен в сервер
1. Создайте файл `.env` в папке `server/`
2. Добавьте строку:
   ```
   EXPO_ACCESS_TOKEN=your-expo-access-token-here
   ```

### 2. Проверка токена

Запустите скрипт проверки:
```bash
cd server
node check-expo-token.js
```

### 3. Исправления в коде

#### 3.1. Исправление PushNotificationService

Проблема: В Expo Go и preview builds используются разные способы получения projectId.

**Решение**: Обновить логику в `mobile/src/shared/services/PushNotificationService.js`:

```javascript
getProjectId() {
    try {
        const isExpoGo = Constants?.executionEnvironment === 'expo' || Constants?.appOwnership === 'expo';
        
        if (isExpoGo || __DEV__) {
            return "934456aa-74ef-4c35-844b-aa0c0c2899f3"; // Ваш projectId
        }
        
        // Для standalone builds
        return Constants?.expoConfig?.extra?.eas?.projectId || 
               Constants?.manifest2?.extra?.eas?.projectId ||
               "934456aa-74ef-4c35-844b-aa0c0c2899f3";
    } catch (error) {
        return "934456aa-74ef-4c35-844b-aa0c0c2899f3";
    }
}
```

#### 3.2. Исправление инициализации токенов

Проблема: В Expo Go токены генерируются по-другому.

**Решение**: Обновить метод `registerForPushNotificationsAsync`:

```javascript
// Для Expo Go ОБЯЗАТЕЛЬНО нужен projectId
if (isExpoGo || __DEV__) {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ 
        projectId: projectId 
    });
    token = tokenResult.data;
}
```

### 4. Тестирование

#### 4.1. В Expo Go
1. Запустите приложение в Expo Go
2. Авторизуйтесь как клиент
3. Откройте тестовый экран push-уведомлений
4. Нажмите "Принудительная инициализация"
5. Проверьте статус

#### 4.2. В Preview Build
1. Соберите preview build:
   ```bash
   cd mobile
   eas build --profile preview --platform android
   ```
2. Установите APK на устройство
3. Протестируйте push-уведомления

### 5. Отладка

#### 5.1. Проверка логов клиента
Включите подробные логи в консоли:
```javascript
console.log('🔍 Build type check:', { isStandalone, isExpoGo, __DEV__ });
console.log('🎫 Expo push token obtained:', token?.substring(0, 50) + '...');
```

#### 5.2. Проверка логов сервера
```bash
tail -f server/logs/app.log | grep "push"
```

#### 5.3. Проверка токенов в базе
```sql
SELECT 
    u.email,
    u.role,
    pt.token,
    pt.platform,
    pt.isActive,
    pt.createdAt
FROM "UserPushToken" pt
JOIN "User" u ON pt.userId = u.id
WHERE pt.isActive = true
ORDER BY pt.createdAt DESC;
```

### 6. Частые проблемы

#### 6.1. "EXPO_ACCESS_TOKEN is required"
**Решение**: Добавьте токен в `.env` файл сервера

#### 6.2. "Invalid push token"
**Решение**: Проверьте правильность projectId в коде

#### 6.3. Уведомления не приходят в Expo Go
**Решение**: 
1. Убедитесь, что используется правильный projectId
2. Проверьте permissions на устройстве
3. Перезапустите приложение

#### 6.4. Уведомления не приходят в preview build
**Решение**:
1. Проверьте, что сборка использует правильный projectId
2. Убедитесь, что EXPO_ACCESS_TOKEN действителен
3. Проверьте логи сервера на ошибки

### 7. Проверка работоспособности

#### 7.1. Тестовая отправка
```bash
# Через API
curl -X POST http://212.67.11.134:5000/api/push-tokens/test-public \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ExponentPushToken[your-token-here]",
    "title": "Тест",
    "body": "Тестовое уведомление"
  }'
```

#### 7.2. Создание остановки
1. Авторизуйтесь как водитель
2. Создайте остановку в районе клиента
3. Проверьте, приходит ли уведомление клиенту

### 8. Контакты для поддержки

Если проблема не решается:
1. Соберите логи клиента и сервера
2. Проверьте статус Expo services
3. Убедитесь, что EXPO_ACCESS_TOKEN актуальный 