# Исправление гонки обновления токенов при перезапуске Expo

## 🔍 Проблема

После перезапуска `npx expo --dev` авторизация "слетала" из-за гонки обновления токенов:

1. **Request interceptor** обновляет токены используя refresh token
2. Старый refresh token **инвалидируется** на сервере (sliding window)
3. **App.jsx** пытается обновить токены повторно, используя уже инвалидированный refresh token
4. Получает **401 ошибку** и очищает токены

### Логи проблемы:
```
LOG  ✅ [API REQUEST] Token refreshed proactively before request
ERROR  ❌ App: Failed to refresh token on initialization: Request failed with status code 401
LOG  🔐 CartAuthHandler: Auth state changed {"nowAuthenticated": false}
```

## ✅ Решение

### 1. **App.jsx - Проверка перед обновлением**

Добавлена проверка, не были ли токены уже обновлены interceptor'ом:

```javascript
// Небольшая задержка чтобы дать interceptor'у обновить токены
await new Promise(resolve => setTimeout(resolve, 100));

// Перечитываем токены из AsyncStorage
let currentTokens = await authService.getStoredTokens();

// Проверяем еще раз перед обновлением
const latestTokens = await authService.getStoredTokens();
const latestAccessValid = latestTokens?.accessToken ? authService.isTokenValid(latestTokens.accessToken) : false;

if (latestAccessValid && latestTokens) {
    // Токены уже обновлены interceptor'ом, просто синхронизируем Redux
    return;
}
```

### 2. **api.js - Улучшенная обработка ошибок**

В `refreshAccessToken` добавлена проверка флага `isRefreshing`:

```javascript
// Проверяем, не обновляются ли токены в request interceptor
if (isRefreshing) {
    // Ждем и проверяем токены еще раз
    await new Promise(resolve => setTimeout(resolve, 200));
    const updatedTokens = await getStoredTokens();
    if (updatedTokens && isTokenValid(updatedTokens.accessToken)) {
        return updatedTokens; // Токены уже обновлены
    }
}
```

### 3. **Обработка 401 ошибки**

При получении 401 проверяем, не были ли токены обновлены другим процессом:

```javascript
if (error.response?.status === 401) {
    // Даем время interceptor'у завершиться
    await new Promise(resolve => setTimeout(resolve, 300));
    const checkTokens = await getStoredTokens();
    
    if (checkTokens && isTokenValid(checkTokens.accessToken)) {
        return checkTokens; // Токены обновлены, возвращаем их
    }
}
```

## 🔧 Технические детали

### Порядок выполнения при запуске:

1. **Redux Persist** восстанавливает auth state
2. **App.jsx** начинает инициализацию
3. **Request interceptor** может начать обновление токенов (если есть запросы)
4. **App.jsx** проверяет токены:
   - Если валидны → синхронизирует Redux
   - Если истекли → проверяет, не обновляются ли уже
   - Если не обновляются → обновляет сам
   - Если обновляются → ждет и проверяет результат

### Защита от гонок:

- ✅ `isRefreshing` флаг в request interceptor
- ✅ `refreshPromise` в `refreshAccessToken`
- ✅ Проверка токенов перед обновлением
- ✅ Повторная проверка после ошибки 401

## 🧪 Тестирование

### Тест 1: Перезапуск Expo
1. Войдите в приложение
2. Остановите `npx expo --dev`
3. Запустите снова
4. ✅ **Ожидается**: Авторизация сохраняется

### Тест 2: Параллельные запросы
1. Войдите в приложение
2. Одновременно откройте несколько экранов
3. ✅ **Ожидается**: Все запросы выполняются, токены обновляются один раз

### Тест 3: Истечение токена при запуске
1. Войдите в приложение
2. Подождите > 1 часа
3. Перезапустите Expo
4. ✅ **Ожидается**: Токены обновляются автоматически

## 📊 Логи для отладки

```
✅ [API REQUEST] Token refreshed proactively - interceptor обновил токены
✅ App: Tokens were already refreshed by interceptor, syncing Redux - App.jsx обнаружил обновление
⏳ refreshAccessToken: Request interceptor is already refreshing - ожидание завершения
✅ refreshAccessToken: Tokens were refreshed by interceptor - использование обновленных токенов
```

## ⚠️ Важно

1. **Не удаляйте задержки** - они дают время interceptor'у завершиться
2. **Всегда перечитывайте токены** из AsyncStorage перед обновлением
3. **Проверяйте флаг `isRefreshing`** перед началом обновления
4. **При 401 ошибке** проверяйте токены еще раз перед очисткой

## 🔗 Связанные файлы

- `mobile/src/app/App.jsx` - инициализация приложения
- `mobile/src/shared/api/api.js` - HTTP клиент и обновление токенов

---

**Дата создания**: ${new Date().toLocaleDateString('ru-RU')}  
**Версия**: 1.0.1
