# Автоматическое скрытие TabBar при открытии клавиатуры

## Проблема

При открытии клавиатуры в экранах чата (DirectChatScreen, GroupChatScreen), поиска (SearchScreen) и авторизации (AuthScreen), нижний CustomTabBar оставался видимым, занимая ценное пространство экрана и мешая просмотру контента и полю ввода.

### Исправленная проблема v2

После первой реализации обнаружилась проблема: таб-бар скрывался, но белое пространство под ним оставалось, так как React Navigation резервирует место для TabBar независимо от его видимости.

## Решение

Реализовано автоматическое скрытие/показ нижнего таб-бара при открытии/закрытии клавиатуры **в экранах чата, поиска и авторизации** с использованием Context API для управления видимостью на уровне навигатора.

## Реализация

### Архитектура

Решение использует **Context API** для управления видимостью TabBar:

1. **TabBarContext** - хранит состояние видимости TabBar
2. **CustomTabBar** - отслеживает клавиатуру и обновляет context
3. **MainTabNavigator** - читает context и динамически изменяет `tabBarStyle`

### 1. TabBarContext.jsx (новый файл)

Создан контекст для управления видимостью TabBar:

```javascript
const TabBarContext = createContext({
    isTabBarVisible: true,
    hideTabBar: () => {},
    showTabBar: () => {},
});

export const TabBarProvider = ({ children }) => {
    const [isTabBarVisible, setIsTabBarVisible] = useState(true);
    // ... логика
};

export const useTabBar = () => useContext(TabBarContext);
```

**Почему Context?**
- Централизованное управление состоянием
- Позволяет навигатору реагировать на изменения
- Избегает prop drilling

### 2. CustomTabBar.jsx

#### Добавлены импорты:
```javascript
import { Keyboard, Platform } from 'react-native';
import { useTabBar } from '../../context';
```

#### Использование контекста:
```javascript
const { hideTabBar, showTabBar, isTabBarVisible } = useTabBar();
```

#### Условный рендеринг:
```javascript
// Если TabBar должен быть скрыт, не рендерим ничего
if (!isTabBarVisible) {
    return null;
}
```

**Ключевое решение:** Прямой условный рендеринг вместо изменения стилей. React Navigation не всегда корректно применяет динамические изменения `tabBarStyle`, поэтому используется `return null`.

#### Слушатели клавиатуры:
```javascript
useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
        (e) => {
            // Проверка, находимся ли в чате
            const currentRoute = state.routes[state.index];
            const isChatScreen = /* проверка маршрута */;
            
            if (isChatScreen) {
                hideTabBar(); // Скрываем через context
            }
        }
    );
    
    const keyboardWillHide = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
        () => {
            showTabBar(); // Показываем через context
        }
    );
    
    return () => {
        keyboardWillShow.remove();
        keyboardWillHide.remove();
    };
}, [hideTabBar, showTabBar, state.index, state.routes]);
```

**Ключевое отличие:** Вместо анимации используются `hideTabBar()` и `showTabBar()` из контекста.

#### 4. Проверка экрана чата, поиска и авторизации:
Реализована многоуровневая проверка для определения, находится ли пользователь в чате, поиске или авторизации:

```javascript
// Проверка чата
const isChatTab = currentRoute?.name === 'ChatList';
const hasChatRoom = currentRoute?.state?.routes?.some(route => 
    route.name === 'ChatRoom' || 
    route.name === 'ChatMain'
);
const hasNestedChatRoom = currentRoute?.state?.routes?.some(route => 
    route?.state?.routes?.some(nestedRoute => 
        nestedRoute.name === 'ChatRoom'
    )
);

// Проверка поиска
const isSearchTab = currentRoute?.name === 'Search';
const hasSearchMain = currentRoute?.state?.routes?.some(route => 
    route.name === 'SearchMain'
);

// Проверка авторизации (ProfileTab показывает AuthScreen когда не авторизован)
const isProfileTab = currentRoute?.name === 'ProfileTab';

const isChatScreen = isChatTab || hasChatRoom || hasNestedChatRoom;
const isSearchScreen = isSearchTab || hasSearchMain;
const isAuthScreen = isProfileTab;

// Скрываем для всех случаев
if (isChatScreen || isSearchScreen || isAuthScreen) {
    hideTabBar();
}
```

Это покрывает все варианты навигации:
- **Чат:** ChatList, ChatRoom, ChatMain, глубоко вложенные маршруты
- **Поиск:** Search таб, SearchMain экран
- **Авторизация:** ProfileTab (когда пользователь не авторизован)

#### 5. Применение анимации:
```javascript
<Animated.View 
    style={[
        styles.menuDoneWithBack,
        {
            transform: [{ translateY: slideAnim }],
        }
    ]}
>
    {/* Контент TabBar */}
</Animated.View>
```

## Особенности

### Платформенные различия:

**iOS:**
- Использует `keyboardWillShow/keyboardWillHide` - срабатывают **до** анимации клавиатуры
- Анимация TabBar синхронизирована с анимацией клавиатуры
- Длительность анимации: 250ms

**Android:**
- Использует `keyboardDidShow/keyboardDidHide` - срабатывают **после** появления клавиатуры
- Более быстрая анимация: 200ms
- Может быть небольшая задержка из-за `adjustResize` в манифесте

### Почему только в чате, поиске и авторизации?

Скрытие TabBar происходит **только в экранах чата, поиска и авторизации**, потому что:
1. **Чат:** клавиатура открывается часто и надолго, нужно максимум места для просмотра сообщений
2. **Поиск:** активно используется поле ввода, нужно больше места для результатов
3. **Авторизация:** формы входа/регистрации требуют много места для полей ввода
4. В других экранах (главная, корзина, избранное) TabBar не мешает работе

## Работа с adjustResize

Эта функция **совместима** с исправлением клавиатуры из `ANDROID_KEYBOARD_FIX.md`:

1. **AndroidManifest.xml** использует `adjustResize` - правильно изменяет размер окна
2. **CustomTabBar** дополнительно скрывается в чате - освобождает еще больше места
3. Вместе они обеспечивают идеальный UX для чатов

## Тестирование

### Проверьте следующие сценарии:

1. **Открытие клавиатуры в чате:**
   - [ ] TabBar полностью исчезает (включая белое пространство)
   - [ ] Поле ввода остается видимым
   - [ ] Сообщения не закрываются клавиатурой

2. **Открытие клавиатуры в поиске:**
   - [ ] TabBar полностью исчезает
   - [ ] Результаты поиска получают больше места
   - [ ] Поле поиска и результаты видны полностью

3. **Открытие клавиатуры в авторизации:**
   - [ ] TabBar полностью исчезает (в ProfileTab когда не авторизован)
   - [ ] Формы входа/регистрации получают больше места
   - [ ] Все поля ввода видны над клавиатурой

4. **Закрытие клавиатуры:**
   - [ ] TabBar появляется обратно
   - [ ] Нет задержек или глюков

5. **Переключение между табами:**
   - [ ] В других табах (Главная, Корзина, Избранное) TabBar не скрывается
   - [ ] TabBar остается видимым при вводе в других формах

6. **Различные типы чатов:**
   - [ ] Работает в DirectChatScreen (личные чаты)
   - [ ] Работает в GroupChatScreen (групповые чаты)
   - [ ] Работает в BROADCAST каналах

7. **Переход между экранами:**
   - [ ] Из ChatList в ChatRoom - TabBar скрывается
   - [ ] Из Search в SearchResults - TabBar скрывается при вводе
   - [ ] В ProfileTab (не авторизован) - TabBar скрывается
   - [ ] Обратно из любого экрана - TabBar появляется
   - [ ] При быстром переключении нет глюков

## Отладка

Включено логирование в dev режиме:

```javascript
if (__DEV__) {
    console.log('⌨️ Keyboard shown in tab:', {
        currentTab: currentRoute?.name,
        isChatScreen,
        keyboardHeight: e.endCoordinates.height
    });
}
```

Проверьте консоль для отладки:
- Какой таб активен при открытии клавиатуры
- Правильно ли определяется экран чата
- Высота клавиатуры

## Известные ограничения

1. **Android с adjustPan:**
   - Если в манифесте стоит `adjustPan` вместо `adjustResize`, поведение может быть некорректным
   - Убедитесь, что используется `adjustResize` (см. ANDROID_KEYBOARD_FIX.md)

2. **Быстрое переключение:**
   - При очень быстром переключении между табами во время анимации клавиатуры может быть небольшая задержка
   - Это нормально и не влияет на UX

3. **Кастомные клавиатуры:**
   - Некоторые сторонние клавиатуры могут не вызывать события правильно
   - Протестируйте с разными клавиатурами

## Производительность

Использование `useNativeDriver: true` обеспечивает:
- ✅ Плавную 60 FPS анимацию
- ✅ Анимация выполняется на нативной стороне
- ✅ Не блокирует JS поток
- ✅ Минимальное потребление ресурсов

## Будущие улучшения

Потенциальные улучшения:

1. **Адаптивная высота:**
   Вместо фиксированного `translateY: 100`, использовать высоту клавиатуры:
   ```javascript
   toValue: e.endCoordinates.height
   ```

2. **Кастомная кривая анимации:**
   Можно добавить easing для более естественного движения:
   ```javascript
   Easing.bezier(0.25, 0.1, 0.25, 1)
   ```

3. **Настройка через конфиг:**
   Добавить возможность включать/выключать эту функцию через featureFlags

## История изменений

- **2024-12-17**: Реализовано автоматическое скрытие TabBar в чате при открытии клавиатуры
  - Добавлены слушатели Keyboard API
  - Реализована анимация скрытия/показа
  - Добавлена проверка экрана чата
  - Поддержка iOS и Android

## Связанные документы

- [ANDROID_KEYBOARD_FIX.md](./ANDROID_KEYBOARD_FIX.md) - Исправление проблем с клавиатурой на Android
- [STAFF_ORDERS_REFRESH_FIX.md](./STAFF_ORDERS_REFRESH_FIX.md) - Работа с заказами

