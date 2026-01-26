# Пошаговое руководство по сборке iOS приложения через EAS

Это руководство поможет вам собрать и установить приложение на iPhone для тестирования.

## 📋 Подготовка

### Шаг 1: Установка EAS CLI (если еще не установлен)

Убедитесь, что у вас установлен EAS CLI глобально:

```bash
npm install -g eas-cli
```

### Шаг 2: Авторизация в Expo

Войдите в свой аккаунт Expo:

```bash
eas login
```

Если у вас нет аккаунта, создайте его на [expo.dev](https://expo.dev) или зарегистрируйтесь через:

```bash
eas register
```

### Шаг 3: Проверка Apple Developer аккаунта

Убедитесь, что:
- ✅ У вас активен Apple Developer аккаунт ($99/год)
- ✅ Вы знаете свой Apple ID (email, который используется для входа в developer.apple.com)
- ✅ Вы знаете ваш Team ID (можно найти на [developer.apple.com/account](https://developer.apple.com/account) в разделе Membership)

---

## 🔐 Настройка Credentials (Учетных данных)

### Шаг 4: Настройка credentials через EAS

EAS может автоматически настроить все необходимые сертификаты и профили. Запустите:

```bash
cd mobile
eas credentials
```

Выберите платформу `ios` и следуйте инструкциям. EAS предложит:
1. **Automatic** (рекомендуется) - EAS автоматически создаст и управляет сертификатами
2. **Manual** - ручная настройка (для продвинутых пользователей)

**Рекомендация:** Выберите **Automatic** для первого раза.

EAS попросит:
- **Apple ID** - ваш email для Apple Developer
- **Apple Team ID** - ваш Team ID из Apple Developer
- **App Store Connect API Key** (опционально, для автоматической загрузки в TestFlight)

---

## 📱 Варианты сборки для тестирования

### Вариант A: Internal Distribution (рекомендуется для быстрого тестирования)

Соберите приложение с профилем `preview` для прямой установки на устройство:

```bash
npm run build:ios
```

или

```bash
eas build --profile preview --platform ios
```

**Характеристики:**
- ✅ Быстрая сборка
- ✅ Прямая установка через ссылку или TestFlight
- ✅ Подходит для тестирования на реальном устройстве
- ✅ Не требует создания App Store Connect приложения

**После сборки:**
1. EAS предоставит ссылку для скачивания `.ipa` файла
2. Скачайте файл на ваш Mac
3. Установите на iPhone через:
   - **AirDrop** (отправьте файл на iPhone)
   - **iTunes/Finder** (подключите iPhone к Mac, перетащите файл)
   - **TestFlight** (если настроен App Store Connect)

### Вариант B: Development Build (для разработки с Expo Dev Client)

Если вы хотите использовать Expo Dev Client с hot reload:

```bash
npm run build:ios:dev
```

или

```bash
eas build --profile development --platform ios
```

**Характеристики:**
- ✅ Поддерживает Expo Dev Client
- ✅ Можно использовать `expo start --dev-client`
- ✅ Быстрые обновления через OTA

---

## 🏗️ Процесс сборки

### Шаг 5: Запуск сборки

После настройки credentials, запустите сборку:

```bash
cd mobile
npm run build:ios
```

EAS спросит:
1. **Build profile** - выберите `preview`
2. **Generate new credentials?** - выберите `No` (если уже настроили на шаге 4) или `Yes` (если нужно обновить)

### Шаг 6: Ожидание сборки

Сборка займет **15-30 минут**. Вы можете:
- Отслеживать прогресс в терминале
- Открыть ссылку в браузере для просмотра логов
- Продолжить работу, сборка завершится в фоне

После завершения вы получите:
- Ссылку на скачивание `.ipa` файла
- QR-код для установки (если используете TestFlight)

---

## 📲 Установка на iPhone

### Способ 1: Через AirDrop (Mac → iPhone)

1. Скачайте `.ipa` файл на Mac
2. Откройте Finder и найдите файл
3. Щелкните правой кнопкой → **Открыть с помощью** → **AirDrop**
4. Выберите ваш iPhone
5. На iPhone: **Настройки** → **Основные** → **Управление VPN и устройством** → Доверьте сертификату разработчика

### Способ 2: Через Finder/iTunes (Mac → iPhone)

1. Подключите iPhone к Mac через USB
2. Откройте Finder (или iTunes на старых версиях macOS)
3. Выберите ваш iPhone в боковой панели
4. Перейдите в раздел **Программы**
5. Перетащите `.ipa` файл в Finder
6. На iPhone: **Настройки** → **Основные** → **Управление VPN и устройством** → Доверьте сертификату

### Способ 3: Через TestFlight (рекомендуется для раздачи тестерам)

1. Создайте приложение в App Store Connect:
   - Перейдите на [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - **My Apps** → **+** → **New App**
   - Заполните информацию (Bundle ID должен совпадать: `com.abuingush.iceberg`)

2. Загрузите сборку в TestFlight:
   ```bash
   eas build --profile preview --platform ios --auto-submit
   ```
   или используйте EAS Submit после сборки:
   ```bash
   eas submit --platform ios
   ```

3. После обработки в App Store Connect (обычно 10-20 минут):
   - Откройте TestFlight на iPhone
   - Войдите с вашим Apple ID
   - Приложение появится в списке доступных

---

## 🔍 Проверка и отладка

### Проверка установки

После установки проверьте:
1. Приложение запускается
2. Все разрешения запрашиваются корректно (камера, фото, геолокация)
3. Push-уведомления работают (если настроены)

### Логи и отладка

Если приложение не запускается или возникают ошибки:

```bash
# Подключите iPhone к Mac и запустите:
eas device:list
# или используйте Xcode для просмотра логов
```

---

## 🛠️ Решение проблем

### Проблема: "No provisioning profile found"

**Решение:**
```bash
eas credentials
# Выберите iOS → Manage credentials → Select existing or create new
```

### Проблема: "Bundle identifier is already in use"

**Решение:**
- Проверьте, что Bundle ID `com.abuingush.iceberg` не используется другим приложением
- Или измените Bundle ID в `app.config.js`:
  ```js
  ios: {
    bundleIdentifier: 'com.abuingush.iceberg.yourname',
  }
  ```

### Проблема: Приложение не устанавливается на iPhone

**Решение:**
1. Убедитесь, что iPhone подключен к интернету
2. Проверьте, что UDID устройства добавлен в профиль разработчика
3. На iPhone: **Настройки** → **Основные** → **VPN и управление устройством** → Доверьте сертификату разработчика

### Проблема: Ошибка при подписании

**Решение:**
```bash
# Очистите credentials и создайте заново:
eas credentials
# Выберите iOS → Remove all credentials → Yes
# Затем создайте заново с Automatic
```

---

## 📝 Полезные команды

```bash
# Проверить статус credentials
eas credentials

# Просмотреть историю сборок
eas build:list

# Отменить текущую сборку
eas build:cancel [BUILD_ID]

# Скачать сборку
eas build:download [BUILD_ID]

# Посмотреть детали сборки
eas build:view [BUILD_ID]

# Проверить список устройств
eas device:list
```

---

## 🎯 Рекомендуемый workflow для тестирования

1. **Первая сборка:**
   ```bash
   npm run build:ios
   ```

2. **Установите на iPhone** через один из способов выше

3. **Тестируйте функционал**

4. **При необходимости внести изменения:**
   - Внесите изменения в код
   - Запустите сборку снова (версия будет автоматически увеличена)

5. **Для обновления через OTA (без пересборки):**
   ```bash
   eas update --branch preview --message "Исправления багов"
   ```

---

## 📚 Дополнительные ресурсы

- [Документация EAS Build](https://docs.expo.dev/build/introduction/)
- [iOS Credentials Guide](https://docs.expo.dev/app-signing/app-credentials/)
- [TestFlight Guide](https://docs.expo.dev/submit/testflight/)

---

## ✅ Чеклист перед первой сборкой

- [ ] Установлен EAS CLI (`npm install -g eas-cli`)
- [ ] Выполнен вход в Expo (`eas login`)
- [ ] Проверен Apple Developer аккаунт (активен)
- [ ] Настроены credentials через `eas credentials`
- [ ] Проверен Bundle Identifier в `app.config.js` (`com.abuingush.iceberg`)
- [ ] Все зависимости установлены (`npm install`)
- [ ] Готов к запуску сборки!

**Удачи с тестированием! 🚀**
