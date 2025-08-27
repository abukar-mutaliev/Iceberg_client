import { createNavigationContainerRef } from '@react-navigation/native';

// Создаем глобальную ссылку на навигацию
export const navigationRef = createNavigationContainerRef();

// Функция для безопасной навигации
export function navigate(name, params) {
    if (navigationRef.isReady()) {
        navigationRef.navigate(name, params);
    } else {
        console.warn('❌ Navigation is not ready, cannot navigate to:', name);
        // Можно добавить в очередь ожидания или показать уведомление
    }
}

// Функция для проверки готовности навигации
export function isNavigationReady() {
    return navigationRef.isReady();
}

// Функция для получения текущего экрана
export function getCurrentRoute() {
    if (navigationRef.isReady()) {
        return navigationRef.getCurrentRoute();
    }
    return null;
} 