# CustomAlert - Универсальный компонент всплывающих окон

Красивый и гибкий компонент для замены стандартных Alert в приложении.

## 🎨 Типы Alert

- `success` - Успешное выполнение операции (зеленый)
- `error` - Ошибка (красный)
- `warning` - Предупреждение (желтый)
- `info` - Информация (фиолетовый)
- `confirm` - Подтверждение действия (оранжевый)

## 📦 Установка

### Вариант 1: Глобальный провайдер (рекомендуется)

Оберните приложение в `CustomAlertProvider`:

```jsx
// App.jsx или AppContainer.jsx
import { CustomAlertProvider } from '@shared/ui/CustomAlert';

export const App = () => {
    return (
        <CustomAlertProvider>
            <YourApp />
        </CustomAlertProvider>
    );
};
```

### Вариант 2: Локальный хук

Используйте `useCustomAlert` в конкретном компоненте.

## 🚀 Использование

### Глобальный Alert (с провайдером)

```jsx
import { useGlobalAlert } from '@shared/ui/CustomAlert';

const MyComponent = () => {
    const { showSuccess, showError, showConfirm } = useGlobalAlert();

    const handleSuccess = () => {
        showSuccess(
            'Успешно!',
            'Операция выполнена успешно'
        );
    };

    const handleError = () => {
        showError(
            'Ошибка',
            'Что-то пошло не так',
            [
                {
                    text: 'Попробовать снова',
                    style: 'primary',
                    onPress: () => console.log('Retry'),
                }
            ]
        );
    };

    const handleDelete = () => {
        showConfirm(
            'Удалить элемент?',
            'Это действие нельзя будет отменить',
            () => console.log('Deleted'), // onConfirm
            () => console.log('Cancelled') // onCancel
        );
    };

    return (
        <View>
            <Button title="Success" onPress={handleSuccess} />
            <Button title="Error" onPress={handleError} />
            <Button title="Confirm" onPress={handleDelete} />
        </View>
    );
};
```

### Локальный Alert (с хуком)

```jsx
import { useCustomAlert } from '@shared/ui/CustomAlert';
import { CustomAlert } from '@shared/ui/CustomAlert';

const MyComponent = () => {
    const { showAlert, alertConfig, hideAlert } = useCustomAlert();

    const handleShowAlert = () => {
        showAlert({
            type: 'success',
            title: 'Готово!',
            message: 'Ваши данные сохранены',
            autoClose: true,
            autoCloseDuration: 2000,
        });
    };

    return (
        <View>
            <Button title="Show Alert" onPress={handleShowAlert} />
            <CustomAlert
                visible={alertConfig.visible}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
                onClose={hideAlert}
                autoClose={alertConfig.autoClose}
                autoCloseDuration={alertConfig.autoCloseDuration}
                showCloseButton={alertConfig.showCloseButton}
                customIcon={alertConfig.customIcon}
            />
        </View>
    );
};
```

### Прямое использование компонента

```jsx
import { CustomAlert } from '@shared/ui/CustomAlert';

const MyComponent = () => {
    const [visible, setVisible] = useState(false);

    return (
        <View>
            <Button title="Show" onPress={() => setVisible(true)} />
            <CustomAlert
                visible={visible}
                type="warning"
                title="Внимание!"
                message="Вы уверены, что хотите продолжить?"
                onClose={() => setVisible(false)}
                buttons={[
                    {
                        text: 'Отмена',
                        style: 'cancel',
                        onPress: () => setVisible(false),
                    },
                    {
                        text: 'Продолжить',
                        style: 'primary',
                        icon: 'arrow-forward',
                        onPress: () => {
                            console.log('Continue');
                            setVisible(false);
                        },
                    },
                ]}
            />
        </View>
    );
};
```

## 🎛️ API

### Props компонента CustomAlert

| Prop | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `visible` | boolean | `false` | Видимость Alert |
| `type` | string | `'info'` | Тип: 'success', 'error', 'warning', 'info', 'confirm' |
| `title` | string | `''` | Заголовок |
| `message` | string | `''` | Сообщение |
| `buttons` | array | `[]` | Массив кнопок |
| `onClose` | function | `() => {}` | Callback при закрытии |
| `autoClose` | boolean | `false` | Автоматическое закрытие |
| `autoCloseDuration` | number | `3000` | Время до авто-закрытия (мс) |
| `showCloseButton` | boolean | `true` | Показывать кнопку закрытия |
| `customIcon` | string | `null` | Кастомная иконка (Material Icons) |

### Структура кнопки

```javascript
{
    text: 'Текст кнопки',           // Обязательно
    style: 'primary',               // 'primary', 'cancel', 'destructive'
    icon: 'check',                  // Иконка Material Icons (опционально)
    onPress: () => {},              // Callback при нажатии
    closeOnPress: true,             // Закрывать Alert при нажатии (по умолчанию true)
}
```

### Методы хука useGlobalAlert

- `showAlert(config)` - Универсальный метод показа Alert
- `hideAlert()` - Скрыть Alert
- `showSuccess(title, message, buttons?)` - Показать успех
- `showError(title, message, buttons?)` - Показать ошибку
- `showWarning(title, message, buttons?)` - Показать предупреждение
- `showInfo(title, message, buttons?)` - Показать информацию
- `showConfirm(title, message, onConfirm, onCancel?)` - Показать подтверждение

## 📝 Примеры использования

### Простое уведомление с авто-закрытием

```jsx
showSuccess('Сохранено!', 'Изменения применены');
```

### Ошибка с кнопкой повтора

```jsx
showError(
    'Ошибка сети',
    'Не удалось загрузить данные',
    [
        {
            text: 'Повторить',
            style: 'primary',
            icon: 'refresh',
            onPress: () => retryRequest(),
        }
    ]
);
```

### Подтверждение удаления

```jsx
showConfirm(
    'Удалить товар?',
    'Это действие нельзя будет отменить',
    () => deleteProduct(), // Подтверждение
    () => console.log('Cancelled') // Отмена
);
```

### Множество кнопок

```jsx
showAlert({
    type: 'warning',
    title: 'Выберите действие',
    message: 'Товар недоступен. Что вы хотите сделать?',
    buttons: [
        {
            text: 'Выбрать замену',
            style: 'primary',
            icon: 'swap-horiz',
            onPress: () => selectAlternative(),
        },
        {
            text: 'Удалить',
            style: 'destructive',
            icon: 'delete',
            onPress: () => removeItem(),
        },
        {
            text: 'Отмена',
            style: 'cancel',
            onPress: () => {},
        },
    ],
});
```

### Кастомная иконка

```jsx
showAlert({
    type: 'info',
    title: 'Специальное предложение',
    message: 'Скидка 20% на все товары!',
    customIcon: 'local-offer',
    buttons: [
        {
            text: 'Перейти к покупкам',
            style: 'primary',
            onPress: () => navigateToShop(),
        }
    ],
});
```

## 🎨 Стилизация

Компонент использует цвета и стили из `GlobalStyles.js`:
- Цвета: `Color.success`, `Color.error`, `Color.warning`, `Color.purpleSoft`
- Шрифты: `FontFamily.sFProDisplay`, `FontFamily.sFProText`
- Тени: `Shadow.heavy`, `Shadow.button`

Вы можете изменить стили в `CustomAlert.jsx` если нужно.

## ✨ Анимации

- Плавное появление с масштабированием (spring animation)
- Анимация исчезновения
- Поддержка как iOS так и Android

## 🔄 Замена стандартных Alert

### Было:
```jsx
Alert.alert('Ошибка', 'Что-то пошло не так', [
    { text: 'OK', onPress: () => {} }
]);
```

### Стало:
```jsx
showError('Ошибка', 'Что-то пошло не так');
```

Или с кнопкой:
```jsx
showError('Ошибка', 'Что-то пошло не так', [
    { text: 'OK', style: 'primary', onPress: () => {} }
]);
```


