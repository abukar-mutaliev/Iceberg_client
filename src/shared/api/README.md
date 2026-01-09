# Централизованное подключение к серверу

Все подключения к серверу теперь централизованы в `@shared/api/api.js`. Используйте эти функции вместо прямых URL.

## Импорт

```javascript
// Основной способ - импорт из api.js
import { 
  api,              // Экземпляр axios с настроенными interceptors
  getBaseUrl,       // Получить базовый URL сервера
  getApiUrl,        // Получить полный URL для endpoint
  getImageUrl,      // Получить URL для изображения
  getUploadsBaseUrl,// Получить базовый URL для uploads
  formatImageUrl,   // Форматировать URL изображения (алиас для getImageUrl)
  apiFetch,         // Выполнить fetch запрос к API
  authService,      // Сервис для работы с авторизацией
} from '@shared/api/api';

// Или через единую точку входа
import { api, getBaseUrl, getImageUrl } from '@shared/api';
```

## Основные функции

### `getBaseUrl()`
Получить базовый URL сервера (например: `http://85.192.33.223:5000`)

```javascript
const baseUrl = getBaseUrl();
// Возвращает: "http://85.192.33.223:5000"
```

### `getApiUrl(endpoint)`
Получить полный URL для API endpoint

```javascript
const url = getApiUrl('/api/products');
// Возвращает: "http://85.192.33.223:5000/api/products"
```

### `getImageUrl(imagePath)`
Получить полный URL для изображения

```javascript
const imageUrl = getImageUrl('products/image.jpg');
// Возвращает: "http://85.192.33.223:5000/uploads/products/image.jpg"

// Если уже полный URL, возвращает как есть
const fullUrl = getImageUrl('http://example.com/image.jpg');
// Возвращает: "http://example.com/image.jpg"
```

### `getUploadsBaseUrl()`
Получить базовый URL для папки uploads

```javascript
const uploadsUrl = getUploadsBaseUrl();
// Возвращает: "http://85.192.33.223:5000/uploads/"
```

### `apiFetch(endpoint, options)`
Выполнить fetch запрос к API (используйте вместо прямого `fetch`)

```javascript
const response = await apiFetch('/api/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ name: 'Product' }),
});
```

### `api` (axios instance)
Экземпляр axios с настроенными interceptors для автоматической обработки токенов

```javascript
import { api } from '@shared/api/api';

// GET запрос
const response = await api.get('/api/products');

// POST запрос
const response = await api.post('/api/products', { name: 'Product' });
```

## Примеры использования

### Работа с изображениями

```javascript
import { getImageUrl, formatImageUrl } from '@shared/api/api';

// В компоненте
<Image source={{ uri: getImageUrl(product.image) }} />

// Или используйте алиас
<Image source={{ uri: formatImageUrl(product.image) }} />
```

### Выполнение API запросов

```javascript
import { api, getApiUrl } from '@shared/api/api';

// Через axios (рекомендуется)
const products = await api.get('/api/products');

// Через fetch
const response = await fetch(getApiUrl('/api/products'));
```

### Работа с загрузками файлов

```javascript
import { getUploadsBaseUrl } from '@shared/api/api';

const uploadsUrl = getUploadsBaseUrl();
const fileUrl = `${uploadsUrl}documents/file.pdf`;
```

## Конфигурация

URL сервера настраивается в `app.config.js`:

```javascript
extra: {
  apiUrl: 'http://85.192.33.223:5000',
}
```

Если `apiUrl` не указан в конфиге, используется fallback значение из `api.js`.

## Важно

- ❌ **НЕ используйте** захардкоженные URL в коде
- ✅ **Используйте** функции из `@shared/api/api.js`
- ✅ Все URL автоматически берутся из конфигурации
- ✅ При изменении сервера достаточно обновить `app.config.js`

