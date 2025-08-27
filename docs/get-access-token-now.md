# Получение EXPO_ACCESS_TOKEN прямо сейчас

## Проблема
У вас есть Session Token (`6dCiZEhwM5X5dlcq15orQCz0FjqlJ-Jf3EVlUt-q`), а нужен Access Token для push-уведомлений.

## Решение (2 минуты)

### Шаг 1: Получите Access Token
1. **Откройте эту ссылку:** https://expo.dev/accounts/abuingush/settings/access-tokens
2. **Создайте новый Access Token**
3. **Скопируйте токен** - он должен начинаться с `ExpoToken`

### Шаг 2: Обновите .env файл
Откройте `server/.env` и замените:
```env
# БЫЛО:
EXPO_ACCESS_TOKEN=6dCiZEhwM5X5dlcq15orQCz0FjqlJ-Jf3EVlUt-q

# СТАЛО:
EXPO_ACCESS_TOKEN=ExpoToken[ваш-новый-токен]
```

### Шаг 3: Перезапустите сервер
```bash
cd ../server
npm restart
```

### Шаг 4: Протестируйте
```bash
cd ../server
node test-push-simple.js
```

## Альтернативные ссылки

Если первая ссылка не работает:
- https://expo.dev/accounts/abuingush/settings
- https://expo.dev/accounts/abuingush/projects/iceberg/settings

## Проверка токена

Правильный Access Token должен:
- ✅ Начинаться с `ExpoToken`
- ✅ Быть длиннее Session Token
- ✅ Работать с push-уведомлениями

## После исправления

1. **Запустите приложение в Expo Go**
2. **Авторизуйтесь как клиент**
3. **Создайте остановку через водителя**
4. **Проверьте push-уведомление**

## Если не получается

1. **Проверьте, что вы вошли в аккаунт `abuingush`**
2. **Ищите раздел "Access Tokens"** (не "Session Tokens")
3. **Создайте новый токен** с правами на push-уведомления 