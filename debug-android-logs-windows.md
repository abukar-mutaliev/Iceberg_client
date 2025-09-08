# 📱 Инструкция по просмотру логов Android приложения (Windows)

## 🛠️ PowerShell команды для Windows:

### Базовые команды:
```powershell
# Все логи приложения
adb logcat | Select-String "iceberg|fcm|push|token" -CaseSensitive:$false

# Логи только вашего приложения
adb logcat com.abuingush.iceberg:V *:S

# Логи с эмодзи (наши debug логи)
adb logcat | Select-String "🔔|💾|🎫|✅|❌|⚠️|🔍|🎉"

# Сохранить логи в файл
adb logcat com.abuingush.iceberg:V *:S > app-logs.txt

# Логи Firebase и Push
adb logcat | Select-String "Firebase|FCM|Push|Token" -CaseSensitive:$false
```

### Альтернативно - используйте cmd:
```cmd
# В обычной командной строке Windows
adb logcat | findstr /i "iceberg fcm push token"
adb logcat com.abuingush.iceberg:V *:S
```

## 🔍 Текущая проблема из ваших логов:

### ❌ **Проблема 1: Динамический импорт**
```
❌ Error saving token to server: [TypeError: require(...asyncRequire.js) is not a function]
```
**Решение:** Заменил динамический импорт на прямой вызов API ✅

### ❌ **Проблема 2: Expo Go режим**
```
Build type: development
Token prefix: ExponentPushToken[...]
```
**Проблема:** Вы используете Expo Go, а не APK сборку!

## 🎯 **Правильное тестирование FCM:**

### Для FCM токенов нужна **standalone APK сборка**:

```bash
# 1. Соберите APK (НЕ Expo Go)
eas build --platform android --profile preview

# 2. Установите APK на устройство
# (не запускайте через Expo Go!)

# 3. Проверьте логи через ADB
adb logcat com.abuingush.iceberg:V *:S

# 4. В APK сборке должно быть:
# Build type: preview (НЕ development)
# Token prefix: c123456789:APA91bF... (НЕ ExponentPushToken)
```

## 📋 **Почему сейчас не работает:**

1. **Expo Go не поддерживает FCM** - только Expo push токены
2. **Динамический импорт** падает в Expo Go
3. **Build type = development** вместо preview/production

## ✅ **После исправлений:**
Теперь даже в Expo Go токен должен сохраняться (Expo токен), но для FCM нужна APK сборка!




