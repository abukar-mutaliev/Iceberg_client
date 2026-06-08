// Точечный реэкспорт UI-компонентов модуля заказов.
// После упрощения системы убраны:
//  - OrderProcessingStages, OrderAssignment, ProcessingNotifications;
//  - хуки useOrderProcessing / useProcessingNotifications;
//  - API OrderProcessingApi / ProcessingNotificationApi;
//  - reducer orderProcessingReducer.

export { OrderCard } from './OrderCard';
export { OrderChoiceCard } from './OrderChoiceCard';
export { ChoiceNotificationBanner } from './ChoiceNotificationBanner';
export { WaitingStockIndicator } from './WaitingStockIndicator';
export { WaitingStockBadge } from './WaitingStockBadge';
export { SplitOrderIndicator } from './SplitOrderIndicator';
export { SplitOrderInfo } from './SplitOrderInfo';

export * from '../lib/constants';
