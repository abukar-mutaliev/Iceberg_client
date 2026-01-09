# Исправление совместимости с Android 15/16

## Проблемы от Google Play

### 1. Использование deprecated APIs для edge-to-edge отображения (Android 15+)

**Ошибка:**
```
Один или несколько используемых вами параметров для отображения от края до края или API 
не поддерживаются в Android 15. Параметры и API, задействованные в вашем приложении:

- android.view.Window.getStatusBarColor
- android.view.Window.setStatusBarColor
- android.view.Window.setNavigationBarColor

Их расположение:
- com.facebook.react.modules.statusbar.StatusBarModule$b.runGuarded
- com.facebook.react.modules.statusbar.StatusBarModule.getTypedExportedConstants
- com.facebook.react.views.view.WindowUtilKt.enableEdgeToEdge
```

### 2. Ограничения на изменение размера и ориентации (Android 16+)

**Ошибка:**
```
Удалите из приложения ограничения на изменение размера и ориентации, чтобы оно 
поддерживало устройства с большим экраном. Начиная с Android 16, Android будет 
игнорировать ограничения на изменение размера и ориентации на устройствах с 
большим экраном (например, складных телефонах и планшетах).

Мы обнаружили в вашем приложении следующие ограничения:
<activity android:name="com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity" 
          android:screenOrientation="PORTRAIT" />
```

## Решение

### 1. Кастомный StatusBar модуль (EdgeToEdgeStatusBarModule)

Создан кастомный нативный модуль для замены deprecated Status Bar APIs:

**Файл:** `android/app/src/main/java/com/abuingush/iceberg/EdgeToEdgeStatusBarModule.kt`

**Что делает:**
- Использует `WindowInsetsControllerCompat` вместо deprecated `Window.setStatusBarColor/getStatusBarColor`
- Предоставляет методы `setBarStyle()`, `setHidden()`, `setTranslucent()` для управления status bar
- Полностью совместим с Android 15+ edge-to-edge требованиями

**Регистрация:**
- Создан `EdgeToEdgePackage.kt` для регистрации модуля
- Добавлен в `MainApplication.kt` в список packages

### 2. Обновление MainActivity.kt

**Что изменено:**
- Используется `WindowCompat.setDecorFitsSystemWindows(window, false)` для edge-to-edge
- Используется `WindowInsetsControllerCompat` для управления status/navigation bars
- Полностью удалены вызовы deprecated APIs

### 3. ProGuard Rules

**Файл:** `android/app/proguard-rules.pro`

**Добавлены правила:**
```proguard
# Удаляем вызовы deprecated Status Bar APIs из React Native
-assumenosideeffects class android.view.Window {
    public int getStatusBarColor();
    public void setStatusBarColor(int);
    public void setNavigationBarColor(int);
}

# Сохраняем WindowInsetsControllerCompat - правильный API для Android 15+
-keep class androidx.core.view.WindowInsetsControllerCompat { *; }
-keep class androidx.core.view.WindowCompat { *; }

# Удаляем неиспользуемые методы из React Native StatusBar модуля
-assumenosideeffects class com.facebook.react.modules.statusbar.StatusBarModule {
    *** getTypedExportedConstants(...);
}
```

### 4. AndroidManifest.xml - Поддержка больших экранов

**Что изменено:**

1. **Application tag:**
```xml
<application ... android:resizeableActivity="true">
```

2. **ML Kit Barcode Scanner Activity:**
```xml
<activity
    android:name="com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity"
    tools:node="merge"
    tools:replace="android:screenOrientation"
    android:screenOrientation="unspecified"
    android:resizeableActivity="true"
    android:exported="false" />
```

3. **MainActivity:**
```xml
<activity 
    android:name=".MainActivity" 
    android:configChanges="keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize"
    android:resizeableActivity="true"
    ... />
```

**Добавлен `smallestScreenSize`** в `configChanges` для правильной обработки изменений размера на больших экранах.

### 5. app.plugin.js - Android 15/16 Compatibility Plugin

**Добавлен плагин:** `withAndroid15Compatibility`

**Что делает:**
- Автоматически добавляет `android:resizeableActivity="true"` в application tag
- Обновляет `configChanges` для MainActivity, добавляя `screenSize`, `smallestScreenSize`, `screenLayout`, `orientation`
- Обеспечивает поддержку split-screen и freeform режимов на больших экранах

## Технические детали

### Edge-to-Edge в Android 15+

В Android 15+ Google требует использования edge-to-edge отображения и отказа от deprecated APIs:

**❌ Deprecated (старый подход):**
```kotlin
window.statusBarColor = Color.TRANSPARENT
window.navigationBarColor = Color.TRANSPARENT
```

**✅ Правильно (новый подход):**
```kotlin
WindowCompat.setDecorFitsSystemWindows(window, false)
val insetsController = WindowInsetsControllerCompat(window, window.decorView)
insetsController.isAppearanceLightStatusBars = true
```

### Поддержка больших экранов в Android 16+

Android 16+ будет игнорировать ограничения на изменение размера и ориентации на больших экранах. Чтобы избежать проблем:

1. **Удалить `android:screenOrientation="portrait"`** или установить `"unspecified"`
2. **Добавить `android:resizeableActivity="true"`** для явной поддержки изменения размера
3. **Добавить `smallestScreenSize`** в `configChanges` для правильной обработки событий

## Тестирование

### Перед загрузкой в Google Play:

1. **Пересоберите AAB bundle:**
```bash
cd mobile
eas build --platform android --profile production
```

2. **Проверьте отсутствие deprecated APIs:**
   - Google Play Console автоматически проверит AAB
   - Убедитесь, что предупреждения исчезли

3. **Тестирование на больших экранах:**
   - Протестируйте на планшете или складном устройстве
   - Проверьте split-screen режим
   - Проверьте поворот экрана

4. **Тестирование edge-to-edge:**
   - Проверьте, что status bar прозрачен
   - Проверьте, что контент правильно отображается под status bar
   - Проверьте SafeAreaView работает корректно

## Изменения в коде приложения

### Не требуется изменений в React Native коде!

Все изменения на нативном уровне. Ваш React Native код с `StatusBar` компонентом продолжит работать:

```jsx
import { StatusBar } from 'react-native';

<StatusBar barStyle="light-content" />
```

Наш кастомный `EdgeToEdgeStatusBarModule` автоматически перехватит эти вызовы и использует правильные APIs.

## Проверка результата

После загрузки обновленного AAB в Google Play Console:

1. ✅ Предупреждение о deprecated Status Bar APIs должно исчезнуть
2. ✅ Предупреждение об ограничениях ориентации должно исчезнуть
3. ✅ Приложение должно пройти все проверки Google Play

## Дополнительные ресурсы

- [Android 15 Edge-to-Edge Enforcement](https://developer.android.com/about/versions/15/behavior-changes-15#edge-to-edge)
- [WindowInsetsControllerCompat Documentation](https://developer.android.com/reference/androidx/core/view/WindowInsetsControllerCompat)
- [Large Screen Support](https://developer.android.com/guide/topics/large-screens)
- [Android 16 Resizability Changes](https://developer.android.com/about/versions/16/behavior-changes-16)

## Версия изменений

- **Дата:** 5 января 2026
- **Версия приложения:** 1.4.1
- **Android versionCode:** 41
- **Затронутые файлы:**
  - `android/app/src/main/java/com/abuingush/iceberg/EdgeToEdgeStatusBarModule.kt` (новый)
  - `android/app/src/main/java/com/abuingush/iceberg/EdgeToEdgePackage.kt` (новый)
  - `android/app/src/main/java/com/abuingush/iceberg/MainActivity.kt` (обновлен)
  - `android/app/src/main/java/com/abuingush/iceberg/MainApplication.kt` (обновлен)
  - `android/app/src/main/AndroidManifest.xml` (обновлен)
  - `android/app/proguard-rules.pro` (обновлен)
  - `app.plugin.js` (обновлен)

