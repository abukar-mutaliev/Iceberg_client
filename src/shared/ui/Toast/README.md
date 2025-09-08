# Toast Notifications

Красивый и переиспользуемый компонент для отображения уведомлений в приложении с плавной анимацией slide up/down.

## Использование

### 1. Импорт хука

```jsx
import { useToast } from '@shared/ui/Toast';
```

### 2. Использование в компоненте

```jsx
const MyComponent = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  const handleSuccess = () => {
    showSuccess('Операция выполнена успешно!');
  };

  const handleError = () => {
    showError('Произошла ошибка');
  };

  return (
    <TouchableOpacity onPress={handleSuccess}>
      <Text>Показать успех</Text>
    </TouchableOpacity>
  );
};
```

## API

### useToast хук

Возвращает функции для отображения различных типов уведомлений:

- `showSuccess(message, options?)` - Зеленое уведомление об успехе
- `showError(message, options?)` - Красное уведомление об ошибке
- `showWarning(message, options?)` - Желтое уведомление с предупреждением
- `showInfo(message, options?)` - Синее информационное уведомление
- `showCustom(config)` - Кастомное уведомление с полными настройками

### Опции

```jsx
const options = {
  duration: 3000,        // Длительность в мс (0 = бесконечно)
  position: 'top',       // 'top' или 'bottom'
  icon: '✓',             // Кастомная иконка
  action: true,          // Показать кнопку действия
  actionText: 'Открыть', // Текст кнопки действия
  onActionPress: () => { // Обработчик нажатия на действие
    console.log('Action pressed!');
  }
};
```

### Кастомное уведомление

```jsx
showCustom({
  message: 'Кастомное сообщение',
  type: 'info',
  duration: 5000,
  position: 'top',
  icon: 'ℹ',
  action: true,
  actionText: 'Подробно',
  onActionPress: () => {
    // Действие при нажатии
  }
});
```

## Стилизация

Компонент использует стили из `@app/styles/GlobalStyles`:

- **Colors**: success (#34C759), error (#FF3B30), warning (#FFCC00), info (primary #3339B0)
- **Border radius**: br_3xs (10px)
- **Shadows**: card shadow
- **Typography**: SF Pro fonts

## Особенности

- ✅ Плавная анимация slide up/down
- ✅ Поддержка нескольких типов уведомлений
- ✅ Возможность добавления действий
- ✅ Автоматическое исчезновение
- ✅ Настраиваемая длительность
- ✅ Переиспользуемый дизайн
- ✅ Поддержка позиционирования (top/bottom)

## Пример интеграции

Замените `Alert.alert` на Toast:

```jsx
// Было
Alert.alert('Успех', 'Данные сохранены');

// Стало
showSuccess('Данные сохранены');
```

Или с действием:

```jsx
showCustom({
  message: 'Заказ создан успешно',
  type: 'success',
  action: true,
  actionText: 'Посмотреть',
  onActionPress: () => navigation.navigate('OrderDetails')
});
```



