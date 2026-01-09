/**
 * ЕДИНАЯ ТОЧКА ПОДКЛЮЧЕНИЯ К СЕРВЕРУ
 * 
 * Импортируйте все функции отсюда для работы с API:
 * 
 * import { 
 *   api,              // Экземпляр axios с настроенными interceptors
 *   apiClient,        // Высокоуровневый клиент (get, post, put, delete, patch)
 *   getBaseUrl,       // Получить базовый URL сервера
 *   getApiUrl,        // Получить полный URL для endpoint
 *   getImageUrl,      // Получить URL для изображения
 *   getUploadsBaseUrl,// Получить базовый URL для uploads
 *   formatImageUrl,   // Форматировать URL изображения (алиас для getImageUrl)
 *   apiFetch,         // Выполнить fetch запрос к API
 *   authService,     // Сервис для работы с авторизацией
 * } from '@shared/api';
 */

// Экспортируем все из основного файла api.js
export * from './api';

// Экспортируем из ApiClient.js
export { apiClient, createApiModule, handleApiError } from '../services/ApiClient';

