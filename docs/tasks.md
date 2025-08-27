## План работ: Chat (Mobile)

Основано на: `mobile/docs/CHATrequirements.md`, `mobile/docs/CHATdesign.md`.

### Цели спринта (MVP)
- Список чатов, экран комнаты, отправка TEXT/IMAGE/PRODUCT, PRODUCT-чат из карточки товара, сокеты (получение новых сообщений, typing), счетчики непрочитанного, курсорная пагинация.

## Этапы и задачи

### Этап 0 — Подготовка
- [ ] Обновить зависимости (при необходимости): `socket.io-client`, `expo-image-manipulator`, `@react-native-community/netinfo`
- [ ] В `.env`/конфиге убедиться в правильном `BASE_URL` и авторизации (в `shared/api/api.js` уже есть логика 401/429)
- [ ] Добавить раздел чата в навигацию (пока скрыт за фичефлагом/условием авторизации)

### Этап 1 — API слой (entities/chat/api)
- [ ] Создать `entities/chat/api/chatApi.js` через `createApiModule('/api/chat')`
- [ ] Методы:
  - [ ] `getRooms({ page, limit })`
  - [ ] `getMessages(roomId, { limit, cursorId, direction })`
  - [ ] `createRoom(formData)` (multipart)
  - [ ] `getOrCreateProductRoom(productId)`
  - [ ] `updateRoom(roomId, formData)` (multipart)
  - [ ] `addMembers(roomId, { userIds, makeAdmins })`
  - [ ] `removeMember(roomId, userId)`
  - [ ] `sendMessage(roomId, formData)` (multipart: images[], captions(JSON), content, type, productId)
  - [ ] `deleteMessage(messageId, { forAll })`
  - [ ] `hideMessage(messageId)`
  - [ ] `markAsRead(roomId)`

### Этап 2 — Store (RTK slice/selectors)
- [ ] Создать `entities/chat/model/slice.js` со структурой:
  - rooms: ids/byId/loading/error/page/hasMore
  - messages: byRoomId: { ids/byId/loading/error/cursorId/hasMore }
  - unreadByRoomId, typingByRoomId, activeRoomId
- [ ] Thunks:
  - [ ] `fetchRooms`, `fetchMessages`
  - [ ] `sendText`, `sendImages`, `sendProduct`
  - [ ] `deleteMessage`, `hideMessage`, `markAsRead`
  - [ ] `createRoom`, `updateRoom`, `addMembers`, `removeMember`
- [ ] Reducers/helpers:
  - [ ] `setActiveRoom`, `receiveSocketMessage`, `receiveMessageDeleted`, `setTyping`
- [ ] Создать мемоселекторы `entities/chat/model/selectors.js`

### Этап 3 — Сокеты (hooks)
- [ ] Создать `entities/chat/hooks/useChatSocket.js`
  - [ ] Подключение по accessToken (`io(getBaseUrl(), { auth: { token } })`)
  - [ ] На connect загрузить/подписаться на имеющиеся комнаты
  - [ ] Слушатели: `chat:message:new`, `chat:message:deleted`, `chat:room:updated`, `chat:room:members`, `chat:typing`
  - [ ] Эмит `chat:typing` с троттлингом 500мс
  - [ ] Обработка реконнекта (повторная подписка и, при необходимости, рефетч)

### Этап 4 — UI-компоненты (entities/chat/ui)
- [ ] `MessageBubble.jsx`: TEXT/IMAGE/PRODUCT (карточка товара с CTA «Открыть»)
- [ ] `Composer.jsx`: TextInput, «скрепка» (выбор до N изображений), превью выбранных, отправка
- [ ] `AttachmentPreview.jsx`: миниатюры и подписи (caption, ограничение длины)

### Этап 5 — Экраны
- [ ] `screens/chat/ChatListScreen.jsx`:
  - [ ] FlatList, элементы: avatar/title, last message (иконки по типу), unread, время
  - [ ] Pull-to-refresh и onEndReached (page/limit)
  - [ ] Навигация в `ChatRoom`
- [ ] `screens/chat/ChatRoomScreen.jsx`:
  - [ ] FlatList (inverted), keyExtractor=id, renderItem=MessageBubble
  - [ ] Догрузка вверх по курсору (cursorId=firstId)
  - [ ] Composer снизу
  - [ ] Long-press меню удаления (с проверкой ролей/окон)
  - [ ] Mark as read при фокусе
  - [ ] Typing-индикатор

### Этап 6 — Интеграции
- [ ] ProductDetail → «Задать вопрос»: вызывать `getOrCreateProductRoom`, переходить в `ChatRoom`
- [ ] Репост товара: кнопка в header `ChatRoom` → `sendProduct`
- [ ] Пуш-уведомления (если уже используются): переход в `ChatRoom` по deep-link `app://chat/room/{id}`

### Этап 7 — Сжатие изображений (RN)
- [ ] Интегрировать `expo-image-manipulator` в отправку изображений чата: resize ~1200px, `compress≈0.7`, JPEG
- [ ] Не указывать `Content-Type` при FormData (пусть RN проставит)
- [ ] Предупреждать о лимитах (количество/размер)

### Этап 8 — Производительность/кэш
- [ ] Настройки FlatList: `inverted`, `initialNumToRender`, `windowSize`, `removeClippedSubviews`
- [ ] Кэш комнат и последних сообщений в `AsyncStorage` (MVP: отображать кэш → затем догрузка)
- [ ] Мемо-селекторы и `React.memo` на пузырях сообщений

### Этап 9 — Тестирование
- [ ] Ручные сценарии (см. `mobile/docs/CHATrequirements.md`): отправка/получение, удаление, пагинация, PRODUCT-чат
- [ ] e2e на smoke-уровне (из существующих инструментов)
- [ ] Проверка поведения при 401/429/сетевых ошибках

### Этап 10 — Документация и включение
- [ ] Обновить README/навигацию для чата
- [ ] Скриншоты/вайрфреймы ключевых экранов (по желанию)
- [ ] Включение раздела чата для авторизованных пользователей (скрыть для гостей)

## Приоритеты
- **MVP-1**: ChatList/ChatRoom, TEXT сообщение, PRODUCT-чат, загрузка/отображение сообщений, markAsRead, сокеты (message:new), базовый typing
- **MVP-2**: IMAGE сообщения (компрессия), удаление (self/forAll), управление участниками (минимум), unread бейджи в списке
- **Plus**: кэш сообщений/комнат, deep-links из пушей, улучшенное UI и анимации

## Риски и смягчение
- Большие вложения → агрессивная компрессия/проверка размеров до отправки
- Сетевые/401/429 → опора на глобальный перехватчик `shared/api/api.js`, дружелюбные тосты
- Перерисовки в комнатах → мемоизация и FlatList оптимизации

