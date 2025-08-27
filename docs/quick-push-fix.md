# Быстрое исправление Push-уведомлений

## Проблема
Push-уведомления не работают в Expo Go и preview builds.

## Быстрое решение (5 минут)

### 1. Получите EXPO_ACCESS_TOKEN
1. Войдите на https://expo.dev
2. Account Settings → Access Tokens
3. Создайте новый токен или скопируйте существующий

### 2. Добавьте токен в сервер
Создайте файл `server/.env`:
```env
EXPO_ACCESS_TOKEN=your-expo-access-token-here
```

### 3. Проверьте токен
```bash
cd server
node check-expo-token.js
```

### 4. Перезапустите сервер
```bash
cd server
npm restart
```

### 5. Протестируйте
1. Запустите приложение в Expo Go
2. Авторизуйтесь как клиент
3. Откройте тестовый экран push-уведомлений
4. Нажмите "Принудительная инициализация"

## Если не работает

### Проверьте логи сервера
```bash
cd server
node test-push-notifications.js
```

### Проверьте permissions
1. Настройки устройства → Expo Go → Уведомления → ВКЛ
2. Перезапустите приложение

### Проверьте токены в базе
```sql
SELECT u.email, pt.token, pt.platform 
FROM "UserPushToken" pt 
JOIN "User" u ON pt.userId = u.id 
WHERE pt.isActive = true;
```

## Частые ошибки

### "EXPO_ACCESS_TOKEN is required"
**Решение**: Добавьте токен в `.env` файл

### "Invalid push token"
**Решение**: Проверьте projectId в коде (должен быть `934456aa-74ef-4c35-844b-aa0c0c2899f3`)

### Уведомления не приходят
**Решение**: 
1. Проверьте permissions на устройстве
2. Убедитесь, что приложение авторизовано
3. Перезапустите приложение

## Контакты
Если проблема не решается, соберите логи и обратитесь к разработчику. 