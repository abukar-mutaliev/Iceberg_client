## Чат (Mobile)

### Навигация
- Раздел доступен для авторизованных пользователей: `ChatList`, `ChatRoom` (под фичефлагом `featureFlags.chat`).
- Из карточки товара: кнопка «Задать вопрос» вызывает создание/получение PRODUCT-комнаты и переводит в `ChatRoom`.
- Репост товара: при переходе в `ChatRoom` можно передать `productId` в `route.params` — появится кнопка «Отправить товар» в шапке.

### Где искать код
- `entities/chat/api/chatApi.js` — REST методы `/api/chat`.
- `entities/chat/model/slice.js` — Redux slice, thunks, кэш AsyncStorage.
- `entities/chat/model/selectors.js` — селекторы.
- `entities/chat/ui/` — UI: `MessageBubble`, `Composer`, `AttachmentPreview`, `ChatBackground`.
- `entities/chat/hooks/useChatSocket.js` — сокеты (Socket.IO клиент).
- `screens/chat/ui/ChatListScreen.jsx`, `ChatRoomScreen.jsx` — экраны списка и комнаты.
- `screens/product/ProductDetailScreen/ui/ProductDetailScreen.jsx` — интеграция кнопки «Задать вопрос».

### Включение раздела
- В `mobile/src/shared/config/featureFlags.js` должен быть `chat: true`.
- Раздел скрыт для гостей: экраны зарегистрированы внутри авторизованного стека.

### Зависимости
- `socket.io-client`, `expo-image-manipulator`, `@react-native-async-storage/async-storage` (уже используются в проекте/добавлены).

### Известные ограничения (MVP)
- Бейджи непрочитанных в списке зависят от данных сервера/или локального подсчёта.
- Статусы доставки/прочтения отображаются, если сервер их присылает в сообщениях.

