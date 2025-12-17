# Исправление проблемы с клавиатурой на Android

## Проблема

На некоторых Android устройствах в продакшн сборке (AAB) при открытии клавиатуры:
- Поле ввода остается под клавиатурой (не поднимается)
- Верхняя шапка растягивается вниз, образуя белое пространство
- Особенно заметно в экранах чата (DirectChatScreen, GroupChatScreen)

## Причина

В `AndroidManifest.xml` использовался неправильный режим:
```xml
android:windowSoftInputMode="adjustPan|stateHidden"
```

**`adjustPan`** - сдвигает всё окно вверх, что приводит к:
- Неправильному позиционированию элементов
- Растягиванию header'а
- Полю ввода под клавиатурой

## Решение

### 1. AndroidManifest.xml
Изменили на `adjustResize`:
```xml
android:windowSoftInputMode="adjustResize"
```

**`adjustResize`** - изменяет размер окна, правильно компенсируя клавиатуру:
- Контент автоматически поднимается
- Header остается на месте
- Поле ввода всегда видно

### 2. app.config.js
Добавили настройку для EAS Build:
```javascript
android: {
    // ...
    softwareKeyboardLayoutMode: 'resize',
    // ...
}
```

Это гарантирует, что при каждой сборке через EAS Build применяется правильная настройка.

### 3. KeyboardAvoidingView в экранах

Обновили поведение в экранах с формами:

**AuthScreen.jsx:**
```jsx
<KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={0}
>
```

**Другие экраны (CheckoutScreen, GuestCheckoutScreen, AddProductScreen):**
```jsx
<KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
>
```

## Рекомендации

### Для новых экранов с вводом текста:

1. **Используйте `KeyboardAvoidingView` с правильным behavior:**
   ```jsx
   <KeyboardAvoidingView
       behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
       style={{ flex: 1 }}
   >
       {/* Контент с полями ввода */}
   </KeyboardAvoidingView>
   ```

2. **Для экранов чата** - не используйте KeyboardAvoidingView, `adjustResize` работает автоматически

3. **Для модальных окон** - используйте `behavior="padding"` на обеих платформах

### Тестирование

После внесения изменений обязательно протестируйте на:
- ✅ Реальных Android устройствах (не только эмулятор)
- ✅ Разных размерах экранов (маленькие/большие)
- ✅ Продакшн сборке (AAB), не только dev

### Отладка проблем с клавиатурой

Если проблема сохраняется:

1. **Проверьте AndroidManifest.xml:**
   ```bash
   # В продакшн сборке
   cd android/app/src/main
   cat AndroidManifest.xml | grep windowSoftInputMode
   ```
   Должно быть: `android:windowSoftInputMode="adjustResize"`

2. **Проверьте app.config.js:**
   ```javascript
   android: {
       softwareKeyboardLayoutMode: 'resize', // Должно быть 'resize'
   }
   ```

3. **Логирование в dev режиме:**
   ```javascript
   useEffect(() => {
       const keyboardDidShow = Keyboard.addListener('keyboardDidShow', (e) => {
           console.log('Keyboard height:', e.endCoordinates.height);
       });
       return () => keyboardDidShow.remove();
   }, []);
   ```

## История изменений

- **2024-12-17**: Исправлена проблема с клавиатурой на Android
  - Изменено `adjustPan` → `adjustResize` в AndroidManifest.xml
  - Добавлено `softwareKeyboardLayoutMode: 'resize'` в app.config.js
  - Обновлен KeyboardAvoidingView в AuthScreen.jsx

## Ссылки

- [Android windowSoftInputMode документация](https://developer.android.com/guide/topics/manifest/activity-element#wsoft)
- [React Native KeyboardAvoidingView](https://reactnative.dev/docs/keyboardavoidingview)
- [Expo softwareKeyboardLayoutMode](https://docs.expo.dev/versions/latest/config/app/#softwarekeyboardlayoutmode)


