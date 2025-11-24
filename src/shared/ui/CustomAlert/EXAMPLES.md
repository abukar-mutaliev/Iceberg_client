# Примеры использования CustomAlert

## Пример 1: Замена Alert в OrderChoiceScreen ✅

### Было (стандартный Alert):
```javascript
Alert.alert('Ошибка', 'Нет товаров для удаления');
```

### Стало (CustomAlert):
```javascript
showError('Ошибка', 'Нет товаров для удаления');
```

---

## Пример 2: Alert с множественными опциями ✅

### Было:
```javascript
Alert.alert(
    'Заказ пуст',
    'После удаления недоступных товаров в заказе не осталось товаров для оплаты. Хотите выбрать похожие товары?',
    [
        {
            text: 'Выбрать товары',
            onPress: () => handleShowAlternativeProducts()
        },
        {
            text: 'Вернуться к корзине',
            style: 'cancel',
            onPress: () => navigation.navigate('Main', { screen: 'Cart' })
        }
    ]
);
```

### Стало:
```javascript
showAlert({
    type: 'warning',
    title: 'Заказ пуст',
    message: 'После удаления недоступных товаров в заказе не осталось товаров для оплаты. Хотите выбрать похожие товары?',
    buttons: [
        {
            text: 'Выбрать товары',
            style: 'primary',
            icon: 'swap-horiz',
            onPress: () => {
                setResponding(false);
                handleShowAlternativeProducts();
            }
        },
        {
            text: 'Вернуться к корзине',
            style: 'cancel',
            icon: 'shopping-cart',
            onPress: () => {
                setResponding(false);
                navigation.navigate('Main', { screen: 'Cart' });
            }
        }
    ]
});
```

---

## Пример 3: Подтверждение с деструктивным действием ✅

### Было:
```javascript
Alert.alert(
    'Отклонить предложение',
    'Вы уверены, что хотите отклонить все предложенные варианты? Заказ будет отменен.',
    [
        { text: 'Нет', style: 'cancel' },
        {
            text: 'Да, отклонить',
            style: 'destructive',
            onPress: async () => {
                // ... обработка
            }
        }
    ]
);
```

### Стало:
```javascript
showConfirm(
    'Отклонить предложение',
    'Вы уверены, что хотите отклонить все предложенные варианты? Заказ будет отменен.',
    async () => {
        // ... обработка при подтверждении
    }
);
```

---

## Пример 4: Обработка истекшей сессии ✅

### Было:
```javascript
if (err.isCriticalOperation) {
    Alert.alert(
        'Сессия истекла',
        'Ваша сессия истекла. Пожалуйста, войдите снова для продолжения оформления заказа.',
        [
            {
                text: 'Войти',
                onPress: () => navigation.navigate('Auth')
            },
            {
                text: 'Отмена',
                style: 'cancel'
            }
        ]
    );
}
```

### Стало:
```javascript
if (err.isCriticalOperation) {
    showAlert({
        type: 'error',
        title: 'Сессия истекла',
        message: 'Ваша сессия истекла. Пожалуйста, войдите снова для продолжения оформления заказа.',
        buttons: [
            {
                text: 'Отмена',
                style: 'cancel'
            },
            {
                text: 'Войти',
                style: 'primary',
                icon: 'login',
                onPress: () => navigation.navigate('Auth')
            }
        ]
    });
}
```

---

## Пример 5: Успешное выполнение с автозакрытием

```javascript
// После успешного сохранения
showSuccess('Сохранено!', 'Изменения успешно применены');
// Автоматически закроется через 2.5 секунды
```

---

## Пример 6: Информационное сообщение

```javascript
showInfo(
    'Новая функция',
    'Теперь вы можете выбирать товары на замену из ближайшего склада!',
    [
        {
            text: 'Попробовать',
            style: 'primary',
            icon: 'rocket-launch',
            onPress: () => openFeature()
        }
    ]
);
```

---

## Пример 7: Множественный выбор действий

```javascript
showAlert({
    type: 'warning',
    title: 'Товар недоступен',
    message: 'Выбранный товар временно недоступен. Что вы хотите сделать?',
    buttons: [
        {
            text: 'Выбрать замену',
            style: 'primary',
            icon: 'swap-horiz',
            onPress: () => selectAlternative(),
        },
        {
            text: 'Подождать поступления',
            style: 'cancel',
            icon: 'schedule',
            onPress: () => waitForStock(),
        },
        {
            text: 'Удалить из заказа',
            style: 'destructive',
            icon: 'delete',
            onPress: () => removeFromOrder(),
        },
    ],
});
```

---

## Интеграция в компонент

```javascript
import React from 'react';
import { View, Button } from 'react-native';
import { CustomAlert, useCustomAlert } from '@shared/ui/CustomAlert';

const MyComponent = () => {
    const { showAlert, showError, showSuccess, showConfirm, alertConfig, hideAlert } = useCustomAlert();

    const handleAction = async () => {
        try {
            await performAction();
            showSuccess('Готово!', 'Операция выполнена успешно');
        } catch (error) {
            showError('Ошибка', error.message);
        }
    };

    const handleDelete = () => {
        showConfirm(
            'Удалить элемент?',
            'Это действие нельзя будет отменить',
            () => {
                // Подтверждение - удаляем
                deleteItem();
            },
            () => {
                // Отмена - ничего не делаем
                console.log('Cancelled');
            }
        );
    };

    return (
        <View>
            <Button title="Выполнить действие" onPress={handleAction} />
            <Button title="Удалить" onPress={handleDelete} />
            
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

---

## Кастомные иконки

```javascript
showAlert({
    type: 'success',
    title: 'Промокод применен!',
    message: 'Скидка 20% добавлена к заказу',
    customIcon: 'local-offer', // Кастомная иконка вместо check-circle
    buttons: [
        {
            text: 'Продолжить',
            style: 'primary',
            onPress: () => continueCheckout()
        }
    ]
});
```

---

## Без кнопки закрытия

```javascript
showAlert({
    type: 'warning',
    title: 'Внимание',
    message: 'Обязательно выберите один из вариантов',
    showCloseButton: false, // Скрываем кнопку закрытия
    buttons: [
        {
            text: 'Вариант 1',
            style: 'primary',
            onPress: () => selectOption1()
        },
        {
            text: 'Вариант 2',
            style: 'primary',
            onPress: () => selectOption2()
        }
    ]
});
```

---

## Преимущества CustomAlert над стандартным Alert:

✅ **Красивый дизайн** - соответствует стилистике приложения  
✅ **Анимации** - плавное появление и исчезновение  
✅ **Иконки** - поддержка Material Icons на кнопках  
✅ **Гибкость** - полная кастомизация кнопок и типов  
✅ **Автозакрытие** - для success сообщений  
✅ **Типизация** - success, error, warning, info, confirm  
✅ **Консистентность** - единый стиль во всем приложении  
✅ **Лучший UX** - более понятные и красивые диалоги


