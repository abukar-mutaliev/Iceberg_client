## CHAT — Technical Design (Mobile, React Native)

Основано на `mobile/docs/CHATrequirements.md` и серверной спецификации. Интеграция в текущую архитектуру (`entities/`, `features/`, `screens/`, `widgets/`, `shared/`).

## Структура модулей
- `mobile/src/entities/chat/`
  - `api/chatApi.js` — REST-обертки (axios через `createApiModule('/api/chat')`)
  - `model/slice.js` — RTK slice: комнаты/сообщения/unread/typing/курсоры
  - `model/selectors.js` — мемоселекторы
  - `hooks/useChatSocket.js` — инициализация `socket.io-client`, обработчики
  - `ui/MessageBubble.jsx`, `ui/Composer.jsx`, `ui/AttachmentPreview.jsx`
- `mobile/src/features/chat/`
  - `OpenProductChat` — кнопка/хук для ProductDetail → PRODUCT-room
  - `ShareProductToChat` — репост товара в открытую комнату
- `mobile/src/screens/chat/`
  - `ChatListScreen.jsx` — список комнат
  - `ChatRoomScreen.jsx` — лента, composer, вложения

## Типы данных (минимум)
```ts
type ChatRoom = {
  id: number;
  type: 'DIRECT'|'GROUP'|'PRODUCT';
  title?: string;
  description?: string;
  avatar?: string; // URL
  productId?: number;
  updatedAt?: string;
  lastMessage?: ChatMessage | null; // сервер может отдавать отдельно
  participants?: { userId: number; role: 'MEMBER'|'ADMIN'|'OWNER' }[];
}

type ChatAttachment = {
  id: number;
  type: 'IMAGE';
  path: string; // URL
  caption?: string;
}

type ChatMessage = {
  id: number;
  roomId: number;
  senderId: number;
  type: 'TEXT'|'IMAGE'|'PRODUCT'|'SYSTEM';
  content?: string;
  productId?: number;
  createdAt: string;
  attachments?: ChatAttachment[];
}
```

## Состояние Redux
```ts
ChatState = {
  rooms: {
    ids: number[];
    byId: Record<number, ChatRoom>;
    loading: boolean;
    error: string|null;
    page: number;
    hasMore: boolean;
  },
  messages: {
    [roomId: number]: {
      ids: number[]; // упорядочены по createdAt desc для inverted FlatList
      byId: Record<number, ChatMessage>;
      loading: boolean;
      error: string|null;
      cursorId?: number|null; // для догрузки вверх
      hasMore: boolean;
    }
  },
  unreadByRoomId: Record<number, number>;
  typingByRoomId: Record<number, number[]>; // userIds
  activeRoomId: number|null;
}
```

## API слой (entities/chat/api/chatApi.js)
Методы:
- `getRooms({ page, limit })` → GET `/api/chat/rooms`
- `getMessages(roomId, { limit, cursorId, direction })` → GET `/api/chat/rooms/:roomId/messages`
- `createRoom(formData)` → POST `/api/chat/rooms` (multipart, avatar?)
- `getOrCreateProductRoom(productId)` → POST `/api/chat/rooms/product/:productId`
- `updateRoom(roomId, formData)` → PATCH `/api/chat/rooms/:roomId`
- `addMembers(roomId, { userIds, makeAdmins })` → POST `/api/chat/rooms/:roomId/members`
- `removeMember(roomId, userId)` → DELETE `/api/chat/rooms/:roomId/members/:userId`
- `sendMessage(roomId, formData)` → POST `/api/chat/rooms/:roomId/messages` (multipart: images[], content, type, productId, captions(JSON))
- `deleteMessage(messageId, { forAll })` → DELETE `/api/chat/messages/:messageId`
- `hideMessage(messageId)` → POST `/api/chat/messages/:messageId/hide`
- `markAsRead(roomId)` → POST `/api/chat/rooms/:roomId/read`

Особенности:
- 401/429 уже перехватываются в `shared/api/api.js`
- Для multipart: как в `ProductsService` — без `Content-Type`, RN сам поставит границы; компрессия через `expo-image-manipulator`

## Slice и thunks (entities/chat/model/slice.js)
- rooms:
  - `fetchRooms({ page, limit })`
  - `createRoom(payload)` | `updateRoom({ roomId, formData })`
  - `addMembers`, `removeMember`
- messages:
  - `fetchMessages({ roomId, limit, cursorId, direction })` (догрузка вверх при достижении головы)
  - `sendText({ roomId, content })`
  - `sendImages({ roomId, files, captions })`
  - `sendProduct({ roomId, productId })`
  - `deleteMessage({ messageId, forAll })` | `hideMessage({ messageId })`
  - `markAsRead({ roomId })`
- UI helpers:
  - `setActiveRoom(roomId)`
  - `receiveSocketMessage({ roomId, message })` (интеграция сокета) → обновить messages и, если room не активен, инкрементировать unread

## Selectors (entities/chat/model/selectors.js)
- Список комнат с сортировкой по `updatedAt`/`lastMessage.createdAt`
- Сообщения комнаты (массив) по ids → byId
- Unread по комнате, typing списки

## Сокеты (entities/chat/hooks/useChatSocket.js)
- Подключение: `io(getBaseUrl(), { auth: { token } })`
- На connect: при наличии `rooms.ids` — `socket.emit('chat:join', { roomId })` для новых комнат; сервер также автоподписывает
- Слушатели:
  - `chat:message:new` → `dispatch(receiveSocketMessage(payload))`
  - `chat:message:deleted` → отметить удаленным/убрать, если текущий список содержит
  - `chat:room:updated`, `chat:room:members` → опционально рефетч комнаты
  - `chat:typing` → обновить typingByRoomId c троттлингом в UI
- Отправка typing: `socket.emit('chat:typing', { roomId, isTyping: true/false })` с троттлингом (500мс)
- Reconnect: повторное подключение — загрузить `/rooms` и восстановить подписки

## Экраны
### ChatListScreen.jsx
- FlatList по комнатам: аватар, title, последняя реплика (иконки по типу), счетчик непрочитанного, время
- Pull-to-refresh → `fetchRooms({ page:1 })`; onEndReached → next page
- Навигация: `onPress` → `ChatRoomScreen` с `roomId`

### ChatRoomScreen.jsx
- Верх: заголовок (avatar/title), кнопки «участники», «репост товара»
- Сообщения: `FlatList` с `inverted` (последние сверху визуально), `keyExtractor=id`, `renderItem=MessageBubble`
- Догрузка: при достижении начала списка — `fetchMessages({ cursorId=firstId, direction:'backward' })`
- Composer: `TextInput`, кнопка «скрепка» (выбор до N изображений), кнопка «Отправить»
  - отправка: TEXT → `sendText`; IMAGE → `sendImages`; PRODUCT → `sendProduct`
- Удаление: long-press на bubble → меню: «Удалить у всех»/«Удалить у себя» (условно от роли)
- Mark as read: при фокусе и открытой комнате — `markAsRead(roomId)`
- Ошибки/429: показывать тост/баннер; блокировать повторную отправку на период окна

## Компоненты UI
- `MessageBubble` — разные типы (TEXT/IMAGE/PRODUCT), own vs others стили; IMAGE с Preview (Modal)
- `Composer` — состояние ввода, отправка, disable при лимитах/429; отображение выбранных файлов (`AttachmentPreview`), удаление из очереди
- `AttachmentPreview` — миниатюры, подписи (caption) c ограничением длины

## Интеграция с ProductDetail
- `features/chat/OpenProductChat` — кнопка «Задать вопрос»:
  - `await chatApi.getOrCreateProductRoom(productId)` → navigate `ChatRoomScreen({ roomId })`
- `features/chat/ShareProductToChat` — в открытой комнате (header action): `sendProduct({ roomId, productId })`

## Сжатие изображений
- Использовать `expo-image-manipulator`: resize ~1200px (высота/ширина), `compress≈0.7`, формат `JPEG`
- В RN `FormData` не указывать `Content-Type`; RN сам проставит
- Валидация по лимитам до отправки; показывать размер/лимит

## Производительность
- FlatList: `inverted`, `initialNumToRender`, `windowSize`, `removeClippedSubviews`
- Мемо-селекторы и `React.memo`
- Плавающий composer, минимизация перерисовок при typing

## Кэш и офлайн (MVP)
- `AsyncStorage`:
  - Кэш комнат (последние N) и первых M сообщений для последних K комнат
  - При старте: показать кэш → затем фоновая догрузка (паттерн как в `StaffOrdersScreen`)

## Ошибки и UX
- 401 → редирект к логину через общую обработку в `shared/api/api.js`
- 429 → тост «Слишком много сообщений. Попробуйте позже.» (с `Retry-After`, если есть)
- Сеть: баннер «Нет соединения» при offline из `NetInfo`

## Навигация
- Добавить маршруты `ChatList` и `ChatRoom` в корневой навигатор; скрывать раздел чата для неавторизованных (или показывать read-only экран с CTA логина)
- Deep-link для пушей: `app://chat/room/{id}` → `ChatRoom`

## Тестирование
- См. `mobile/docs/CHATrequirements.md` — тест-кейсы; e2e smoke (ручная проверка) через `server/test/chat.http` и мобильный UI

