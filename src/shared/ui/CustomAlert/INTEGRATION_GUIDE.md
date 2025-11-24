# Руководство по интеграции CustomAlert

## 🚀 Быстрый старт

### Шаг 1: Глобальная интеграция (рекомендуется)

Найдите корневой компонент приложения (обычно `App.jsx` или `AppContainer.jsx`) и оберните его в `CustomAlertProvider`:

```javascript
// mobile/src/app/AppContainer.jsx (или аналогичный файл)
import { CustomAlertProvider } from '@shared/ui/CustomAlert';

export const AppContainer = () => {
    return (
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <CustomAlertProvider>  {/* Добавить эту обертку */}
                    <NavigationContainer>
                        <RootNavigator />
                    </NavigationContainer>
                </CustomAlertProvider>  {/* Закрывающий тег */}
            </PersistGate>
        </Provider>
    );
};
```

### Шаг 2: Использование в компонентах

После глобальной интеграции используйте хук `useGlobalAlert` в любом компоненте:

```javascript
import { useGlobalAlert } from '@shared/ui/CustomAlert';

const MyComponent = () => {
    const { showError, showSuccess, showConfirm } = useGlobalAlert();

    const handleSubmit = async () => {
        try {
            await submitData();
            showSuccess('Успешно!', 'Данные сохранены');
        } catch (error) {
            showError('Ошибка', error.message);
        }
    };

    return (
        // ... ваш компонент
    );
};
```

## 📝 Замена существующих Alert

### Простая замена:

#### Было:
```javascript
import { Alert } from 'react-native';

Alert.alert('Ошибка', 'Что-то пошло не так');
```

#### Стало:
```javascript
import { useGlobalAlert } from '@shared/ui/CustomAlert';

const { showError } = useGlobalAlert();
showError('Ошибка', 'Что-то пошло не так');
```

### Замена с кнопками:

#### Было:
```javascript
Alert.alert(
    'Удалить?',
    'Вы уверены?',
    [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', onPress: () => deleteItem() }
    ]
);
```

#### Стало:
```javascript
const { showConfirm } = useGlobalAlert();
showConfirm(
    'Удалить?',
    'Вы уверены?',
    () => deleteItem(), // onConfirm
    () => {}            // onCancel (опционально)
);
```

## 🎨 Типы Alert

| Метод | Тип | Цвет | Иконка | Использование |
|-------|-----|------|--------|---------------|
| `showSuccess()` | success | Зеленый | check-circle | Успешные операции |
| `showError()` | error | Красный | error | Ошибки |
| `showWarning()` | warning | Желтый | warning | Предупреждения |
| `showInfo()` | info | Фиолетовый | info | Информация |
| `showConfirm()` | confirm | Оранжевый | help-outline | Подтверждения |

## 🛠️ Расширенное использование

### Кастомные кнопки с иконками:

```javascript
const { showAlert } = useGlobalAlert();

showAlert({
    type: 'warning',
    title: 'Товар недоступен',
    message: 'Выберите один из вариантов',
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

### Автозакрытие:

```javascript
showAlert({
    type: 'success',
    title: 'Готово!',
    message: 'Операция завершена',
    autoClose: true,
    autoCloseDuration: 2000, // 2 секунды
});
```

### Без кнопки закрытия:

```javascript
showAlert({
    type: 'warning',
    title: 'Выберите действие',
    message: 'Необходимо выбрать один из вариантов',
    showCloseButton: false,
    buttons: [
        { text: 'Вариант 1', style: 'primary', onPress: () => {} },
        { text: 'Вариант 2', style: 'primary', onPress: () => {} },
    ],
});
```

## 📦 Локальное использование (без провайдера)

Если не хотите использовать глобальный провайдер, можно использовать компонент локально:

```javascript
import { CustomAlert, useCustomAlert } from '@shared/ui/CustomAlert';

const MyComponent = () => {
    const { showAlert, alertConfig, hideAlert } = useCustomAlert();

    return (
        <View>
            {/* Ваш компонент */}
            <Button 
                title="Show Alert" 
                onPress={() => showAlert({
                    type: 'info',
                    title: 'Привет!',
                    message: 'Это локальный alert'
                })} 
            />
            
            {/* CustomAlert компонент */}
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

## ✅ Чек-лист интеграции

- [ ] Обернуть корневой компонент в `CustomAlertProvider`
- [ ] Заменить `import { Alert } from 'react-native'` на `import { useGlobalAlert } from '@shared/ui/CustomAlert'`
- [ ] Заменить `Alert.alert()` на `showError()`, `showSuccess()` и т.д.
- [ ] Обновить обработчики кнопок при необходимости
- [ ] Протестировать все существующие Alert в приложении

## 🎯 Преимущества

✅ Единый стиль во всем приложении  
✅ Красивые анимации  
✅ Поддержка иконок на кнопках  
✅ Автозакрытие для success сообщений  
✅ Гибкая кастомизация  
✅ Лучший UX по сравнению со стандартным Alert  
✅ Соответствие дизайну приложения

## 📚 Дополнительные ресурсы

- `README.md` - Полная документация API
- `EXAMPLES.md` - Примеры из реального кода
- `CustomAlert.jsx` - Исходный код компонента


