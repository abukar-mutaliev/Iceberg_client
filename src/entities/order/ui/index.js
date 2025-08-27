// Экспорт компонентов системы обработки заказов

// Основные компоненты
export { OrderProcessingStages } from './OrderProcessingStages/OrderProcessingStages';
export { OrderAssignment } from './OrderAssignment/OrderAssignment';
export { ProcessingNotifications } from './ProcessingNotifications/ProcessingNotifications';

// Экспорт хуков
export { useOrderProcessing } from '../hooks/useOrderProcessing';
export { useProcessingNotifications } from '../hooks/useProcessingNotifications';

// Экспорт API
export { OrderProcessingApi } from '../api/orderProcessingApi';
export { ProcessingNotificationApi } from '../api/processingNotificationApi';

// Экспорт констант
export * from '../lib/constants';

// Экспорт Redux slice
export { default as orderProcessingReducer } from '../model/processingSlice';
export * from '../model/processingSlice'; 