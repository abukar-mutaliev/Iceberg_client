# Быстрое исправление Push-уведомлений

## Проблема
У вас Session Token, а нужен Access Token для push-уведомлений.

## Решение (3 минуты)

### 1. Получите Access Token
1. Откройте https://expo.dev/accounts/abuingush/settings/access-tokens
2. Создайте новый Access Token
3. Скопируйте токен (должен начинаться с `ExpoToken`)

### 2. Обновите .env
В файле `server/.env` замените:
```env
EXPO_ACCESS_TOKEN=ExpoToken[ваш-новый-токен]
```

### 3. Перезапустите сервер
```bash
cd server
npm restart
```

### 4. Протестируйте
```bash
cd server
node test-push-simple.js
```

## Проверка
1. Запустите приложение в Expo Go
2. Авторизуйтесь как клиент
3. Создайте остановку через водителя
4. Проверьте push-уведомление

## Если не работает
- Проверьте permissions уведомлений
- Убедитесь, что приложение не в фоне
- Проверьте, что пользователь в правильном районе 