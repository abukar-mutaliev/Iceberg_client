# 🔥 Руководство по настройке Firebase для Push-уведомлений

## 📋 Проверка Firebase консоли

### 1. Войдите в Firebase консоль:
https://console.firebase.google.com/project/iceberg-323db

### 2. Проверьте настройки проекта:

#### ✅ **Cloud Messaging:**
1. Перейдите в **Project Settings** → **Cloud Messaging**
2. Убедитесь, что **Cloud Messaging API** включен
3. Проверьте **Server key** (нужен для сервера)

#### ✅ **Android приложение:**
1. В **Project Settings** → **General** → **Your apps**
2. Найдите приложение `com.abuingush.iceberg`
3. Убедитесь, что `google-services.json` актуальный

#### ✅ **Cloud Messaging API:**
1. Перейдите в **APIs & Services** → **Library**
2. Найдите **Cloud Messaging API**
3. Убедитесь, что API включен

### 3. Обновите google-services.json:

Если в Firebase консоли есть обновленная версия `google-services.json`, замените текущий файл.

### 4. Проверьте Server Key:

В Firebase консоли:
1. **Project Settings** → **Cloud Messaging**
2. Скопируйте **Server key**
3. Убедитесь, что он совпадает с серверной конфигурацией

## 🔧 Исправления в коде

### 1. Обновленный google-services.json:
```json
{
  "project_info": {
    "project_number": "128167227674",
    "project_id": "iceberg-323db",
    "storage_bucket": "iceberg-323db.firebasestorage.app"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:128167227674:android:e7a092a5d4f2048049fca3",
        "android_client_info": {
          "package_name": "com.abuingush.iceberg"
        }
      },
      "oauth_client": [],
      "api_key": [
        {
          "current_key": "AIzaSyDD3uuAMWkPiXuvapXxDItnGslG57A12mc"
        }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": []
        },
        "fcm_service": {
          "fcm_default_sender_id": "128167227674"
        }
      },
      "firebase_messaging": {
        "gcm_default_sender_id": "128167227674"
      }
    }
  ],
  "configuration_version": "1"
}
```

### 2. Проверьте серверную конфигурацию:

Убедитесь, что в серверном `.env` файле:
```
GOOGLE_SERVICE_ACCOUNT_KEY={"project_id":"iceberg-323db",...}
```

## 🧪 Тестирование

### 1. Пересоберите приложение:
```bash
cd mobile
npm run build
```

### 2. Установите новую сборку на устройство

### 3. Протестируйте push-уведомления:
- Откройте диагностический экран
- Нажмите "🚀 Preview тест"
- Проверьте, что токены сохраняются и уведомления приходят

## 🔍 Диагностика проблем

### Проблема: "FCM не инициализирован"
**Решение:** Проверьте `google-services.json` и убедитесь, что FCM конфигурация присутствует

### Проблема: "Server key неверный"
**Решение:** Обновите Server key в серверной конфигурации

### Проблема: "Cloud Messaging API отключен"
**Решение:** Включите Cloud Messaging API в Firebase консоли

## 📊 Ожидаемые результаты

После правильной настройки Firebase:
✅ FCM токены генерируются
✅ Push-уведомления приходят
✅ Серверные уведомления работают
✅ Локальные уведомления работают 