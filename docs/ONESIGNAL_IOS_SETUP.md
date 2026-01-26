# Настройка OneSignal для iOS Push-уведомлений

## 📋 Данные для OneSignal Dashboard

### Из вашей конфигурации:

- **Team ID**: `QWUD474CZ6`
- **Bundle ID**: `com.abuingush.iceberg`
- **APNs Key ID**: `3A2H6M3A7Y` (создан через EAS, но .p8 файл недоступен)

---

## 🔑 Вариант 1: Создать новый APNs Key для OneSignal (РЕКОМЕНДУЕТСЯ)

### Шаг 1: Создание APNs Key в Apple Developer Portal

1. Откройте [developer.apple.com/account/resources/authkeys/list](https://developer.apple.com/account/resources/authkeys/list)
2. Нажмите **"+"** → **"New Key"**
3. Заполните:
   - **Key Name**: `OneSignal APNs Key` (или любое другое название)
   - **Enable Services**: ✅ **Apple Push Notifications service (APNs)**
4. ⚠️ **ВАЖНО**: Нажмите кнопку **"Configure"** рядом с APNs (не "Continue"!)
5. На странице "Configure Key":
   - **Environment**: Выберите **"Production"** (для реальных push-уведомлений) или **"Both"** (Sandbox + Production)
   - **Key Restriction**: Оставьте **"Team Scoped (All Topics)"**
   - Нажмите **"Save"** (вверху справа)
6. Вернитесь на страницу создания ключа — кнопка **"Continue"** теперь должна быть активна
7. Нажмите **"Continue"** → **"Register"**
8. ⚠️ **КРИТИЧЕСКИ ВАЖНО**: Сразу скачайте `.p8` файл — он доступен только один раз!
9. Запишите **Key ID** (отображается на странице, например: `ABC123DEF4`)

### Шаг 2: Настройка в OneSignal Dashboard

В OneSignal Dashboard → Settings → Platforms → Apple iOS:

1. **APNs Authentication Type**: `.p8 Auth Key (Recommended)` ✅
2. **Key (.p8 file)***: 
   - Нажмите **"Select file"**
   - Выберите скачанный `.p8` файл
3. **Key ID***: 
   - Введите Key ID из Apple Developer Portal (например: `ABC123DEF4`)
4. **Team ID***: 
   - Введите: `QWUD474CZ6`
5. **App Bundle ID***: 
   - Введите: `com.abuingush.iceberg`
6. Нажмите **"Save & Continue"**

---

## 🔑 Вариант 2: Использовать App Store Connect API Key (Альтернатива)

Если не хотите создавать новый APNs Key, можно использовать App Store Connect API Key:

### Шаг 1: Создание App Store Connect API Key

1. Откройте [appstoreconnect.apple.com/access/api](https://appstoreconnect.apple.com/access/api)
2. Нажмите **"Keys"** → **"+"** → **"Generate API Key"**
3. Заполните:
   - **Name**: `OneSignal API Key`
   - **Access**: **App Manager** или **Admin**
4. Нажмите **"Generate"**
5. ⚠️ **ВАЖНО**: Сразу скачайте `.p8` файл — он доступен только один раз!
6. Запишите **Key ID** и **Issuer ID**

### Шаг 2: Настройка в OneSignal

В OneSignal Dashboard:
1. Выберите **"App Store Connect API Key"** вместо `.p8 Auth Key`
2. Загрузите `.p8` файл из App Store Connect
3. Введите **Key ID** и **Issuer ID**

---

## ✅ Проверка после настройки

После настройки OneSignal:

1. **Проверьте статус** в OneSignal Dashboard:
   - Settings → Platforms → Apple iOS
   - Должен быть зеленый статус "✅ Configured"

2. **Отправьте тестовое уведомление**:
   - Messages → New Push → Send to Test Device
   - Выберите ваше устройство

3. **Проверьте на iPhone**:
   - Убедитесь, что разрешения на уведомления включены
   - Настройки → Уведомления → Iceberg → Разрешить уведомления

---

## 🐛 Решение проблем

### Проблема: "Invalid APNs credentials"

**Решение:**
- Проверьте, что Key ID, Team ID и Bundle ID введены правильно
- Убедитесь, что `.p8` файл не поврежден
- Проверьте, что APNs Key создан с правильными разрешениями

### Проблема: Уведомления не приходят

**Решение:**
1. Проверьте, что приложение установлено через EAS build (не Expo Go)
2. Убедитесь, что разрешения на уведомления включены на устройстве
3. Проверьте логи в OneSignal Dashboard → Delivery → Logs
4. Убедитесь, что `onesignal-expo-plugin` правильно настроен в `app.config.js`

---

## 📝 Текущая конфигурация проекта

Ваш проект уже настроен:
- ✅ `onesignal-expo-plugin` добавлен в `app.config.js`
- ✅ OneSignal App ID настроен: `a1bde379-4211-4fb9-89e2-3e94530a7041`
- ✅ Push Key создан через EAS (ID: `3A2H6M3A7Y`)

**Осталось только**: Настроить APNs credentials в OneSignal Dashboard через один из вариантов выше.

---

## 🎯 Рекомендация

**Используйте Вариант 1** (создать новый APNs Key специально для OneSignal):
- ✅ Более простой и надежный
- ✅ Прямая интеграция с OneSignal
- ✅ Полный контроль над ключом

После настройки push-уведомления должны заработать на iPhone! 🚀
