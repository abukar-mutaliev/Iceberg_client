# Исправление ошибки App Group для OneSignal iOS

## Проблема

При сборке iOS приложения возникает ошибка:
```
Provisioning profile "*[expo] com.abuingush.iceberg.OneSignalNotificationServiceExtension AdHoc" 
doesn't support the group.com.abuingush.iceberg.onesignal App Group.
```

## Причина

OneSignal Notification Service Extension требует App Group `group.com.abuingush.iceberg.onesignal` для обмена данными с основным приложением, но этот App Group не был создан в Apple Developer Portal и не включен в Provisioning Profile.

## Решение

### Шаг 1: Плагин добавлен ✅

Добавлен плагин `withOneSignalAppGroup` в `app.plugin.js`, который автоматически добавляет App Group в entitlements.

### Шаг 2: Обновить credentials через EAS

Нужно обновить credentials, чтобы EAS создал App Group в Apple Developer Portal и обновил provisioning profiles:

```bash
cd mobile
eas credentials
```

1. Выберите **iOS**
2. Выберите профиль **preview**
3. Выберите **Build Credentials: Manage everything needed to build your project**
4. Выберите **All: Set up all the required credentials to build your project**
5. EAS автоматически:
   - Создаст App Group `group.com.abuingush.iceberg.onesignal` в Apple Developer Portal
   - Обновит provisioning profiles для обоих таргетов (Iceberg и OneSignalNotificationServiceExtension)
   - Включит App Group capability в оба профиля

### Шаг 3: Запустить сборку снова

После обновления credentials:

```bash
npm run build:ios
```

## Что было изменено

1. **app.plugin.js**:
   - Добавлен плагин `withOneSignalAppGroup`
   - Автоматически добавляет App Group в entitlements при prebuild

2. **app.config.js**:
   - Без изменений (App Group добавляется через плагин)

## Проверка

После обновления credentials проверьте в Apple Developer Portal:
- **Certificates, Identifiers & Profiles** → **Identifiers** → **App Groups**
- Должен появиться `group.com.abuingush.iceberg.onesignal`

В Provisioning Profiles оба профиля должны содержать этот App Group.
