# 🚀 Инструкция: Настройка Push-уведомлений для Production сборки

## 📋 Что нужно для работы push-уведомлений в production:

### 1. 🔑 **Expo Access Token** (ОБЯЗАТЕЛЬНО)
- **Где получить:** https://expo.dev/accounts/[username]/settings/access-tokens
- **Что это:** Токен для отправки уведомлений через Expo Push API
- **Где настроить:** В переменных окружения сервера
- **Формат:** `exp1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2. 🔥 **Firebase Configuration** (ОБЯЗАТЕЛЬНО для production)
- **Google Services Account Key** (JSON файл)
- **Где получить:** https://console.firebase.google.com/project/[project-id]/settings/serviceaccounts/adminsdk
- **Что это:** Ключ для отправки уведомлений через Firebase Cloud Messaging
- **Где настроить:** В переменных окружения сервера

### 3. 📱 **Google Services JSON** (ОБЯЗАТЕЛЬНО для production)
- **google-services.json** для Android
- **GoogleService-Info.plist** для iOS
- **Где получить:** https://console.firebase.google.com/project/[project-id]/settings/general
- **Что это:** Конфигурация Firebase для клиентского приложения

## 🔧 **Пошаговая настройка:**

### Шаг 1: Настройка Firebase проекта

1. **Создайте Firebase проект:**
   ```
   https://console.firebase.google.com/
   ```

2. **Добавьте Android приложение:**
   - Package name: `com.abuingush.iceberg`
   - App nickname: `Iceberg`
   - Debug signing certificate SHA-1: (опционально)

3. **Скачайте google-services.json:**
   - Перейдите в Project Settings
   - Скачайте google-services.json
   - Поместите в `mobile/google-services.json`

### Шаг 2: Настройка сервера

1. **Получите Expo Access Token:**
   ```
   https://expo.dev/accounts/abuingush/settings/access-tokens
   ```

2. **Получите Firebase Service Account Key:**
   ```
   https://console.firebase.google.com/project/iceberg-323db/settings/serviceaccounts/adminsdk
   ```

3. **Настройте переменные окружения на сервере:**
   ```bash
   # В файле .env на сервере
   EXPO_ACCESS_TOKEN=exp1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"iceberg-323db",...}
   ```

### Шаг 3: Обновление конфигурации приложения

1. **Добавьте google-services.json в проект:**
   ```bash
   # Скопируйте файл в mobile/
   cp google-services.json mobile/
   ```

2. **Обновите app.json:**
   ```json
   {
     "expo": {
       "android": {
         "googleServicesFile": "./google-services.json"
       }
     }
   }
   ```

3. **Установите Firebase зависимости:**
   ```bash
   npx expo install @react-native-firebase/app @react-native-firebase/messaging
   ```

### Шаг 4: Обновление кода

1. **Обновите PushNotificationService.js:**
   ```javascript
   // Добавьте импорты Firebase
   import firebase from 'firebase/app';
   import 'firebase/messaging';
   
   // В функции registerForPushNotificationsAsync добавьте:
   if (this.isProductionBuild()) {
     // Используем Firebase для production
     const fcmToken = await firebase.messaging().getToken();
     return fcmToken;
   } else {
     // Используем Expo Push для development/preview
     return await Notifications.getExpoPushTokenAsync({ projectId });
   }
   ```

### Шаг 5: Создание production сборки

1. **Создайте production профиль в eas.json:**
   ```json
   {
     "build": {
       "production": {
         "android": {
           "buildType": "apk",
           "gradleCommand": ":app:assembleRelease"
         }
       }
     }
   }
   ```

2. **Соберите production APK:**
   ```bash
   eas build --profile production --platform android
   ```

## 🔍 **Проверка настройки:**

### На сервере:
```bash
# Проверьте переменные окружения
echo $EXPO_ACCESS_TOKEN
echo $GOOGLE_SERVICE_ACCOUNT_KEY

# Запустите тест
node test-complete-push-system.js
```

### В приложении:
1. Откройте диагностику push-уведомлений
2. Нажмите "🚀 Preview тест"
3. Проверьте, что токен получен
4. Нажмите "📡 Серверное" для теста

## ❌ **Частые проблемы:**

### Проблема 1: "Default FirebaseApp is not initialized"
**Решение:** Добавьте google-services.json в проект

### Проблема 2: "The registration token is not a valid FCM registration token"
**Решение:** Проверьте, что Firebase проект правильно настроен

### Проблема 3: "Expo Access Token not found"
**Решение:** Проверьте переменную EXPO_ACCESS_TOKEN на сервере

### Проблема 4: "Google Service Account Key not found"
**Решение:** Проверьте переменную GOOGLE_SERVICE_ACCOUNT_KEY на сервере

## 📱 **Типы токенов:**

1. **Expo Push Token** (для development/preview):
   - Формат: `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`
   - Используется в: Expo Go, Preview сборки

2. **Firebase FCM Token** (для production):
   - Формат: `fMEP0vJqS0:APA91bH...`
   - Используется в: Production сборки

## 🎯 **Итоговая проверка:**

✅ Expo Access Token настроен  
✅ Firebase Service Account Key настроен  
✅ google-services.json добавлен в проект  
✅ Firebase зависимости установлены  
✅ Код обновлен для поддержки Firebase  
✅ Production сборка создана  
✅ Серверные тесты проходят  
✅ Клиентские тесты проходят  

## 🚨 **ВАЖНО:**

- **Development/Preview:** Использует Expo Push токены
- **Production:** Использует Firebase FCM токены
- **Сервер:** Поддерживает оба типа токенов автоматически
- **Клиент:** Автоматически переключается между типами токенов

## 📞 **Поддержка:**

Если что-то не работает:
1. Проверьте все токены и ключи
2. Убедитесь, что Firebase проект правильно настроен
3. Проверьте логи сервера и клиента
4. Запустите диагностику в приложении 